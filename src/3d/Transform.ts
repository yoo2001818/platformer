import {mat4, vec3, quat} from 'gl-matrix';

import {Entity} from '../core/Entity';

import {TransformComponent} from './TransformComponent';

export class Transform {

  static fromJSON(data: unknown): Transform {
    if (data instanceof Transform) {
      return data;
    }
    const transform = new Transform();
    if (typeof data === 'object' && data != null) {
      const dataJSON = data as
        {position: number[]; scale: number[]; rotation: number[];};
      if ('position' in data) {
        transform.setPosition(dataJSON.position as vec3);
      }
      if ('scale' in data) {
        transform.setScale(dataJSON.scale as vec3);
      }
      if ('rotation' in data) {
        transform.setRotation(dataJSON.rotation as quat);
      }
    }
    return transform;
  }

  position: Float32Array;
  scale: Float32Array;
  rotation: Float32Array;
  matrix: Float32Array;
  _matrixVersion: number;
  _componentVersion: number;
  worldMatrix: Float32Array;
  worldInverseMatrix: Float32Array;
  _parentVersion: number;
  _globalVersion: number;
  _parentId: number;
  _inverseVersion: number;
  entity: Entity | null = null;
  component: TransformComponent | null = null;

  constructor() {
    this.position = new Float32Array([0, 0, 0]);
    this.scale = new Float32Array([1, 1, 1]);
    this.rotation = quat.create() as Float32Array;
    this.matrix = mat4.create() as Float32Array;
    this.worldMatrix = mat4.create() as Float32Array;
    this.worldInverseMatrix = mat4.create() as Float32Array;
    this._matrixVersion = 0;
    this._componentVersion = 0;
    this._parentVersion = 0;
    this._globalVersion = -1;
    this._parentId = -1;
    this._inverseVersion = -1;
  }

  _updateComponents(): void {
    if (this._componentVersion < this._matrixVersion) {
      mat4.getTranslation(this.position, this.matrix);
      mat4.getScaling(this.scale, this.matrix);
      mat4.getRotation(this.rotation, this.matrix);
      this._componentVersion = this._matrixVersion;
    }
  }

  _updateMatrix(): void {
    if (this._matrixVersion < this._componentVersion) {
      mat4.fromRotationTranslationScale(
        this.matrix,
        this.rotation,
        this.position,
        this.scale,
      );
      this._matrixVersion = this._componentVersion;
    }
  }

  _getParentWorldMatrix(): mat4 | null {
    const parent = this.entity?.get<Entity | null>('parent');
    if (parent == null) {
      return null;
    }
    const parentTransform = parent.get<Transform>('transform')!;
    const parentMat = parentTransform.getMatrixWorld();
    // We don't do version check here because we assume that parent transform
    // will be valid here
    return parentMat;
  }

  _getParentWorldInverseMatrix(): mat4 | null {
    const parent = this.entity?.get<Entity | null>('parent');
    if (parent == null) {
      return null;
    }
    const parentTransform = parent.get<Transform>('transform')!;
    const parentMat = parentTransform.getMatrixInverseWorld();
    // We don't do version check here because we assume that parent transform
    // will be valid here
    return parentMat;
  }

  _updateWorldMatrix(): void {
    if (this.component!.globalVersion === this._globalVersion) {
      return;
    }
    this._updateMatrix();
    const parent = this.entity?.get<Entity | null>('parent');
    if (parent != null) {
      const parentTransform = parent.get<Transform>('transform')!;
      const parentMat = parentTransform.getMatrixWorld();
      const targetId = parent.handle.id;
      const targetVersion = this._matrixVersion + parentTransform._parentVersion;
      if (
        this._parentId !== targetId ||
        this._parentVersion !== targetVersion
      ) {
        mat4.mul(this.worldMatrix, parentMat, this.matrix);
        this._parentId = targetId;
        this._parentVersion = targetVersion;
        this._inverseVersion = -1;
      }
    } else if (
      this._parentId !== -1 ||
      this._parentVersion !== this._matrixVersion
    ) {
      mat4.copy(this.worldMatrix, this.matrix);
      this._parentId = -1;
      this._parentVersion = this._matrixVersion;
      this._inverseVersion = -1;
    }
    this._globalVersion = this.component!.globalVersion;
  }

  _updateWorldInverseMatrix(): void {
    if (this.component!.globalVersion === this._inverseVersion) {
      return;
    }
    this._updateWorldMatrix();
    if (this._inverseVersion === -1) {
      mat4.invert(this.worldInverseMatrix, this.worldMatrix);
      this._inverseVersion = this.component!.globalVersion;
    }
  }

  register(entity: Entity, component: TransformComponent): void {
    this.entity = entity;
    this.component = component;
  }

  unregister(): void {
    this.entity = null;
  }

  getPosition(): Float32Array {
    this._updateComponents();
    return this.position;
  }

  getScale(): Float32Array {
    this._updateComponents();
    return this.scale;
  }

  getRotation(): Float32Array {
    this._updateComponents();
    return this.rotation;
  }

  getMatrixLocal(): Float32Array {
    this._updateMatrix();
    return this.matrix;
  }

