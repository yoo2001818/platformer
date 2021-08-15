import {TransformComponent} from '../../3d/TransformComponent';
import {EntityChunk} from '../../core/EntityChunk';
import {GLGeometry} from '../gl/GLGeometry';
import {Material} from '../Material';
import {Renderer} from '../Renderer';
import {createId} from '../utils/createId';
import {GLTexture} from '../gl/GLTexture';

export interface BasicMaterialOptions {
  albedo: string | Float32Array | number[] | GLTexture | null;
  metalic: number | GLTexture;
  roughness: number | GLTexture;
}

const ALBEDO_BIT = 1;
const METALIC_BIT = 2;
const ROUGHNESS_BIT = 4;

export class BasicMaterial implements Material {
  id: number;
  options: BasicMaterialOptions;
  constructor(options: BasicMaterialOptions) {
    this.id = createId();
    this.options = options;
  }

  render(chunk: EntityChunk, geometry: GLGeometry, renderer: Renderer): void {
    const {options} = this;
    const {pipeline, entityStore} = renderer;

    // Prepare shader uniforms
    const transformComp =
      entityStore.getComponent<TransformComponent>('transform')!;
    const uniformOptions: {[key: string]: any;} = {
      uMaterial: options,
    };

    // Retrieve shader feature bits
    let featureBits = 0;
    if (options.albedo instanceof GLTexture) {
      featureBits |= ALBEDO_BIT;
      uniformOptions.uAlbedoMap = options.albedo;
    }

    const shader = pipeline.getDeferredShader(`basic-${featureBits}`, () => ({
      vert: /* glsl */`
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
          vec4 pos = uModel * vec4(aPosition + aInstanced, 1.0);
          gl_Position = uProjection * uView * pos;
          vPosition = pos.xyz;
          // TODO Normal 3x3 matrix
          vNormal = (uModel * vec4(aNormal, 0.0)).xyz;
          vTexCoord = aTexCoord;
        } 
      `,
      frag: /* glsl */`
        ${featureBits & ALBEDO_BIT ? '#define USE_ALBEDO_MAP' : ''}
        ${featureBits & METALIC_BIT ? '#define USE_METALIC_MAP' : ''}
        ${featureBits & ROUGHNESS_BIT ? '#define USE_ROUGHNESS_MAP' : ''}

        struct Material {
          vec3 albedo;
          float metalic;
          float roughness;
        };

        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vTexCoord;

        uniform Material uMaterial;
        #ifdef USE_ALBEDO_MAP
        uniform sampler2D uAlbedoMap;
        #endif

        void material(out MaterialInfo mInfo) {
          #ifdef USE_ALBEDO_MAP
            mInfo.albedo = texture2D(uAlbedoMap, vTexCoord).rgb;
          #else
            mInfo.albedo = uMaterial.albedo;
          #endif

          mInfo.normal = normalize(vNormal);
          mInfo.position = vPosition;

          mInfo.roughness = uMaterial.roughness;
          mInfo.metalic = uMaterial.metalic;
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
