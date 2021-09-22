import React from 'react';

import {ParentComponent} from '../../3d/ParentComponent';
import {useEngineValue} from '../hooks/useEngineValue';

export function EntityList(): React.ReactElement {
  const entities = useEngineValue((engine) => {
    const parent = engine.entityStore.getComponent<ParentComponent>('parent');
    const root = parent.getChildren(null);
    return root;
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
