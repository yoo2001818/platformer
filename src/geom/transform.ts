import {vec2, vec3, vec4} from 'gl-matrix';

import {GeometryOptions} from './types';
import {inferVertexCount} from './utils/inferVertexCount';

export type TransformerFunction =
  ((value: Float32Array) => Float32Array);

export type Transformer =
  | number[]
  | Float32Array
  | TransformerFunction;

function getTransformer(
  size: number,
  transform: Transformer,
): TransformerFunction {
    // If function, just use it
  if (typeof transform === 'function') {
    return transform;
  }
  // Otherwise, try to find matching transformer
  if (Array.isArray(transform) || transform instanceof Float32Array) {
    const transformArr = transform as Float32Array;
    if (size === 2 && transform.length === 4) {
      return (v) => vec2.transformMat2(v, v, transformArr) as Float32Array;
    } else if (size === 2 && transform.length === 6) {
      return (v) => vec2.transformMat2d(v, v, transformArr) as Float32Array;
    } else if (size === 2 && transform.length === 9) {
      return (v) => vec2.transformMat3(v, v, transformArr) as Float32Array;
    } else if (size === 3 && transform.length === 9) {
      return (v) => vec3.transformMat3(v, v, transformArr) as Float32Array;
    } else if (size === 3 && transform.length === 16) {
      return (v) => vec3.transformMat4(v, v, transformArr) as Float32Array;
    } else if (size === 4 && transform.length === 16) {
      return (v) => vec4.transformMat4(v, v, transformArr) as Float32Array;
    } else if (size === transform.length) {
      return (v) => {
        v.set(transformArr);
        return v;
      };
    } else {
      throw new Error('Unknown axis / transformer pair');
    }
  } else {
    throw new Error('Unknown transformer type');
  }
}

export function transform(
  input: GeometryOptions,
  transformers: {[key: string]: Transformer;},
): GeometryOptions {
  const output = {...input, attributes: {...input.attributes}};
  const vertexCount = inferVertexCount(input);
  Object.keys(transformers).forEach((key) => {
    const transformer = transformers[key];
    let original = input.attributes[key];
    if (original == null) {
      if (
        (Array.isArray(transformer) || transformer instanceof Float32Array) &&
        transformer.length <= 4
      ) {
        original = {
          size: transformer.length,
          data: new Float32Array(transformer.length * vertexCount),
        };
      } else {
        return;
      }
    }

    const data = new Float32Array(original.data);
    const size = original.size;
    const transformerFunc = getTransformer(original.size, transformer);

    if (size <= 0) {
      throw new Error('Size must be larger than 0');
    }
    for (let i = 0; i < data.length; i += size) {
      const value = data.subarray(i, i + size);
      // Now, change the value (We can do it safely because we're working with
      // the clone)
      transformerFunc(value);
    }

    output.attributes[key] = {data, size};
  });
  return output;
}
