import {TransformComponent} from '../../3d/TransformComponent';
import {quad} from '../../geom/quad';
import {GLArrayBuffer} from '../gl/GLArrayBuffer';
import {GLFrameBuffer} from '../gl/GLFrameBuffer';
import {GLGeometry} from '../gl/GLGeometry';
import {GLShader} from '../gl/GLShader';
import {GLTexture2D, GLTexture2DOptions} from '../gl/GLTexture2D';
import {generateBlueNoiseMap} from '../map/generateBlueNoiseMap';
import {DeferredPipeline} from '../pipeline/DeferredPipeline';
import {BVHTexture} from '../raytrace/BVHTexture';
import {MaterialInjector} from '../raytrace/MaterialInjector';
import {Sobol} from '../raytrace/Sobol';
import {WorldBVH} from '../raytrace/WorldBVH';
import {POINT_LIGHT} from '../shader/light';
import {MATERIAL_INFO} from '../shader/material';
import {PBR} from '../shader/pbr';
import {DENOISE, INTERSECTION, MATERIAL_INJECTOR} from '../shader/raytrace';
import {SAMPLE} from '../shader/sample';

import {DeferredEffect} from './DeferredEffect';

const LIGHT_QUAD = new GLGeometry(quad());
const TARGET_DELTA_TIME = 1 / 30;

export class RaytraceEffect implements DeferredEffect {
  pipeline: DeferredPipeline;
  worldBVH: WorldBVH;
  bvhTexture: BVHTexture;
  materialInjector: MaterialInjector;
  rayBuffer: GLTexture2D | null = null;
  rayFrameBuffer: GLFrameBuffer | null = null;
  rayTilePos = 0;
  rayTileFrame = 1;
  rayTileBuffer: GLArrayBuffer = new GLArrayBuffer(undefined, 'stream');
  tileWidth = 1;
  tileHeight = 1;
  randomPos: Float32Array = new Float32Array(2);
  randomMap: GLTexture2D | null = null;
  worldVersion = -1;
  sobol: Sobol;

  constructor(pipeline: DeferredPipeline, worldBVH: WorldBVH) {
    this.pipeline = pipeline;
    this.worldBVH = worldBVH;
    this.materialInjector = new MaterialInjector(pipeline.renderer);
    this.bvhTexture = new BVHTexture(
      worldBVH.entityStore,
      worldBVH,
      this.materialInjector,
    );
    this.sobol = new Sobol(2);
  }

