import {TransformComponent} from '../../3d/TransformComponent';
import {EntityChunk} from '../../core/EntityChunk';
import {GLGeometry} from '../gl/GLGeometry';
import {Material} from '../Material';
import {Renderer} from '../Renderer';
import {createId} from '../utils/createId';
import {GLTexture} from '../gl/GLTexture';
import {PipelineShadowOptions} from '../pipeline/Pipeline';

export interface StandardMaterialOptions {
  albedo: string | Float32Array | number[] | GLTexture | null;
  metalic: number | GLTexture;
  roughness: number | GLTexture;
  normal?: GLTexture | null;
}

const ALBEDO_BIT = 1;
const METALIC_BIT = 2;
const ROUGHNESS_BIT = 4;
const NORMAL_BIT = 8;

export class StandardMaterial implements Material {
  id: number;
  mode: 'deferred' = 'deferred';
  options: StandardMaterialOptions;
  constructor(options: StandardMaterialOptions) {
    this.id = createId();
    this.options = options;
  }

  renderShadow(
    chunk: EntityChunk,
    geometry: GLGeometry,
    renderer: Renderer,
    options: PipelineShadowOptions,
  ): void {
    const {entityStore, pipeline} = renderer;
    const transformComp =
      entityStore.getComponent<TransformComponent>('transform')!;
    const shader = pipeline.getShadowShader('basic', () => ({
      vert: /* glsl */`
        #version 100
        precision highp float;

        attribute vec3 aPosition;
        attribute vec3 aNormal;
        attribute vec2 aTexCoord;

        uniform mat4 uView;
        uniform mat4 uProjection;
        uniform mat4 uModel;

        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vTexCoord;

        void main() {
          vec4 pos = uModel * vec4(aPosition, 1.0);
          gl_Position = uProjection * uView * pos;
          vPosition = pos.xyz;
          // TODO Normal 3x3 matrix
          vNormal = (uModel * vec4(aNormal, 0.0)).xyz;
          vTexCoord = aTexCoord;
        } 
      `,
    }));
    chunk.forEach((entity) => {
      const transform = entity.get(transformComp);
      if (transform == null) {
        return;
      }
      pipeline.drawShadow({
        ...options,
        shader,
        geometry,
        uniforms: {
          ...options.uniforms,
          uModel: transform.getMatrix(),
        },
      });
    });
  }

  render(chunk: EntityChunk, geometry: GLGeometry, renderer: Renderer): void {
    const {options} = this;
    const {pipeline, entityStore} = renderer;

    // Prepare shader uniforms
    const transformComp =
      entityStore.getComponent<TransformComponent>('transform')!;
    const uniformOptions: {[key: string]: any;} = {
      uMaterial: {...options},
    };

    // Retrieve shader feature bits
    let featureBits = 0;
    if (options.albedo instanceof GLTexture) {
      featureBits |= ALBEDO_BIT;
      uniformOptions.uAlbedoMap = options.albedo;
    }
    if (options.normal instanceof GLTexture) {
      featureBits |= NORMAL_BIT;
      uniformOptions.uNormalMap = options.normal;
    }
    if (options.roughness instanceof GLTexture) {
      featureBits |= ROUGHNESS_BIT;
      uniformOptions.uMaterial.roughness = 0;
      uniformOptions.uRoughnessMap = options.roughness;
    }
    if (options.metalic instanceof GLTexture) {
      featureBits |= METALIC_BIT;
      uniformOptions.uMaterial.metalic = 0;
      uniformOptions.uMetalicMap = options.metalic;
    }

    const shader = pipeline.getDeferredShader(`basic-${featureBits}`, () => ({
      vert: /* glsl */`
        ${featureBits & NORMAL_BIT ? '#define USE_NORMAL_MAP' : ''}
        #version 100
        precision highp float;

        attribute vec3 aPosition;
        attribute vec3 aNormal;
        attribute vec2 aTexCoord;
        #ifdef USE_NORMAL_MAP
        attribute vec4 aTangent;
        #endif

        uniform mat4 uView;
        uniform mat4 uProjection;
        uniform mat4 uModel;

        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vTexCoord;
        #ifdef USE_NORMAL_MAP
        varying vec4 vTangent;
        #endif

        void main() {
          vec4 pos = uModel * vec4(aPosition, 1.0);
          gl_Position = uProjection * uView * pos;
          vPosition = pos.xyz;
          // TODO Normal 3x3 matrix
          vNormal = (uModel * vec4(aNormal, 0.0)).xyz;
          vTexCoord = aTexCoord;
          #ifdef USE_NORMAL_MAP
          vTangent = vec4((uModel * vec4(aTangent.xyz, 0.0)).xyz, aTangent.w);
          #endif
        } 
      `,
      frag: /* glsl */`
        ${featureBits & ALBEDO_BIT ? '#define USE_ALBEDO_MAP' : ''}
        ${featureBits & METALIC_BIT ? '#define USE_METALIC_MAP' : ''}
        ${featureBits & ROUGHNESS_BIT ? '#define USE_ROUGHNESS_MAP' : ''}
        ${featureBits & NORMAL_BIT ? '#define USE_NORMAL_MAP' : ''}

        struct Material {
          vec3 albedo;
          float metalic;
          float roughness;
        };

        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vTexCoord;
        #ifdef USE_NORMAL_MAP
        varying vec4 vTangent;
        #endif

        uniform Material uMaterial;
        #ifdef USE_ALBEDO_MAP
        uniform sampler2D uAlbedoMap;
        #endif
        #ifdef USE_METALIC_MAP
        uniform sampler2D uMetalicMap;
        #endif
        #ifdef USE_ROUGHNESS_MAP
        uniform sampler2D uRoughnessMap;
        #endif
        #ifdef USE_NORMAL_MAP
        uniform sampler2D uNormalMap;
        #endif

        void material(out MaterialInfo mInfo) {
          #ifdef USE_ALBEDO_MAP
            mInfo.albedo = texture2D(uAlbedoMap, vTexCoord).rgb;
          #else
            mInfo.albedo = uMaterial.albedo;
          #endif
          // Tone mapping
          mInfo.albedo = pow(mInfo.albedo, vec3(2.2));

          #ifdef USE_NORMAL_MAP
            vec3 N = normalize(vNormal);
            vec3 T = normalize(vTangent.xyz);
            T = normalize(T - dot(T, N) * N);
            vec3 B = cross(T, N) * vTangent.w;
            mat3 tangent = mat3(T, B, N);
            vec3 normal = texture2D(uNormalMap, vTexCoord).xyz * 2.0 - 1.0;
            normal.y = -normal.y;
            mInfo.normal = tangent * normalize(normal);
          #else
            mInfo.normal = normalize(vNormal);
          #endif
          mInfo.position = vPosition;

          #ifdef USE_ROUGHNESS_MAP
            mInfo.roughness = texture2D(uRoughnessMap, vTexCoord).r;
          #else
            mInfo.roughness = uMaterial.roughness;
          #endif
          #ifdef USE_METALIC_MAP
            mInfo.metalic = texture2D(uMetalicMap, vTexCoord).r;
          #else
            mInfo.metalic = uMaterial.metalic;
          #endif
        } 
      `,
    }));

    chunk.forEach((entity) => {
      const transform = entity.get(transformComp);
      if (transform == null) {
        return;
      }
      pipeline.drawDeferred({
        shader,
        geometry,
        uniforms: {
          ...uniformOptions,
          uModel: transform.getMatrix(),
        },
      });
    });
  }

  dispose(): void {
  }
}
