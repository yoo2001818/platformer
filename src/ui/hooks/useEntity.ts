import {Entity} from '../../core/Entity';

import {useEngineValue} from './useEngineValue';

export function useEntity(entity: Entity): Entity {
  return useEngineValue(() => entity);
}
