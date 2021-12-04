import {Engine} from '../../core/Engine';
import {RenderNode} from '../ModeState';

import {EditorMode} from './EditorMode';

export class DefaultMode implements EditorMode {

  bind(engine: Engine): void {
  }

  destroy(): void {
  }

  update(deltaTime?: number): void {
  }

  processEvent(type: string, ...args: any[]): void {
  }

  getEffects(): RenderNode<unknown>[] {
    return [];
  }

}
