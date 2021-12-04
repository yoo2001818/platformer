import {GizmoEffect} from '../render/effect/GizmoEffect';
import {Renderer} from '../render/Renderer';

import {ModeModel} from './models/ModeModel';
import {Viewport} from './Viewport';

export class ViewportEffect implements GizmoEffect<unknown> {
  viewport: Viewport;
  prevEffects: GizmoEffect<unknown>[];

  constructor(viewport: Viewport) {
    this.viewport = viewport;
    this.prevEffects = [];
  }

  bind(renderer: Renderer): void {
    //
  }

  render(deltaTime?: number): void {
    const modeModel = this.viewport.engine!.getModel<ModeModel>('mode');
    const effects = modeModel.mode.getEffects(this.viewport);
    // Bind and dispose effects
    effects.forEach((effect) => {
      //
    });
  }

  dispose(): void {
    //
  }

}
