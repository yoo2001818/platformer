export interface GeometryAttribute {
  data: number[] | Float32Array;
  size: number;
}

export interface GeometryOptions {
  attributes: {[key: string]: GeometryAttribute;};
  indices?: number[];
  mode?: number;
}
