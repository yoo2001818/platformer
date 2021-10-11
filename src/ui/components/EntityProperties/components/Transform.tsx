import React from 'react';
import styled from '@emotion/styled';

import {EntityPropertiesComponentHeader} from '../ComponentHeader';
import {Transform} from '../../../../3d/Transform';
import {COLORS} from '../../../styles';
import {FormGroup} from '../../FormGroup';
import {DimensionInput} from '../../Input';

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
      <EntityPropertiesComponentHeader label="Transform" />
      <FormGroup label="Position">
        <DimensionInput
          dimensions={3}
          value={value.getPosition()}
          onChange={(arr) => value.setPosition(arr)}
        />
      </FormGroup>
      <FormGroup label="Scale">Test</FormGroup>
      <FormGroup label="Rotation">Test</FormGroup>
      { JSON.stringify(value.getPosition(), null, 2) }
    </Div>
  );
}

const Div = styled.div`
  color: ${COLORS.gray90};
`;
