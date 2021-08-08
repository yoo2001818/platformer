import {Camera} from '../3d/Camera';
import {Transform} from '../3d/Transform';
import {TransformComponent} from '../3d/TransformComponent';
import {EntityChunk} from '../core/EntityChunk';

import {GLGeometry} from './gl/GLGeometry';
import {GLShader} from './gl/GLShader';
import {Material} from './Material';
import {Renderer} from './Renderer';
import {Light} from './Light';
import {createId} from './utils/createId';
import {PBR} from './shader/pbr';

export class BasicMaterial implements Material {
  id: number;
  shader: GLShader;
  frameId = 0;
  lights: unknown[] = [];
  constructor() {
    this.id = createId();
    this.shader = new GLShader(/* glsl */`
      #version 100
      precision highp float;

      attribute vec3 aPosition;
      attribute vec3 aNormal;
      attribute vec2 aTexCoord;
      attribute vec3 aInstanced;

      uniform mat4 uView;
      uniform mat4 uProjection;
      uniform mat4 uModel;

      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec2 vTexCoord;

      void main() {
        vec4 pos = uView * uModel * vec4(aPosition + aInstanced, 1.0);
        gl_Position = uProjection * pos;
        vPosition = pos.xyz;
        // TODO Normal 3x3 matrix
        vNormal = (uView * uModel * vec4(aNormal, 0.0)).xyz;
        vTexCoord = aTexCoord;
      } 
    `, /* glsl */`
      #version 100
      precision highp float;

      #define NUM_POINT_LIGHTS 1
      #define GAMMA 2.2
      #define PI 3.14159

      struct Material {
        vec3 albedo;
        float metalic;
        float roughness;
      };

      struct PointLight {
        vec3 position;
        vec3 color;
        vec4 intensity;
      };

      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec2 vTexCoord;

      uniform mat4 uView;
      uniform PointLight uPointLights[NUM_POINT_LIGHTS];
      uniform Material uMaterial;

      vec3 gNormal;
      vec3 gFragPos;
      vec3 gAlbedo;
      vec3 gReflection;

      ${PBR}

      vec3 calcPoint(PointLight light, vec3 V) {
        vec3 lightPos = (uView * vec4(light.position, 1.0)).xyz;
        vec3 L = lightPos - gFragPos;
        vec3 N = gNormal;

        float distance = length(L);
        L = L / distance;

        // Attenuation
        float attenuation = 1.0 / ( 1.0 +
          light.intensity.w * (distance * distance));

        float dotNL = max(dot(N, L), 0.0);

        vec3 brdf = brdfCookTorr(L, V, N, uMaterial.roughness, gAlbedo, gReflection);

        // return vec3(pow(1.0 - dotNL, 5.0));
        return brdf * light.color * attenuation * dotNL;
      }

      void main() {
        gFragPos = vPosition;
        vec3 viewDir = normalize(-vPosition);
        gNormal = normalize(vNormal);

        vec3 linearAlbedo = pow(uMaterial.albedo, vec3(GAMMA));
        gAlbedo = mix(linearAlbedo, vec3(0.0), uMaterial.metalic);
        gReflection = mix(vec3(0.04), linearAlbedo, uMaterial.metalic);

        vec3 result = vec3(0.0, 0.0, 0.0);

        for (int i = 0; i < NUM_POINT_LIGHTS; i += 1) {
          result += calcPoint(uPointLights[i], viewDir);
        }

        gl_FragColor = vec4(pow(result, vec3(1.0 / GAMMA)), 1.0);
      } 
    `);
  }

  _prepare(renderer: Renderer): void {
    // Collect all lights in the world
    const {entityStore, frameId} = renderer;
    this.frameId = frameId;
    this.lights = [];
    // Bake the lights...
    entityStore.forEachWith(['light', 'transform'], (entity) => {
      const transform = entity.get<Transform>('transform')!;
      const light = entity.get<Light>('light')!;
      const lightOptions = light.options;
      this.lights.push({
        position: transform.getPosition(),
        color: lightOptions.color,
        intensity: [
          lightOptions.ambient,
          lightOptions.diffuse,
          lightOptions.specular,
          lightOptions.attenuation,
        ],
      });
    });
  }

  render(chunk: EntityChunk, geometry: GLGeometry, renderer: Renderer): void {
    const {glRenderer, entityStore, camera, frameId} = renderer;
    if (frameId !== this.frameId) {
      this._prepare(renderer);
    }

    // Bind the shaders
    this.shader.bind(glRenderer);
    geometry.bind(glRenderer, this.shader);

    // Get the necessary components
    const transformComp =
      entityStore.getComponent<TransformComponent>('transform')!;
    const cameraData = camera!.get<Camera>('camera')!;
    const cameraTransform = camera!.get<Transform>(transformComp)!;
    this.shader.setUniforms({
      uView: cameraData.getView(cameraTransform),
      uProjection: cameraData.getProjection(renderer.getAspectRatio()),
      uPointLights: this.lights,
      uMaterial: {
        albedo: '#FFD229',
        metalic: 0,
        roughness: 0.01,
      },
    });
    chunk.forEach((entity) => {
      const transform = entity.get(transformComp);
      if (transform == null) {
        return;
      }
      // Set uniforms and draw the element
      this.shader.setUniforms({
        uModel: transform.getMatrix(),
      });
      geometry.draw();
    });
  }

  dispose(): void {
    this.shader.dispose();
  }
}
