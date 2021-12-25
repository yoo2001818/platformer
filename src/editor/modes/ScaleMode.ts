import {mat4, vec2, vec3} from 'gl-matrix';

import {Transform} from '../../3d/Transform';
import {selectedEntity} from '../../ui/states/selection';
import {BasisType} from '../models/SelectionModel';
import {Viewport} from '../Viewport';

import {AbstractMoveMode} from './AbstractMoveMode';
import {EditorMode} from './EditorMode';

export class ScaleMode extends AbstractMoveMode {
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
    // Scale is so simple... Just compare distances between initial and current
    // NDCs and we should be good to go.
    const originalDist =
      vec2.dist(this.initialCursorNDC, this.initialObjectNDC);
    const currentDist = vec2.dist(ndcPos, this.initialObjectNDC);

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

    // Now, apply this arragement IN BASIS SPACE
    // This will be done by the following;
    // world space -(inverse basis)-> basis space -> basis space local matrix
    // Multiply the basis space local matrix with resultScale,
    // then convert all the way back.
    // basis space local matrix -(basis)-> world space.
    const basis = this._getBasis();
    const inverseBasis = mat4.invert(mat4.create(), basis);
    const targetMat = mat4.copy(mat4.create(), this.initialMatrix);
    // world -> basis
    mat4.mul(targetMat, inverseBasis, targetMat);
    // apply scaling
    const scaleMat = mat4.create();
    mat4.scale(scaleMat, scaleMat, resultScale);
    mat4.mul(targetMat, scaleMat, targetMat);
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
