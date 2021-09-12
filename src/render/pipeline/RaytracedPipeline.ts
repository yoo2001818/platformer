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
import {WorldBVH} from '../raytrace/WorldBVH';
import {Renderer} from '../Renderer';
import {INTERSECTION} from '../shader/raytrace';
import {FILMIC} from '../shader/tonemap';
import {ShadowPipeline} from '../shadow/ShadowPipeline';

import {Pipeline, PipelineShaderBlock} from './Pipeline';

const LIGHT_QUAD = new GLGeometry(quad());
const TARGET_DELTA_TIME = 1 / 60;

export class RaytracedPipeline implements Pipeline {
  renderer: Renderer;
  worldBVH: WorldBVH;
  bvhTexture: BVHTexture;
  rayBuffer: GLTexture2D | null = null;
  rayFrameBuffer: GLFrameBuffer | null = null;
  rayTilePos = 0;
  rayTileFrame = 1;
  rayTileBuffer: GLArrayBuffer = new GLArrayBuffer(undefined, 'stream');
  tileWidth = 1;
  tileHeight = 1;
  randomMap: GLTexture2D | null = null;
  cameraUniforms: {[key: string]: unknown;} = {};
  worldVersion = -1;

  constructor(renderer: Renderer, worldBVH: WorldBVH) {
    this.renderer = renderer;
    this.worldBVH = worldBVH;
    this.bvhTexture = new BVHTexture(worldBVH.entityStore, worldBVH);
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

          varying vec2 vTilePosition;
          varying vec2 vPosition;
          uniform vec2 uScreenSize;
          uniform vec2 uRandomMapSize;

          void main() {
            vPosition = aPosition.xy * aScreenOffset.xy + aScreenOffset.zw;
            vTilePosition = fract((vPosition.xy * 0.5 + 0.5) * uScreenSize / uRandomMapSize);
            gl_Position = vec4(vPosition, 1.0, 1.0);
          }
        `,
        /* glsl */`
          #version 100
          precision highp float;
          precision highp sampler2D;

          ${INTERSECTION}
          #define PI 3.141592

          varying vec2 vTilePosition;
          varying vec2 vPosition;

          uniform mat4 uInverseView;
          uniform mat4 uInverseProjection;
          uniform sampler2D uBVHMap;
          uniform vec2 uBVHMapSize;
          uniform sampler2D uRandomMap;
          uniform vec2 uSeed;
          uniform vec2 uScreenSize;

          float vTilePos = 0.0;
          float rand(){
            float currentPos = vTilePos;
            vTilePos += 0.1;
            return texture2D(uRandomMap, uSeed + vTilePosition + vec2(currentPos, 0.0)).r;
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

          void main() {
            vec2 ndcPos = vPosition.xy + (1.0 / uScreenSize) * (vec2(rand(), rand()) * 2.0 - 1.0);
            vec4 viewPos = uInverseProjection * vec4(ndcPos, 1.0, 1.0);
            viewPos /= viewPos.w;
            vec3 resultColor = vec3(0.0);
            float contribution = 1.0;

            vec3 dir = (uInverseView * vec4(normalize(viewPos.xyz), 0.0)).xyz;
            vec3 origin = uInverseView[3].xyz;
            BVHIntersectResult bvhResult;
            for (int i = 0; i < 4; i += 1) {
              bool isIntersecting = intersectBVH(
                bvhResult,
                uBVHMap,
                uBVHMapSize, 1.0 / uBVHMapSize,
                0,
                origin,
                dir
              );
              if (isIntersecting) {
                BVHBLASLeaf blas;
                bvhBLASFetch(blas, bvhResult.faceAddr, uBVHMap, uBVHMapSize, 1.0 / uBVHMapSize);
                vec3 normal = vec3(0.0);
                normal += blas.normal[0] * bvhResult.barycentric.x;
                normal += blas.normal[1] * bvhResult.barycentric.y;
                normal += blas.normal[2] * bvhResult.barycentric.z;
                normal = normalize((bvhResult.matrix * vec4(normal, 0.0)).xyz);
                vec3 color = vec3(1.0);
                if (bvhResult.childId == 2.0) {
                  color = vec3(1.0, 0.0, 0.0);
                } else if (bvhResult.childId == 1.0) {
                  color = vec3(0.0, 1.0, 0.0);
                } else if (bvhResult.childId == 5.0) {
                  color = vec3(0.0, 0.0, 1.0);
                }
                // lighting
                float lightIntensity = 0.0;
                origin = bvhResult.position + normal * 0.01;
                {
                  vec3 L = vec3(0.0, 1.0, 0.0) - origin;
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
                    lightIntensity += max(dot(normal, L), 0.0);
                  }
                }
                resultColor += lightIntensity * contribution * color;
                mat3 basis = orthonormalBasis(-normal);
                dir = basis *
                  sign(dot(normal, dir)) *
                  cosineSampleHemisphere(vec2(
                    rand(),
                    rand()
                  ));

                contribution *= max(dot(normal, dir), 0.0);
              }
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
      format: 'luminance',
      type: 'unsignedByte',
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
    const buffer = new Uint8Array(tileWidth * tileHeight);
    for (let i = 0; i < tileWidth * tileHeight; i += 1) {
      buffer[i] = Math.random() * 255 | 0;
    }
    this.randomMap.setOptions({
      ...opts,
      source: buffer,
    });
  }

  prepare(): void {
    const {glRenderer} = this.renderer;
    const width = glRenderer.getWidth();
    const height = glRenderer.getHeight();
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
        type: 'halfFloat',
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
        uSeed: [Math.random(), Math.random()],
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
