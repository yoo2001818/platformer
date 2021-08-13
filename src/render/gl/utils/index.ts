import {BufferValue, GLAttributeType} from '../types';

export function flattenBuffer<T extends BufferValue>(
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

export function inferBufferType(data: unknown): GLAttributeType {
  if (Array.isArray(data)) {
    return 'float';
  }
  if (data instanceof Float64Array) {
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

export const TYPE_LENGTHS: {[key in GLAttributeType]: number;} = {
  byte: 1,
  short: 2,
  unsignedByte: 1,
  unsignedShort: 2,
  float: 4,
};

export const ATTRIBUTE_TYPE_MAP = {
  halfFloat: 0x8D61,
  byte: 0x1400,
  unsignedByte: 0x1401,
  short: 0x1402,
  unsignedShort: 0x1403,
  int: 0x1404,
  unsignedInt: 0x1405,
  float: 0x1406,
  unsignedShort4444: 0x8033,
  unsignedShort5551: 0x8034,
  unsignedShort565: 0x8363,
  unsignedInt248: 0x84FA,
};

export const TEXTURE_FORMAT_MAP = {
  rgba: 0x1908,
  rgb: 0x1907,
  luminanceAlpha: 0x190A,
  luminance: 0x1909,
  alpha: 0x1906,
  depth: 0x1902,
  depthStencil: 0x84F9,
};

export const TEXTURE_PARAM_MAP = {
  nearest: 0x2600,
  linear: 0x2601,
  nearestMipmapNearest: 0x2700,
  linearMipmapNearest: 0x2701,
  nearestMipmapLinear: 0x2702,
  linearMipmapLinear: 0x2703,
  repeat: 0x2901,
  clampToEdge: 0x812F,
  mirroredRepeat: 0x8370,
};

export * from './parseIndices';
