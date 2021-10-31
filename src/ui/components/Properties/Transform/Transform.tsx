import React, {useCallback} from 'react';

import {Transform} from '../../../../3d/Transform';
import {Entity} from '../../../../core/Entity';
import {FormGroup} from '../../FormGroup';
import {DimensionInput} from '../../Input';

import {TransformPropertiesRotation} from './Rotation';

export interface TransformPropertiesProps {
  className?: string;
  entity: Entity;
  value: Transform;
}

export function TransformProperties(
  props: TransformPropertiesProps,
): React.ReactElement {
  const {className, entity, value} = props;
  const handleChange = useCallback(() => {
    entity.markChanged('transform');
  }, [entity]);
  return (
    <div className={className}>
      <FormGroup label="Position">
        <DimensionInput
          dimensions={3}
          value={value.getPosition()}
          onChange={(arr) => {
            value.setPosition(arr);
            handleChange();
          }}
        />
      </FormGroup>
      <FormGroup label="Rotation">
        <TransformPropertiesRotation
          value={value}
          onChange={handleChange}
        />
      </FormGroup>
      <FormGroup label="Scale">
        <DimensionInput
          dimensions={3}
          value={value.getScale()}
          onChange={(arr) => {
            value.setScale(arr);
            handleChange();
          }}
        />
      </FormGroup>
    </div>
  );
}
