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
import {DIRECTIONAL_LIGHT, DIRECTIONAL_LIGHT_RAYTRACE, POINT_LIGHT, POINT_LIGHT_RAYTRACE} from '../shader/light';
import {MATERIAL_INFO} from '../shader/material';
import {PBR} from '../shader/pbr';
import {INTERSECTION, INTERSECTION_MESH, MATERIAL_INJECTOR} from '../shader/raytrace/intersect';
import {RAYTRACE_STEP} from '../shader/raytrace/step';
import {RAYTRACE_PBR} from '../shader/raytrace/pbr';
import {SAMPLE} from '../shader/sample';
import {FILMIC} from '../shader/tonemap';
import {LightTexture} from '../raytrace/LightTexture';
import {LIGHT_MAP} from '../shader/raytrace/lightMap';

import {Pipeline, PipelineShaderBlock} from './Pipeline';

const LIGHT_QUAD = new GLGeometry(quad());
const TARGET_DELTA_TIME = 1 / 50;

export class RaytracedPipeline implements Pipeline {
  renderer: Renderer;
  worldBVH: WorldBVH;
  bvhTexture: BVHTexture;
  lightTexture: LightTexture;
  materialInjector: MaterialInjector;
  rayBuffer: GLTexture2D | null = null;
  rayFrameBuffer: GLFrameBuffer | null = null;
  rayTilePos = 0;
  rayTileFrame = 1;
  rayTileBuffer: GLArrayBuffer = new GLArrayBuffer(undefined, 'stream');
  numPasses = 0;
  prevPassTime = 0;
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
    this.lightTexture = new LightTexture(renderer.entityStore);
  }

  dispose(): void {
    this.bvhTexture.dispose();
    this.materialInjector.dispose();
    this.lightTexture.dispose();
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
          ${DIRECTIONAL_LIGHT}
          ${DIRECTIONAL_LIGHT_RAYTRACE}
          ${LIGHT_MAP}
          ${MATERIAL_INJECTOR}
          ${INTERSECTION_MESH}
          ${RAYTRACE_PBR}
          ${RAYTRACE_STEP}

          varying vec2 vPosition;

          uniform mat4 uInverseView;
          uniform mat4 uInverseProjection;
          uniform sampler2D uBVHMap;
          uniform vec2 uBVHMapSize;
          uniform sampler2D uAtlasMap;
          uniform sampler2D uLightMap;
          uniform vec3 uLightMapSize;
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

            RaytraceContext context;
            initRaytraceContext(
              context,
              normalize((viewFarPos - viewNearPos).xyz),
              viewNearPos.xyz
            );
            MaterialInfo mInfo;

            const int NUM_SAMPLES = 4;
            for (int i = 0; i < NUM_SAMPLES; i += 1) {
              bool isIntersecting = intersectMesh(mInfo, context.origin, context.dir, uBVHMap, uAtlasMap, uBVHMapSize, 0);
              if (!isIntersecting) {
                break;
              }
              raytraceStep(context, mInfo, i, i == NUM_SAMPLES - 1, uRandomMap, uBVHMap, uAtlasMap, uBVHMapSize, 0, uLightMap, uLightMapSize);
              if (context.abort) {
                break;
              }
            }
            float threshold = 1000.0;
            if (all(lessThan(context.li, vec3(threshold)))) {
              gl_FragColor = vec4(context.li, 1.0);
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

  shouldForceRender(): boolean {
    return true;
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
      this.lightTexture.update();

      // Invalidate / clear the framebuffer
      glRenderer.clear(this.rayFrameBuffer!);

      this.worldVersion = entityStore.version;
      this.rayTilePos = 0;
      this.prevPassTime = performance.now();

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
      console.log(`Pass took ${performance.now() - this.prevPassTime}ms`);
      this.prevPassTime = performance.now();
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
        uLightMap: this.lightTexture.lightTexture,
        uLightMapSize: [
          this.lightTexture.lightTexture.getWidth(),
          this.lightTexture.lightTexture.getHeight(),
          this.lightTexture.numLights,
        ],
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
