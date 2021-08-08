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
  options: CameraOptions;
  projection: Float32Array;
  inverseProjection: Float32Array;
  view: Float32Array;

  constructor(options: CameraOptions) {
    this.options = options;
    this.projection = mat4.create() as Float32Array;
    this.inverseProjection = mat4.create() as Float32Array;
    this.view = mat4.create() as Float32Array;
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
    mat4.invert(this.view, transform.getMatrix());
    return this.view;
  }

  getInverseProjection(aspect: number): Float32Array {
    mat4.invert(this.inverseProjection, this.getProjection(aspect));
    return this.inverseProjection;
  }

  getInverseView(entity: Entity): Float32Array {
    const transform = entity.get<Transform>('transform')!;
    return transform.getMatrix();
  }
}
