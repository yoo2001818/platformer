import {Camera} from '../../3d/Camera';
import {Transform} from '../../3d/Transform';
import {TransformComponent} from '../../3d/TransformComponent';
import {quad} from '../../geom/quad';
import {GLArrayBuffer} from '../gl/GLArrayBuffer';
import {GLFrameBuffer} from '../gl/GLFrameBuffer';
import {GLGeometry} from '../gl/GLGeometry';
import {GLShader} from '../gl/GLShader';
import {GLTexture2D, GLTexture2DOptions} from '../gl/GLTexture2D';
import {DrawOptions} from '../gl/types';
import {BVHTexture} from '../raytrace/BVHTexture';
import {MaterialInjector} from '../raytrace/MaterialInjector';
import {Sobol} from '../raytrace/Sobol';
import {WorldBVH} from '../raytrace/WorldBVH';
import {Renderer} from '../Renderer';
import {POINT_LIGHT} from '../shader/light';
import {MATERIAL_INFO} from '../shader/material';
import {PBR} from '../shader/pbr';
import {INTERSECTION, MATERIAL_INJECTOR} from '../shader/raytrace';
import {FILMIC} from '../shader/tonemap';
import {ShadowPipeline} from '../shadow/ShadowPipeline';

import {Pipeline, PipelineShaderBlock} from './Pipeline';

const LIGHT_QUAD = new GLGeometry(quad());
const TARGET_DELTA_TIME = 1 / 60;

export class RaytracedPipeline implements Pipeline {
  renderer: Renderer;
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
  cameraUniforms: {[key: string]: unknown;} = {};
  worldVersion = -1;
  sobol: Sobol;

  constructor(renderer: Renderer, worldBVH: WorldBVH) {
    this.renderer = renderer;
    this.worldBVH = worldBVH;
    this.materialInjector = new MaterialInjector(renderer);
    this.bvhTexture = new BVHTexture(
      worldBVH.entityStore,
      worldBVH,
      this.materialInjector,
    );
    this.sobol = new Sobol(2);
  }

  dispose(): void {
  }

  getDeferredShader(id: string, onCreate: () => PipelineShaderBlock): GLShader {
    throw new Error('Raytraced pipeline cannot work on shaders');
  }

  getForwardShader(id: string, onCreate: () => PipelineShaderBlock): GLShader {
    throw new Error('Raytraced pipeline cannot work on shaders');
  }

  drawDeferred(options: DrawOptions): void {
    throw new Error('Raytraced pipeline cannot work on draw call');
  }

  drawForward(options: DrawOptions): void {
    throw new Error('Raytraced pipeline cannot work on draw call');
  }

  renderShadow(shadowPipeline: ShadowPipeline): void {
    throw new Error('Raytraced pipeline cannot work on shadows');
  }

