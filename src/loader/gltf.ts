import {Transform} from '../3d/Transform';
import {AnimationClip, AnimationTargetWithFuture} from '../anim/Animation';
import {EntityFuture} from '../core/EntityFuture';
import {ArmatureOptionsWithFuture} from '../render/Armature';
import {Geometry} from '../render/Geometry';
import {GLArrayBuffer} from '../render/gl/GLArrayBuffer';
import {GLElementArrayBuffer} from '../render/gl/GLElementArrayBuffer';
import {GLTexture2D} from '../render/gl/GLTexture2D';
import {AttributeOptions, GLAttributeType} from '../render/gl/types';
import {TEXTURE_PARAM_MAP, TYPE_LENGTHS} from '../render/gl/utils';
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
};
const ATTRIBUTE_NOT_NORMALIZED_MAP: {[key: string]: boolean;} = {
  JOINTS_0: true,
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
    console.log(material);
    // TODO: material.name
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
        options.roughness = Math.sqrt(pbr.roughnessFactor ?? 1);
      }
      if ('normalTexture' in material) {
        options.normal = textures[material.normalTexture.index];
      }
      return new StandardMaterial(options as StandardMaterialOptions);
    } else {
      throw new Error('Invalid material');
    }
  });
  const defaultMaterial = new StandardMaterial({
    albedo: '#ffffff',
    metalic: 0,
    roughness: 0.5,
  });

  // These are populated by the accessors.
  const glArrayBuffers: GLArrayBuffer[] = [];
  const glElementArrayBuffers: GLElementArrayBuffer[] = [];

  const getAttribute = (
    index: number,
    normalized: boolean,
  ): {attribute: AttributeOptions; count: number;} => {
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
    let glArrayBuffer = glArrayBuffers[accessor.bufferView];
    if (glArrayBuffer == null) {
      glArrayBuffer = new GLArrayBuffer(bufferView.buffer.slice(
        bufferView.byteOffset,
        bufferView.byteOffset + bufferView.byteLength,
      ));
      glArrayBuffers[accessor.bufferView] = glArrayBuffer;
    }
    const type = COMPONENT_TYPE_MAP[accessor.componentType];
    const size = TYPE_SIZE_MAP[accessor.type];
    return {
      attribute: {
        buffer: glArrayBuffer,
        size,
        type,
        offset: accessor.byteOffset ?? 0,
        normalized: false,
      },
      count: accessor.count,
    };
  };
  const getIndices = (index: number): GLElementArrayBuffer => {
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
    let glElementArrayBuffer = glElementArrayBuffers[accessor.bufferView];
    if (glElementArrayBuffer == null) {
      const sliced =
        bufferView.buffer.slice(
          bufferView.byteOffset + byteOffset,
          bufferView.byteOffset + bufferView.byteLength - byteOffset,
        );
      let array;
      switch (COMPONENT_TYPE_MAP[accessor.componentType]) {
        case 'unsignedByte':
          array = new Uint8Array(sliced);
          break;
        case 'unsignedShort':
          array = new Uint16Array(sliced);
          break;
        case 'unsignedInt':
          array = new Uint32Array(sliced);
          break;
        default:
      }
      glElementArrayBuffer = new GLElementArrayBuffer(array);
      glElementArrayBuffers[accessor.bufferView] = glElementArrayBuffer;
    }
    return glElementArrayBuffer;
  };
  const getAccessorFloat32Array = (
    index: number,
    normalized: boolean,
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
    if (type !== 'float') {
      throw new Error('Component type must be float for now');
    }
    const size = TYPE_SIZE_MAP[accessor.type];
    const byteSize = size * TYPE_LENGTHS[type] * accessor.count;
    return new Float32Array(bufferView.buffer.slice(
      bufferView.byteOffset + (accessor.byteOffset ?? 0),
      bufferView.byteOffset + (accessor.byteOffset ?? 0) + byteSize,
    ));
  };
  const getAccessorBounds = (index: number): {min: number[];max: number[];} => {
    const accessor = input.accessors[index];
    if (accessor == null) {
      throw new Error('Invalid accessor reference');
    }
    return {min: accessor.min, max: accessor.max};
  };

  const meshes: Mesh[] = input.meshes.map((mesh: any) => {
    const geometries: Geometry[] = [];
    const outMaterials: Material[] = [];
    mesh.primitives.map((primitive: any) => {
      const attributes: {[key: string]: AttributeOptions;} = {};
      let count = 0;
      Object.keys(primitive.attributes).forEach((key) => {
        const name = ATTRIBUTE_MAP[key];
        if (name == null) {
          // Ignore invalid attribute
          return;
        }
        const normalized = !ATTRIBUTE_NOT_NORMALIZED_MAP[key];
        const result = getAttribute(primitive.attributes[key], normalized);
        attributes[name] = result.attribute;
        count = result.count;
      });
      const indices = primitive.indices != null
        ? getIndices(primitive.indices)
        : undefined;
      console.log(attributes);
      geometries.push(new Geometry({
        attributes,
        indices,
        mode: primitive.mode,
        count: indices == null ? count : undefined,
      }));
      outMaterials.push(materials[primitive.material] ?? defaultMaterial);
    });
    return new Mesh(outMaterials, geometries);
  });

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
          false,
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
        const input = getAccessorFloat32Array(sampler.input, true);
        const output = getAccessorFloat32Array(sampler.output, true);
        duration = getAccessorBounds(sampler.input).max[0];
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
  return {entities: nodes};
}
