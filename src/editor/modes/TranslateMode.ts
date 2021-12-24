import {mat4, vec2, vec3, vec4} from 'gl-matrix';

import {Camera} from '../../3d/Camera';
import {intersectRayPlane} from '../../3d/collision';
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

export class TranslateMode implements EditorMode {
  engine: Engine | null = null;
  belongingViewport: Viewport;
  prevMode: EditorMode;
  initialNDC: vec2;
  initialPos: vec3;
  cursorDiff: vec2;
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
    this.initialPos = vec3.create();
    this.isAlignAxisPlane = isAlignAxisPlane;
    this.alignAxis = alignAxis;
    this.cursorDiff = vec2.create();
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
    vec2.sub(this.cursorDiff, this.initialNDC, perspPos as vec2);

    vec3.copy(this.initialPos, transform.getPositionWorld());
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

  _moveEntity(ndcPos: vec2): void {
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
    // Construct a plane out of camera eye and initial pos
    const invProj = this._getCameraInverseProjection();
    const invView = this._getCameraInverseView();
    const camCenter = vec3.create();
    vec3.transformMat4(camCenter, camCenter, invView);
    const camDiff = vec3.create();
    vec3.sub(camDiff, camCenter, this.initialPos);
    vec3.normalize(camDiff, camDiff);
    const planeNormal = vec3.create();
    if (this.alignAxis == null) {
      vec3.copy(planeNormal, camDiff);
    } else if (this.isAlignAxisPlane) {
      vec3.copy(planeNormal, this.alignAxis);
    } else {
      vec3.scaleAndAdd(
        planeNormal,
        camDiff,
        this.alignAxis,
        -vec3.dot(camDiff, this.alignAxis),
      );
    }

    // Create a ray pointing to the clicked position
    const rayDir = vec4.fromValues(
      ndcPos[0] - this.cursorDiff[0],
      ndcPos[1] - this.cursorDiff[1],
      1,
      1,
    );
    vec4.transformMat4(rayDir, rayDir, invProj);
    vec4.scale(rayDir, rayDir, 1 / rayDir[3]);
    vec4.transformMat4(rayDir, rayDir, invView);

    // Shoot the ray to the plane
    const resultPos = vec3.create();
    const hasCollision = intersectRayPlane(
      resultPos,
      planeNormal,
      this.initialPos,
      camCenter,
      rayDir as vec3,
    );
    if (hasCollision) {
      // Restrict the vector to allowed values
      if (!this.isAlignAxisPlane && this.alignAxis != null) {
        for (let i = 0; i < 3; i += 1) {
          if (this.alignAxis[i] === 0) {
            resultPos[i] = this.initialPos[i];
          }
        }
      }
      transform.setPositionWorld(resultPos);
    }
  }

  processEvent(type: string, viewport: Viewport, ...args: any[]): void {
    if (viewport !== this.belongingViewport) {
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
        this._moveEntity(ndcPos);
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
      this.alignAxis && this.isAlignAxisPlane !== (this.alignAxis[0] > 0) &&
      gizmoItem(AxisEffect, {
        position: this.initialPos,
        axis: vec3.fromValues(1, 0, 0),
        color: '#ff3333',
        key: 'axis1',
      }),
      this.alignAxis && this.isAlignAxisPlane !== (this.alignAxis[1] > 0) &&
      gizmoItem(AxisEffect, {
        position: this.initialPos,
        axis: vec3.fromValues(0, 1, 0),
        color: '#33ff33',
        key: 'axis2',
      }),
      this.alignAxis && this.isAlignAxisPlane !== (this.alignAxis[2] > 0) &&
      gizmoItem(AxisEffect, {
        position: this.initialPos,
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
