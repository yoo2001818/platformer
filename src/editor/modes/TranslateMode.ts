import {mat4, quat, vec2, vec3, vec4} from 'gl-matrix';

import {Camera} from '../../3d/Camera';
import {intersectRayPlane} from '../../3d/collision';
import {Transform} from '../../3d/Transform';
import {Engine} from '../../core/Engine';
import {Entity} from '../../core/Entity';
import {selectedEntity} from '../../ui/states/selection';
import {AxisEffect} from '../gizmoEffects/AxisEffect';
import {SelectedDotEffect} from '../gizmoEffects/SelectedDotEffect';
import {SelectedEffect} from '../gizmoEffects/SelectedEffect';
import {ModeModel} from '../models/ModeModel';
import {BasisType, SelectionModel} from '../models/SelectionModel';
import {gizmoItem, RenderNode} from '../ModeState';
import {getMouseEventNDCPos} from '../utils/getMousePos';
import {Viewport} from '../Viewport';

import {EditorMode} from './EditorMode';

export class TranslateMode implements EditorMode {
  engine: Engine | null = null;
  currentEntity: Entity | null = null;
  belongingViewport: Viewport;
  prevMode: EditorMode;
  initialNDC: vec2;
  initialPos: vec3;
  lastMousePos: vec2;
  cursorDiff: vec2;
  isAlignAxisPlane: boolean;
  alignAxis: vec3 | null;
  basisType: BasisType;

  constructor(
    prevMode: EditorMode,
    belongingViewport: Viewport,
    initialNDC: vec2,
    isAlignAxisPlane: boolean,
    alignAxis: vec3 | null,
    basisType: BasisType = 'world',
  ) {
    this.prevMode = prevMode;
    this.currentEntity = null;
    this.belongingViewport = belongingViewport;
    this.initialNDC = initialNDC;
    this.initialPos = vec3.create();
    this.lastMousePos = vec2.copy(vec2.create(), initialNDC);
    this.cursorDiff = vec2.create();
    this.isAlignAxisPlane = isAlignAxisPlane;
    this.alignAxis = alignAxis;
    this.basisType = basisType;
  }

  bind(engine: Engine): void {
    this.engine = engine;

    // Register difference between cursor position and actual position
    const {entityStore} = this.engine!;
    const selectedEntityHandle = entityStore.getAtom(selectedEntity).state;
    const entity = entityStore.get(selectedEntityHandle);
    this.currentEntity = entity;
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

    const basis = this._getBasis();
    mat4.getTranslation(this.initialPos, basis);
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
    const {currentEntity} = this;
    if (currentEntity == null) {
      return;
    }
    const transform = currentEntity.getMutate<Transform>('transform');
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
    const alignAxis = vec4.create();
    const basis = this._getBasis();
    if (this.alignAxis == null) {
      vec3.copy(planeNormal, camDiff);
    } else {
      vec4.zero(alignAxis);
      vec3.copy(alignAxis as vec3, this.alignAxis);
      vec4.transformMat4(alignAxis, alignAxis, basis);
      if (this.isAlignAxisPlane) {
        vec3.copy(planeNormal, alignAxis as vec3);
      } else {
        vec3.scaleAndAdd(
          planeNormal,
          camDiff,
          alignAxis as vec3,
          -vec3.dot(camDiff, alignAxis as vec3),
        );
      }
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
        // To do this, we have to convert the resultPos to local space
        // and remove the axis, and convert it back to the world space.
        const basisQuat = quat.create();
        // We assume the basis will be normalized
        mat4.getRotation(basisQuat, basis);
        const inverseBasisQuat = quat.create();
        quat.conjugate(inverseBasisQuat, basisQuat);
        vec3.transformQuat(resultPos, resultPos, inverseBasisQuat);
        const initialPosLocal = vec3.create();
        vec3.transformQuat(initialPosLocal, this.initialPos, inverseBasisQuat);
        for (let i = 0; i < 3; i += 1) {
          if (this.alignAxis[i] === 0) {
            resultPos[i] = initialPosLocal[i];
          }
        }
        vec3.transformQuat(resultPos, resultPos, basisQuat);
      }
      transform.setPositionWorld(resultPos);
    }
  }

  _getBasis(): mat4 {
    const {currentEntity} = this;
    const engine = this.engine!;
    const selectionModel = engine.getModel<SelectionModel>('selection');

    return selectionModel.getBasis(
      mat4.create(),
      currentEntity,
      this.basisType,
    );
  }

  setAxis(
    isAlignAxisPlane: boolean,
    alignAxis: vec3 | null,
  ): void {
    if (alignAxis != null && this.alignAxis != null) {
      // If the user has pressed same key twice, swap basis
      if (vec3.dot(alignAxis, this.alignAxis) >= 0.999999) {
        if (this.basisType === 'local') {
          this.basisType = 'world';
        } else {
          this.basisType = 'local';
        }
      } else {
        // TODO: Read from selectionModel or something
        this.basisType = 'world';
      }
    }
    this.isAlignAxisPlane = isAlignAxisPlane;
    this.alignAxis = alignAxis;
    this._moveEntity(this.lastMousePos);
  }

  processEvent(type: string, viewport: Viewport, ...args: any[]): void {
    if (viewport !== this.belongingViewport) {
      return;
    }
    const {currentEntity} = this;
    if (currentEntity == null) {
      return;
    }
    const transform = currentEntity.getMutate<Transform>('transform');
    if (transform == null) {
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
        this._moveEntity(ndcPos);
        break;
      }
      case 'keydown': {
        const event: KeyboardEvent = args[0];
        const modeModel = this.engine!.getModel<ModeModel>('mode');
        switch (event.code) {
          case 'Escape': {
            // Move the entity back to initial pos
            const transform = currentEntity.getMutate<Transform>('transform');
            if (transform == null) {
              return;
            }
            transform.setPositionWorld(this.initialPos);
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
    const {currentEntity} = this;
    const basis = this._getBasis();
    const axisX = basis.slice(0, 3) as vec3;
    const axisY = basis.slice(4, 7) as vec3;
    const axisZ = basis.slice(8, 11) as vec3;
    return [
      gizmoItem(SelectedEffect, {
        entity: currentEntity,
        key: 'selected',
      }),
      this.alignAxis && this.isAlignAxisPlane !== (this.alignAxis[0] > 0) &&
      gizmoItem(AxisEffect, {
        position: this.initialPos,
        axis: axisX,
        color: '#ff3333',
        key: 'axis1',
      }),
      this.alignAxis && this.isAlignAxisPlane !== (this.alignAxis[1] > 0) &&
      gizmoItem(AxisEffect, {
        position: this.initialPos,
        axis: axisY,
        color: '#33ff33',
        key: 'axis2',
      }),
      this.alignAxis && this.isAlignAxisPlane !== (this.alignAxis[2] > 0) &&
      gizmoItem(AxisEffect, {
        position: this.initialPos,
        axis: axisZ,
        color: '#3333ff',
        key: 'axis3',
      }),
      gizmoItem(SelectedDotEffect, {
        entity: currentEntity,
        key: 'selectedDot',
      }),
    ].filter((v): v is RenderNode<any> => Boolean(v));
  }

}
