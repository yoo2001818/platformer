import {Component} from '../../core/components';
import {Engine} from '../../core/Engine';
import {Entity} from '../../core/Entity';
import {EntityHandle} from '../../core/EntityHandle';

import {useEngineValue} from './useEngineValue';

function getEntity(
  engine: Engine,
  entity: Entity | EntityHandle | null,
): Entity | null {
  if (entity == null) {
    return null;
  }
  if (entity instanceof Entity) {
    return entity;
  }
  return engine.entityStore.get(entity);
}

export function useComponent<T>(
  entity: Entity | EntityHandle | null,
  component: Component<T, any> | string,
): T | null {
  return useEngineValue(
    (engine) => {
      const entityVal = getEntity(engine, entity);
      if (entityVal == null) {
        return null;
      }
      return entityVal.get(component);
    },
    (engine) => {
      const entityVal = getEntity(engine, entity);
      if (entityVal == null) {
        return {signals: [], getVersion: () => 0};
      }
      return {
        signals: [entityVal?.getComponentSignal(component)],
        getVersion: () => entityVal.getComponentVersion(component),
      };
    },
    [entity],
  );
}

