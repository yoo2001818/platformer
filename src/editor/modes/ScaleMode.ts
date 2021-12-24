import {mat4, vec2, vec3, vec4} from 'gl-matrix';

import {Camera} from '../../3d/Camera';
import {Transform} from '../../3d/Transform';
import {Engine} from '../../core/Engine';
import {selectedEntity} from '../../ui/states/selection';
import {AxisEffect} from '../gizmoEffects/AxisEffect';
import {SelectedDotEffect} from '../gizmoEffects/SelectedDotEffect';
import {SelectedEffect} from '../gizmoEffects/SelectedEffect';
import {ModeModel} from '../models/ModeModel';
import {gizmoItem, RenderNode} from '../ModeState';
import {getMouseEventNDCPos} from '../utils/getMousePos';
import {Viewport} from '../Viewport';

import {EditorMode} from './EditorMode';

export class ScaleMode implements EditorMode {
  engine: Engine | null = null;
  belongingViewport: Viewport;
  prevMode: EditorMode;
  initialNDC: vec2;
  initialScale: vec3;
  lastMousePos: vec2;
  centerPos: vec2;
  isAlignAxisPlane: boolean;
  alignAxis: vec3 | null;

  constructor(
    prevMode: EditorMode,
    belongingViewport: Viewport,
    initialNDC: vec2,
    isAlignAxisPlane: boolean,
    alignAxis: vec3 | null,
  ) {
    this.prevMode = prevMode;
    this.belongingViewport = belongingViewport;
    this.initialNDC = initialNDC;
    this.initialScale = vec3.create();
    this.lastMousePos = vec2.copy(vec2.create(), initialNDC);
    this.centerPos = vec2.create();
    this.isAlignAxisPlane = isAlignAxisPlane;
    this.alignAxis = alignAxis;
  }

  bind(engine: Engine): void {
    this.engine = engine;

    // Register difference between cursor position and actual position
    const {entityStore} = this.engine!;
    const selectedEntityHandle = entityStore.getAtom(selectedEntity).state;
    const entity = entityStore.get(selectedEntityHandle);
    if (entity == null) {
      return;
    }

    const transform = entity.get<Transform>('transform');
    if (transform == null) {
      return;
    }

    const perspPos = vec4.fromValues(0, 0, 0, 1);
    vec4.transformMat4(perspPos, perspPos, transform.getMatrixWorld());
    vec4.transformMat4(perspPos, perspPos, this._getCameraProjectionView());
    vec4.scale(perspPos, perspPos, 1 / perspPos[3]);
    vec2.copy(this.centerPos, perspPos as vec2);

    vec3.copy(this.initialScale, transform.getScaleWorld());
  }

  destroy(): void {
    this.engine = null;
  }

  _getCameraProjectionView(): mat4 {
    const {renderer} = this.belongingViewport;
    const camera = renderer.camera!;
    const cameraData = camera.get<Camera>('camera')!;
    const aspect = renderer.getAspectRatio();
    return cameraData.getProjectionView(camera, aspect);
  }

  _getCameraInverseProjection(): mat4 {
    const {renderer} = this.belongingViewport;
    const camera = renderer.camera!;
    const cameraData = camera.get<Camera>('camera')!;
    const aspect = renderer.getAspectRatio();
    return cameraData.getInverseProjection(aspect);
  }

  _getCameraInverseView(): mat4 {
    const {renderer} = this.belongingViewport;
    const camera = renderer.camera!;
    const cameraData = camera.get<Camera>('camera')!;
    return cameraData.getInverseView(camera);
  }

  update(deltaTime?: number): void {
  }

