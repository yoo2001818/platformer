import {ArrayBufferView} from '../types';

export function mergeArrayBuffers(
  input: (ArrayBufferLike | ArrayBufferView)[],
): ArrayBuffer {
  // First, determine the size of output array.
  const byteLength = input.reduce((size, array) => size + array.byteLength, 0);
  const output = new ArrayBuffer(byteLength);
  let offset = 0;
  // Copy each input.
  input.forEach((array) => {
    if (array instanceof ArrayBuffer) {
      new Uint8Array(output).set(new Uint8Array(array), offset);
    } else if (array instanceof SharedArrayBuffer) {
      new Uint8Array(output).set(new Uint8Array(array), offset);
    } else {
      new Uint8Array(output).set(
        new Uint8Array(array.buffer, array.byteOffset, array.byteLength),
        offset,
      );
    }
    offset += array.byteLength;
  });
  return output;
}
