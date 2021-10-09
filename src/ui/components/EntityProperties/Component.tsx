import React from 'react';

import {Entity} from '../../../core/Entity';

import {EntityPropertiesComponentHeader} from './ComponentHeader';

export interface EntityPropertiesComponentProps {
  className?: string;
  entity: Entity;
  name: string;
  value: any;
}

export function EntityPropertiesComponent(
  props: EntityPropertiesComponentProps,
): React.ReactElement {
  const {className, entity, name, value} = props;
  return (
    <div className={className}>
      <EntityPropertiesComponentHeader name={name} />
    </div>
  );
}
