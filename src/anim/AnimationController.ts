import {Entity} from '../core/Entity';
import {EntityFuture} from '../core/EntityFuture';

export interface AnimationTarget {
  entity: Entity;
  path: 'rotation' | 'scale' | 'position';
}

export interface AnimationTargetWithFuture {
  entity: Entity | EntityFuture;
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
}

export interface AnimationController {
  targets: AnimationTarget[];
  clips: AnimationClip[];
  currentTime: number;
}

export interface AnimationControllerWithFuture {
  targets: AnimationTargetWithFuture[];
  clips: AnimationClip[];
  currentTime: number;
}
