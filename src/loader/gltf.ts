import {Transform} from '../3d/Transform';
import {AnimationClip, AnimationTargetWithFuture} from '../anim/Animation';
import {EntityFuture} from '../core/EntityFuture';
import {GeometryAttribute} from '../geom/types';
import {ArmatureOptionsWithFuture} from '../render/Armature';
import {Geometry, GeometryBounds} from '../render/Geometry';
import {GLTexture2D} from '../render/gl/GLTexture2D';
import {GLAttributeType} from '../render/gl/types';
import {TEXTURE_PARAM_MAP} from '../render/gl/utils';
import {DirectionalLight} from '../render/light/DirectionalLight';
import {Light} from '../render/light/Light';
import {PointLight} from '../render/light/PointLight';
import {Material} from '../render/Material';
import {StandardMaterial, StandardMaterialOptions} from '../render/material/StandardMaterial';
import {Mesh} from '../render/Mesh';

function checkVersion(current: string, target: string): boolean {
  const currentNums = current.split('.').map((v) => parseInt(v, 10));
  const targetNums = current.split('.').map((v) => parseInt(v, 10));
  for (let i = 0; i < currentNums.length; i += 1) {
    if (currentNums[i] > targetNums[i]) {
      return true;
    }
    if (currentNums[i] < targetNums[i]) {
      return false;
    }
  }
  return true;
}

const BASE64_PREFIX = 'data:application/octet-stream;base64,';
const COMPONENT_TYPE_MAP: {[key: number]: GLAttributeType;} = {
  5120: 'byte',
  5121: 'unsignedByte',
  5122: 'short',
  5123: 'unsignedShort',
  5125: 'unsignedInt',
  5126: 'float',
};
const TYPE_SIZE_MAP: {[key: string]: number;} = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};
const ATTRIBUTE_MAP: {[key: string]: string;} = {
  POSITION: 'aPosition',
  NORMAL: 'aNormal',
  TANGENT: 'aTangent',
  TEXCOORD_0: 'aTexCoord',
  TEXCOORD_1: 'aTexCoord2',
  COLOR_0: 'aColor',
  JOINTS_0: 'aSkinJoints',
  WEIGHTS_0: 'aSkinWeights',
  JOINTS_1: 'aSkinJoints2',
  WEIGHTS_1: 'aSkinWeights2',
};
const INV_TEXTURE_PARAM_MAP: {
  [key: number]: keyof typeof TEXTURE_PARAM_MAP;
} = {};
Object.keys(TEXTURE_PARAM_MAP).forEach((key) => {
  const keyVal = key as keyof typeof TEXTURE_PARAM_MAP;
  INV_TEXTURE_PARAM_MAP[TEXTURE_PARAM_MAP[keyVal]] = keyVal;
});
const ANIMATION_PATH_MAP: {[key: string]: string;} = {
  translation: 'position',
  rotation: 'rotation',
  scale: 'scale',
  weights: 'weights',
};

export interface GLTFResult {
  meshes: Mesh[];
  entities: {[key: string]: any;}[];
}

