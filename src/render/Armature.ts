import {mat4} from 'gl-matrix';

import {TransformComponent} from '../3d/TransformComponent';
import {Entity} from '../core/Entity';
import {EntityFuture} from '../core/EntityFuture';
import {EntityStore} from '../core/EntityStore';

import {GLTexture2D} from './gl/GLTexture2D';

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
  texture: GLTexture2D;
  entityStore: EntityStore | null;
  _matrixVersion = -1;
  _textureVersion = -1;

  constructor(options: ArmatureOptions) {
    this.options = options;
    this.matrixData = new Float32Array(options.inverseBindMatrices.length);
    this.texture = new GLTexture2D({
      format: 'rgba',
      type: 'float',
      minFilter: 'nearest',
      magFilter: 'nearest',
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      source: null,
    });
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
    if (transformComp.globalVersion === this._matrixVersion) {
      return matrixData;
    }
    // Loop all entities and multiply with inverse bind matrices
    for (let i = 0; i < joints.length; i += 1) {
      const target = matrixData.subarray(i * 16, (i + 1) * 16);
      const invMatrix = inverseBindMatrices.subarray(i * 16, (i + 1) * 16);
      const entity = joints[i];
      const transform = transformComp.get(entity)!;
      mat4.multiply(target, transform.getMatrixWorld(), invMatrix);
    }
    this._matrixVersion = transformComp.globalVersion;
    return matrixData;
  }

  getTexture(): GLTexture2D {
    const {entityStore} = this;
    if (entityStore == null) {
      throw new Error('EntityStore is not bound');
    }
    const transformComp =
      entityStore.getComponent<TransformComponent>('transform');
    if (transformComp.globalVersion === this._textureVersion) {
      return this.texture;
    }
    const matrix = this.getMatrix();
    this.texture.setOptions({
      format: 'rgba',
      type: 'float',
      minFilter: 'nearest',
      magFilter: 'nearest',
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      source: matrix,
      width: matrix.length / 4,
      height: 1,
    });
    this._textureVersion = transformComp.globalVersion;
    return this.texture;
  }
}