  getRaytraceShader(): GLShader {
    const {renderer} = this.pipeline;
    // TODO: Clean this up
    return renderer.getResource(`raytrace~raytraced`, () => {
      return new GLShader(
        /* glsl */`
          #version 100
          precision highp float;

          attribute vec3 aPosition;
          attribute vec4 aScreenOffset;

          varying vec2 vPosition;

          void main() {
            vPosition = aPosition.xy * aScreenOffset.xy + aScreenOffset.zw;
            gl_Position = vec4(vPosition, 1.0, 1.0);
          }
        `,
        /* glsl */`
          #version 100
          precision highp float;
          precision highp sampler2D;

          ${INTERSECTION}
          ${PBR}
          ${MATERIAL_INFO}
          ${POINT_LIGHT}
          ${MATERIAL_INJECTOR}
          ${SAMPLE}

          #define PI 3.141592

          varying vec2 vPosition;

          uniform mat4 uInverseView;
          uniform mat4 uInverseProjection;
          uniform vec3 uViewPos;
          uniform sampler2D uBVHMap;
          uniform vec2 uBVHMapSize;
          uniform sampler2D uAtlasMap;
          uniform sampler2D uRandomMap;
          uniform vec2 uSeed;
          uniform vec2 uScreenSize;
          uniform vec2 uRandomMapSize;
          uniform highp sampler2D uDepthBuffer;
          uniform sampler2D uGBuffer0;
          uniform sampler2D uGBuffer1;
          uniform vec2 uGBufferSize;

          void main() {
            // Interlacing
            vec2 uv = vPosition.xy * 0.5 + 0.5;
            vec2 interlaceUV = floor(uv * 4.0);
            uv = fract(uv * 4.0);
            uv += interlaceUV / uScreenSize;
            // uv = (round(uv * uGBufferSize) + 0.5) / uGBufferSize;

            vec2 ndc = uv * 2.0 - 1.0;
            randInit(uSeed + fract(uv * uScreenSize / uRandomMapSize), uSeed);

            float depth = texture2D(uDepthBuffer, uv).x;
            vec4 values[GBUFFER_SIZE];
            values[0] = texture2D(uGBuffer0, uv);
            values[1] = texture2D(uGBuffer1, uv);

            MaterialInfo mInfo;
            unpackMaterialInfo(
              depth, values, ndc,
              uInverseProjection, uInverseView,
              mInfo
            );

            PointLight light;
            light.position = vec3(1.78, 2.399, -1.78);
            light.color = vec3(1.0);
            light.intensity = vec3(PI * 8.0, 0.0, 100.0);

            vec3 dir;
            vec3 origin;
            vec3 prevOrigin;
            BVHIntersectResult bvhResult;

            dir = mInfo.normal;
            origin = mInfo.position + dir * 0.04;
            prevOrigin = uViewPos;

            vec3 resultColor = vec3(0.0);
            vec3 attenuation = vec3(1.0);

            for (int i = 0; i < 3; i += 1) {
              // lighting 
              vec3 lightingColor = vec3(0.0);
              /* if (i > 0) */ {
                vec3 L = light.position - origin; 
                float lightDist = length(L);
                L /= lightDist;
                // Check occulsion
                BVHIntersectResult lightResult;
                bool isLightIntersecting = intersectBVH(
                  lightResult,
                  uBVHMap,
                  uBVHMapSize, 1.0 / uBVHMapSize,
                  0,
                  origin,
                  L
                );
                if (!isLightIntersecting || (lightResult.rayDist - lightDist > 0.000001)) {
                  if (i == 0) {
                    lightingColor += calcPoint(prevOrigin, mInfo, light);
                  } else {
                    lightingColor += max(dot(mInfo.normal, L), 0.0) *
                      light.color * mInfo.albedo * light.intensity.x / PI;
                  }
                }
              }

              resultColor += lightingColor * attenuation * 0.5;
              // scattering
              if (mInfo.metalic > 0.5) {
                dir = mInfo.normal;
              } else {
                dir = normalize(mInfo.normal + sampleSphere(randVec3(uRandomMap)));
              }
              attenuation *= mInfo.albedo * 0.5;
              // next ray
              if (i < 1) {
                bool isIntersecting = intersectBVH(
                  bvhResult,
                  uBVHMap,
                  uBVHMapSize, 1.0 / uBVHMapSize,
                  0,
                  origin,
                  dir
                );
                if (!isIntersecting) {
                  break;
                }
                BVHBLASLeaf blas;
                bvhBLASFetch(blas, bvhResult.faceAddr, uBVHMap, uBVHMapSize, 1.0 / uBVHMapSize);
                vec3 normal = vec3(0.0);
                normal += blas.normal[0] * bvhResult.barycentric.x;
                normal += blas.normal[1] * bvhResult.barycentric.y;
                normal += blas.normal[2] * bvhResult.barycentric.z;
                normal = normalize((bvhResult.matrix * vec4(normal, 0.0)).xyz);
                if (dot(normal, dir) > 0.0) {
                  // normal *= -1.0;
                }
                vec2 texCoord = vec2(0.0);
                texCoord += blas.texCoord[0] * bvhResult.barycentric.x;
                texCoord += blas.texCoord[1] * bvhResult.barycentric.y;
                texCoord += blas.texCoord[2] * bvhResult.barycentric.z;
                unpackMaterialInfoBVH(
                  mInfo,
                  bvhResult.position,
                  normal,
                  texCoord,
                  uAtlasMap,
                  int(bvhResult.childId),
                  uBVHMap,
                  uBVHMapSize,
                  1.0 / uBVHMapSize
                );
                origin = mInfo.position + mInfo.normal * 0.0001;
              }
            }
            gl_FragColor = vec4(resultColor, 1.0);
          }
        `,
      );
    });
  }

