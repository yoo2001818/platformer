import {Camera} from '../../3d/Camera';
import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {quad} from '../../geom/quad';
import {GLFrameBuffer} from '../gl/GLFrameBuffer';
import {GLGeometry} from '../gl/GLGeometry';
import {GLShader} from '../gl/GLShader';
import {GLTexture2D, GLTexture2DOptions} from '../gl/GLTexture2D';
import {DrawOptions} from '../gl/types';
import {Light, LightPipelineShaderBlock, LightShaderBlock} from '../light/Light';
import {MeshComponent} from '../MeshComponent';
import {Renderer} from '../Renderer';
import {MATERIAL_INFO} from '../shader/material';
import {PBR} from '../shader/pbr';
import {FILMIC} from '../shader/tonemap';
import {FXAA} from '../shader/fxaa';
import {SSAO} from '../deferredEffect/SSAO';
import {DeferredEffect} from '../deferredEffect/DeferredEffect';
import {MaterialVertexShaderBlock} from '../Material';
import {GLRenderBuffer} from '../gl/GLRenderBuffer';
import {CONSTANT} from '../shader/constant';

import {Pipeline, PipelineShaderBlock} from './Pipeline';

interface FallbackLightConfig {
  type: string;
  size: number;
  shaderBlock: LightShaderBlock;
  uniforms: unknown;
}

interface LightGroup {
  type: string;
  light: Light;
  entities: Entity[];
}

const LIGHT_QUAD = new GLGeometry(quad());

