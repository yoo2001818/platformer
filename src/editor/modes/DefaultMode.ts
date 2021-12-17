import {Engine} from '../../core/Engine';
import {GizmoPosRotScaleEffect} from '../gizmoEffects/GizmoPosRotScaleEffect';
import {SelectedEffect} from '../gizmoEffects/SelectedEffect';
import {gizmoItem, RenderNode} from '../ModeState';
import {selectedEntity} from '../../ui/states/selection';

import {EditorMode} from './EditorMode';

export class DefaultMode implements EditorMode {
  engine: Engine | null = null;

  bind(engine: Engine): void {
    this.engine = engine;
  }

  destroy(): void {
    this.engine = null;
  }

  update(deltaTime?: number): void {
  }

  processEvent(type: string, ...args: any[]): void {
    switch (type) {
      case 'click': {
        const event: MouseEvent = args[0];
        // TODO: Implement mouse picking or whatever
        console.log(event);
        break;
      }
      default:
        break;
    }
  }

  getEffects(): RenderNode<unknown>[] {
    const {entityStore} = this.engine!;
    const selectedEntityHandle = entityStore.getAtom(selectedEntity).state;
    const entity = entityStore.get(selectedEntityHandle);
    return [
      gizmoItem(SelectedEffect, {
        entity,
        key: 'selected',
      }),
      gizmoItem(GizmoPosRotScaleEffect, {
        entity,
        key: 'posRotScale',
      }),
    ];
  }

}
