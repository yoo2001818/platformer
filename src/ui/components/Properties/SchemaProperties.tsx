import React from 'react';

import {DimensionInput, ColorInput, NumberInput} from '../Input';
import {FormGroup} from '../FormGroup';

export interface SchemaPropertiesTypeProps {
  value: any;
  onChange: (value: any) => void;
}

export interface SchemaPropertiesType {
  (props: SchemaPropertiesTypeProps): React.ReactElement;
}

export const TYPE_TABLE: {[key: string]: SchemaPropertiesType;} = {
  vec3: (props) => (
    <DimensionInput
      dimensions={3}
      {...props}
    />
  ),
  color: (props) => (
    <ColorInput {...props} />
  ),
  number: (props) => (
    <NumberInput {...props} />
  ),
};

export interface SchemaPropertiesSchema {
  id: string;
  label: string;
  type: string;
}

export interface SchemaPropertiesProps {
  schema: SchemaPropertiesSchema[];
  value: any;
  onChange: (value: any) => void;
}

export function SchemaProperties(
  props: SchemaPropertiesProps,
): React.ReactElement {
  const {schema, value, onChange} = props;
  return (
    <>
      { schema.map(({id, label, type}) => {
        const renderItem = TYPE_TABLE[type];
        if (renderItem == null) {
          return (
            <FormGroup label={label} key={id}>
              { type }
            </FormGroup>
          );
        }
        return (
          <FormGroup label={label} key={id}>
            { renderItem({
              value: value[id],
              onChange: (nextValue) => {
                onChange({
                  ...value,
                  [id]: nextValue,
                });
              },
            }) }
          </FormGroup>
        );
      }) }
    </>
  );
}
