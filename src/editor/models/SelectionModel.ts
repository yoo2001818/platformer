import {mat4, vec3} from 'gl-matrix';

import {Transform} from '../../3d/Transform';
import {atom, Atom} from '../../core/Atom';
import {Engine} from '../../core/Engine';
import {Entity} from '../../core/Entity';
import {EntityHandle} from '../../core/EntityHandle';

export type BasisType =
  | 'world'
  | 'local';

export type BasisCenterType =
  | 'object';

export const selectedEntity = atom<EntityHandle | null>({
  name: 'selection$selectedEntity',
  defaultState: null,
});

export class SelectionModel {
  engine: Engine;
  selectedEntityAtom: Atom<EntityHandle | null>;

  constructor(engine: Engine) {
    this.engine = engine;
    this.selectedEntityAtom = engine.entityStore.getAtom(selectedEntity);
  }

  getSelection(): Entity | null {
    const handle = this.selectedEntityAtom.state;
    if (handle == null) {
      return null;
    }
    return this.engine.entityStore.get(handle);
  }

  setSelection(entity: Entity | null): void {
    this.selectedEntityAtom.setState(entity?.handle ?? null);
  }

  /**
   * Returns the matrix corresponding to the requested basis type. The basis
   * type contains the translation vector, to allow setting 'center point'.
   */
  getBasis(
    out: mat4,
    targetEntity: Entity | null,
    type: BasisType,
  ): mat4 {
    switch (type) {
      case 'world':
        mat4.identity(out);
        break;
      case 'local': {
        const selected = this.getSelection();
        const transform = selected?.get<Transform>('transform');
        if (transform != null) {
          const mat = transform.getMatrixWorld();
          // Normalize each axis to remove scale
          const basisX = vec3.create();
          const basisY = vec3.create();
          const basisZ = vec3.create();
          vec3.normalize(basisX, mat.slice(0, 3));
          vec3.normalize(basisY, mat.slice(4, 7));
          vec3.normalize(basisZ, mat.slice(8, 11));
          // And copy onto out matrix
          mat4.set(
            out,
            basisX[0], basisX[1], basisX[2], 0,
            basisY[0], basisY[1], basisY[2], 0,
            basisZ[0], basisZ[1], basisZ[2], 0,
            0, 0, 0, 1,
          );
        } else {
          mat4.identity(out);
        }
        break;
      }
    }
    if (targetEntity != null) {
      const transform = targetEntity.get<Transform>('transform');
      if (transform != null) {
        const pos = transform.getPositionWorld();
        const transMat = mat4.create();
        mat4.fromTranslation(transMat, pos);
        mat4.mul(out, transMat, out);
      }
    }
    return out;
  }
}
