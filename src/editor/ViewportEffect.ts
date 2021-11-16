import {GizmoEffect} from '../render/effect/GizmoEffect';
import {Renderer} from '../render/Renderer';

import {Viewport} from './Viewport';

export class ViewportEffect implements GizmoEffect {
  constructor(viewport: Viewport) {
  }

  bind(renderer: Renderer): void {
    throw new Error('Method not implemented.');
  }

  render(deltaTime?: number): void {
    throw new Error('Method not implemented.');
  }

  dispose(): void {
    throw new Error('Method not implemented.');
  }

}
