export interface UniformSlot {
  name: string;
  size: number;
  glType: number;
  type: 'uniform';
  location: WebGLUniformLocation;
}

export type UniformContainer =
  | {[key: string]: UniformEntry;}
  | UniformEntry[];

export type UniformEntry =
  | UniformSlot
  | UniformContainer;
