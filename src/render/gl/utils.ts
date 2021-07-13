import {ArrayBufferView, GLAttributeType} from './types';

export function flattenBuffer<
  T extends ArrayBufferView | ArrayBufferLike | number[] | number[][]
>(
  data: T,
): T extends number[] | number[][] ? Float32Array : T {
  if (Array.isArray(data)) {
    if (Array.isArray(data[0])) {
      const axis = data[0].length;
      const output = new Float32Array(data.length * axis);
      for (let i = 0; i < data.length; i += 1) {
        const entry = data[i] as number[];
        for (let j = 0; j < axis; j += 1) {
          output[i * axis + j] = entry[j];
        }
      }
      return output as any;
    }
    return new Float32Array(data as number[]) as any;
  }
  return data as any;
}

export function inferBufferType(data: unknown): GLAttributeType | null {
  if (Array.isArray(data)) {
    return 'float';
  }
  if (data instanceof Float32Array) {
    return 'float';
  }
  if (data instanceof Int8Array) {
    return 'byte';
  }
  if (data instanceof Uint8ClampedArray) {
    return 'unsignedByte';
  }
  if (data instanceof Uint8Array) {
    return 'unsignedByte';
  }
  if (data instanceof Int16Array) {
    return 'short';
  }
  if (data instanceof Uint16Array) {
    return 'unsignedShort';
  }
  // Assume float
  return 'float';
}
