import {Camera} from '../../3d/Camera';
import {Transform} from '../../3d/Transform';
import {quad} from '../../geom/quad';
import {GLArrayBuffer} from '../gl/GLArrayBuffer';
import {GLFrameBuffer} from '../gl/GLFrameBuffer';
import {GLGeometry} from '../gl/GLGeometry';
import {GLShader} from '../gl/GLShader';
import {GLTexture2D, GLTexture2DOptions} from '../gl/GLTexture2D';
import {DrawOptions} from '../gl/types';
import {generateBlueNoiseMap} from '../map/generateBlueNoiseMap';
import {MaterialVertexShaderBlock} from '../Material';
import {MeshComponent} from '../MeshComponent';
import {BVHTexture} from '../raytrace/BVHTexture';
import {MaterialInjector} from '../raytrace/MaterialInjector';
import {WorldBVH} from '../raytrace/WorldBVH';
import {Renderer} from '../Renderer';
import {POINT_LIGHT, POINT_LIGHT_RAYTRACE} from '../shader/light';
import {MATERIAL_INFO} from '../shader/material';
import {PBR} from '../shader/pbr';
import {INTERSECTION, INTERSECTION_MESH, MATERIAL_INJECTOR} from '../shader/raytrace/intersect';
import {RTPBR} from '../shader/raytracepbr';
import {SAMPLE} from '../shader/sample';
import {FILMIC} from '../shader/tonemap';

import {Pipeline, PipelineShaderBlock} from './Pipeline';

