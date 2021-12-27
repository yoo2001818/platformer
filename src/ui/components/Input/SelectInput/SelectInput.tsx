import styled from '@emotion/styled';
import React, {useCallback, useMemo} from 'react';

import {TextInputInput, TextInputStyleProps} from '../TextInput';
import IconCaretDown from '../../../icons/IconCaretDown.svg';

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
    e: React.ChangeEvent<HTMLElement>,
  ) => {
    // Try to parse the value index
    const index = parseInt((e.target as HTMLSelectElement).value, 10);
    if (!isNaN(index)) {
      const entry = options[index];
      if (entry != null && entry.value !== value) {
        onChange(entry.value);
      }
    }
  }, [onChange, options]);
  return (
    <SelectInputDiv>
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
      <SelectInputCaret />
    </SelectInputDiv>
  );
}

const SelectInputDiv = styled.div`
  position: relative;
`;

const SelectInputInput = styled(TextInputInput)`
  padding-right: 24px;
`.withComponent('select');

const SelectInputCaret = styled(IconCaretDown)`
  position: absolute;
  right: 3px;
  top: 50%;
  margin-top: -8px;
  font-size: 16px;
  pointer-events: none;
`;
