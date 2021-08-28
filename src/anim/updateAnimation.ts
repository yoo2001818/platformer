import {quat} from 'gl-matrix';

import {Transform} from '../3d/Transform';
import {EntityStore} from '../core/EntityStore';

import {Animation} from './Animation';

function binarySearch(
  value: number,
  input: Float32Array,
): number {
  let min = 0;
  let max = input.length - 2;
  while (min < max) {
    const mid = Math.floor(min + (max - min + 1) / 2);
    if (input[mid] > value) {
      max = mid - 1;
    } else {
      min = mid;
    }
  }
  return min;
}

function interpolateArray(
  pos: number,
  t: number,
  size: number,
  data: Float32Array,
): Float32Array {
  const output = new Float32Array(size);
  for (let i = 0; i < size; i += 1) {
    const min = data[pos * size + i];
    const max = data[(pos + 1) * size + i];
    output[i] = min + (max - min) * t;
  }
  return output;
}

export function updateAnimation(
  store: EntityStore,
  deltaTime: number,
): void {
  store.forEachWith(['animation'], (entity) => {
    const animation = entity.get<Animation>('animation')!;
    animation.currentTime += deltaTime;
    const clipDuration =
      animation.clips.reduce((p, v) => Math.max(p, v.duration), 0);
    const currentTime = animation.currentTime % clipDuration;
    animation.clips.forEach((clip) => {
      clip.channels.forEach((channel) => {
        // Run binary search to determine current position
        const pos = binarySearch(currentTime, channel.input);
        const tmin = channel.input[pos];
        const tmax = channel.input[pos + 1];
        const t = Math.min(1, Math.max(0, (currentTime - tmin) / (tmax - tmin)));
        // Blend the target
        const target = animation.targets[channel.target];
        const transform = target.entity.get<Transform>('transform')!;
        switch (target.path) {
          case 'position':
            transform.setPosition(interpolateArray(pos, t, 3, channel.output));
            break;
          case 'rotation': {
            const min = channel.output.subarray(pos * 4, (pos + 1) * 4);
            const max = channel.output.subarray((pos + 1) * 4, (pos + 2) * 4);
            const out = quat.create();
            quat.slerp(out, min, max, t);
            transform.setRotation(out);
            break;
          }
          case 'scale':
            transform.setScale(interpolateArray(pos, t, 3, channel.output));
            break;
          default:
            throw new Error(`Unknown animation path ${target.path}`);
        }
      });
    });
  });
}
