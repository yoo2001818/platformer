import {mat4, vec2, vec3, vec4} from 'gl-matrix';

import {Camera} from '../../3d/Camera';
import {Transform} from '../../3d/Transform';
import {Engine} from '../../core/Engine';
import {Entity} from '../../core/Entity';
import {AxisEffect} from '../gizmoEffects/AxisEffect';
import {CursorEffect} from '../gizmoEffects/CursorEffect';
import {SelectedDotEffect} from '../gizmoEffects/SelectedDotEffect';
import {SelectedEffect} from '../gizmoEffects/SelectedEffect';
import {ModeModel} from '../models/ModeModel';
import {BasisType, SelectionModel} from '../models/SelectionModel';
import {gizmoItem, RenderNode} from '../ModeState';
import {getMouseEventNDCPos} from '../utils/getMousePos';
import {Viewport} from '../Viewport';

import {EditorMode} from './EditorMode';

/**
 * This implements common functions for "movement" mode such as translation,
 * rotation, scaling. These modes depend on basis matrix, mouse cursor position,
 * etc in common.
 */
export abstract class AbstractMoveMode implements EditorMode {
  engine: Engine | null = null;
  currentEntity: Entity | null = null;
  belongingViewport: Viewport;
  prevMode: EditorMode;
  initialCursorNDC: vec2;
  lastCursorNDC: vec2;
  initialObjectNDC: vec2;
  isAlignAxisPlane: boolean;
  alignAxis: vec3 | null;
  shouldAllowAxisPlane: boolean;
  basisType: BasisType;
  initialBasisType: BasisType;
  basisBundle: {[key in BasisType]: mat4;};

  constructor(
    prevMode: EditorMode,
    belongingViewport: Viewport,
    initialCursorNDC: vec2,
    basisType: BasisType = 'world',
    // Rotation doesn't use this; feel free to fix it to 'false'
    isAlignAxisPlane: boolean,
    alignAxis: vec3 | null,
    shouldAllowAxisPlane = true,
  ) {
    this.prevMode = prevMode;
    this.currentEntity = null;
    this.belongingViewport = belongingViewport;
    this.initialCursorNDC = initialCursorNDC;
    this.lastCursorNDC = vec2.copy(vec2.create(), initialCursorNDC);
    this.initialObjectNDC = vec2.create();
    this.isAlignAxisPlane = isAlignAxisPlane;
    this.alignAxis = alignAxis;
    this.shouldAllowAxisPlane = shouldAllowAxisPlane;
    this.basisType = basisType;
    this.initialBasisType = basisType;
    this.basisBundle = {world: mat4.create(), local: mat4.create()};
  }

  bind(engine: Engine): void {
    this.engine = engine;

    // Register difference between cursor position and actual position
    const selectionModel = engine.getModel<SelectionModel>('selection');
    const entity = selectionModel.getSelection();
    this.currentEntity = entity;
    if (entity == null) {
      return;
    }

    const transform = entity.get<Transform>('transform');
    if (transform == null) {
      return;
    }

    // Project current object to the screen (it is assumed that the camera
    // never changes during the mode's execution time)
    const perspPos = vec4.fromValues(0, 0, 0, 1);
    vec4.transformMat4(perspPos, perspPos, transform.getMatrixWorld());
    vec4.transformMat4(perspPos, perspPos, this._getCameraProjectionView());
    vec4.scale(perspPos, perspPos, 1 / perspPos[3]);
    vec2.copy(this.initialObjectNDC, perspPos as vec2);

    this.basisBundle = {
      world: selectionModel.getBasis(mat4.create(), entity, 'world'),
      local: selectionModel.getBasis(mat4.create(), entity, 'local'),
    };

    // The underlying class is expected to do something after calling this by
    // overriding this function
    this._init();
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

  _getBasis(): mat4 {
    return this.basisBundle[this.basisType];
  }

  destroy(): void {
    this.engine = null;
  }

  update(deltaTime?: number): void {
  }

  _init(): void {
    throw new Error('Method not implemented.');
  }

  _moveEntity(ndcPos: vec2): void {
    throw new Error('Method not implemented.');
  }

  _cancel(): void {
    throw new Error('Method not implemented.');
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
        this.basisType = this.initialBasisType;
      }
    }
    this.isAlignAxisPlane = isAlignAxisPlane && this.shouldAllowAxisPlane;
    this.alignAxis = alignAxis;
    this._moveEntity(this.lastCursorNDC);
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
        vec2.copy(this.lastCursorNDC, ndcPos);
        this._moveEntity(ndcPos);
        break;
      }
      case 'keydown': {
        const event: KeyboardEvent = args[0];
        const modeModel = this.engine!.getModel<ModeModel>('mode');
        switch (event.code) {
          case 'Escape': {
            // Move the entity back to initial pos
            this._cancel();
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
    const position = mat4.getTranslation(vec3.create(), basis);
    return [
      gizmoItem(SelectedEffect, {
        entity: currentEntity,
        key: 'selected',
      }),
      this.alignAxis && this.isAlignAxisPlane !== (this.alignAxis[0] > 0) &&
      gizmoItem(AxisEffect, {
        position,
        axis: axisX,
        color: '#ff3333',
        key: 'axis1',
      }),
      this.alignAxis && this.isAlignAxisPlane !== (this.alignAxis[1] > 0) &&
      gizmoItem(AxisEffect, {
        position,
        axis: axisY,
        color: '#33ff33',
        key: 'axis2',
      }),
      this.alignAxis && this.isAlignAxisPlane !== (this.alignAxis[2] > 0) &&
      gizmoItem(AxisEffect, {
        position,
        axis: axisZ,
        color: '#3333ff',
        key: 'axis3',
      }),
      gizmoItem(SelectedDotEffect, {
        entity: currentEntity,
        key: 'selectedDot',
      }),
      gizmoItem(CursorEffect, {
        engine: this.engine!,
        key: 'cursor',
      }),
    ].filter((v): v is RenderNode<any> => Boolean(v));
  }

}
