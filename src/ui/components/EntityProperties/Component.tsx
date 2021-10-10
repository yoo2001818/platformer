import React from 'react';

import {Entity} from '../../../core/Entity';

import {EntityPropertiesComponentHeader} from './ComponentHeader';
import {EntityPropertiesTransform} from './components/Transform';

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
  switch (name) {
    case 'transform':
      return (
        <EntityPropertiesTransform {...props} />
      );
    default:
      return (
        <div className={className}>
          <EntityPropertiesComponentHeader name={name} />
        </div>
      );
  }
}