  getDisplayShader(): GLShader {
    const {renderer} = this.pipeline;
    return renderer.getResource(`display~raytraced`, () => {
      return new GLShader(
        /* glsl */`
          #version 100
          precision highp float;

          attribute vec3 aPosition;

          varying vec2 vPosition;

          void main() {
            vPosition = aPosition.xy;
            gl_Position = vec4(aPosition.xy, 1.0, 1.0);
          }
        `,
        /* glsl */`
          #version 100
          precision highp float;

          ${DENOISE}

          varying vec2 vPosition;

          uniform sampler2D uRayMap;
          uniform sampler2D uNormalMap;
          uniform vec2 uScreenSize;
          uniform vec2 uGBufferSize;
          
          float rand(vec2 co) {
              return fract(sin(dot(co.xy,vec2(12.9898,78.233))) * 43758.5453);
          }

          void main() {
            // Interlacing
            vec2 srcUV = vPosition.xy * 0.5 + 0.5;
            vec2 uv = srcUV;
            uv += (rand(vPosition) - 0.5) / uScreenSize;

            vec4 color = denoiseRaytrace(uv, 3.0, uRayMap, uNormalMap, uScreenSize, 1.0 / uScreenSize, vec2(4.0));
            // gl_FragColor = vec4(color.rgb, 1.0);
            // vec4 color = texture2D(uRayMap, uv);
            gl_FragColor = vec4(color.rgb, 1.0);
          }
        `,
      );
    });
  }

  prepare(): void {
    const {glRenderer} = this.pipeline.renderer;
    const {capabilities} = glRenderer;
    const useFloat = capabilities.hasFloatBlend() &&
      capabilities.hasFloatBuffer() &&
      capabilities.hasFloatTextureLinear();
    const isMobile = navigator.userAgent.match(/Android|iPhone|iPad|iPod/i);
    let width = glRenderer.getWidth();
    let height = glRenderer.getHeight();
    width = Math.floor(width / 1);
    height = Math.floor(height / 1);
    if (isMobile) {
      width = Math.floor(width / 3);
      height = Math.floor(height / 3);
    }
    // width = 128;
    // height = 128;
    // this.tileWidth = Math.floor(width / 64);
    // this.tileHeight = Math.floor(height / 64);
    this.tileWidth = 4;
    this.tileHeight = 4;
    const defaultOpts: GLTexture2DOptions = {
      width,
      height,
      magFilter: 'nearest',
      minFilter: 'nearest',
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      mipmap: false,
      source: null,
    };
    if (this.rayBuffer == null) {
      this.rayBuffer = new GLTexture2D({
        ...defaultOpts,
        format: 'rgba',
        type: useFloat ? 'float' : 'halfFloat',
      });
    }
    if (this.rayFrameBuffer == null) {
      this.rayFrameBuffer = new GLFrameBuffer({
        width,
        height,
        color: this.rayBuffer!,
      });
    }
    if (this.randomMap == null) {
      this.randomMap = generateBlueNoiseMap();
      // this.refreshRandomMap();
    }
  }

