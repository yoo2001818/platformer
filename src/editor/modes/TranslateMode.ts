import {vec2, vec3} from 'gl-matrix';

import {Engine} from '../../core/Engine';
import {selectedEntity} from '../../ui/states/selection';
import {AxisEffect} from '../gizmoEffects/AxisEffect';
import {SelectedEffect} from '../gizmoEffects/SelectedEffect';
import {ModeModel} from '../models/ModeModel';
import {gizmoItem, RenderNode} from '../ModeState';
import {Viewport} from '../Viewport';

import {EditorMode} from './EditorMode';

export class TranslateMode implements EditorMode {
  engine: Engine | null = null;
  prevMode: EditorMode;
  initialNDC: vec2;
  alignAxis: vec3 | null;

  constructor(
    prevMode: EditorMode,
    initialNDC: vec2,
    alignAxis: vec3 | null,
  ) {
    this.prevMode = prevMode;
    this.initialNDC = initialNDC;
    this.alignAxis = alignAxis;
  }

  bind(engine: Engine): void {
    this.engine = engine;
  }

  destroy(): void {
    this.engine = null;
  }

  update(deltaTime?: number): void {
  }

  processEvent(type: string, viewport: Viewport, ...args: any[]): void {
    switch (type) {
      case 'mouseup': {
        const e: MouseEvent = args[0];
        if (e.button !== 0) {
          break;
        }
        const modeModel = this.engine!.getModel<ModeModel>('mode');
        modeModel.setMode(this.prevMode);
        break;
      }
    }
  }

  getEffects(viewport: Viewport): RenderNode<any>[] {
    const {entityStore} = this.engine!;
    const selectedEntityHandle = entityStore.getAtom(selectedEntity).state;
    const entity = entityStore.get(selectedEntityHandle);
    return [
      gizmoItem(SelectedEffect, {
        entity,
        key: 'selected',
      }),
      this.alignAxis && this.alignAxis[0] > 0 && gizmoItem(AxisEffect, {
        entity,
        axis: vec3.fromValues(1, 0, 0),
        color: '#ff3333',
        key: 'axis',
      }),
      this.alignAxis && this.alignAxis[1] > 0 && gizmoItem(AxisEffect, {
        entity,
        axis: vec3.fromValues(0, 1, 0),
        color: '#33ff33',
        key: 'axis',
      }),
      this.alignAxis && this.alignAxis[2] > 0 && gizmoItem(AxisEffect, {
        entity,
        axis: vec3.fromValues(0, 0, 1),
        color: '#3333ff',
        key: 'axis',
      }),
    ].filter((v): v is RenderNode<any> => Boolean(v));
  }

}
