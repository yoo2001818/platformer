import {Engine} from '../../core/Engine';
import {GizmoPosRotScaleEffect} from '../gizmoEffects/GizmoPosRotScaleEffect';
import {SelectedEffect} from '../gizmoEffects/SelectedEffect';
import {gizmoItem, RenderNode} from '../ModeState';

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
    return [
      gizmoItem(SelectedEffect, {key: 'selected'}),
      gizmoItem(GizmoPosRotScaleEffect, {key: 'posRotScale'}),
    ];
  }

}
