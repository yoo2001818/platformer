import {mat4, quat, vec2, vec3, vec4} from 'gl-matrix';

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

export class RotateMode implements EditorMode {
  engine: Engine | null = null;
  belongingViewport: Viewport;
  prevMode: EditorMode;
  initialNDC: vec2;
  initialRotation: quat;
  lastMousePos: vec2;
  centerPos: vec2;
  alignAxis: vec3 | null;

  constructor(
    prevMode: EditorMode,
    belongingViewport: Viewport,
    initialNDC: vec2,
    alignAxis: vec3 | null,
  ) {
    this.prevMode = prevMode;
    this.belongingViewport = belongingViewport;
    this.initialNDC = initialNDC;
    this.initialRotation = quat.create();
    this.lastMousePos = vec2.copy(vec2.create(), initialNDC);
    this.centerPos = vec2.create();
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

    quat.copy(this.initialRotation, transform.getRotationWorld());
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

  destroy(): void {
    this.engine = null;
  }

  update(deltaTime?: number): void {
  }

  _rotateEntity(ndcPos: vec2): void {
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
    const aspect = this.belongingViewport.renderer.getAspectRatio();
    // Run atan2 for initialNDC and current ndc
    const diff = vec2.create();
    vec2.sub(diff, this.initialNDC, this.centerPos);
    const initialAngle = Math.atan2(diff[1], diff[0] * aspect);
    vec2.sub(diff, ndcPos, this.centerPos);
    let currentAngle = Math.atan2(diff[1], diff[0] * aspect) - initialAngle;
    if (currentAngle > Math.PI) {
      currentAngle -= Math.PI * 2;
    }
    if (currentAngle < -Math.PI) {
      currentAngle += Math.PI * 2;
    }
    // Create rotation axis
    const invView = this._getCameraInverseView();
    const cameraRay = vec3.create();
    vec3.transformMat4(cameraRay, cameraRay, invView);
    vec3.sub(cameraRay, cameraRay, transform.getPositionWorld());
    vec3.normalize(cameraRay, cameraRay);
    const axis = vec3.create();
    if (this.alignAxis == null) {
      vec3.copy(axis, cameraRay);
    } else {
      vec3.copy(axis, this.alignAxis);
      if (vec3.dot(axis, cameraRay) < 0) {
        vec3.scale(axis, axis, -1);
      }
    }
    // Rotate the object
    const rotation = quat.create();
    quat.setAxisAngle(rotation, axis, currentAngle);
    quat.mul(rotation, rotation, this.initialRotation);
    transform.setRotationWorld(rotation);
  }

  setAxis(
    alignAxis: vec3 | null,
  ): void {
    this.alignAxis = alignAxis;
    this._rotateEntity(this.lastMousePos);
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
        this._rotateEntity(ndcPos);
        break;
      }
      case 'keydown': {
        const event: KeyboardEvent = args[0];
        const modeModel = this.engine!.getModel<ModeModel>('mode');
        switch (event.code) {
          case 'Escape': {
            // Move the entity back to initial pos
            const transform = entity.getMutate<Transform>('transform');
            if (transform == null) {
              return;
            }
            transform.setRotationWorld(this.initialRotation);
            modeModel.setMode(this.prevMode);
            break;
          }
          case 'KeyC': {
            // Clear axis info
            this.setAxis(null);
            break;
          }
          case 'KeyX': {
            this.setAxis(vec3.fromValues(1, 0, 0));
            break;
          }
          case 'KeyY': {
            this.setAxis(vec3.fromValues(0, 1, 0));
            break;
          }
          case 'KeyZ': {
            this.setAxis(vec3.fromValues(0, 0, 1));
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
      this.alignAxis && this.alignAxis[0] > 0 &&
      gizmoItem(AxisEffect, {
        position: pos,
        axis: vec3.fromValues(1, 0, 0),
        color: '#ff3333',
        key: 'axis1',
      }),
      this.alignAxis && this.alignAxis[1] > 0 &&
      gizmoItem(AxisEffect, {
        position: pos,
        axis: vec3.fromValues(0, 1, 0),
        color: '#33ff33',
        key: 'axis2',
      }),
      this.alignAxis && this.alignAxis[2] > 0 &&
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
