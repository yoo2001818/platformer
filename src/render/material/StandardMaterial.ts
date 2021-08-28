import {TransformComponent} from '../../3d/TransformComponent';
import {EntityChunk} from '../../core/EntityChunk';
import {GLGeometry} from '../gl/GLGeometry';
import {Material} from '../Material';
import {Renderer} from '../Renderer';
import {createId} from '../utils/createId';
import {GLTexture} from '../gl/GLTexture';
import {PipelineShadowOptions} from '../pipeline/Pipeline';
import {GLArrayBuffer} from '../gl/GLArrayBuffer';
import {Armature} from '../Armature';

export interface StandardMaterialOptions {
  albedo: string | Float32Array | number[] | GLTexture | null;
  metalic: number | GLTexture;
  roughness: number | GLTexture;
  normal?: GLTexture | null;
  texScale?: [number, number] | null;
}

const ALBEDO_BIT = 1;
const METALIC_BIT = 2;
const ROUGHNESS_BIT = 4;
const NORMAL_BIT = 8;
const INSTANCING_BIT = 16;
const ARMATURE_BIT = 32;
const ARMATURE2_BIT = 64;

export class StandardMaterial implements Material {
  id: number;
  mode: 'deferred' = 'deferred';
  options: StandardMaterialOptions;
  instancedBuffer: GLArrayBuffer;
  constructor(options: StandardMaterialOptions) {
    this.id = createId();
    this.options = options;
    this.instancedBuffer = new GLArrayBuffer(null, 'stream');
  }

  renderShadow(
    chunk: EntityChunk,
    geometry: GLGeometry,
    renderer: Renderer,
    options: PipelineShadowOptions,
  ): void {
    const {entityStore, pipeline, glRenderer} = renderer;
    const transformComp =
      entityStore.getComponent<TransformComponent>('transform')!;
    let featureBits = 0;
    featureBits |= INSTANCING_BIT;
    const shader = pipeline.getShadowShader(`basic-${featureBits}`, () => ({
      vert: /* glsl */`
        ${featureBits & INSTANCING_BIT ? '#define USE_INSTANCING' : ''}
        #version 100
        precision highp float;

        attribute vec3 aPosition;
        attribute vec3 aNormal;
        attribute vec2 aTexCoord;
        #ifdef USE_INSTANCING
        attribute mat4 aModel;
        #endif

        uniform mat4 uView;
        uniform mat4 uProjection;
        #ifndef USE_INSTANCING
        uniform mat4 uModel;
        #endif
        uniform vec2 uTexScale;

        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vTexCoord;

        void main() {
          #ifdef USE_INSTANCING
          mat4 model = aModel;
          #else
          mat4 model = uModel;
          #endif
          vec4 pos = model * vec4(aPosition, 1.0);
          gl_Position = uProjection * uView * pos;
          vPosition = pos.xyz;
          // TODO Normal 3x3 matrix
          vNormal = (model * vec4(aNormal, 0.0)).xyz;
          vTexCoord = aTexCoord * uTexScale;
        } 
      `,
    }));
    const buffer = new Float32Array(chunk.size * 16);
    let index = 0;
    chunk.forEach((entity) => {
      const transform = entity.get(transformComp);
      buffer.set(transform!.getMatrixWorld(), index * 16);
      index += 1;
    });
    // Pass instanced buffer to GPU
    this.instancedBuffer.set(buffer);
    // Bind the shader and bind aModel attribute
    shader.bind(glRenderer);
    geometry.bind(glRenderer, shader);
    shader.setAttribute('aModel', {
      buffer: this.instancedBuffer,
      divisor: 1,
    });
    pipeline.drawShadow({
      ...options,
      shader,
      geometry,
      uniforms: options.uniforms,
      primCount: chunk.size,
    });
  }

