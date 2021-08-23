import { Geometry } from '../render/Geometry';
import {GLArrayBuffer} from '../render/gl/GLArrayBuffer';
import {GLElementArrayBuffer} from '../render/gl/GLElementArrayBuffer';
import { AttributeOptions } from '../render/gl/types';

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

export function parseGLTF(input: any): void {
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
  }) as {buffer: ArrayBuffer, byteLength: number, byteOffset: number}[];

  // These are populated by the accessors.
  const glArrayBuffers: GLArrayBuffer[] = [];
  const glElementArrayBuffers: GLElementArrayBuffer[] = [];

  const getAttribute = (index: number): AttributeOptions => {
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
      glArrayBuffer = new GLArrayBuffer(
        bufferView.buffer.slice(bufferView.byteOffset, bufferView.byteOffset),
      );
      glArrayBuffers[accessor.bufferView] = glArrayBuffer;
    }
    return {
      buffer: glArrayBuffer,
      // TODO: Read off of componentType / type
      size: 4,
      type: 'short',
      offset: accessor.byteOffset,
    };
  };

  const meshes = input.meshes.map((mesh: any) => {
    mesh.primitives.map((primitive: any) => {
      new Geometry({
        attributes: 
        indices: 
        // mode: primitive.mode,
      });
    });
  });
  console.log(input);
}
