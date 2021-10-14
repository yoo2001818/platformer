import React, {useState, useCallback} from 'react';
import {vec3} from 'gl-matrix';

import {Transform} from '../../../../3d/Transform';
import {DimensionInput, SelectInput} from '../../Input';
import {FormRow} from '../../FormRow';
import {
  quaternionFromEulerXYZ,
  quaternionToEulerXYZ,
} from '../../../../3d/utils/euler';

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
      { type === 'quaternion' && (
        <TransformPropertiesRotationQuaternion value={value} />
      ) }
      { type === 'xyz' && (
        <TransformPropertiesRotationEuler value={value} />
      ) }
    </>
  );
}

function TransformPropertiesRotationQuaternion(
  props: TransformPropertiesRotationProps,
): React.ReactElement {
  const {value} = props;
  return (
    <FormRow>
      <DimensionInput
        dimensions={4}
        value={value.getRotation()}
        onChange={(arr) => value.setRotation(arr)}
      />
    </FormRow>
  );
}


function TransformPropertiesRotationEuler(
  props: TransformPropertiesRotationProps,
): React.ReactElement {
  const {value} = props;
  const rotation = value.getRotation();
  const euler = new Float32Array(3);
  quaternionToEulerXYZ(euler, rotation);
  vec3.scale(euler, euler, 180 / Math.PI);
  const handleChange = useCallback((euler: Float32Array) => {
    vec3.scale(euler, euler, Math.PI / 180);
    const out = new Float32Array(4);
    quaternionFromEulerXYZ(out, euler);
    value.setRotation(out);
  }, [value]);
  return (
    <FormRow>
      <DimensionInput
        dimensions={3}
        value={euler}
        onChange={handleChange}
        scale={10}
      />
    </FormRow>
  );
}