  getRaytraceShader(): GLShader {
    const {renderer} = this;
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

          #define PI 3.141592

          varying vec2 vPosition;

          uniform mat4 uInverseView;
          uniform mat4 uInverseProjection;
          uniform sampler2D uBVHMap;
          uniform vec2 uBVHMapSize;
          uniform sampler2D uAtlasMap;
          uniform sampler2D uRandomMap;
          uniform vec2 uSeed;
          uniform vec2 uScreenSize;
          uniform vec2 uRandomMapSize;

          vec4 randTexel;
          int randPtr = 0;
          vec2 tilePosition;
          float rand() {
            if (randPtr == 0) {
              randTexel = texture2D(uRandomMap, tilePosition);
            }
            float result;
            if (randPtr == 0) {
              result = randTexel.r;
            } else if (randPtr == 1) {
              result = randTexel.g;
            } else if (randPtr == 2) {
              result = randTexel.b;
            } else if (randPtr == 3) {
              result = randTexel.w;
            }
            randPtr += 1;
            if (randPtr == 4) {
              randPtr = 0;
              tilePosition += uSeed;
            }
            return result;
          }

          // https://graphics.pixar.com/library/OrthonormalB/paper.pdf
          mat3 orthonormalBasis(vec3 n) {
            float zsign = n.z >= 0.0 ? 1.0 : -1.0;
            float a = -1.0 / (zsign + n.z);
            float b = n.x * n.y * a;
            vec3 s = vec3(1.0 + zsign * n.x * n.x * a, zsign * b, -zsign * n.x);
            vec3 t = vec3(b, zsign + n.y * n.y * a, -n.y);
            return mat3(s, t, n);
          }

          // http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#SamplingaUnitDisk
          vec2 sampleCircle(vec2 p) {
            p = 2.0 * p - 1.0;

            bool greater = abs(p.x) > abs(p.y);

            float r = greater ? p.x : p.y;
            float theta = greater ? 0.25 * PI * p.y / p.x : PI * (0.5 - 0.25 * p.x / p.y);

            return r * vec2(cos(theta), sin(theta));
          }

          // http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#Cosine-WeightedHemisphereSampling
          vec3 cosineSampleHemisphere(vec2 p) {
            vec2 h = sampleCircle(p);
            float z = sqrt(max(0.0, 1.0 - h.x * h.x - h.y * h.y));
            return vec3(h, z);
          }

          vec3 sampleSphere() {
            return normalize(vec3(
              rand(),
              rand(),
              rand()
            ) * 2.0 - 1.0);
          }

          float fade(float low, float high, float value){
              float mid = (low+high)*0.5;
              float range = (high-low)*0.5;
              float x = 1.0 - clamp(abs(mid-value)/range, 0.0, 1.0);
              return smoothstep(0.0, 1.0, x);
          }

          vec3 getColor(float intensity){
              vec3 blue = vec3(0.0, 0.0, 1.0);
              vec3 cyan = vec3(0.0, 1.0, 1.0);
              vec3 green = vec3(0.0, 1.0, 0.0);
              vec3 yellow = vec3(1.0, 1.0, 0.0);
              vec3 red = vec3(1.0, 0.0, 0.0);

              vec3 color = (
                  fade(-0.25, 0.25, intensity)*blue +
                  fade(0.0, 0.5, intensity)*cyan +
                  fade(0.25, 0.75, intensity)*green +
                  fade(0.5, 1.0, intensity)*yellow +
                  smoothstep(0.75, 1.0, intensity)*red
              );
              return color;
          }

          void main() {
            tilePosition = uSeed + fract((vPosition.xy * 0.5 + 0.5) * uScreenSize / uRandomMapSize);
            vec2 ndcPos = vPosition.xy + (1.0 / uScreenSize) * (vec2(rand(), rand()) * 2.0 - 1.0);
            vec4 viewFarPos = uInverseProjection * vec4(ndcPos, 1.0, 1.0);
            viewFarPos /= viewFarPos.w;
            vec4 viewNearPos = uInverseProjection * vec4(ndcPos, -1.0, 1.0);
            viewNearPos /= viewNearPos.w;

            viewFarPos = uInverseView * viewFarPos;
            viewNearPos = uInverseView * viewNearPos;

            vec3 dir = normalize((viewFarPos - viewNearPos).xyz);
            vec3 origin = viewNearPos.xyz;
            BVHIntersectResult bvhResult;
            MaterialInfo mInfo;
            PointLight light;
            light.position = vec3(1.78, 2.399, -1.78);
            light.color = vec3(1.0);
            light.intensity = vec3(PI * 6.0, 0.0, 100.0);

            vec3 resultColor = vec3(0.0);
            vec3 attenuation = vec3(1.0);

            for (int i = 0; i < 3; i += 1) {
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
              vec3 prevOrigin = origin;
              origin = mInfo.position + mInfo.normal * 0.0001;
              // lighting 
              vec3 lightingColor = vec3(0.0);
              {
                vec3 L = light.position - mInfo.position;
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
                dir = normalize(mInfo.normal + sampleSphere());
              }
              attenuation *= mInfo.albedo * 0.5;

            }
            gl_FragColor = vec4(resultColor, 1.0);
          }
        `,
      );
    });
  }

  getDisplayShader(): GLShader {
    const {renderer} = this;
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

          ${FILMIC}

          varying vec2 vPosition;

          uniform sampler2D uBuffer;
          
          void main() {
            vec2 uv = vPosition * 0.5 + 0.5;
            vec4 color = texture2D(uBuffer, uv);
            gl_FragColor = vec4(tonemap(color.xyz / color.w), 1.0);
          }
        `,
      );
    });
  }

  refreshRandomMap(): void {
    const tileWidth = 256;
    const tileHeight = 256;
    const opts: GLTexture2DOptions = {
      magFilter: 'nearest',
      minFilter: 'nearest',
      wrapS: 'repeat',
      wrapT: 'repeat',
      format: 'rgba',
      type: 'float',
      width: tileWidth,
      height: tileHeight,
      mipmap: false,
    };
    if (this.randomMap == null) {
      this.randomMap = new GLTexture2D({
        ...opts,
        source: null,
      });
    }
    const buffer = new Float32Array(tileWidth * tileHeight * 4);
    for (let i = 0; i < tileWidth * tileHeight * 4; i += 1) {
      buffer[i] = Math.random();
    }
    this.randomMap.setOptions({
      ...opts,
      source: buffer,
    });
  }

  prepare(): void {
    const {glRenderer} = this.renderer;
    const {capabilities} = glRenderer;
    const useFloat = capabilities.hasFloatBlend() &&
      capabilities.hasFloatBuffer() &&
      capabilities.hasFloatTextureLinear();
    const isMobile = navigator.userAgent.match(/Android|iPhone|iPad|iPod/i);
    let width = glRenderer.getWidth();
    let height = glRenderer.getHeight();
    if (isMobile) {
      width = Math.floor(width / 3);
      height = Math.floor(height / 3);
    }
    // width = 128;
    // height = 128;
    this.tileWidth = Math.floor(width / 64);
    this.tileHeight = Math.floor(height / 64);
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
      this.refreshRandomMap();
    }
  }

  render(deltaTime?: number): void {
    const {entityStore, glRenderer, camera} = this.renderer;

    if (camera == null) {
      throw new Error('Camera is not specified');
    }

    const transformComp =
      entityStore.getComponent<TransformComponent>('transform')!;
    const cameraData = camera!.get<Camera>('camera')!;
    const cameraTransform = camera!.get<Transform>('transform')!;

    const aspect = this.renderer.getAspectRatio();
    this.cameraUniforms = {
      uInverseView: cameraData.getInverseView(camera!),
      uInverseProjection: cameraData.getInverseProjection(aspect),
      uView: cameraData.getView(camera!),
      uProjection: cameraData.getProjection(aspect),
      uViewPos: cameraTransform.getPosition(),
    };

    this.prepare();

    const shouldRefresh = this.worldVersion !== transformComp.globalVersion;

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
      this.randomPos[0] = next[0] * 255 / 256;
      this.randomPos[1] = next[1] * 255 / 256;
    }

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
      this.randomPos[0] = next[0] * 255 / 256;
      this.randomPos[1] = next[1] * 255 / 256;
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
        ...this.cameraUniforms,
        uBVHMap: this.bvhTexture.bvhTexture,
        uBVHMapSize: [
          this.bvhTexture.bvhTexture.getWidth(),
          this.bvhTexture.bvhTexture.getHeight(),
        ],
        uAtlasMap: this.materialInjector.texture,
        uSeed: this.randomPos,
        uRandomMap: this.randomMap,
        uRandomMapSize: [
          this.randomMap!.getWidth(),
          this.randomMap!.getHeight(),
        ],
        uScreenSize: [
          this.rayBuffer!.getWidth(),
          this.rayBuffer!.getHeight(),
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
      geometry: LIGHT_QUAD,
      shader: this.getDisplayShader(),
      uniforms: {
        uBuffer: this.rayBuffer,
      },
      state: {
        depth: false,
      },
    });
  }

}
