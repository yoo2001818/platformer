import React from 'react';

import {Entity} from '../../../core/Entity';
import {TransformProperties} from '../Properties';

import {EntityPropertiesComponentHeader} from './ComponentHeader';

export interface EntityPropertiesComponentProps {
  className?: string;
  entity: Entity;
  name: string;
  value: any;
  onChange: (value: any) => void;
}

export function EntityPropertiesComponent(
  props: EntityPropertiesComponentProps,
): React.ReactElement {
  const {className, name} = props;
  switch (name) {
    case 'transform':
      return (
        <>
          <EntityPropertiesComponentHeader label="Transform" />
          <TransformProperties {...props} />
        </>
      );
    default:
      return (
        <div className={className}>
          <EntityPropertiesComponentHeader label={name} />
        </div>
      );
  }
}
