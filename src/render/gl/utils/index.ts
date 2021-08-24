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
  unsignedInt: 4,
  float: 4,
};

export const ATTRIBUTE_TYPE_MAP = {
  // halfFloat: 0x8D61,
  halfFloat: 0x140B,
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
  unsignedInt2101010: 0x8368,
  unsignedInt10F11F11F: 0x8C3B,
  unsignedInt5999: 0x8C3E,
  float32unsignedInt248rev: 0x8DAD,
};

export const WEBGL1_ATTRIBUTE_TYPE_MAP = {
  ...ATTRIBUTE_TYPE_MAP,
  halfFloat: 0x8D61,
};

export const TEXTURE_FORMAT_MAP = {
  rgba: 0x1908,
  rgb: 0x1907,
  luminanceAlpha: 0x190A,
  luminance: 0x1909,
  alpha: 0x1906,
  depth: 0x1902,
  depthStencil: 0x84F9,
  // WebGL 2
  red: 0x1903,
  rg: 0x8227,
  rgbaInteger: 0x8D99,
  rgbInteger: 0x8D98,
  rgInteger: 0x8228,
  redInteger: 0x8D94,
};

export const WEBGL2_TEXTURE_FORMAT_MAP = {
  ...TEXTURE_FORMAT_MAP,
  depthComponent16: 0x81A5,
  depthComponent24: 0x81A6,
  depthComponent32f: 0x8CAC,
  stencilIndex8: 0x8D48,
  depth24stencil8: 0x88F0,
  depth32fstencil8: 0x8CAD,
  r8: 0x8229,
  r8snorm: 0x8F94,
  rg8: 0x822B,
  rg8snorm: 0x8F95,
  rgb8: 0x8051,
  rgb8snorm: 0x8F96,
  rgb565: 0x8D62,
  rgba4: 0x8056,
  rgb5a1: 0x8057,
  rgba8: 0x8058,
  rgba8snorm: 0x8F97,
  rgb10a2: 0x8059,
  rgb10a2ui: 0x906F,
  srgb8: 0x8C41,
  srgb8alpha8: 0x8C43,
  r16f: 0x822D,
  rg16f: 0x822F,
  rgb16f: 0x881B,
  rgba16f: 0x881A,
  r32f: 0x822E,
  rg32f: 0x8230,
  rgb32f: 0x8815,
  rgba32f: 0x8814,
  r11g11b10f: 0x8C3A,
  rgb9e5: 0x8C3D,
  r8i: 0x8231,
  r8ui: 0x8232,
  r16i: 0x8233,
  r16ui: 0x8234,
  r32i: 0x8235,
  r32ui: 0x8236,
  rg8i: 0x8237,
  rg8ui: 0x8238,
  rg16i: 0x8239,
  rg16ui: 0x823A,
  rg32i: 0x823B,
  rg32ui: 0x823C,
  rgb8i: 0x8D8F,
  rgb8ui: 0x8D7D,
  rgb16i: 0x8D89,
  rgb16ui: 0x8D77,
  rgb32i: 0x8D83,
  rgb32ui: 0x8D71,
  rgba8i: 0x8D8E,
  rgba8ui: 0x8D7C,
  rgba16i: 0x8D88,
  rgba16ui: 0x8D76,
  rgba32i: 0x8D82,
  rgba32ui: 0x8D70,
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

export const BLEND_EQUATION = {
  add: 0x8006,
  subtract: 0x800A,
  reverseSubtract: 0x800B,
  min: 0x8007,
  max: 0x8008,
};

export const BLEND_FUNC = {
  zero: 0,
  one: 1,
  srcColor: 0x0300,
  oneMinusSrcColor: 0x0301,
  dstColor: 0x0302,
  oneMinusDstColor: 0x0303,
  srcAlpha: 0x0304,
  oneMinusSrcAlpha: 0x0305,
  dstAlpha: 0x0306,
  oneMinusDstAlpha: 0x0307,
  constantColor: 0x8001,
  oneMinusConstantColor: 0x8002,
  constantAlpha: 0x8003,
  oneMinusConstantAlpha: 0x8004,
  srcAlphaSaturate: 0x0308,
};

export const STENCIL_OP = {
  keep: 0x1E00,
  zero: 0,
  replace: 0x1E01,
  incr: 0x1E02,
  incrWrap: 0x8507,
  decr: 0x1E03,
  decrWrap: 0x8508,
  invert: 0x150A,
};

export const TEST_FUNC = {
  never: 0x0200,
  less: 0x0201,
  equal: 0x0202,
  lequal: 0x0203,
  greater: 0x0204,
  notequal: 0x0205,
  gequal: 0x0206,
  always: 0x0207,
};

export const CULL_FACE_MODE = {
  front: 0x0404,
  back: 0x0405,
  frontAndBack: 0x0408,
};

export const FRONT_FACE = {
  cw: 0x0900,
  ccw: 0x0901,
};

export * from './parseIndices';
