import {GeometryOptions} from './types';
import {inferVertexCount} from './utils/inferVertexCount';

export function generateIndices(input: GeometryOptions): GeometryOptions {
  if (input.indices != null) {
    return input;
  }
  // Generate linear indices.
  const count = inferVertexCount(input);
  const indices: number[] = [];
  for (let i = 0; i < count; i += 1) {
    indices[i] = i;
  }
  return {...input, indices};
}
