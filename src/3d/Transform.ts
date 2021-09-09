import {mat4, vec3, quat} from 'gl-matrix';

import {Entity} from '../core/Entity';

import {TransformComponent} from './TransformComponent';

export class Transform {
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

  setScale(scale: vec3): this {
    this.markChanged();
    vec3.copy(this.scale, scale);
    return this;
  }

  setRotation(rotation: quat): this {
    this.markChanged();
    quat.copy(this.rotation, rotation);
    return this;
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
}
