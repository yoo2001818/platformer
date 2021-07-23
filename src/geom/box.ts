/* eslint-disable indent-legacy */
/* eslint-disable no-multi-spaces */
import {GeometryOptions} from './types';

export function box(): GeometryOptions {
  return {
    attributes: {
      aPosition: {
        size: 3,
        data: new Float32Array([
          // Front
          -1.0, -1.0,  1.0,
          1.0, -1.0,  1.0,
          1.0,  1.0,  1.0,
          -1.0,  1.0,  1.0,
          // Top
          -1.0,  1.0,  1.0,
          1.0,  1.0,  1.0,
          1.0,  1.0, -1.0,
          -1.0,  1.0, -1.0,
          // Back
          1.0, -1.0, -1.0,
          -1.0, -1.0, -1.0,
          -1.0,  1.0, -1.0,
          1.0,  1.0, -1.0,
          // Bottom
          -1.0, -1.0, -1.0,
          1.0, -1.0, -1.0,
          1.0, -1.0,  1.0,
          -1.0, -1.0,  1.0,
          // Left
          -1.0, -1.0, -1.0,
          -1.0, -1.0,  1.0,
          -1.0,  1.0,  1.0,
          -1.0,  1.0, -1.0,
          // Right
          1.0, -1.0,  1.0,
          1.0, -1.0, -1.0,
          1.0,  1.0, -1.0,
          1.0,  1.0,  1.0,
        ]),
      },
      aTexCoord: {
        size: 2,
        data: new Float32Array([
          0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
          0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
          0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
          0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
          0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
          0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
        ]),
      },
    },
    indices: [
       0,  1,  2,  2,  3,  0,
       4,  5,  6,  6,  7,  4,
       8,  9, 10, 10, 11,  8,
      12, 13, 14, 14, 15, 12,
      16, 17, 18, 18, 19, 16,
      20, 21, 22, 22, 23, 20,
    ],
  };
}
