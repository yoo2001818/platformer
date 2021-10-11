import React, {useCallback, useState} from 'react';

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
  const [inputValue, setInputValue] = useState<string | null>(null);
  const handleChange = useCallback((value: string) => {
    setInputValue(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onChange(numValue);
    }
  }, [onChange]);
  const handleBlur = useCallback(() => {
    setInputValue(null);
    if (inputValue != null) {
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue)) {
        onChange(numValue);
      }
    }
  }, [inputValue, onChange]);
  return (
    <TextInput
      value={inputValue ?? (value != null ? String(value) : '')}
      onChange={handleChange}
      onBlur={handleBlur}
      {...restProps}
    />
  );
}
