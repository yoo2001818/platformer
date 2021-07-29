import {mat4, vec3, quat} from 'gl-matrix';

export class Transform {
  position: Float32Array;
  scale: Float32Array;
  rotation: Float32Array;
  matrix: Float32Array;
  _matrixVersion: number;
  _componentVersion: number;

  constructor() {
    this.position = new Float32Array([0, 0, 0]);
    this.scale = new Float32Array([1, 1, 1]);
    this.rotation = quat.create() as Float32Array;
    this.matrix = mat4.create() as Float32Array;
    this._matrixVersion = 0;
    this._componentVersion = 0;
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

  getMatrix(): Float32Array {
    this._updateMatrix();
    return this.matrix;
  }

  markChanged(): void {
    this._componentVersion += 1;
  }

  markMatrixChanged(): void {
    this._matrixVersion += 1;
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
}
