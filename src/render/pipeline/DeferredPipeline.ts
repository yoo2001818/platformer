import {Camera} from '../../3d/Camera';
import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {quad} from '../../geom/quad';
import {GLFrameBuffer} from '../gl/GLFrameBuffer';
import {GLGeometry} from '../gl/GLGeometry';
import {GLShader} from '../gl/GLShader';
import {GLTexture2D} from '../gl/GLTexture2D';
import {DrawOptions} from '../gl/types';
import {Light, LightShaderBlock} from '../light/Light';
import {MeshComponent} from '../MeshComponent';
import {Renderer} from '../Renderer';
import {MATERIAL_INFO} from '../shader/material';
import {PBR} from '../shader/pbr';
import {FILMIC} from '../shader/tonemap';

import {Pipeline, PipelineShaderBlock} from './Pipeline';

interface LightConfig {
  type: string;
  size: number;
  shaderBlock: LightShaderBlock;
  uniforms: unknown;
}

const LIGHT_QUAD = new GLGeometry(quad());

export class DeferredPipeline implements Pipeline {
  renderer: Renderer;
  depthBuffer: GLTexture2D | null = null;
  gBuffers: GLTexture2D[] | null = null;
  outBuffer: GLTexture2D | null = null;
  frameBuffer: GLFrameBuffer | null = null;
  outPreFrameBuffer: GLFrameBuffer | null = null;
  outFrameBuffer: GLFrameBuffer | null = null;
  lights: LightConfig[] = [];
  lightUniforms: {[key: string]: unknown;} = {};
  cameraUniforms: {[key: string]: unknown;} = {};
  lightId = '';

  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }

  dispose(): void {

  }

  _collectLights(): void {
    const {entityStore} = this.renderer;
    this.lights = [];
    this.lightUniforms = {};

    const lightMap: Map<string, Entity[]> = new Map();

    // First, collect all lights groupped with their type
    entityStore.forEachWith(['light', 'transform'], (entity) => {
      const light = entity.get<Light>('light')!;

      let lightArr = lightMap.get(light.type);
      if (lightArr == null) {
        lightArr = [];
        lightMap.set(light.type, lightArr);
      }
      lightArr.push(entity);
    });

    for (const [type, entities] of lightMap.entries()) {
      const light = entities[0].get<Light>('light')!;
      const uniforms = light.getUniforms(entities, this.renderer);
      this.lights.push({
        type,
        size: entities.length,
        shaderBlock: light.getShaderBlock(entities.length, this.renderer),
        uniforms,
      });
      Object.assign(this.lightUniforms, uniforms);
    }

    this.lightId = this.lights.map((v) => `${v.type}/${v.size}`).join(',');
  }

  getDeferredShader(id: string, onCreate: () => PipelineShaderBlock): GLShader {
    const {renderer} = this;
    return renderer.getResource(`deferred~${id}`, () => {
      const block = onCreate();
      return new GLShader(
        block.vert,
        /* glsl */`
          #version 100
          #extension GL_EXT_draw_buffers : require
          precision highp float;

          uniform mat4 uView;
          uniform mat4 uProjection;
          uniform mat4 uModel;
          uniform mat4 uInverseView;
          uniform mat4 uInverseProjection;
          uniform vec3 uViewPos;

          ${PBR}
          ${MATERIAL_INFO}

          ${block.frag}

          #ifdef WEBGL2
          layout(location = 1) out vec4 glFragData1;
          #endif

          void main() {
            vec3 result = vec3(0.0);
            vec3 viewPos = uViewPos;

            MaterialInfo mInfo;
            material(mInfo);

            vec4 vecOut[2];
            packMaterialInfo(mInfo, vecOut);

            #ifdef WEBGL2
              gl_FragColor = vecOut[0];
              glFragData1 = vecOut[1];
            #else
              gl_FragData[0] = vecOut[0];
              gl_FragData[1] = vecOut[1];
            #endif
          }
        `,
      );
    });
  }

  getLightShader(): GLShader {
    const {renderer} = this;
    return renderer.getResource(`light~${this.lightId}`, () => {
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

          ${PBR}
          ${MATERIAL_INFO}
          ${FILMIC}

          varying vec2 vPosition;

          uniform mat4 uView;
          uniform mat4 uProjection;
          uniform mat4 uModel;
          uniform mat4 uInverseView;
          uniform mat4 uInverseProjection;
          uniform vec3 uViewPos;
          uniform sampler2D uDepthBuffer;
          uniform sampler2D uGBuffer0;
          uniform sampler2D uGBuffer1;
          
          ${this.lights.map((light) => light.shaderBlock.header).join('\n')}

          #line 5000
          void main() {
            vec2 uv = vPosition * 0.5 + 0.5;
            float depth = texture2D(uDepthBuffer, uv).x;
            vec4 values[GBUFFER_SIZE];
            values[0] = texture2D(uGBuffer0, uv);
            values[1] = texture2D(uGBuffer1, uv);

            MaterialInfo mInfo;
            unpackMaterialInfo(
              depth, values, vPosition,
              uInverseProjection, uInverseView,
              mInfo
            );

            vec3 viewPos = uViewPos;

            vec3 result = vec3(0.0);

            ${this.lights.map((light) => light.shaderBlock.body).join('\n')}
            
            result = tonemap(result);

            gl_FragColor = vec4(result, 1.0);
          }
        `,
      );
    });
  }

  getDisplayShader(): GLShader {
    const {renderer} = this;
    return renderer.getResource(`display~deferred`, () => {
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

          varying vec2 vPosition;

          uniform sampler2D uBuffer;
          
          void main() {
            vec2 uv = vPosition * 0.5 + 0.5;
            gl_FragColor = texture2D(uBuffer, uv);
          }
        `,
      );
    });
  }

  drawDeferred(options: DrawOptions): void {
    const {renderer: {glRenderer}} = this;
    glRenderer.draw({
      frameBuffer: this.frameBuffer!,
      ...options,
      uniforms: {
        ...this.lightUniforms,
        ...this.cameraUniforms,
        ...options.uniforms,
      },
    });
  }

  drawForward(options: DrawOptions): void {
    const {renderer: {glRenderer}} = this;
    glRenderer.draw({
      frameBuffer: this.outFrameBuffer!,
      ...options,
      uniforms: {
        ...this.cameraUniforms,
        ...options.uniforms,
      },
    });
  }

  prepare(): void {
    const {glRenderer} = this.renderer;
    const width = glRenderer.getWidth();
    const height = glRenderer.getHeight();
    if (this.depthBuffer == null) {
      this.depthBuffer = new GLTexture2D({
        width,
        height,
        format: 'depthStencil',
        type: 'unsignedInt248',
        magFilter: 'nearest',
        minFilter: 'nearest',
        wrapS: 'clampToEdge',
        wrapT: 'clampToEdge',
        mipmap: false,
        source: null,
      });
    }
    if (this.gBuffers == null) {
      this.gBuffers = Array.from({length: 2}, () => new GLTexture2D({
        width,
        height,
        format: 'rgba',
        type: 'float',
        magFilter: 'nearest',
        minFilter: 'nearest',
        wrapS: 'clampToEdge',
        wrapT: 'clampToEdge',
        mipmap: false,
        source: null,
      }));
    }
    if (this.outBuffer == null) {
      this.outBuffer = new GLTexture2D({
        width,
        height,
        format: 'rgba',
        type: 'float',
        magFilter: 'nearest',
        minFilter: 'nearest',
        wrapS: 'clampToEdge',
        wrapT: 'clampToEdge',
        mipmap: false,
        source: null,
      });
    }
    if (this.frameBuffer == null) {
      this.frameBuffer = new GLFrameBuffer({
        width,
        height,
        depthStencil: this.depthBuffer!,
        color: this.gBuffers!,
      });
    }
    if (this.outPreFrameBuffer == null) {
      this.outPreFrameBuffer = new GLFrameBuffer({
        width,
        height,
        color: this.outBuffer!,
      });
    }
    if (this.outFrameBuffer == null) {
      this.outFrameBuffer = new GLFrameBuffer({
        width,
        height,
        depthStencil: this.depthBuffer!,
        color: this.outBuffer!,
      });
    }
  }

  render(): void {
    const {entityStore, camera, glRenderer} = this.renderer;

    if (camera == null) {
      throw new Error('Camera is not specified');
    }

    const cameraData = camera!.get<Camera>('camera')!;

    this._collectLights();
    const aspect = this.renderer.getAspectRatio();
    this.cameraUniforms = {
      uInverseView: cameraData.getInverseView(camera!),
      uInverseProjection: cameraData.getInverseProjection(aspect),
      uView: cameraData.getView(camera!),
      uProjection: cameraData.getProjection(aspect),
      uViewPos: camera!.get<Transform>('transform')!.getPosition(),
    };

    this.prepare();
    glRenderer.clear(this.frameBuffer);

    // Render to G-buffer
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
          if (material.mode === 'deferred') {
            material.render(chunk, glGeometry, this.renderer);
          }
        });
      }
    });

    glRenderer.clear(this.outPreFrameBuffer);

    // Render lights
    glRenderer.draw({
      frameBuffer: this.outPreFrameBuffer,
      geometry: LIGHT_QUAD,
      shader: this.getLightShader(),
      uniforms: {
        ...this.cameraUniforms,
        ...this.lightUniforms,
        uDepthBuffer: this.depthBuffer,
        uGBuffer0: this.gBuffers![0],
        uGBuffer1: this.gBuffers![1],
      },
    });

    // Render forward
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
          if (material.mode === 'forward') {
            material.render(chunk, glGeometry, this.renderer);
          }
        });
      }
    });

    // Spit everything to screen
    glRenderer.draw({
      geometry: LIGHT_QUAD,
      shader: this.getDisplayShader(),
      uniforms: {
        uBuffer: this.outBuffer,
      },
    });

  }

}