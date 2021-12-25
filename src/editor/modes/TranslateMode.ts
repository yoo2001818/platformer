import {mat4, quat, vec2, vec3, vec4} from 'gl-matrix';

import {intersectRayPlane} from '../../3d/collision';
import {Transform} from '../../3d/Transform';
import {BasisType} from '../models/SelectionModel';
import {Viewport} from '../Viewport';

import {AbstractMoveMode} from './AbstractMoveMode';
import {EditorMode} from './EditorMode';

export class TranslateMode extends AbstractMoveMode {
  initialPos: vec3;
  initialPosBasisDiff: vec3;

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
    this.initialPos = vec3.create();
    this.initialPosBasisDiff = vec3.create();
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
    const basis = this._getBasis();
    mat4.getTranslation(this.initialPos, basis);
    // Determine the difference between current transform and the basis position
    // (in world space)
    vec3.sub(
      this.initialPosBasisDiff,
      transform.getPositionWorld(),
      this.initialPos,
    );
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

    const cursorDiff = vec2.create();
    vec2.sub(cursorDiff, this.initialCursorNDC, this.initialObjectNDC);
    // Create a ray pointing to the clicked position
    const rayDir = vec4.fromValues(
      ndcPos[0] - cursorDiff[0],
      ndcPos[1] - cursorDiff[1],
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

  _cancel(): void {
    // Revert the entity to initialPos... which is already in world space.
    const nextPos = vec3.create();
    vec3.add(nextPos, this.initialPos, this.initialPosBasisDiff);
    const {currentEntity} = this;
    if (currentEntity == null) {
      return;
    }
    const transform = currentEntity.getMutate<Transform>('transform');
    if (transform == null) {
      return;
    }
    transform.setPositionWorld(nextPos);
  }

}
