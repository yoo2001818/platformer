import React from 'react';
import styled from '@emotion/styled';

import {COLORS} from '../../styles/colors';
import {selectedEntity} from '../../states/selection';
import {useEntity} from '../../hooks/useEntity';
import {useAtom} from '../../hooks/useAtom';

import {EntityPropertiesHeader} from './Header';
import {EntityPropertiesComponent} from './Component';

// TODO: We're reading off of the entity state; however this should be changed
export function EntityProperties(): React.ReactElement | null {
  const [selected] = useAtom(selectedEntity);
  const entity = useEntity(selected);
  if (entity == null) {
    return null;
  }
  const components = entity.getEntries();
  return (
    <Div>
      <EntityPropertiesHeader entity={entity} />
      { components.map(([name, value]) => (
        <EntityPropertiesComponent
          entity={entity}
          name={name}
          value={value}
          key={name}
          onChange={(value) => {
            entity.set(name, value);
          }}
        />
      )) }
    </Div>
  );
}

const Div = styled.div`
  color: ${COLORS.gray90};
`;
