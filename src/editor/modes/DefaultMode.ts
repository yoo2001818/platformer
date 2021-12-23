import {vec2, vec3} from 'gl-matrix';

import {Engine} from '../../core/Engine';
import {GizmoPosRotScaleEffect} from '../gizmoEffects/GizmoPosRotScaleEffect';
import {SelectedEffect} from '../gizmoEffects/SelectedEffect';
import {gizmoItem, RenderNode} from '../ModeState';
import {selectedEntity} from '../../ui/states/selection';
import {Viewport} from '../Viewport';
import {MousePicker} from '../MousePicker';
import {CameraController} from '../CameraController';
import {ViewportModel} from '../models/ViewportModel';
import {getMouseEventPos, getNDCPos} from '../utils/getMousePos';
import {ModeModel} from '../models/ModeModel';

import {EditorMode} from './EditorMode';
import {TranslateMode} from './TranslateMode';

export class DefaultMode implements EditorMode {
  engine: Engine | null = null;
  mousePickMap: Map<Viewport, MousePicker> = new Map();
  cameraControllerMap: Map<Viewport, CameraController> = new Map();
  hoveringAxis: number | null = null;

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

  _getMousePicker(viewport: Viewport): MousePicker {
    const entry = this.mousePickMap.get(viewport);
    if (entry != null) {
      return entry;
    }
    const newEntry = new MousePicker(viewport.renderer);
    this.mousePickMap.set(viewport, newEntry);
    return newEntry;
  }

  _getCameraController(viewport: Viewport): CameraController {
    const entry = this.cameraControllerMap.get(viewport);
    if (entry != null) {
      return entry;
    }
    const newEntry = new CameraController();
    this.cameraControllerMap.set(viewport, newEntry);
    return newEntry;
  }

  update(deltaTime = 0.016): void {
    const {engine} = this;
    if (engine == null) {
      return;
    }
    const viewportModel = engine.getModel<ViewportModel>('viewport');
    for (const viewport of viewportModel.viewports) {
      const camController = this._getCameraController(viewport);
      camController.setEntity(viewport.renderer.camera);
      camController.update(deltaTime);
    }
  }

  processEvent(type: string, viewport: Viewport, ...args: any[]): void {
    const camController = this._getCameraController(viewport);
    camController.processEvent(type, viewport, ...args);
    switch (type) {
      case 'mousemove': {
        const {entityStore} = this.engine!;
        const event: MouseEvent = args[0];
        const pixelPos = getMouseEventPos(viewport, event);
        const ndcPos = getNDCPos(viewport, pixelPos, vec2.create());
        const gizmoPosRotScaleEffect =
          viewport.getEffect<GizmoPosRotScaleEffect>('posRotScale');
        if (gizmoPosRotScaleEffect != null) {
          const hoveringAxis = gizmoPosRotScaleEffect.testIntersect(ndcPos);
          if (hoveringAxis !== this.hoveringAxis) {
            this.hoveringAxis = hoveringAxis;
            entityStore.nextVersion();
          }
        }
        break;
      }
      case 'mousedown': {
        const {entityStore} = this.engine!;
        const event: MouseEvent = args[0];
        if (event.button !== 0) {
          break;
        }
        const pixelPos = getMouseEventPos(viewport, event);
        const ndcPos = getNDCPos(viewport, pixelPos, vec2.create());
        // Check the gizmo position
        const gizmoPosRotScaleEffect =
          viewport.getEffect<GizmoPosRotScaleEffect>('posRotScale');
        const modeModel = this.engine!.getModel<ModeModel>('mode');
        if (gizmoPosRotScaleEffect != null) {
          const hoveringAxis = gizmoPosRotScaleEffect.testIntersect(ndcPos);
          if (hoveringAxis != null) {
            const axis = vec3.create();
            axis[hoveringAxis] = 1;
            modeModel.setMode(new TranslateMode(this, viewport, ndcPos, axis));
            break;
          }
        }
        // Run mouse picking
        const picker = this._getMousePicker(viewport);
        picker.render();
        const entity = picker.getEntity(pixelPos[0], pixelPos[1]);
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
        highlightAxis: this.hoveringAxis,
        key: 'posRotScale',
      }),
    ];
  }

}
