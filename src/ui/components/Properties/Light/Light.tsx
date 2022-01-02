import React from 'react';

import {Entity} from '../../../../core/Entity';
import {LIGHT_TABLE} from '../../../../render/light';
import {Light} from '../../../../render/light/Light';
import {FormGroup} from '../../FormGroup';
import {SelectInput} from '../../Input';
import {SchemaProperties, SchemaPropertiesSchema} from '../SchemaProperties';

const LIGHT_SCHEMAS: {[key: string]: SchemaPropertiesSchema[];} = {
  point: [
    {id: 'color', label: 'Color', type: 'color'},
    {id: 'power', label: 'Power', type: 'number'},
    {id: 'radius', label: 'Radius', type: 'number'},
    {id: 'range', label: 'Range', type: 'number'},
  ],
  directional: [
    {id: 'color', label: 'Color', type: 'color'},
    {id: 'power', label: 'Power', type: 'number'},
  ],
  directionalShadow: [
    {id: 'color', label: 'Color', type: 'color'},
    {id: 'power', label: 'Power', type: 'number'},
  ],
  environment: [
    {id: 'texture', label: 'Texture', type: 'texture2D'},
    {id: 'power', label: 'Power', type: 'number'},
  ],
  ambient: [
    {id: 'color', label: 'Color', type: 'color'},
    {id: 'power', label: 'Power', type: 'number'},
  ],
};

export interface LightPropertiesProps {
  className?: string;
  entity: Entity;
  value: Light;
  onChange: (value: Light) => void;
}

export function LightProperties(
  props: LightPropertiesProps,
): React.ReactElement {
  const {className, value, onChange} = props;
  const schema = LIGHT_SCHEMAS[value.type];
  return (
    <div className={className}>
      <FormGroup label="Type">
        <SelectInput
          options={Object.keys(LIGHT_TABLE).map((v) => ({label: v, value: v}))}
          value={value.type}
          onChange={(newType) => {
            const NewLight = LIGHT_TABLE[newType];
            const newLight = new NewLight();
            onChange(newLight);
          }}
        />
      </FormGroup>
      { schema != null && (
        <SchemaProperties
          schema={schema}
          value={value.getOptions()}
          onChange={(v) => {
            value.setOptions(v);
            onChange(value);
          }}
        />
      ) }
    </div>
  );
}

