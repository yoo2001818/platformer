import React from 'react';
import styled from '@emotion/styled';

import {EntityPropertiesComponentHeader} from '../ComponentHeader';
import {Transform} from '../../../../3d/Transform';
import {COLORS} from '../../../styles';
import {FormGroup} from '../../FormGroup';
import {DimensionInput, SelectInput} from '../../Input';
import {FormRow} from '../../FormRow';

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
      <FormGroup label="Rotation">
        <FormRow>
          <SelectInput
            value="quaternion"
            onChange={() => {}}
            options={[
              {label: 'Quaternion', value: 'quaternion'},
              {label: 'Euler YZX', value: 'yzx'},
            ]}
          />
        </FormRow>
        <FormRow>
          <DimensionInput
            dimensions={4}
            value={value.getRotation()}
            onChange={(arr) => value.setRotation(arr)}
          />
        </FormRow>
      </FormGroup>
      <FormGroup label="Scale">
        <DimensionInput
          dimensions={3}
          value={value.getScale()}
          onChange={(arr) => value.setScale(arr)}
        />
      </FormGroup>
    </Div>
  );
}

const Div = styled.div`
  color: ${COLORS.gray90};
`;
