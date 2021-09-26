import {atom} from 'recoil';

import {EntityHandle} from '../../core/EntityHandle';

export const selectedEntity = atom<EntityHandle | null>({
  key: 'selectedEntity',
  default: null,
});
