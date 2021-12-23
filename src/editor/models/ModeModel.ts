import {Engine, UPDATE_PHASE} from '../../core/Engine';
import {Signal} from '../../core/Signal';
import {DefaultMode} from '../modes/DefaultMode';
import {EditorMode} from '../modes/EditorMode';
import {Viewport} from '../Viewport';

import {ViewportModel} from './ViewportModel';

export class ModeModel {
  engine: Engine;
  signal: Signal;
  mode: EditorMode;

  constructor(engine: Engine) {
    this.engine = engine;
    this.signal = new Signal();
    this.mode = new DefaultMode();
    this.mode.bind(engine);
    this.processEvent = this.processEvent.bind(this);
    this.update = this.update.bind(this);

    this.engine.getModel<ViewportModel>('viewport').emitter
      .on('all', this.processEvent);
    this.engine.registerSystem(UPDATE_PHASE, this.update);
  }

  setMode(mode: EditorMode): void {
    this.mode.destroy();
    this.mode = mode;
    mode.bind(this.engine);
  }

  processEvent(type: string, viewport: Viewport, ...args: any[]): void {
    this.mode.processEvent(type, viewport, ...args);
  }

  update(deltaTime?: number): void {
    this.mode.update(deltaTime);
  }
}
