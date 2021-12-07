import {GizmoEffect} from '../render/effect/GizmoEffect';
import {Renderer} from '../render/Renderer';

import {ModeModel} from './models/ModeModel';
import {Viewport} from './Viewport';

interface RenderInstance {
  key: unknown;
  instance: GizmoEffect<any>;
}

export class ViewportEffect implements GizmoEffect<unknown> {
  viewport: Viewport;
  renderer: Renderer | null;
  prevEffects: RenderInstance[];

  constructor(viewport: Viewport) {
    this.viewport = viewport;
    this.renderer = null;
    this.prevEffects = [];
  }

  bind(renderer: Renderer): void {
    this.renderer = renderer;
  }

  render(deltaTime?: number): void {
    const renderer = this.renderer;
    if (renderer == null) {
      throw new Error('It must be bound first');
    }
    const modeModel = this.viewport.engine!.getModel<ModeModel>('mode');
    const effects = modeModel.mode.getEffects(this.viewport);
    // Run diff checks; we'll use Map for this purpose
    const prevMap = new Map(
      this.prevEffects
        .map((v) => [v.key, v.instance]),
    );
    const nextEffects: RenderInstance[] = [];
    effects.forEach((effect) => {
      const {key} = effect.props;
      const prevItem = prevMap.get(key);
      if (prevItem != null) {
        prevMap.delete(key);
        // Render
        prevItem.render(effect.props, deltaTime);
        nextEffects.push({key, instance: prevItem});
      } else {
        // Register a new effect
        const Component = effect.component;
        const instance = new Component();
        // Bind and render
        instance.bind(renderer);
        instance.render(effect.props, deltaTime);
        nextEffects.push({key, instance});
      }
    });
    // Remove unused entries
    prevMap.forEach((instance) => {
      instance.dispose();
    });
    this.prevEffects = nextEffects;
  }

  dispose(): void {
    // Dispose all effects
    this.prevEffects.forEach(({instance}) => {
      instance.dispose();
    });
    this.prevEffects = [];
  }

}
