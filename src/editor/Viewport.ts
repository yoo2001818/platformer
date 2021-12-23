import {Engine} from '../core/Engine';
import {GizmoEffect} from '../render/effect/GizmoEffect';
import {Renderer} from '../render/Renderer';

import {ViewportModel} from './models/ViewportModel';
import {ViewportEffect} from './ViewportEffect';

export class Viewport {
  engine: Engine | null;
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  viewportEffect: ViewportEffect;
  unattachFn: (() => void) | null;

  constructor(
    canvas: HTMLCanvasElement,
    renderer: Renderer,
  ) {
    this.engine = null;
    this.canvas = canvas;
    this.renderer = renderer;
    this.unattachFn = null;
    this.viewportEffect = new ViewportEffect(this);
  }

  attach(engine: Engine): void {
    this.engine = engine;
    const viewportModel = engine.getModel<ViewportModel>('viewport');
    const callbacks = [
      'mousedown',
      'mousemove',
      'mouseup',
      'click',
      'contextmenu',
      'keydown',
      'keyup',
      'touchstart',
      'wheel',
    ].map((name) => {
      const callback =
        (...args: any[]) => viewportModel.emitter.emit(name, [this, ...args]);
      this.canvas.addEventListener(name, callback);
      return {name, callback};
    });
    this.unattachFn = () => {
      callbacks.forEach(({name, callback}) => {
        this.canvas.removeEventListener(name, callback);
      });
    };
    this.renderer.gizmoEffects.push(this.viewportEffect);
  }

  unattach(): void {
    if (this.unattachFn != null) {
      this.unattachFn();
      this.unattachFn = null;
    }
  }

  getEffect<T extends GizmoEffect<any>>(key: string): T | null {
    return this.viewportEffect.get(key);
  }
}
