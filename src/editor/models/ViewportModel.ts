import {Engine} from '../../core/Engine';
import {EventEmitter} from '../EventEmitter';
import {Viewport} from '../Viewport';

export class ViewportModel {
  engine: Engine;
  viewports: unknown[];
  emitter: EventEmitter;

  constructor(engine: Engine) {
    this.engine = engine;
    this.viewports = [];
    this.emitter = new EventEmitter();
  }

  addViewport(viewport: Viewport): void {
    this.viewports.push(viewport);
  }

  removeViewport(viewport: Viewport): void {
    this.viewports = this.viewports.filter((v) => v !== viewport);
  }
}
