import type {Renderer} from '../Renderer';

import {UniformEntry} from './types';
import {isUniformType} from './utils';

export function setUniforms(
  renderer: Renderer,
  value: unknown,
  entry: UniformEntry,
): void {
  if (entry == null) {
    throw new Error('Unregistered uniform');
  } else if (isUniformType(entry)) {
    // TODO: Assign to GL buffer
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