export function parseGLTF(input: any): GLTFResult {
  // Since we have no reason to use type definitions for gltf, we're using
  // any for most of the code. However it is possible to change the above 'any'
  // to valid type definition, and it should compile correctly.

  // Validate the version of gltf file.
  if (input.asset == null) {
    throw new Error('Not a valid gltf file; asset field is missing');
  }
  if (input.asset.minVersion != null) {
    if (!checkVersion('2.0', input.asset.minVersion)) {
      throw new Error('Version not supported');
    }
  } else if (!checkVersion('2.999', input.asset.version)) {
    throw new Error('Version not supported');
  }

  // Create buffers and buffer views.
  const buffers: ArrayBuffer[] = (input.buffers ?? []).map((buffer: any) => {
    // TODO: I don't think streaming gltf is an option for now. But implement it
    // sometime...
    if (buffer.uri.startsWith(BASE64_PREFIX)) {
      return Uint8Array.from(
        atob(buffer.uri.slice(BASE64_PREFIX.length)),
        (v) => v.charCodeAt(0),
      ).buffer;
    } else {
      throw new Error('URI scheme not supported');
    }
  });
  const bufferViews = (input.bufferViews ?? []).map((bufferView: any) => {
    const buffer = buffers[bufferView.buffer];
    const byteLength: number = bufferView.byteLength;
    const byteOffset: number = bufferView.byteOffset;
    if (buffer == null) {
      throw new Error('Invalid buffer reference');
    }
    return {buffer, byteLength, byteOffset};
  }) as {buffer: ArrayBuffer;byteLength: number;byteOffset: number;}[];

  // Create images and textures
  const images = (input.images ?? []).map((image: any): HTMLImageElement => {
    if ('uri' in image) {
      const imgElem = new Image();
      imgElem.src = image.uri;
      return imgElem;
    } else if ('bufferView' in image) {
      const bufferView = bufferViews[image.bufferView];
      if (bufferView == null) {
        throw new Error('Invalid bufferView reference');
      }
      const data = bufferView.buffer.slice(
        bufferView.byteOffset,
        bufferView.byteOffset + bufferView.byteLength,
      );
      const blob = new Blob([data], {type: image.mimeType});
      const imgElem = new Image();
      imgElem.src = URL.createObjectURL(blob);
      // TODO: Delete object URL
      return imgElem;
    }
    throw new Error('Invalid image definition');
  });
  const textures = (input.textures ?? []).map((texture: any): GLTexture2D => {
    const source = images[texture.source];
    const sampler = (input.samplers ?? [])[texture.sampler];
    if (source == null) {
      throw new Error('Invalid source reference');
    }
    return new GLTexture2D({
      source,
      format: 'rgba',
      magFilter: INV_TEXTURE_PARAM_MAP[sampler.magFilter ?? 'linear'] as any,
      minFilter: INV_TEXTURE_PARAM_MAP[sampler.minFilter ?? 'nearestMipmapLinear'] as any,
      wrapS: INV_TEXTURE_PARAM_MAP[sampler.wrapS ?? 'repeat'] as any,
      wrapT: INV_TEXTURE_PARAM_MAP[sampler.wrapT ?? 'repeat'] as any,
      flipY: false,
    });
  });
  const materials = (input.materials ?? []).map((material: any): Material => {
    const name: string = material.name ?? 'Material';
    if ('pbrMetallicRoughness' in material) {
      // TODO: material.emissiveFactor
      // TODO: material.normalTexture
      const pbr = material.pbrMetallicRoughness;
      const options: Partial<StandardMaterialOptions> = {};
      if ('baseColorTexture' in pbr) {
        options.albedo = textures[pbr.baseColorTexture.index];
      } else {
        options.albedo = pbr.baseColorFactor ?? '#ffffff';
      }
      if ('metallicRoughnessTexture' in pbr) {
        // options.albedo = textures[pbr.baseColorTexture.index];
        // TODO
      } else {
        options.metalic = pbr.metallicFactor ?? 1;
        options.roughness = pbr.roughnessFactor ?? 0;
      }
      if ('normalTexture' in material) {
        options.normal = textures[material.normalTexture.index];
      }
      return new StandardMaterial(name, options as StandardMaterialOptions);
    } else {
      throw new Error('Invalid material');
    }
  });
  const defaultMaterial = new StandardMaterial('Default', {
    albedo: '#ffffff',
    metalic: 0,
    roughness: 0.5,
  });

  const getAccessorFloat32Array = (
    index: number,
  ): Float32Array => {
    const accessor = input.accessors[index];
    if (accessor == null) {
      throw new Error('Invalid accessor reference');
    }
    if (accessor.sparse != null) {
      // FIXME
      throw new Error('Sparse accessor is not supported yet');
    }
    const bufferView = bufferViews[accessor.bufferView];
    if (bufferView == null) {
      throw new Error('Invalid bufferView reference');
    }
    const type = COMPONENT_TYPE_MAP[accessor.componentType];
    const size = TYPE_SIZE_MAP[accessor.type];
    // const byteSize = size * TYPE_LENGTHS[type] * accessor.count;
    const buffer = bufferView.buffer;
    const offset = bufferView.byteOffset + (accessor.byteOffset ?? 0);
    const length = size * accessor.count;
    const normalized = accessor.normalized ?? false;
    switch (type) {
      case 'float':
        return new Float32Array(buffer, offset, length);
      case 'byte': {
        const src = new Int8Array(buffer, offset, length);
        const out = new Float32Array(length);
        if (normalized) {
          for (let i = 0; i < length; i += 1) {
            out[i] = Math.max(src[i] / 127, -1);
          }
        } else {
          for (let i = 0; i < length; i += 1) {
            out[i] = src[i];
          }
        }
        return out;
      }
      case 'short': {
        const src = new Int16Array(buffer, offset, length);
        const out = new Float32Array(length);
        if (normalized) {
          for (let i = 0; i < length; i += 1) {
            out[i] = Math.max(src[i] / 32767, -1);
          }
        } else {
          for (let i = 0; i < length; i += 1) {
            out[i] = src[i];
          }
        }
        return out;
      }
      case 'unsignedByte': {
        const src = new Uint8Array(buffer, offset, length);
        const out = new Float32Array(length);
        if (normalized) {
          for (let i = 0; i < length; i += 1) {
            out[i] = src[i] / 255;
          }
        } else {
          for (let i = 0; i < length; i += 1) {
            out[i] = src[i];
          }
        }
        return out;
      }
      case 'unsignedShort': {
        const src = new Uint16Array(buffer, offset, length);
        const out = new Float32Array(length);
        if (normalized) {
          for (let i = 0; i < length; i += 1) {
            out[i] = src[i] / 65535;
          }
        } else {
          for (let i = 0; i < length; i += 1) {
            out[i] = src[i];
          }
        }
        return out;
      }
      case 'unsignedInt': {
        const src = new Uint32Array(buffer, offset, length);
        const out = new Float32Array(length);
        if (normalized) {
          for (let i = 0; i < length; i += 1) {
            out[i] = src[i] / 2147483647;
          }
        } else {
          for (let i = 0; i < length; i += 1) {
            out[i] = src[i];
          }
        }
        return out;
      }
      default:
        throw new Error('Invalid data type');
    }
  };
  const getAttribute = (
    index: number,
  ): {attribute: GeometryAttribute; count: number;} => {
    const accessor = input.accessors[index];
    if (accessor == null) {
      throw new Error('Invalid accessor reference');
    }
    const size = TYPE_SIZE_MAP[accessor.type];
    return {
      attribute: {
        data: getAccessorFloat32Array(index),
        size,
      },
      count: accessor.count,
    };
  };
  const getIndices = (
    index: number,
  ): Uint8Array | Uint16Array | Uint32Array => {
    const accessor = input.accessors[index];
    if (accessor == null) {
      throw new Error('Invalid accessor reference');
    }
    if (accessor.sparse != null) {
      // FIXME
      throw new Error('Sparse accessor is not supported yet');
    }
    const bufferView = bufferViews[accessor.bufferView];
    if (bufferView == null) {
      throw new Error('Invalid bufferView reference');
    }
    const byteOffset = accessor.byteOffset ?? 0;
    const buffer = bufferView.buffer;
    const offset = bufferView.byteOffset + byteOffset;
    const byteLength = bufferView.byteLength;
    let array;
    switch (COMPONENT_TYPE_MAP[accessor.componentType]) {
      case 'unsignedByte':
        array = new Uint8Array(buffer, offset, byteLength);
        break;
      case 'unsignedShort':
        array = new Uint16Array(buffer, offset, byteLength / 2);
        break;
      case 'unsignedInt':
        array = new Uint32Array(buffer, offset, byteLength / 4);
        break;
      default:
        throw new Error('Unsupported indices componentType');
    }
    return array;
  };
  const getAccessorBounds = (
    index: number,
  ): {min: number[];max: number[];} | null => {
    const accessor = input.accessors[index];
    if (accessor == null) {
      throw new Error('Invalid accessor reference');
    }
    if (accessor.min != null && accessor.max != null) {
      return {min: accessor.min, max: accessor.max};
    }
    return null;
  };

  const meshes: Mesh[] = input.meshes.map((mesh: any) => {
    const name: string = mesh.name ?? 'Mesh';
    const geometries: Geometry[] = [];
    const outMaterials: Material[] = [];
    mesh.primitives.map((primitive: any) => {
      const attributes: {[key: string]: GeometryAttribute;} = {};
      let count = 0;
      let bounds: GeometryBounds | null = null;
      Object.keys(primitive.attributes).forEach((key) => {
        const name = ATTRIBUTE_MAP[key];
        if (name == null) {
          // Ignore invalid attribute
          return;
        }
        const result = getAttribute(primitive.attributes[key]);
        attributes[name] = result.attribute;
        count = result.count;
        if (name === 'aPosition') {
          bounds = getAccessorBounds(primitive.attributes[key]);
        }
      });
      const indices = primitive.indices != null
        ? getIndices(primitive.indices)
        : undefined;
      geometries.push(new Geometry(name, {
        attributes,
        indices,
        mode: primitive.mode,
        count: indices == null ? count : undefined,
      }, bounds));
      outMaterials.push(materials[primitive.material] ?? defaultMaterial);
    });
    return new Mesh(outMaterials, geometries);
  });

  let lights: Light[] = [];
  if (input.extensions?.KHR_lights_punctual != null) {
    lights = (input.extensions.KHR_lights_punctual.lights ?? []).map((
      light: any,
    ): Light => {
      switch (light.type) {
        case 'point':
        case 'spot':
          // TODO: Spot light support
          return new PointLight({
            color: light.color ?? [1, 1, 1],
            power: light.intensity ?? 1,
            radius: 0,
            range: light.range ?? 0,
          });
        case 'directional':
          return new DirectionalLight({
            color: light.color ?? [1, 1, 1],
            power: light.intensity ?? 1,
          });
        default:
          throw new Error(`Unknown light ${light.type}`);
      }
    });
  }

  const nodes: {[key: string]: any;}[] = input.nodes.map((node: any) => {
    const entity: {[key: string]: any;} = {};
    const transform = new Transform();
    if ('matrix' in node) {
      transform.setMatrix(node.matrix);
    } else {
      if (node.translation != null) {
        transform.setPosition(node.translation);
      }
      if (node.rotation != null) {
        transform.setRotation(node.rotation);
      }
      if (node.scale != null) {
        transform.setScale(node.scale);
      }
    }
    entity.transform = transform;
    if ('mesh' in node) {
      const mesh = meshes[node.mesh];
      if (mesh == null) {
        throw new Error('Invalid mesh reference');
      }
      entity.mesh = mesh;
    }
    if ('name' in node) {
      entity.name = node.name;
    }
    if (node.extensions?.KHR_lights_punctual != null) {
      const light = lights[node.extensions?.KHR_lights_punctual.light];
      if (light == null) {
        throw new Error('Invalid light reference');
      }
      entity.light = light.clone();
    }
    return entity;
  });
  // Set up node childrens, after all entities are generated
  input.nodes.map((node: any, index: number) => {
    if ('children' in node) {
      node.children.forEach((childId: any) => {
        const childNode = nodes[childId];
        if (childNode == null) {
          throw new Error('Invalid child reference');
        }
        childNode.parent = new EntityFuture(index);
      });
    }
    if ('skin' in node) {
      const skin = input.skins[node.skin];
      if (skin == null) {
        throw new Error('Invalid skin reference');
      }
      if (skin.inverseBindMatrices == null) {
        throw new Error('inverse bind matrix must be provided ... for now');
      }
      const armature: ArmatureOptionsWithFuture = {
        inverseBindMatrices: getAccessorFloat32Array(
          skin.inverseBindMatrices,
        ),
        skeleton: skin.skeleton != null
          ? new EntityFuture(skin.skeleton)
          : null,
        joints: skin.joints.map((joint: number) => new EntityFuture(joint)),
      };
      nodes[index].armature = armature;
    }
  });
  // Set up animation controller node if any animation is specified
  if (input.animations != null) {
    const targetMap: Map<string, number> = new Map();
    const targets: AnimationTargetWithFuture[] = [];
    const clips: AnimationClip[] = input.animations.map((
      animation: any,
    ): AnimationClip => {
      let duration = 0;
      const channels = animation.channels.map((channel: any) => {
        // Retrieve target ID. Generate target entry if needed
        let targetId: number;
        const targetKey = `${channel.target.node}-${channel.target.path}`;
        if (targetMap.has(targetKey)) {
          targetId = targetMap.get(targetKey)!;
        } else {
          targets.push({
            entity: new EntityFuture(channel.target.node),
            path: ANIMATION_PATH_MAP[channel.target.path] as any,
          });
          targetMap.set(targetKey, targets.length - 1);
          targetId = targets.length - 1;
        }
        // Retrieve sampler
        const sampler = animation.samplers[channel.sampler];
        if (sampler == null) {
          throw new Error('Invalid sampler reference');
        }
        const input = getAccessorFloat32Array(sampler.input);
        const output = getAccessorFloat32Array(sampler.output);
        duration = getAccessorBounds(sampler.input)?.max[0] ?? 0;
        return {
          target: targetId,
          input,
          output,
          interpolation: sampler.interpolation,
        };
      });
      return {
        name: animation.name,
        channels,
        duration,
      };
    });
    nodes.push({
      animation: {
        targets,
        clips,
        currentTime: 0,
      },
    });
  }
  console.log(input);
  console.log(nodes);
  return {meshes, entities: nodes};
}
