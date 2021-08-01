import {EntityStore} from '../core/EntityStore';

import {GLRenderer} from './gl/GLRenderer';

export class Renderer {
  glRenderer: GLRenderer;
  entityStore: EntityStore;

  constructor(
    glRenderer: GLRenderer,
    entityStore: EntityStore,
  ) {
    this.glRenderer = glRenderer;
    this.entityStore = entityStore;
  }

  render(): void {
    const {glRenderer, entityStore} = this;
  }
}