  render(deltaTime?: number): void {
    const {cameraUniforms, depthBuffer, gBuffers} = this.pipeline;
    const {entityStore, glRenderer} = this.pipeline.renderer;

    const transformComp =
      entityStore.getComponent<TransformComponent>('transform')!;

    this.prepare();

    const shouldRefresh = this.worldVersion !== transformComp.globalVersion;
    const randomMapWidth = this.randomMap!.getWidth();
    const randomMapHeight = this.randomMap!.getHeight();

    if (!this.randomMap!.isReady()) {
      return;
    }

    if (shouldRefresh) {
      // TODO: Don't update it unless any mesh has moved
      this.worldBVH.update();
      this.bvhTexture.update();

      // Invalidate / clear the framebuffer
      glRenderer.clear(this.rayFrameBuffer!);

      this.worldVersion = transformComp.globalVersion;
      this.rayTilePos = 0;
      this.sobol.reset();

      const next = this.sobol.next();
      this.randomPos[0] = next[0] * (randomMapWidth - 1) / randomMapWidth;
      this.randomPos[1] = next[1] * (randomMapHeight - 1) / randomMapHeight;
    }
    this.materialInjector.updateTexture();

    const tw = this.tileWidth;
    const th = this.tileHeight;
    if (deltaTime != null) {
      if (deltaTime >= TARGET_DELTA_TIME) {
        this.rayTileFrame = Math.max(this.rayTileFrame - 1, 1);
      } else {
        this.rayTileFrame = Math.min(this.rayTileFrame + 1, tw * th);
      }
    }

    const tilePerFrame = this.rayTileFrame;
    const tileData = new Float32Array(4 * tilePerFrame);
    for (let i = 0; i < tilePerFrame; i += 1) {
      const tilePos = this.rayTilePos + i;
      tileData[i * 4] = 1 / tw;
      tileData[i * 4 + 1] = 1 / th;
      tileData[i * 4 + 2] = ((tilePos % tw) + 0.5) / tw * 2 - 1;
      tileData[i * 4 + 3] =
        ((Math.floor(tilePos / tw) % th) + 0.5) / th * 2 - 1;
    }
    const prevScanId = Math.floor(this.rayTilePos / (tw * th));
    const nextScanId = Math.floor((this.rayTilePos + tilePerFrame) / (tw * th));
    if (prevScanId !== nextScanId) {
      const next = this.sobol.next();
      this.randomPos[0] = next[0] * (randomMapWidth - 1) / randomMapWidth;
      this.randomPos[1] = next[1] * (randomMapHeight - 1) / randomMapHeight;
    }
    this.rayTileBuffer.set(tileData);
    this.rayTilePos += tilePerFrame;

    // Perform ray tracing
    glRenderer.draw({
      frameBuffer: this.rayFrameBuffer,
      geometry: LIGHT_QUAD,
      attributes: {
        aScreenOffset: {
          buffer: this.rayTileBuffer,
          divisor: 1,
        },
      },
      shader: this.getRaytraceShader(),
      uniforms: {
        ...cameraUniforms,
        uDepthBuffer: depthBuffer,
        uGBuffer0: gBuffers![0],
        uGBuffer1: gBuffers![1],
        uBVHMap: this.bvhTexture.bvhTexture,
        uBVHMapSize: [
          this.bvhTexture.bvhTexture.getWidth(),
          this.bvhTexture.bvhTexture.getHeight(),
        ],
        uAtlasMap: this.materialInjector.texture,
        uSeed: this.randomPos,
        uRandomMap: this.randomMap,
        uRandomMapSize: [randomMapWidth, randomMapHeight],
        uScreenSize: [
          this.rayBuffer!.getWidth(),
          this.rayBuffer!.getHeight(),
        ],
        uGBufferSize: [
          depthBuffer!.getWidth(),
          depthBuffer!.getHeight(),
        ],
      },
      state: {
        blend: {
          equation: 'add',
          func: ['one', 'one'],
        },
        depth: false,
      },
      primCount: tilePerFrame,
    });

    // Output to screen
    glRenderer.draw({
      frameBuffer: this.pipeline.outFrameBuffer!,
      geometry: LIGHT_QUAD,
      shader: this.getDisplayShader(),
      uniforms: {
        uRayMap: this.rayBuffer,
        uNormalMap: gBuffers![1],
        uScreenSize: [
          this.rayBuffer!.getWidth(),
          this.rayBuffer!.getHeight(),
        ],
        uGBufferSize: [
          depthBuffer!.getWidth(),
          depthBuffer!.getHeight(),
        ],
      },
      state: {
        depthMask: false,
        depth: false,
        cull: false,
        blend: {
          equation: 'add',
          func: ['one', 'one'],
        },
      },
    });
  }
}
