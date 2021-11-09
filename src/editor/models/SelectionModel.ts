import {atom, Atom} from '../../core/Atom';
import {Engine} from '../../core/Engine';
import {Entity} from '../../core/Entity';
import {EntityHandle} from '../../core/EntityHandle';

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
}
