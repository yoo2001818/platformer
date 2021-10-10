import React from 'react';
import styled from '@emotion/styled';

import {EntityPropertiesComponentHeader} from '../ComponentHeader';
import {Transform} from '../../../../3d/Transform';
import {COLORS} from '../../../styles';

export interface EntityPropertiesTransformProps {
  className?: string;
  value: Transform;
}

export function EntityPropertiesTransform(
  props: EntityPropertiesTransformProps,
): React.ReactElement {
  const {className, value} = props;
  return (
    <Div className={className}>
      <EntityPropertiesComponentHeader name="Transform" />
      { JSON.stringify(value.getPosition(), null, 2) }
    </Div>
  );
}

const Div = styled.div`
  color: ${COLORS.gray90};
`;
