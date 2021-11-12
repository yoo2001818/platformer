import {Engine} from '../core/Engine';

import {ViewportModel} from './models/ViewportModel';

export class Viewport {
  engine: Engine | null;
  canvas: HTMLCanvasElement;
  unattachFn: (() => void) | null;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = null;
    this.canvas = canvas;
    this.unattachFn = null;
  }

  attach(engine: Engine): void {
    this.engine = engine;
    const viewportModel = engine.getModel<ViewportModel>('viewport');
    const callbacks = [
      'mousedown',
      'mousemove',
      'keydown',
      'keyup',
      'touchstart',
      'wheel',
    ].map((name) => {
      const callback =
        (...args: any[]) => viewportModel.emitter.emit(name, args);
      this.canvas.addEventListener(name, callback);
      return {name, callback};
    });
    this.unattachFn = () => {
      callbacks.forEach(({name, callback}) => {
        this.canvas.removeEventListener(name, callback);
      });
    };
  }

  unattach(): void {
    if (this.unattachFn != null) {
      this.unattachFn();
      this.unattachFn = null;
    }
  }
}
