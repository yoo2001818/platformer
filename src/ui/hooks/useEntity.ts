import {Entity} from '../../core/Entity';
import {EntityHandle} from '../../core/EntityHandle';

import {useEngineValue} from './useEngineValue';

export function useEntity(entity: Entity | EntityHandle | null): Entity | null {
  return useEngineValue((engine) => {
    if (entity == null) {
      return null;
    }
    if (entity instanceof Entity) {
      return entity;
    }
    return engine.entityStore.get(entity);
  });
}
