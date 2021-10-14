import React from 'react';

import {Transform} from '../../../../3d/Transform';
import {FormGroup} from '../../FormGroup';
import {DimensionInput} from '../../Input';

import {TransformPropertiesRotation} from './Rotation';

export interface TransformPropertiesProps {
  className?: string;
  value: Transform;
}

export function TransformProperties(
  props: TransformPropertiesProps,
): React.ReactElement {
  const {className, value} = props;
  return (
    <div className={className}>
      <FormGroup label="Position">
        <DimensionInput
          dimensions={3}
          value={value.getPosition()}
          onChange={(arr) => value.setPosition(arr)}
        />
      </FormGroup>
      <FormGroup label="Rotation">
        <TransformPropertiesRotation value={value} />
      </FormGroup>
      <FormGroup label="Scale">
        <DimensionInput
          dimensions={3}
          value={value.getScale()}
          onChange={(arr) => value.setScale(arr)}
        />
      </FormGroup>
    </div>
  );
}
