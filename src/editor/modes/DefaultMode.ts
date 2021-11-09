import {Engine} from '../../core/Engine';

import {EditorMode} from './EditorMode';

export class DefaultMode implements EditorMode {

  bind(engine: Engine): void {
    // Set up events and appropriate effects. Preferably call viewportModel?
    throw new Error('Method not implemented.');
  }

  destroy(): void {
    throw new Error('Method not implemented.');
  }

}
