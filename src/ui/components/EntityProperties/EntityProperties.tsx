import React from 'react';
import styled from '@emotion/styled';
import {useRecoilValue} from 'recoil';

import {COLORS} from '../../styles/colors';
import {selectedEntity} from '../../states/selection';
import {useEntity} from '../../hooks/useEntity';

// TODO: We're reading off of the entity state; however this should be changed
export function EntityProperties(): React.ReactElement | null {
  const selected = useRecoilValue(selectedEntity);
  const entity = useEntity(selected);
  if (entity == null) {
    return null;
  }
  const components = entity.getEntries();
  return (
    <Div>
      <ul>
        { components.map(([name, value]) => (
          <li key={name}>
            { name }
          </li>
        )) }
      </ul>
    </Div>
  );
}

const Div = styled.div`
  color: ${COLORS.gray90};
`;
