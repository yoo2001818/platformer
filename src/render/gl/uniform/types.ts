export interface UniformSlot {
  name: string;
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
