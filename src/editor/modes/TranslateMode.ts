import {mat4, vec2, vec3, vec4} from 'gl-matrix';

import {Camera} from '../../3d/Camera';
import {Transform} from '../../3d/Transform';
import {Engine} from '../../core/Engine';
import {selectedEntity} from '../../ui/states/selection';
import {AxisEffect} from '../gizmoEffects/AxisEffect';
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
    this.initialPos = vec3.create();
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

  _getCameraInverseProjectionView(): mat4 {
    const {renderer} = this.belongingViewport;
    const camera = renderer.camera!;
    const cameraData = camera.get<Camera>('camera')!;
    const aspect = renderer.getAspectRatio();
    return cameraData.getInverseProjectionView(camera, aspect);
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
    if (this.alignAxis == null) {
      // TODO
    } else {
      // Project current model position to projection space
      const originPos = vec4.fromValues(0, 0, 0, 1);
      vec3.copy(originPos as vec3, this.initialPos);
      vec4.transformMat4(originPos, originPos, this._getCameraProjectionView());
      vec4.scale(originPos, originPos, 1 / originPos[3]);
      // Determine the axis projected dir
      const deltaPos = vec4.fromValues(0, 0, 0, 1);
      vec3.add(deltaPos as vec3, this.initialPos, this.alignAxis);
      vec4.transformMat4(deltaPos, deltaPos, this._getCameraProjectionView());
      vec4.scale(deltaPos, deltaPos, 1 / deltaPos[3]);
      vec4.sub(deltaPos, deltaPos, originPos);
      // Determine the cursor - origin projected
      const cursorDelta = vec2.create();
      vec2.sub(cursorDelta, ndcPos, originPos as vec2);
      // Calculate dist value
      const l2 = vec2.sqrDist(originPos as vec2, deltaPos as vec2);
      const dist = vec2.dot(cursorDelta, deltaPos as vec2) / l2;
      // Using the dist value, calculate new cursor pos
      const nextAxisPos = vec2.create();
      vec2.scaleAndAdd(nextAxisPos, originPos as vec2, deltaPos as vec2, dist);
      // Reverse project the next axis
      const nextPos =
        vec4.fromValues(nextAxisPos[0], nextAxisPos[1], originPos[2], 1);
      vec4.transformMat4(
        nextPos,
        nextPos,
        this._getCameraInverseProjectionView(),
      );
      vec4.scale(nextPos, nextPos, 1 / nextPos[3]);
      console.log(nextPos);
      transform.setPosition(nextPos as vec3);
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
