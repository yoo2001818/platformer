import {Engine} from '../../core/Engine';
import {EventEmitter} from '../EventEmitter';

export class ViewportModel {
  engine: Engine;
  viewports: unknown[];
  emitter: EventEmitter;

  constructor(engine: Engine) {
    this.engine = engine;
    this.viewports = [];
    this.emitter = new EventEmitter();
  }

  addViewport(viewport: unknown): void {
    this.viewports.push(viewport);
  }

  removeViewport(viewport: unknown): void {
    this.viewports = this.viewports.filter((v) => v !== viewport);
  }
}
