import {Engine} from '../../core/Engine';
import {Signal} from '../../core/Signal';
import {DefaultMode} from '../modes/DefaultMode';
import {EditorMode} from '../modes/EditorMode';

export class ModeModel {
  engine: Engine;
  signal: Signal;
  mode: EditorMode;

  constructor(engine: Engine) {
    this.engine = engine;
    this.signal = new Signal();
    this.mode = new DefaultMode();
    this.mode.bind(engine);
  }

  setMode(mode: EditorMode): void {
    this.mode.destroy();
    this.mode = mode;
    mode.bind(this.engine);
  }
}
