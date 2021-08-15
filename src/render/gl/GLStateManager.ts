import {GLRenderer} from './GLRenderer';

export class GLStateManager {
  renderer: GLRenderer;
  constructor(renderer: GLRenderer) {
    this.renderer = renderer;
  }
}
