import {Engine} from '../../core/Engine';
import {GizmoPosRotScaleEffect} from '../gizmoEffects/GizmoPosRotScaleEffect';
import {SelectedEffect} from '../gizmoEffects/SelectedEffect';
import {gizmoItem, RenderNode} from '../ModeState';
import {selectedEntity} from '../../ui/states/selection';
import {Viewport} from '../Viewport';
import {MousePicker} from '../MousePicker';
import {CameraController} from '../CameraController';
import {ViewportModel} from '../models/ViewportModel';

import {EditorMode} from './EditorMode';

export class DefaultMode implements EditorMode {
  engine: Engine | null = null;
  mousePickMap: Map<Viewport, MousePicker> = new Map();
  cameraControllerMap: Map<Viewport, CameraController> = new Map();

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
    this.cameraControllerMap.clear();
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
      case 'mousedown': {
        const {entityStore} = this.engine!;
        const event: MouseEvent = args[0];
        if (event.button !== 0) {
          break;
        }
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