  _scaleEntity(ndcPos: vec2): void {
    const {entityStore} = this.engine!;
    const selectedEntityHandle = entityStore.getAtom(selectedEntity).state;
    const entity = entityStore.get(selectedEntityHandle);
    if (entity == null) {
      return;
    }
    const transform = entity.getMutate<Transform>('transform');
    if (transform == null) {
      return;
    }
    // Scale is so simple... Just compare distances between initial and current
    // NDCs and we should be good to go.
    const originalDist = vec2.dist(this.initialNDC, this.centerPos);
    const currentDist = vec2.dist(ndcPos, this.centerPos);

    const scale = currentDist / originalDist;
    const resultScale = vec3.fromValues(scale, scale, scale);

    // Restrict the vector to allowed values
    if (this.alignAxis != null) {
      if (this.isAlignAxisPlane) {
        for (let i = 0; i < 3; i += 1) {
          if (this.alignAxis[i] !== 0) {
            resultScale[i] = 1;
          }
        }
      } else {
        for (let i = 0; i < 3; i += 1) {
          if (this.alignAxis[i] === 0) {
            resultScale[i] = 1;
          }
        }
      }
    }

    vec3.mul(resultScale, resultScale, this.initialScale);
    transform.setScaleWorld(resultScale);
  }

  setAxis(
    isAlignAxisPlane: boolean,
    alignAxis: vec3 | null,
  ): void {
    this.isAlignAxisPlane = isAlignAxisPlane;
    this.alignAxis = alignAxis;
    this._scaleEntity(this.lastMousePos);
  }

  processEvent(type: string, viewport: Viewport, ...args: any[]): void {
    if (viewport !== this.belongingViewport) {
      return;
    }
    const {entityStore} = this.engine!;
    const selectedEntityHandle = entityStore.getAtom(selectedEntity).state;
    const entity = entityStore.get(selectedEntityHandle);
    if (entity == null) {
      return;
    }
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
      case 'mousemove': {
        const e: MouseEvent = args[0];
        const ndcPos = getMouseEventNDCPos(viewport, e, vec2.create());
        vec2.copy(this.lastMousePos, ndcPos);
        this._scaleEntity(ndcPos);
        break;
      }
      case 'keydown': {
        const event: KeyboardEvent = args[0];
        const modeModel = this.engine!.getModel<ModeModel>('mode');
        switch (event.code) {
          case 'Escape': {
            // Move the entity back to initial scale
            const transform = entity.getMutate<Transform>('transform');
            if (transform == null) {
              return;
            }
            transform.setScaleWorld(this.initialScale);
            modeModel.setMode(this.prevMode);
            break;
          }
          case 'KeyC': {
            // Clear axis info
            this.setAxis(false, null);
            break;
          }
          case 'KeyX': {
            this.setAxis(event.shiftKey, vec3.fromValues(1, 0, 0));
            break;
          }
          case 'KeyY': {
            this.setAxis(event.shiftKey, vec3.fromValues(0, 1, 0));
            break;
          }
          case 'KeyZ': {
            this.setAxis(event.shiftKey, vec3.fromValues(0, 0, 1));
            break;
          }
        }
        break;
      }
    }
  }

  getEffects(viewport: Viewport): RenderNode<any>[] {
    const {entityStore} = this.engine!;
    const selectedEntityHandle = entityStore.getAtom(selectedEntity).state;
    const entity = entityStore.get(selectedEntityHandle);
    if (entity == null) {
      return [];
    }
    const transform = entity.getMutate<Transform>('transform');
    if (transform == null) {
      return [];
    }
    const pos = transform.getPositionWorld();
    return [
      gizmoItem(SelectedEffect, {
        entity,
        key: 'selected',
      }),
      this.alignAxis && this.isAlignAxisPlane !== (this.alignAxis[0] > 0) &&
      gizmoItem(AxisEffect, {
        position: pos,
        axis: vec3.fromValues(1, 0, 0),
        color: '#ff3333',
        key: 'axis1',
      }),
      this.alignAxis && this.isAlignAxisPlane !== (this.alignAxis[1] > 0) &&
      gizmoItem(AxisEffect, {
        position: pos,
        axis: vec3.fromValues(0, 1, 0),
        color: '#33ff33',
        key: 'axis2',
      }),
      this.alignAxis && this.isAlignAxisPlane !== (this.alignAxis[2] > 0) &&
      gizmoItem(AxisEffect, {
        position: pos,
        axis: vec3.fromValues(0, 0, 1),
        color: '#3333ff',
        key: 'axis3',
      }),
      gizmoItem(SelectedDotEffect, {
        entity,
        key: 'selectedDot',
      }),
    ].filter((v): v is RenderNode<any> => Boolean(v));
  }

}
