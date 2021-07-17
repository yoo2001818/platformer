import {UniformEntry, UniformSlot} from './types';

export function isUniformType(t: UniformEntry): t is UniformSlot {
  return 'type' in t && t.type === 'uniform';
}
