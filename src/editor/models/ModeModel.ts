import {Engine} from '../../core/Engine';
import {Signal} from '../../core/Signal';
import {DefaultMode} from '../modes/DefaultMode';
import {EditorMode} from '../modes/EditorMode';

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

    this.engine.getModel<ViewportModel>('viewport').emitter
      .on('all', this.processEvent);
  }

  setMode(mode: EditorMode): void {
    this.mode.destroy();
    this.mode = mode;
    mode.bind(this.engine);
  }

  processEvent(type: string, ...args: any[]): void {
    this.mode.processEvent(type, ...args);
  }
}