  render(chunk: EntityChunk, geometry: GLGeometry, renderer: Renderer): void {
    const {options} = this;
    const {pipeline, entityStore, glRenderer} = renderer;

    // Prepare shader uniforms
    const transformComp =
      entityStore.getComponent<TransformComponent>('transform')!;
    const uniformOptions: {[key: string]: any;} = {
      uTexScale: options.texScale ?? [1, 1],
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
    if (chunk.has('armature')) {
      featureBits |= ARMATURE_BIT;
      if (geometry.options.attributes.aSkinJoints2) {
        featureBits |= ARMATURE2_BIT;
      }
    } else {
      featureBits |= INSTANCING_BIT;
    }

    const shader = pipeline.getDeferredShader(`basic-${featureBits}`, () => ({
      vert: /* glsl */`
        ${featureBits & NORMAL_BIT ? '#define USE_NORMAL_MAP' : ''}
        ${featureBits & INSTANCING_BIT ? '#define USE_INSTANCING' : ''}
        ${featureBits & ARMATURE_BIT ? '#define USE_ARMATURE' : ''}
        ${featureBits & ARMATURE2_BIT ? '#define USE_ARMATURE2' : ''}
        #version 100
        precision highp float;

        attribute vec3 aPosition;
        attribute vec3 aNormal;
        attribute vec2 aTexCoord;
        #ifdef USE_NORMAL_MAP
        attribute vec4 aTangent;
        #endif
        #ifdef USE_INSTANCING
        attribute mat4 aModel;
        #endif
        #ifdef USE_ARMATURE
        attribute vec4 aSkinJoints;
        attribute vec4 aSkinWeights;
        #endif
        #ifdef USE_ARMATURE2
        attribute vec4 aSkinJoints2;
        attribute vec4 aSkinWeights2;
        #endif

        uniform mat4 uView;
        uniform mat4 uProjection;
        #ifndef USE_INSTANCING
        uniform mat4 uModel;
        #endif
        uniform vec2 uTexScale;
        #ifdef USE_ARMATURE
        uniform sampler2D uArmatureMap;
        uniform vec2 uArmatureMapSize;
        #endif

        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vTexCoord;
        #ifdef USE_NORMAL_MAP
        varying vec4 vTangent;
        #endif

        #ifdef USE_ARMATURE
        void fetchArmature(inout mat4 mat, int index, float weight) {
          if (weight > 0.0) {
            vec2 texelSize = 1.0 / uArmatureMapSize;
            vec2 coord = vec2((float(index * 4) + 0.5) * texelSize.x, 0.5);
            mat4 outMat = mat4(
              vec4(texture2D(uArmatureMap, coord)),
              vec4(texture2D(uArmatureMap, coord + vec2(1.0, 0.0) * texelSize)),
              vec4(texture2D(uArmatureMap, coord + vec2(2.0, 0.0) * texelSize)),
              vec4(texture2D(uArmatureMap, coord + vec2(3.0, 0.0) * texelSize))
            );
            mat += weight * outMat;
          }
        }
        #endif

        void main() {
          #ifdef USE_INSTANCING
          mat4 model = aModel;
          #else
          mat4 model = uModel;
          #endif
          #ifdef USE_ARMATURE
          mat4 armatureMat = mat4(0.0);
          for (int i = 0; i < 4; ++i) {
            fetchArmature(armatureMat, int(aSkinJoints[i]), aSkinWeights[i]);
          }
          #ifdef USE_ARMATURE2
          for (int i = 0; i < 4; ++i) {
            fetchArmature(armatureMat, int(aSkinJoints2[i]), aSkinWeights2[i]);
          }
          #endif
          model = model * armatureMat;
          #endif
          vec4 pos = model * vec4(aPosition, 1.0);
          gl_Position = uProjection * uView * pos;
          vPosition = pos.xyz;
          // TODO Normal 3x3 matrix
          vNormal = (model * vec4(aNormal, 0.0)).xyz;
          vTexCoord = aTexCoord * uTexScale;
          #ifdef USE_NORMAL_MAP
          vTangent = vec4((model * vec4(aTangent.xyz, 0.0)).xyz, aTangent.w);
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
            mInfo.albedo = pow(mInfo.albedo, vec3(2.2));
          #else
            mInfo.albedo = uMaterial.albedo;
          #endif
          // Tone mapping

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

    if (chunk.has('armature')) {
      // Draw each armature separately;
      chunk.forEach((entity) => {
        const transform = entity.get(transformComp)!;
        const armature = entity.get<Armature>('armature')!;
        const armatureMap = armature.getTexture();
        pipeline.drawDeferred({
          shader,
          geometry,
          uniforms: {
            ...uniformOptions,
            uModel: transform.getMatrixWorld(),
            uArmatureMap: armatureMap,
            uArmatureMapSize: [
              armatureMap.getWidth(),
              armatureMap.getHeight(),
            ],
          },
        });
      });
    } else {
      const buffer = new Float32Array(chunk.size * 16);
      let index = 0;
      chunk.forEach((entity) => {
        const transform = entity.get(transformComp);
        buffer.set(transform!.getMatrixWorld(), index * 16);
        index += 1;
      });
      // Pass instanced buffer to GPU
      this.instancedBuffer.set(buffer);
      // Bind the shader and bind aModel attribute
      shader.bind(glRenderer);
      geometry.bind(glRenderer, shader);
      shader.setAttribute('aModel', {
        buffer: this.instancedBuffer,
        divisor: 1,
      });
      pipeline.drawDeferred({
        shader,
        geometry,
        uniforms: uniformOptions,
        primCount: chunk.size,
      });
    }
  }

  dispose(): void {
  }
}
