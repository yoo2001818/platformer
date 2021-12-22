import {Engine} from '../../core/Engine';
import {GizmoPosRotScaleEffect} from '../gizmoEffects/GizmoPosRotScaleEffect';
import {SelectedEffect} from '../gizmoEffects/SelectedEffect';
import {gizmoItem, RenderNode} from '../ModeState';
import {selectedEntity} from '../../ui/states/selection';
import {Viewport} from '../Viewport';
import {MousePicker} from '../MousePicker';

import {EditorMode} from './EditorMode';

export class DefaultMode implements EditorMode {
  engine: Engine | null = null;
  mousePickMap: Map<Viewport, MousePicker> = new Map();

  bind(engine: Engine): void {
    this.engine = engine;
    this.mousePickMap = new Map();
  }

  destroy(): void {
    this.engine = null;
    for (const mousePicker of this.mousePickMap.values()) {
      mousePicker.dispose();
    }
    this.mousePickMap.clear();
  }

  update(deltaTime?: number): void {
  }

  _getMousePicker(viewport: Viewport): MousePicker {
    const entry = this.mousePickMap.get(viewport);
    if (entry != null) {
      return entry;
    }
    const newEntry = new MousePicker(viewport.renderer);
    this.mousePickMap.set(viewport, newEntry);
    return newEntry;
  }

  processEvent(type: string, viewport: Viewport, ...args: any[]): void {
    switch (type) {
      case 'click': {
        const {entityStore} = this.engine!;
        const event: MouseEvent = args[0];
        // Get relative position of the canvas
        const canvasBounds = viewport.canvas.getBoundingClientRect();
        const targetX = Math.floor(event.clientX - canvasBounds.left);
        const targetY = Math.floor(
          canvasBounds.height - (event.clientY - canvasBounds.top),
        );
        // Run mouse picking
        const picker = this._getMousePicker(viewport);
        picker.render();
        const entity = picker.getEntity(targetX, targetY);
        if (entity != null) {
          entityStore.getAtom(selectedEntity).setState(entity.handle);
        }
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
