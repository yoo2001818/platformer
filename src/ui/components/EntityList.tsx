import React from 'react';

import {Entity} from '../../core/Entity';
import {useEngineValue} from '../hooks/useEngineValue';

export function EntityList(): React.ReactElement {
  const entities = useEngineValue((engine) => {
    const result: Entity[] = [];
    engine.entityStore
      .query()
      .without('parent')
      .forEach((entity) => {
        result.push(entity);
      });
    return result;
  });
  return (
    <ul>
      { entities.map((entity, i) => (
        <li key={entity.handle.id}>
          { entity.get('name') }
        </li>
      )) }
    </ul>
  );
}
