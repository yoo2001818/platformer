import React from 'react';
import styled from '@emotion/styled';

import {Entity} from '../../../core/Entity';
import {TextInput} from '../Input';

export interface EntityPropertiesHeaderProps {
  className?: string;
  entity: Entity;
}

export function EntityPropertiesHeader(
  props: EntityPropertiesHeaderProps,
): React.ReactElement {
  const {className, entity} = props;
  return (
    <HeaderDiv className={className}>
      <TextInput
        value={entity.get('name')!}
        onChange={(name) => {
          entity.set('name', name);
        }}
      />
    </HeaderDiv>
  );
}

const HeaderDiv = styled.div`
  padding: 10px 10px 5px;
`;
