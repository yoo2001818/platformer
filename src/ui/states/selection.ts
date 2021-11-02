import {atom} from '../../core/Atom';
import {EntityHandle} from '../../core/EntityHandle';

export const selectedEntity = atom<EntityHandle | null>({
  name: 'selectedEntity',
  defaultState: null,
});

export const editorCamera = atom<EntityHandle | null>({
  name: 'editorCamera',
  defaultState: null,
});
