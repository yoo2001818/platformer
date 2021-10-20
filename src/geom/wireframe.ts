import {GeometryOptions} from './types';

const TRIANGLES = 4;
const LINES = 1;

export function wireframe(input: GeometryOptions): GeometryOptions {
  if (input.mode != null && input.mode !== TRIANGLES) {
    return input;
  }
  if (input.indices != null) {
    const indices = [];
    const numVertices = Math.floor(input.indices.length / 3);
    for (let i = 0; i < numVertices; i += 1) {
      indices[i * 6] = input.indices[i * 3];
      indices[i * 6 + 1] = input.indices[i * 3 + 1];
      indices[i * 6 + 2] = input.indices[i * 3 + 1];
      indices[i * 6 + 3] = input.indices[i * 3 + 2];
      indices[i * 6 + 4] = input.indices[i * 3 + 2];
      indices[i * 6 + 5] = input.indices[i * 3];
    }
    return {
      ...input,
      indices,
      mode: LINES,
    };
  } else {
    const indices = [];
    // TODO
    const numVertices = 0;
    for (let i = 0; i < numVertices; i += 1) {
      indices[i * 6] = i * 3;
      indices[i * 6 + 1] = i * 3 + 1;
      indices[i * 6 + 2] = i * 3 + 1;
      indices[i * 6 + 3] = i * 3 + 2;
      indices[i * 6 + 4] = i * 3 + 2;
      indices[i * 6 + 5] = i * 3;
    }
    return {
      ...input,
      indices,
      mode: LINES,
    };
  }
}
