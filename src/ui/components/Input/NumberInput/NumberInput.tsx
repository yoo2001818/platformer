import React, {useCallback} from 'react';

import {TextInput} from '../TextInput';

export interface NumberInputProps {
  className?: string;
  value: number | null;
  onChange: (value: number) => void;
  placeholder?: string;
}

export function NumberInput(
  props: NumberInputProps,
): React.ReactElement {
  const {value, onChange, ...restProps} = props;
  const handleChange = useCallback((value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onChange(numValue);
    }
  }, [onChange]);
  return (
    <TextInput
      value={value != null ? String(value) : ''}
      onChange={handleChange}
      {...restProps}
    />
  );
}
