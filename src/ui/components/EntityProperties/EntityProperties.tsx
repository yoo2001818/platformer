import React from 'react';
import styled from '@emotion/styled';
import {useRecoilValue} from 'recoil';

import {COLORS} from '../../styles/colors';
import {selectedEntity} from '../../states/selection';
import {useEntity} from '../../hooks/useEntity';

// TODO: We're reading off of the entity state; however this should be changed
export function EntityProperties(): React.ReactElement {
  const selected = useRecoilValue(selectedEntity);
  const entity = useEntity(selected);
  return (
    <Div>
      { entity != null && (
        <pre>
          { JSON.stringify(entity.toJSON(), null, 2) }
        </pre>
      ) }
    </Div>
  );
}

const Div = styled.div`
  color: ${COLORS.gray90};
`;
