import {Engine} from '../../core/Engine';
import {GizmoEffect} from '../../render/effect/GizmoEffect';

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

  getEffects(): GizmoEffect[] {
    return [];
  }

}
