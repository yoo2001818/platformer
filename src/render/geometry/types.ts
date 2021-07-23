export interface GeometryAttribute {
  data: number[] | Float32Array;
  size: number;
}

export interface GeometryOptions {
  attributes: {[key: string]: GeometryAttribute;};
  indices?: number[];
  mode?: number;
}

// ChannelGeometry allows to specify separate indices for each attribute.
// This therefore allows changing each triangle's property without changing
// all the attributes, which is useful for calculating normals and tangents,
// since position data is shared between all vertices, but hard normals are
// not.
export interface ChannelGeometryOptions {
  attributes: {[key: string]: GeometryAttribute;};
  indices: {[key: string]: number[];};
  mode?: number;
}
