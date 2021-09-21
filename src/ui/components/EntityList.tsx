import React from 'react';

import {useEngineValue} from '../hooks/useEngineValue';

export function EntityList(): React.ReactElement {
  const entities = useEngineValue((engine) => engine.entityStore.getEntities());
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