  getMatrixWorld(): Float32Array {
    this._updateWorldMatrix();
    return this.worldMatrix;
  }

  getPositionWorld(): Float32Array {
    this._updateWorldMatrix();
    return mat4.getTranslation(vec3.create(), this.worldMatrix) as Float32Array;
  }

  getScaleWorld(): Float32Array {
    this._updateWorldMatrix();
    return mat4.getScaling(vec3.create(), this.worldMatrix) as Float32Array;
  }

  getRotationWorld(): Float32Array {
    this._updateWorldMatrix();
    return mat4.getRotation(quat.create(), this.worldMatrix) as Float32Array;
  }

  getMatrixInverseWorld(): Float32Array {
    this._updateWorldInverseMatrix();
    return this.worldInverseMatrix;
  }

  markChanged(): void {
    this._updateComponents();
    this._componentVersion += 1;
    this.component?.markGlobalDirty();
  }

  markMatrixChanged(): void {
    this._matrixVersion += 1;
    this.component?.markGlobalDirty();
  }

  setPosition(position: vec3): this {
    this.markChanged();
    vec3.copy(this.position, position);
    return this;
  }

  setPositionWorld(position: vec3): this {
    const parentMat = this._getParentWorldInverseMatrix();
    if (parentMat == null) {
      return this.setPosition(position);
    }
    // Multiply current position by world's inverse matrix
    const nextPos = vec3.create();
    vec3.transformMat4(nextPos, position, parentMat);
    return this.setPosition(nextPos);
  }

  setScale(scale: vec3): this {
    this.markChanged();
    vec3.copy(this.scale, scale);
    return this;
  }

  setScaleWorld(scale: vec3): this {
    const parentMat = this._getParentWorldMatrix();
    if (parentMat == null) {
      return this.setScale(scale);
    }
    const nextScale = vec3.create();
    mat4.getScaling(nextScale, parentMat);
    vec3.divide(nextScale, scale, nextScale);
    return this.setScale(nextScale);
  }

  setRotation(rotation: quat): this {
    this.markChanged();
    quat.copy(this.rotation, rotation);
    return this;
  }

  setRotationWorld(rotation: quat): this {
    const parentMat = this._getParentWorldMatrix();
    if (parentMat == null) {
      return this.setRotation(rotation);
    }
    const nextRotation = quat.create();
    mat4.getRotation(nextRotation, parentMat);
    quat.normalize(nextRotation, nextRotation);
    quat.conjugate(nextRotation, nextRotation);
    quat.multiply(nextRotation, nextRotation, rotation);
    return this.setRotation(nextRotation);
  }

  setMatrix(matrix: mat4): this {
    this.markMatrixChanged();
    mat4.copy(this.matrix, matrix);
    return this;
  }

  applyMatrix(matrix: mat4): this {
    this._updateMatrix();
    this.markMatrixChanged();
    mat4.multiply(this.matrix, matrix, this.matrix);
    return this;
  }

  setMatrixWorld(matrix: mat4): this {
    const parentMat = this._getParentWorldInverseMatrix();
    if (parentMat == null) {
      return this.setMatrix(matrix);
    }
    const nextMat = mat4.create();
    mat4.mul(nextMat, parentMat, matrix);
    return this.setMatrix(nextMat);
  }

  rotate(rotation: quat): this {
    this._updateComponents();
    this.markChanged();
    quat.multiply(this.rotation, rotation, this.rotation);
    return this;
  }

  translate(position: vec3): this {
    this._updateComponents();
    this.markChanged();
    vec3.add(this.position, position, this.position);
    return this;
  }

  rotateX(rad: number): this {
    this._updateComponents();
    this.markChanged();
    quat.rotateX(this.rotation, this.rotation, rad);
    return this;
  }

  rotateY(rad: number): this {
    this._updateComponents();
    this.markChanged();
    quat.rotateY(this.rotation, this.rotation, rad);
    return this;
  }

  rotateZ(rad: number): this {
    this._updateComponents();
    this.markChanged();
    quat.rotateZ(this.rotation, this.rotation, rad);
    return this;
  }

  rotateAxis(axis: vec3, rad: number): this {
    const tmp = quat.create();
    quat.setAxisAngle(tmp, axis, rad);
    return this.rotate(tmp);
  }

  lookAt(target: vec3): this {
    // https://stackoverflow.com/a/51170230
    const to = vec3.create();
    vec3.subtract(to, target, this.getPosition());
    vec3.normalize(to, to);

    const rot = vec3.create();
    vec3.cross(rot, [0, 0, 1], to);
    vec3.normalize(rot, rot);
    if (vec3.sqrLen(rot) === 0) {
      vec3.copy(rot, [0, 1, 0]);
    }

    const dot = vec3.dot([0, 0, 1], to);
    const angle = Math.acos(dot);

    const out = quat.create();
    quat.setAxisAngle(out, rot, angle);
    return this.setRotation(out);
  }

  toJSON(): unknown {
    return {
      position: Array.from(this.position),
      scale: Array.from(this.scale),
      rotation: Array.from(this.rotation),
    };
  }

  clone(): Transform {
    const result = new Transform();
    result.setMatrix(this.getMatrixLocal());
    return result;
  }

}
