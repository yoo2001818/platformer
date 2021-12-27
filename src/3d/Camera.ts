import {mat4} from 'gl-matrix';

import {Entity} from '../core/Entity';

import {Transform} from './Transform';

export interface CameraOptions {
  type: 'ortho' | 'perspective';
  near: number;
  far: number;
  fov: number;
}

export class Camera {
  static fromJSON(options: unknown): Camera {
    return new Camera(options as CameraOptions);
  }

  options: CameraOptions;
  projection: Float32Array;
  inverseProjection: Float32Array;

  constructor(options: CameraOptions) {
    this.options = options;
    this.projection = mat4.create() as Float32Array;
    this.inverseProjection = mat4.create() as Float32Array;
  }

  setOptions(options: CameraOptions): void {
    this.options = options;
  }

  getProjection(aspect: number): Float32Array {
    const {type, near, far, fov} = this.options;
    switch (type) {
      case 'perspective':
        mat4.perspective(this.projection, fov, aspect, near, far);
        break;
      case 'ortho':
        mat4.ortho(
          this.projection,
          -1,
          1,
          -1 / aspect,
          1 / aspect,
          near,
          far,
        );
        break;
    }
    return this.projection;
  }

  getView(entity: Entity): Float32Array {
    const transform = entity.get<Transform>('transform')!;
    return transform.getMatrixInverseWorld();
  }

  getInverseProjection(aspect: number): Float32Array {
    mat4.invert(this.inverseProjection, this.getProjection(aspect));
    return this.inverseProjection;
  }

  getInverseView(entity: Entity): Float32Array {
    const transform = entity.get<Transform>('transform')!;
    return transform.getMatrixWorld();
  }

  getProjectionView(entity: Entity, aspect: number): mat4 {
    const view = this.getView(entity);
    const projection = this.getProjection(aspect);
    const output = mat4.create();
    mat4.mul(output, projection, view);
    return output;
  }


  getInverseProjectionView(entity: Entity, aspect: number): mat4 {
    const inverseView = this.getInverseView(entity);
    const inverseProjection = this.getInverseProjection(aspect);
    const output = mat4.create();
    mat4.mul(output, inverseView, inverseProjection);
    return output;
  }

  clone(): Camera {
    return new Camera(this.options);
  }

  toJSON(): unknown {
    return this.options;
  }
}
