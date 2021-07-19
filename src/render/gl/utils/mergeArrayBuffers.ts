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
    } else if (
      typeof SharedArrayBuffer !== 'undefined' &&
      array instanceof SharedArrayBuffer
    ) {
      new Uint8Array(output).set(new Uint8Array(array), offset);
    } else {
      const arrayArray = array as Uint8Array;
      new Uint8Array(output).set(
        new Uint8Array(
          arrayArray.buffer,
          arrayArray.byteOffset,
          arrayArray.byteLength,
        ),
        offset,
      );
    }
    offset += array.byteLength;
  });
  return output;
}
