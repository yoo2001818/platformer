import {UniformEntry, UniformSlot} from './types';

export function isUniformType(t: UniformEntry): t is UniformSlot {
  return 'uniform' in t && t.uniform === 'uniform';
}

export function convertFloat(value: unknown): number {
  if (Array.isArray(value)) {
    return value[0] as number;
  }
  if (value instanceof Float32Array) {
    return value[0];
  }
  if (typeof value === 'number') {
    return value;
  }
  throw new Error(`Unexpect value ${value}`);
}

const floatBuf = Array.from({length: 16}, (_, i) => new Float32Array(i));

export function convertFloatArray(
  value: unknown,
  size: number,
): Float32Array {
  if (Array.isArray(value)) {
    const buf = floatBuf[size];
    for (let i = 0; i < size; i += 1) {
      buf[i] = value[i];
    }
    return buf;
  }
  if (value instanceof Float32Array) {
    return value;
  }
  if (typeof value === 'string' && size === 3) {
    const buf = floatBuf[3];
    buf[0] = parseInt(value.slice(1, 3), 16) / 255;
    buf[1] = parseInt(value.slice(3, 5), 16) / 255;
    buf[2] = parseInt(value.slice(5, 7), 16) / 255;
    return buf;
  }
  if (typeof value === 'string' && size === 4) {
    const buf = floatBuf[4];
    if (value.length > 7) {
      // RGBA
      buf[0] = parseInt(value.slice(1, 3), 16) / 255;
      buf[1] = parseInt(value.slice(3, 5), 16) / 255;
      buf[2] = parseInt(value.slice(5, 7), 16) / 255;
      buf[3] = parseInt(value.slice(7, 9), 16) / 255;
      return buf;
    }
    // RGB
    buf[0] = parseInt(value.slice(1, 3), 16) / 255;
    buf[1] = parseInt(value.slice(3, 5), 16) / 255;
    buf[2] = parseInt(value.slice(5, 7), 16) / 255;
    buf[3] = 1;
    return buf;
  }
  return floatBuf[size];
}

export function convertInt(value: unknown): number {
  if (Array.isArray(value)) {
    return value[0] as number;
  }
  if (value instanceof Float32Array) {
    return value[0];
  }
  if (value instanceof Int32Array) {
    return value[0];
  }
  if (value === true) {
    return 1;
  }
  if (value === false) {
    return 0;
  }
  return value as number;
}

const intBuf = Array.from({length: 16}, (_, i) => new Int32Array(i));

export function convertIntArray(
  value: unknown,
  size: number,
): Int32Array {
  if (Array.isArray(value)) {
    const buf = intBuf[size];
    for (let i = 0; i < size; i += 1) {
      buf[i] = value[i];
    }
    return buf;
  }
  if (value instanceof Int32Array) {
    return value;
  }
  return intBuf[size];
}

export function step(value: unknown, path: (string | number)[]): unknown {
  return path.reduce((p, v) => {
    if (p == null) {
      return p;
    }
    return (p as any)[v];
  }, value);
}

