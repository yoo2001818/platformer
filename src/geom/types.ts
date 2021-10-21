export interface GeometryAttribute {
  data: number[] | Float32Array;
  size: number;
}

export interface GeometryOptions {
  attributes: {[key: string]: GeometryAttribute;};
  indices?: number[] | Uint8Array | Uint16Array | Uint32Array;
  mode?: number;
  count?: number;
}

export const POINTS = 0;
export const LINES = 1;
export const LINE_LOOP = 2;
export const LINE_STRIP = 3;
export const TRIANGLES = 4;
export const TRIANGLE_STRIP = 5;
export const TRIANGLE_FAN = 6;