export class DeferredPipeline implements Pipeline {
  renderer: Renderer;
  depthBuffer: GLTexture2D | null = null;
  stencilBuffer: GLRenderBuffer | null = null;
  gBuffers: GLTexture2D[] | null = null;
  outBuffer: GLTexture2D | null = null;
  outDepthBuffer: GLTexture2D | null = null;
  frameBuffer: GLFrameBuffer | null = null;
  outFrameBuffer: GLFrameBuffer | null = null;
  fallbackLights: FallbackLightConfig[] = [];
  fallbackLightUniforms: {[key: string]: unknown;} = {};
  lights: LightGroup[] = [];
  cameraUniforms: {[key: string]: unknown;} = {};
  ssao: SSAO;
  effects: DeferredEffect[] = [];
  fallbackLightId = '';

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.ssao = new SSAO(this);
  }

  dispose(): void {
    this.depthBuffer?.dispose();
    this.stencilBuffer?.dispose();
    this.gBuffers?.forEach((v) => v.dispose());
    this.outBuffer?.dispose();
    this.outDepthBuffer?.dispose();
    this.frameBuffer?.dispose();
    this.outFrameBuffer?.dispose();
    this.ssao.dispose();
  }

  _collectLights(): void {
    const {entityStore} = this.renderer;
    this.lights = [];
    this.fallbackLights = [];
    this.fallbackLightUniforms = {};

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
      light.prepare(entities, this.renderer);
      if (light.renderDeferred == null) {
        const uniforms = light.getUniforms(entities, this.renderer);
        this.fallbackLights.push({
          type,
          size: entities.length,
          shaderBlock: light.getShaderBlock(entities.length, this.renderer),
          uniforms,
        });
        Object.assign(this.fallbackLightUniforms, uniforms);
      } else {
        this.lights.push({
          type,
          light,
          entities,
        });
      }
    }

    this.fallbackLightId = this.fallbackLights
      .map((v) => `${v.type}/${v.size}`).join(',');
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

          ${CONSTANT}
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

  getForwardShader(id: string, onCreate: () => PipelineShaderBlock): GLShader {
    const {renderer} = this;
    return renderer.getResource(`deferred~${id}`, () => {
      const block = onCreate();
      return new GLShader(
        block.vert,
        /* glsl */`
          ${block.frag}
          void main() {
            vec3 result = vec3(0.0);
            result = material();
            gl_FragColor = vec4(result, 1.0);
          }
        `,
      );
    });
  }

  getLightShader(
    id: string,
    onCreate: () => LightPipelineShaderBlock,
  ): GLShader {
    const {renderer} = this;
    return renderer.getResource(`light~${id}`, () => {
      const block = onCreate();
      return new GLShader(
        block.vert,
        /* glsl */`
          #version 100
          precision highp float;

          ${CONSTANT}
          ${PBR}
          ${MATERIAL_INFO}

          varying vec2 vPosition;

          uniform mat4 uView;
          uniform mat4 uProjection;
          uniform mat4 uInverseView;
          uniform mat4 uInverseProjection;
          uniform vec3 uViewPos;
          uniform highp sampler2D uDepthBuffer;
          uniform sampler2D uGBuffer0;
          uniform sampler2D uGBuffer1;
          uniform sampler2D uAOBuffer;
          
          ${block.header}

          void main() {
            vec2 position = vPosition;
            ${block.noperspective ? `
              position *= gl_FragCoord.w;
            ` : ''}
            vec2 uv = position * 0.5 + 0.5;
            float depth = texture2D(uDepthBuffer, uv).x;
            vec4 values[GBUFFER_SIZE];
            values[0] = texture2D(uGBuffer0, uv);
            values[1] = texture2D(uGBuffer1, uv);
            float ao = texture2D(uAOBuffer, uv).x;

            MaterialInfo mInfo;
            unpackMaterialInfo(
              depth, values, position,
              uInverseProjection, uInverseView,
              mInfo
            );

            vec3 viewPos = uViewPos;

            vec3 result = vec3(0.0);

            ${block.body}

            result *= ao;

            gl_FragColor = vec4(result, 1.0);
          }
        `,
      );
    });
  }

  getFallbackLightShader(): GLShader {
    return this.getLightShader(this.fallbackLightId, () => ({
      vert: /* glsl */`
        #version 100
        precision highp float;

        attribute vec3 aPosition;

        varying vec2 vPosition;

        void main() {
          vPosition = aPosition.xy;
          gl_Position = vec4(aPosition.xy, 1.0, 1.0);
        }
      `,
      header: this.fallbackLights
        .map((light) => light.shaderBlock.header).join('\n'),
      body: this.fallbackLights
        .map((light) => light.shaderBlock.body).join('\n'),
    }));
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
          #ifndef WEBGL2
          #extension GL_EXT_frag_depth : enable
          #endif
          precision highp float;

          ${FXAA}
          ${FILMIC}

          varying vec2 vPosition;

          uniform sampler2D uBuffer;
          uniform sampler2D uDepthBuffer;
          uniform vec2 uResolution;
          
          void main() {
            vec2 uv = vPosition * 0.5 + 0.5;
            gl_FragColor = vec4(tonemap(fxaa(uBuffer, uv, uResolution).xyz), 1.0);
            // gl_FragColor = vec4(tonemap(texture2D(uBuffer, uv).xyz), 1.0);
            #ifdef WEBGL2
            gl_FragDepth = texture2D(uDepthBuffer, uv).x;
            #elif defined(GL_EXT_frag_depth)
            gl_FragDepthEXT = texture2D(uDepthBuffer, uv).x;
            #endif
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

  drawDeferred(options: DrawOptions): void {
    const {renderer: {glRenderer}} = this;
    glRenderer.draw({
      frameBuffer: this.frameBuffer!,
      ...options,
      uniforms: {
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

  drawLight(options: DrawOptions): void {
    const {renderer: {glRenderer}} = this;
    glRenderer.draw({
      frameBuffer: this.outFrameBuffer!,
      ...options,
      uniforms: {
        ...this.cameraUniforms,
        ...options.uniforms,
        uDepthBuffer: this.depthBuffer,
        uGBuffer0: this.gBuffers![0],
        uGBuffer1: this.gBuffers![1],
        uAOBuffer: this.ssao.aoOutBuffer!,
      },
      state: {
        blend: {
          equation: 'add',
          func: ['one', 'one'],
        },
        ...options.state ?? {},
      },
    });
  }

  addEffect(effect: DeferredEffect): void {
    this.effects.push(effect);
  }

  prepare(): void {
    const {glRenderer} = this.renderer;
    const {capabilities} = glRenderer;
    const width = glRenderer.getWidth();
    const height = glRenderer.getHeight();
    const defaultOpts: GLTexture2DOptions = {
      magFilter: 'nearest',
      minFilter: 'nearest',
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      mipmap: false,
      source: null,
    };
    if (this.depthBuffer == null) {
      this.depthBuffer = new GLTexture2D({
        ...defaultOpts,
        format: 'depthStencil',
        type: 'unsignedInt248',
        // type: capabilities.isWebGL2
        //   ? 'float32unsignedInt248rev'
        //   : 'unsignedInt248',
      });
    }
    this.depthBuffer.updateSize(width, height);
    if (this.gBuffers == null) {
      this.gBuffers = [
        new GLTexture2D({
          ...defaultOpts,
          format: 'rgba',
          type: 'unsignedByte',
        }),
        new GLTexture2D({
          ...defaultOpts,
          format: 'rgba',
          type: capabilities.isWebGL2 ? 'unsignedInt2101010' : 'unsignedByte',
        }),
      ];
    }
    this.gBuffers.forEach((v) => v.updateSize(width, height));
    if (this.outBuffer == null) {
      this.outBuffer = new GLTexture2D({
        ...defaultOpts,
        format: 'rgba',
        type: 'halfFloat',
      });
    }
    this.outBuffer.updateSize(width, height);
    if (this.outDepthBuffer == null) {
      this.outDepthBuffer = new GLTexture2D({
        ...defaultOpts,
        format: 'depthStencil',
        type: 'unsignedInt248',
        // type: capabilities.isWebGL2
        //   ? 'float32unsignedInt248rev'
        //   : 'unsignedInt248',
      });
    }
    this.outDepthBuffer.updateSize(width, height);
    if (this.frameBuffer == null) {
      this.frameBuffer = new GLFrameBuffer({
        depthStencil: this.depthBuffer!,
        color: this.gBuffers!,
      });
    }
    if (this.outFrameBuffer == null) {
      this.outFrameBuffer = new GLFrameBuffer({
        depthStencil: this.outDepthBuffer!,
        color: this.outBuffer!,
      });
    }
  }

  shouldForceRender(): boolean {
    return false;
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

  render(deltaTime?: number): void {
    const {entityStore, glRenderer} = this.renderer;
    const {gl} = glRenderer;

    this._collectLights();
    this.cameraUniforms = this.getCameraUniforms();

    this.prepare();
    this.ssao.prepare();
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

    // SSAO
    this.ssao.render();

    glRenderer.clear(this.outFrameBuffer);
    glRenderer.blit(
      this.frameBuffer!,
      this.outFrameBuffer!,
      gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT,
      'nearest',
    );

    // Render lights
    if (this.fallbackLights.length > 0) {
      this.drawLight({
        geometry: LIGHT_QUAD,
        shader: this.getFallbackLightShader(),
        uniforms: this.fallbackLightUniforms,
        state: {
          depthMask: false,
          cull: false,
          depth: 'greater',
        },
      });
    }
    this.lights.forEach((group) => {
      const {light, entities} = group;
      light.renderDeferred?.(entities, this.renderer, this);
    });

    // Render deferred effect
    for (const effect of this.effects) {
      effect.render(deltaTime);
    }

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
    const width = glRenderer.getWidth();
    const height = glRenderer.getHeight();
    glRenderer.draw({
      geometry: LIGHT_QUAD,
      shader: this.getDisplayShader(),
      uniforms: {
        uBuffer: this.outBuffer,
        uDepthBuffer: this.outDepthBuffer,
        uResolution: [width, height],
      },
      state: {
        depth: 'always',
      },
    });
  }

}
