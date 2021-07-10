export interface GeometryAttribute {
  data: number[] | number[][] | Float32Array;
  axis: number;
  stride?: number | null;
  offset?: number | null;
  instanced?: number | null;
}

export interface GeometryDescriptor {
  attributes: {[key: string]: GeometryAttribute | number[][];};
  indices?: number[] | Uint8Array | Uint16Array | Uint32Array | null;
  mode?: number;
}

// ChannelGeometry allows to specify separate indices for each attribute.
// This therefore allows changing each triangle's property without changing
// all the attributes, which is useful for calculating normals and tangents,
// since position data is shared between all vertices, but hard normals are
// not.
export interface ChannelGeometryDescriptor {
  attributes: {[key: string]: GeometryAttribute | number[][];};
  indices: {[key: string]: number[];};
}

export const POINTS = 0;
export const LINES = 1;
export const LINE_LOOP = 2;
export const LINE_STRIP = 3;
export const TRIANGLES = 4;
export const TRIANGLE_STRIP = 5;
export const TRIANGLE_FAN = 6;

