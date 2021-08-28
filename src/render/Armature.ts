import {mat4} from 'gl-matrix';

import {Transform} from '../3d/Transform';
import {TransformComponent} from '../3d/TransformComponent';
import {Entity} from '../core/Entity';
import {EntityFuture} from '../core/EntityFuture';
import {EntityStore} from '../core/EntityStore';

export interface ArmatureOptions {
  inverseBindMatrices: Float32Array;
  joints: Entity[];
  skeleton: Entity | null;
}

export interface ArmatureOptionsWithFuture {
  inverseBindMatrices: Float32Array;
  joints: (Entity | EntityFuture)[];
  skeleton: (Entity | EntityFuture) | null;
}

export class Armature {
  options: ArmatureOptions;
  matrixData: Float32Array;
  entityStore: EntityStore | null;

  constructor(options: ArmatureOptions) {
    this.options = options;
    this.matrixData = new Float32Array(options.inverseBindMatrices.length);
    this.entityStore = null;
  }

  register(entityStore: EntityStore): void {
    this.entityStore = entityStore;
  }

  getMatrix(): Float32Array {
    const {inverseBindMatrices, joints} = this.options;
    const {matrixData, entityStore} = this;
    if (entityStore == null) {
      throw new Error('EntityStore is not bound');
    }
    const transformComp =
      entityStore.getComponent<TransformComponent>('transform');
    // Loop all entities and multiply with inverse bind matrices
    for (let i = 0; i < joints.length; i += 1) {
      const target = matrixData.slice(i * 16, (i + 1) * 16);
      const invMatrix = inverseBindMatrices.slice(i * 16, (i + 1) * 16);
      const entity = joints[i];
      const transform = transformComp.get(entity)!;
      mat4.multiply(target, invMatrix, transform.getMatrixWorld());
    }
    return matrixData;
  }
}
