import {mat4, vec2, vec3, vec4} from 'gl-matrix';

import {Transform} from '../../3d/Transform';
import {selectedEntity} from '../../ui/states/selection';
import {BasisType} from '../models/SelectionModel';
import {Viewport} from '../Viewport';

import {AbstractMoveMode} from './AbstractMoveMode';
import {EditorMode} from './EditorMode';

export class RotateMode extends AbstractMoveMode {
  initialMatrix: mat4;

  constructor(
    prevMode: EditorMode,
    belongingViewport: Viewport,
    initialCursorNDC: vec2,
    basisType: BasisType = 'world',
    isAlignAxisPlane: boolean,
    alignAxis: vec3 | null,
  ) {
    super(
      prevMode,
      belongingViewport,
      initialCursorNDC,
      basisType,
      isAlignAxisPlane,
      alignAxis,
      true,
    );
    this.initialMatrix = mat4.create();
  }

  _init(): void {
    const {currentEntity} = this;
    if (currentEntity == null) {
      return;
    }
    const transform = currentEntity.getMutate<Transform>('transform');
    if (transform == null) {
      return;
    }
    mat4.copy(this.initialMatrix, transform.getMatrixWorld());
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
    const aspect = this.belongingViewport.renderer.getAspectRatio();
    // Run atan2 for initialNDC and current ndc
    const diff = vec2.create();
    vec2.sub(diff, this.initialCursorNDC, this.initialObjectNDC);
    const initialAngle = Math.atan2(diff[1], diff[0] * aspect);
    vec2.sub(diff, ndcPos, this.initialObjectNDC);
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
    const basis = this._getBasis();
    if (this.alignAxis == null) {
      vec3.copy(axis, cameraRay);
    } else {
      vec3.copy(axis, this.alignAxis);
      // Check if the camera ray and axis faces the different direction and
      // therefore the axis must be inverted.
      // Before we do that, we must convert the axis to world space
      const axisWorld = vec4.create();
      vec3.copy(axisWorld as vec3, axis);
      vec4.transformMat4(axisWorld, axisWorld, basis);
      vec4.normalize(axisWorld, axisWorld);
      if (vec3.dot(axisWorld as vec3, cameraRay) < 0) {
        vec3.scale(axis, axis, -1);
      }
    }
    // Now, apply this arragement IN BASIS SPACE
    // This will be done by the following;
    // world space -(inverse basis)-> basis space -> basis space local matrix
    // Multiply the basis space local matrix with rotation,
    // then convert all the way back.
    // basis space local matrix -(basis)-> world space.
    const inverseBasis = mat4.invert(mat4.create(), basis);
    const targetMat = mat4.copy(mat4.create(), this.initialMatrix);
    // world -> basis
    mat4.mul(targetMat, inverseBasis, targetMat);
    // apply scaling
    const rotateMat = mat4.create();
    mat4.rotate(rotateMat, rotateMat, currentAngle, axis);
    mat4.mul(targetMat, rotateMat, targetMat);
    // basis -> world
    mat4.mul(targetMat, basis, targetMat);
    transform.setMatrixWorld(targetMat);
  }

  _cancel(): void {
    const {currentEntity} = this;
    if (currentEntity == null) {
      return;
    }
    const transform = currentEntity.getMutate<Transform>('transform');
    if (transform == null) {
      return;
    }
    transform.setMatrixWorld(this.initialMatrix);
  }
}
