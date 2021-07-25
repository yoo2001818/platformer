import type {GLRenderer} from '../GLRenderer';
import {GLTexture} from '../GLTexture';

import {UniformEntry} from './types';
import {
  isUniformType,
  convertFloat,
  convertFloatArray,
  convertInt,
  convertIntArray,
} from './utils';

export function setUniforms(
  renderer: GLRenderer,
  value: unknown,
  entry: UniformEntry,
): void {
  if (entry == null) {
    // noop
  } else if (isUniformType(entry)) {
    const {gl} = renderer;
    switch (entry.type) {
      case gl.FLOAT:
        gl.uniform1f(entry.location, convertFloat(value));
        break;
      case gl.FLOAT_VEC2:
        gl.uniform2fv(entry.location, convertFloatArray(value, 2));
        break;
      case gl.FLOAT_VEC3:
        gl.uniform3fv(entry.location, convertFloatArray(value, 3));
        break;
      case gl.FLOAT_VEC4:
        gl.uniform4fv(entry.location, convertFloatArray(value, 4));
        break;
      case gl.FLOAT_MAT2:
        gl.uniformMatrix2fv(
          entry.location,
          false,
          convertFloatArray(value, 4),
        );
        break;
      case gl.FLOAT_MAT3:
        gl.uniformMatrix3fv(
          entry.location,
          false,
          convertFloatArray(value, 9),
        );
        break;
      case gl.FLOAT_MAT4:
        gl.uniformMatrix4fv(
          entry.location,
          false,
          convertFloatArray(value, 16),
        );
        break;
      case gl.INT_VEC2:
      case gl.BOOL_VEC2:
        gl.uniform2iv(entry.location, convertIntArray(value, 2));
        break;
      case gl.INT_VEC3:
      case gl.BOOL_VEC3:
        gl.uniform3iv(entry.location, convertIntArray(value, 3));
        break;
      case gl.INT_VEC4:
      case gl.BOOL_VEC4:
        gl.uniform4iv(entry.location, convertIntArray(value, 4));
        break;
      case gl.BOOL:
      case gl.BYTE:
      case gl.UNSIGNED_BYTE:
      case gl.SHORT:
      case gl.UNSIGNED_SHORT:
      case gl.INT:
      case gl.UNSIGNED_INT:
        gl.uniform1i(entry.location, convertInt(value));
        break;
      case gl.SAMPLER_2D:
      case gl.SAMPLER_CUBE: {
        // Try to find the entity with given ID - however, if the texture
        // is missing, we need to use "placeholder" texture.
        if (value instanceof GLTexture) {
          const samplerId = renderer.textureManager.bind(value);
          gl.uniform1i(entry.location, samplerId);
        }
        break;
      }
      default:
        throw new Error('Unsupported type');
    }
  } else if (Array.isArray(entry)) {
    if (!Array.isArray(value)) {
      throw new Error('An array is expected to uniform');
    }
    value.forEach((child, index) => {
      setUniforms(renderer, child, entry[index]);
    });
  } else if (typeof value === 'object') {
    const valueMap = value as {[key: string]: unknown;};
    for (const key in valueMap) {
      if (key in valueMap) {
        setUniforms(renderer, valueMap[key], entry[key]);
      }
    }
  }
}
