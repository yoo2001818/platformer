import React from 'react';
import styled from '@emotion/styled';

import {COLORS} from '../../styles';

export interface EntityPropertiesComponentHeaderProps {
  className?: string;
  name: string;
}

export function EntityPropertiesComponentHeader(
  props: EntityPropertiesComponentHeaderProps,
): React.ReactElement {
  const {className, name} = props;
  return (
    <Div className={className}>
      { name }
    </Div>
  );
}

const Div = styled.div`
  margin: 0px 4px;
  padding: 5px 5px;
  color: ${COLORS.gray100};
  font-weight: bold;
  font-size: 13px;
  border-bottom: 1px solid ${COLORS.gray30};
`;
