import {vec3} from 'gl-matrix';

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
import {POINT_LIGHT} from './shader/light';
import {GLTexture} from './gl/GLTexture';
import {ShaderBank} from './ShaderBank';

export interface BasicMaterialOptions {
  albedo: string | Float32Array | number[] | GLTexture;
  metalic: number | GLTexture;
  roughness: number | GLTexture;
}

const ALBEDO_BIT = 1;
const METALIC_BIT = 2;
const ROUGHNESS_BIT = 3;

const SHADER_BANK = new ShaderBank(
  (textureBits: number, numLights: number) => `${textureBits}/${numLights}`,
  (textureBits, numLights) => new GLShader(/* glsl */`
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

    #define NUM_POINT_LIGHTS ${numLights}
    ${textureBits & ALBEDO_BIT ? '#define USE_ALBEDO_MAP' : ''}
    ${textureBits & METALIC_BIT ? '#define USE_METALIC_MAP' : ''}
    ${textureBits & ROUGHNESS_BIT ? '#define USE_ROUGHNESS_MAP' : ''}

    #define GAMMA 2.2
    #define PI 3.14159

    struct Material {
      vec3 albedo;
      float metalic;
      float roughness;
    };

    ${POINT_LIGHT}
    ${PBR}

    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec2 vTexCoord;

    uniform mat4 uView;
    uniform PointLight uPointLights[NUM_POINT_LIGHTS];
    uniform Material uMaterial;
    #ifdef USE_ALBEDO_MAP
    uniform sampler2D uAlbedoMap;
    #endif

    void main() {
      vec3 V = normalize(-vPosition);
      vec3 N = normalize(vNormal);

      vec3 materialAlbedo;
      #ifdef USE_ALBEDO_MAP
        materialAlbedo = texture2D(uAlbedoMap, vTexCoord).rgb;
      #else
        materialAlbedo = uMaterial.albedo;
      #endif

      vec3 linearAlbedo = pow(materialAlbedo, vec3(GAMMA));
      vec3 albedo = mix(linearAlbedo, vec3(0.0), uMaterial.metalic);
      vec3 reflection = mix(vec3(0.04), linearAlbedo, uMaterial.metalic);

      vec3 result = vec3(0.0, 0.0, 0.0);

      for (int i = 0; i < NUM_POINT_LIGHTS; i += 1) {
        PointLight light = uPointLights[i];

        vec3 L = light.position - vPosition;
        float lightDist = length(L);
        L = L / lightDist;

        vec3 radiance = calcPoint(L, V, N, light, lightDist);
        vec3 brdf = brdfCookTorr(L, V, N, uMaterial.roughness, albedo, reflection);

        result += radiance * brdf;
      }

      gl_FragColor = vec4(pow(result, vec3(1.0 / GAMMA)), 1.0);
    } 
  `),
);

export class BasicMaterial implements Material {
  id: number;
  options: BasicMaterialOptions;
  frameId = 0;
  lights: unknown[] = [];
  constructor(options: BasicMaterialOptions) {
    this.id = createId();
    this.options = options;
  }

  _prepare(renderer: Renderer): void {
    // Collect all lights in the world
    const {entityStore, camera, frameId} = renderer;
    const cameraData = camera!.get<Camera>('camera')!;
    this.frameId = frameId;
    this.lights = [];
    // Bake the lights...
    entityStore.forEachWith(['light', 'transform'], (entity) => {
      const transform = entity.get<Transform>('transform')!;
      const light = entity.get<Light>('light')!;
      const lightOptions = light.options;
      const posVec = vec3.create();
      vec3.transformMat4(
        posVec,
        transform.getPosition(),
        cameraData.getView(camera!),
      );
      this.lights.push({
        position: posVec,
        color: lightOptions.color,
        intensity: [
          lightOptions.power,
          lightOptions.attenuation,
        ],
      });
    });
  }

  render(chunk: EntityChunk, geometry: GLGeometry, renderer: Renderer): void {
    const {options} = this;
    const {glRenderer, entityStore, camera, frameId} = renderer;
    if (frameId !== this.frameId) {
      this._prepare(renderer);
    }

    // Prepare shader uniforms
    const transformComp =
      entityStore.getComponent<TransformComponent>('transform')!;
    const cameraData = camera!.get<Camera>('camera')!;
    const uniformOptions: {[key: string]: any;} = {
      uView: cameraData.getView(camera!),
      uProjection: cameraData.getProjection(renderer.getAspectRatio()),
      uPointLights: this.lights,
      uMaterial: options,
    };

    // Retrieve shader feature bits
    let featureBits = 0;
    if (options.albedo instanceof GLTexture) {
      featureBits |= ALBEDO_BIT;
      uniformOptions.uAlbedoMap = options.albedo;
    }

    const shader = SHADER_BANK.get(featureBits, this.lights.length);

    // Bind the shaders
    shader.bind(glRenderer);
    geometry.bind(glRenderer, shader);

    // Set uniforms and issue draw call
    shader.setUniforms(uniformOptions);
    chunk.forEach((entity) => {
      const transform = entity.get(transformComp);
      if (transform == null) {
        return;
      }
      // Set uniforms and draw the element
      shader.setUniforms({
        uModel: transform.getMatrix(),
      });
      geometry.draw();
    });
  }

  dispose(): void {
    SHADER_BANK.dispose();
  }
}