const LIGHT_QUAD = new GLGeometry(quad());
const TARGET_DELTA_TIME = 1 / 50;

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
  numPasses = 0;
  tileWidth = 1;
  tileHeight = 1;
  randomPos: Float32Array = new Float32Array(2);
  randomMap: GLTexture2D | null = null;
  cameraUniforms: {[key: string]: unknown;} = {};
  worldVersion = -1;

  constructor(renderer: Renderer, worldBVH: WorldBVH) {
    this.renderer = renderer;
    this.worldBVH = worldBVH;
    this.materialInjector = new MaterialInjector(renderer);
    this.bvhTexture = new BVHTexture(
      worldBVH.entityStore,
      worldBVH,
      this.materialInjector,
    );
  }

  dispose(): void {
    this.bvhTexture.dispose();
    this.materialInjector.dispose();
    this.rayBuffer?.dispose();
    this.rayFrameBuffer?.dispose();
    this.rayTileBuffer.dispose();
    this.randomMap?.dispose();
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

          #define PI 3.141592

          ${INTERSECTION}
          ${PBR}
          ${SAMPLE}
          ${MATERIAL_INFO}
          ${POINT_LIGHT}
          ${POINT_LIGHT_RAYTRACE}
          ${MATERIAL_INJECTOR}
          ${INTERSECTION_MESH}
          ${RTPBR}

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

          void main() {
            randInit(uSeed + fract((vPosition.xy * 0.5 + 0.5) * uScreenSize / uRandomMapSize), uSeed);
            vec2 ndcPos = vPosition.xy + (1.0 / uScreenSize) * (randVec2(uRandomMap) * 2.0 - 1.0);
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
            light.position = vec3(-0.25, 4.7, -3.0);
            light.color = vec3(1.0);
            light.intensity = vec3(10.0 / PI, 0.2, 100.0);

            vec3 resultColor = vec3(0.0);
            vec3 attenuation = vec3(1.0);
            float weight = 1.0;
            float specularDisabled = 0.0;

            const int NUM_SAMPLES = 3;
            for (int i = 0; i < NUM_SAMPLES; i += 1) {
              bool isIntersecting = intersectMesh(mInfo, origin, dir, uBVHMap, uAtlasMap, uBVHMapSize, 0);
              if (!isIntersecting) {
                break;
              }
              vec3 prevOrigin = origin;
              origin = mInfo.position + mInfo.normal * 0.0001;
              // lighting 
              {
                vec3 lightingColor = vec3(0.0);
                vec3 L = shootPointLight(mInfo.position, light, randVec3(uRandomMap));
                float lightDist = length(L);
                L /= lightDist;
                // Check occulsion
                bool isLightIntersecting = intersectMeshOcclude(origin, L, lightDist, uBVHMap, uBVHMapSize, 0);
                if (!isLightIntersecting) {
                  vec3 L;
                  vec3 V = -dir;
                  vec3 N = mInfo.normal;
                  vec3 radiance = calcPointLight(L, V, N, mInfo.position, light);
                  if (specularDisabled > 0.5) {
                    float dotNL = max(dot(N, L), 0.0);
                    vec3 diffuseColor = mix(mInfo.albedo, vec3(0.0), mInfo.metalic);
                    lightingColor += diffuseColor * dotNL * radiance / PI;
                  } else {
                    lightingColor += calcBRDF(L, V, N, mInfo) * radiance;
                  }
                  resultColor += lightingColor * attenuation;
                }
              }
              if (i < NUM_SAMPLES - 1) {
                vec3 N = mInfo.normal;
                vec3 V = -dir;
                vec3 L;
                vec3 diffuseColor = mix(mInfo.albedo, vec3(0.0), mInfo.metalic);
                vec3 specColor = mix(vec3(0.04), mInfo.albedo, mInfo.metalic);
                // determine if we should use diffuse or not
                float probDiffuse = mix(probabilityToSampleDiffuse(diffuseColor, specColor), 1.0, specularDisabled);
                if (probDiffuse > randFloat(uRandomMap)) {
                  // diffuse
                  L = normalize(mInfo.normal + sampleSphere(randVec3(uRandomMap)));
                  attenuation *= diffuseColor / probDiffuse;
                  specularDisabled = 1.0;
                } else {
                  // specular
                  float roughness = max(mInfo.roughness * mInfo.roughness, 0.0001);

                  vec3 H = importanceSampleGGX(randVec2(uRandomMap), mInfo.normal, roughness);
                  L = reflect(dir, H);

                  float dotNL = max(dot(N, L), 0.0);
                  float dotNV = max(dot(N, V), 0.0);

                  float dotNH = max(dot(N, H), 0.0);
                  float dotHV = max(dot(H, V), 0.0);

                  float D = distributionGGX(dotNH, roughness);
                  vec3 F = fresnelSchlick(dotHV, specColor);
                  float G = geometrySmith(roughness, dotNV, dotNL);

                  vec3 spec = specCookTorr(D, F, G, dotNL, dotNV);

                  float specPdf = pdfDistributionGGX(
                    dotNH,
                    max(dot(H, L), 0.0),
                    roughness
                  );
                  
                  float pdf = specPdf * (1.0 - probDiffuse);
                  attenuation *= dotNL * spec / max(pdf, 0.001);
                  // specularDisabled = 1.0;
                }
                dir = L;
                // russian roulette
                if (i >= 2) {
                  float q = 1.0 - luminance(attenuation);
                  if (randFloat(uRandomMap) < q) {
                    break;
                  }
                  attenuation /= 1.0 - q;
                }
              }
            }
            float threshold = 100.0;
            if (all(lessThan(resultColor, vec3(threshold)))) {
              gl_FragColor = vec4(resultColor, 1.0);
            } else {
              gl_FragColor = vec4(0.0);
            }
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

  getCameraUniforms(): {[key: string]: unknown;} {
    const {camera} = this.renderer;

    if (camera == null) {
      throw new Error('Camera is not specified');
    }

    const cameraData = camera!.get<Camera>('camera')!;

    const aspect = this.renderer.getAspectRatio();
    return {
      uInverseView: cameraData.getInverseView(camera!),
      uInverseProjection: cameraData.getInverseProjection(aspect),
      uView: cameraData.getView(camera!),
      uProjection: cameraData.getProjection(aspect),
      uViewPos: camera!.get<Transform>('transform')!.getPosition(),
    };
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
        color: this.rayBuffer!,
      });
    }
    if (this.randomMap == null) {
      this.randomMap = generateBlueNoiseMap();
      // this.refreshRandomMap();
    }
  }

  render(deltaTime?: number): void {
    const {entityStore, glRenderer} = this.renderer;

    this.cameraUniforms = this.getCameraUniforms();

    this.prepare();

    const shouldRefresh = entityStore.version !== this.worldVersion;
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

      this.worldVersion = entityStore.version;
      this.rayTilePos = 0;

      this.randomPos[0] = Math.random();
      this.randomPos[1] = Math.random();
    }
    this.materialInjector.updateTexture();
    if (!this.materialInjector.isReady()) {
      return;
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
    this.numPasses = nextScanId;
    if (prevScanId !== nextScanId) {
      this.randomPos[0] =
        Math.floor(Math.random() * randomMapWidth) / randomMapWidth;
      this.randomPos[1] =
        Math.floor(Math.random() * randomMapHeight) / randomMapHeight;
      this.refreshRandomMap();
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
        uRandomMapSize: [randomMapWidth, randomMapHeight],
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

  renderVertex(
    onGetShader: (
      id: string,
      onCreate: (defines?: string) => MaterialVertexShaderBlock,
    ) => GLShader,
    onDraw: (options: DrawOptions) => void,
  ): void {
    const {entityStore} = this.renderer;
    const meshComp = entityStore.getComponent<MeshComponent>('mesh');
    entityStore.forEachChunkWith([meshComp], (chunk) => {
      const mesh = meshComp.getChunk(chunk, 0);
      if (mesh != null) {
        mesh.geometries.forEach((geometry, index) => {
          const materialIndex = Math.min(mesh.materials.length - 1, index);
          const material = mesh.materials[materialIndex];
          if (material == null) {
            throw new Error('Geometry is null');
          }
          const glGeometry = geometry.getGLGeometry(this.renderer);
          material.renderVertex?.(
            chunk,
            glGeometry,
            this.renderer,
            onGetShader,
            onDraw,
          );
        });
      }
    });
  }
}
