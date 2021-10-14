import React, {useState} from 'react';

import {Transform} from '../../../../3d/Transform';
import {DimensionInput, SelectInput} from '../../Input';
import {FormRow} from '../../FormRow';

export interface TransformPropertiesRotationProps {
  value: Transform;
}

export function TransformPropertiesRotation(
  props: TransformPropertiesRotationProps,
): React.ReactElement {
  const {value} = props;
  const [type, setType] = useState('quaternion');
  return (
    <>
      <FormRow>
        <SelectInput
          value={type}
          onChange={(value) => setType(value)}
          options={[
            {label: 'Quaternion', value: 'quaternion'},
            {label: 'Euler XYZ', value: 'xyz'},
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
    </>
  );
}
