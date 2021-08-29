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
