import {Camera} from '../../3d/Camera';
import {Transform} from '../../3d/Transform';
import {Entity} from '../../core/Entity';
import {GLShader} from '../gl/GLShader';
import {DrawOptions} from '../gl/types';
import {Light, LightShaderBlock} from '../light/Light';
import {MeshComponent} from '../MeshComponent';
import {Renderer} from '../Renderer';
import {MATERIAL_INFO} from '../shader/material';
import {PBR} from '../shader/pbr';
import {FILMIC} from '../shader/tonemap';
import {MaterialVertexShaderBlock} from '../Material';
import {CONSTANT} from '../shader/constant';

import {Pipeline, PipelineShaderBlock} from './Pipeline';

interface LightConfig {
  type: string;
  size: number;
  shaderBlock: LightShaderBlock;
  uniforms: unknown;
}

export class ForwardPipeline implements Pipeline {
  renderer: Renderer;
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
      light.prepare(entities, this.renderer);
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
    return renderer.getResource(`${id}~${this.lightId}`, () => {
      const block = onCreate();
      return new GLShader(
        block.vert,
        /* glsl */`
          #version 100
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
          ${FILMIC}

          ${this.lights.map((light) => light.shaderBlock.header).join('\n')}

          ${block.frag}

          void main() {
            vec3 result = vec3(0.0);
            vec3 viewPos = uViewPos;

            MaterialInfo mInfo;
            material(mInfo);
            mInfo.depth = gl_FragCoord.z;

            ${this.lights.map((light) => light.shaderBlock.body).join('\n')}
            
            result = tonemap(result);
            gl_FragColor = vec4(result, 1.0);
          }
        `,
      );
    });
  }

  getForwardShader(id: string, onCreate: () => PipelineShaderBlock): GLShader {
    const {renderer} = this;
    return renderer.getResource(`forward~${id}`, () => {
      const block = onCreate();
      return new GLShader(
        block.vert,
        /* glsl */`
          ${block.frag}
          void main() {
            vec3 result = vec3(0.0);
            result = material();
            gl_FragColor = vec4(tonemap(result), 1.0);
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
      ...options,
      uniforms: {
        ...this.cameraUniforms,
        ...options.uniforms,
      },
    });
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

  render(): void {
    const {entityStore, glRenderer} = this.renderer;

    glRenderer.clear(null, undefined, [0, 0, 0, 1]);
    this._collectLights();
    this.cameraUniforms = this.getCameraUniforms();

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
          material.render(chunk, glGeometry, this.renderer);
        });
      }
    });

  }

}
