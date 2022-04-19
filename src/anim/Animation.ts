import {Entity} from '../core/Entity';

export interface AnimationTarget {
  entity: Entity;
  path: 'rotation' | 'scale' | 'position';
}

export interface AnimationChannel {
  target: number;
  input: Float32Array;
  output: Float32Array;
  interpolation?: string;
}

export interface AnimationClip {
  name: string;
  channels: AnimationChannel[];
  duration: number;
}

export interface Animation {
  targets: AnimationTarget[];
  clips: AnimationClip[];
  currentTime: number;
}
