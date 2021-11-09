import {Engine} from '../../core/Engine';

export class ViewportModel {
  engine: Engine;
  viewports: unknown[];

  constructor(engine: Engine) {
    this.engine = engine;
    this.viewports = [];
  }

  addViewport(viewport: unknown): void {
    this.viewports.push(viewport);
  }

  removeViewport(viewport: unknown): void {
    this.viewports = this.viewports.filter((v) => v !== viewport);
  }
}
