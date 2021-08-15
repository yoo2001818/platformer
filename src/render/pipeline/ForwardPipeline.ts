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
      const uniforms = light.getUniforms(entities);
      this.lights.push({
        type,
        size: entities.length,
        shaderBlock: light.getShaderBlock(entities.length),
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

          ${PBR}
          ${MATERIAL_INFO}

          ${this.lights.map((light) => light.shaderBlock.header).join('\n')}

          ${block.frag}

          void main() {
            vec3 result = vec3(0.0);
            vec3 viewPos = uViewPos;

            MaterialInfo mInfo;
            material(mInfo);

            ${this.lights.map((light) => light.shaderBlock.body).join('\n')}
            
            // tone mapping
            result = result / (result + 1.0);
            gl_FragColor = vec4(pow(result, vec3(1.0 / 2.2)), 1.0);
          }
        `,
      );
    });
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

  render(): void {
    const {entityStore, camera} = this.renderer;

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
