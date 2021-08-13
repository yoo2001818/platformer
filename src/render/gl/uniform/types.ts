export interface UniformSlot {
  name: string;
  path: (string | number)[];
  size: number;
  type: number;
  uniform: 'uniform';
  location: WebGLUniformLocation;
}

export type UniformContainer =
  | {[key: string]: UniformEntry;}
  | UniformEntry[];

export type UniformEntry =
  | UniformSlot
  | UniformContainer;

export interface UniformResult {
  uniforms: UniformContainer;
  textures: UniformSlot[];
}
