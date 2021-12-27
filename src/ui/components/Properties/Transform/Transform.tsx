import React from 'react';

import {Transform} from '../../../../3d/Transform';
import {Entity} from '../../../../core/Entity';
import {FormGroup} from '../../FormGroup';
import {DimensionInput} from '../../Input';

import {TransformPropertiesRotation} from './Rotation';

export interface TransformPropertiesProps {
  className?: string;
  entity: Entity;
  value: Transform;
  onChange: (value: Transform) => void;
}

export function TransformProperties(
  props: TransformPropertiesProps,
): React.ReactElement {
  const {className, value, onChange} = props;
  return (
    <div className={className}>
      <FormGroup label="Position">
        <DimensionInput
          dimensions={3}
          value={value.getPosition()}
          onChange={(arr) => {
            onChange(value.setPosition(arr));
          }}
        />
      </FormGroup>
      <FormGroup label="Rotation">
        <TransformPropertiesRotation
          value={value}
          onChange={onChange}
        />
      </FormGroup>
      <FormGroup label="Scale">
        <DimensionInput
          dimensions={3}
          value={value.getScale()}
          onChange={(arr) => {
            onChange(value.setScale(arr));
          }}
        />
      </FormGroup>
    </div>
  );
}
