import {Entity} from '../core/Entity';
import {EntityFuture} from '../core/EntityFuture';

export interface Armature {
  inverseBindMatrices: Float32Array;
  joints: Entity[];
  skeleton: Entity | null;
}

export interface ArmatureWithFuture {
  inverseBindMatrices: Float32Array;
  joints: (Entity | EntityFuture)[];
  skeleton: (Entity | EntityFuture) | null;
}
