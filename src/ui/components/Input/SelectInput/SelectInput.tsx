import React, {useCallback, useMemo} from 'react';

import {TextInputInput, TextInputStyleProps} from '../TextInput';

export interface SelectInputOption<T> {
  label: string;
  value: T;
}

export interface SelectInputProps<T> {
  className?: string;
  value: T | null;
  onChange: (value: T) => void;
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
  placeholder?: string;
  options: SelectInputOption<T>[];
  size?: TextInputStyleProps['sizeHeight'];
  color?: TextInputStyleProps['color'];
}

export function SelectInput<T>(
  props: SelectInputProps<T>,
): React.ReactElement {
  const {
    value, onChange, placeholder, options, size, color, ...restProps
  } = props;
  const optionValues = useMemo(() => {
    const output: React.ReactElement[] = [];
    if (placeholder != null) {
      output.push((
        <option value={-1} key={-1} disabled>{ placeholder }</option>
      ));
    }
    options.forEach(({label}, index) => {
      output.push((
        <option value={index} key={index}>{ label }</option>
      ));
    });
    return output;
  }, [options, placeholder]);
  const selectedIndex = useMemo(
    () => options.findIndex((entry) => entry.value === value),
    [value, options],
  );
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    // Try to parse the value index
    const index = parseInt(e.target.value, 10);
    if (!isNaN(index)) {
      const entry = options[index];
      if (entry != null) {
        onChange(entry.value);
      }
    }
  }, [onChange, options]);
  return (
    <SelectInputInput
      {...restProps}
      value={selectedIndex}
      onChange={handleChange}
      size={1}
      sizeHeight={size}
      color={color}
    >
      { optionValues }
    </SelectInputInput>
  );
}

const SelectInputInput = TextInputInput.withComponent('select');
