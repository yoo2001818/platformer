import {Transform} from '../3d/Transform';
import {Geometry} from '../render/Geometry';
import {GLArrayBuffer} from '../render/gl/GLArrayBuffer';
import {GLElementArrayBuffer} from '../render/gl/GLElementArrayBuffer';
import {AttributeOptions, GLAttributeType} from '../render/gl/types';
import {Material} from '../render/Material';
import {StandardMaterial} from '../render/material/StandardMaterial';
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
  const buffers: ArrayBuffer[] = input.buffers.map((buffer: any) => {
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
  const bufferViews = input.bufferViews.map((bufferView: any) => {
    const buffer = buffers[bufferView.buffer];
    const byteLength: number = bufferView.byteLength;
    const byteOffset: number = bufferView.byteOffset;
    if (buffer == null) {
      throw new Error('Invalid buffer reference');
    }
    return {buffer, byteLength, byteOffset};
  }) as {buffer: ArrayBuffer;byteLength: number;byteOffset: number;}[];

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

  const meshes: Mesh[] = input.meshes.map((mesh: any) => {
    const geometries: Geometry[] = [];
    const materials: Material[] = [];
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
      materials.push(new StandardMaterial({
        albedo: '#ffffff',
        metalic: 0,
        roughness: 0.5,
      }));
    });
      console.log(geometries);
    return new Mesh(materials, geometries);
  });

  const nodes: {[key: string]: any;}[] = input.nodes.map((node: any) => {
    const entity: {[key: string]: any;} = {};
    const transform = new Transform();
    if ('matrix' in node) {
      transform.setMatrix(node.matrix);
    } else if ('translation' in node) {
      transform.setPosition(node.translation);
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
    return entity;
  });
  console.log(input);
  console.log(nodes);
  return {entities: nodes};
}
