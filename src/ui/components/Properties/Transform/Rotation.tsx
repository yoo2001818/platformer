import React, {useState, useCallback} from 'react';
import {vec3} from 'gl-matrix';

import {Transform} from '../../../../3d/Transform';
import {DimensionInput, SelectInput} from '../../Input';
import {FormRow} from '../../FormRow';
import {
  quaternionFromEulerYZX,
  quaternionToEulerYZX,
} from '../../../../3d/utils/euler';

export interface TransformPropertiesRotationProps {
  value: Transform;
  onChange: () => void;
}

export function TransformPropertiesRotation(
  props: TransformPropertiesRotationProps,
): React.ReactElement {
  const [type, setType] = useState('yzx');
  return (
    <>
      <FormRow>
        <SelectInput
          value={type}
          onChange={(value) => setType(value)}
          options={[
            {label: 'Quaternion', value: 'quaternion'},
            {label: 'Euler YZX', value: 'yzx'},
          ]}
        />
      </FormRow>
      { type === 'quaternion' && (
        <TransformPropertiesRotationQuaternion {...props} />
      ) }
      { type === 'yzx' && (
        <TransformPropertiesRotationEuler {...props} />
      ) }
    </>
  );
}

function TransformPropertiesRotationQuaternion(
  props: TransformPropertiesRotationProps,
): React.ReactElement {
  const {value, onChange} = props;
  return (
    <FormRow>
      <DimensionInput
        dimensions={4}
        value={value.getRotation()}
        onChange={(arr) => {
          value.setRotation(arr);
          onChange();
        }}
      />
    </FormRow>
  );
}


function TransformPropertiesRotationEuler(
  props: TransformPropertiesRotationProps,
): React.ReactElement {
  const {value, onChange} = props;
  const rotation = value.getRotation();
  const euler = new Float32Array(3);
  quaternionToEulerYZX(euler, rotation);
  vec3.scale(euler, euler, 180 / Math.PI);
  const handleChange = useCallback((euler: Float32Array) => {
    vec3.scale(euler, euler, Math.PI / 180);
    const out = new Float32Array(4);
    quaternionFromEulerYZX(out, euler);
    value.setRotation(out);
    onChange();
  }, [value, onChange]);
  return (
    <FormRow>
      <DimensionInput
        dimensions={3}
        value={euler}
        onChange={handleChange}
        scale={20}
        fraction={2}
      />
    </FormRow>
  );
}
