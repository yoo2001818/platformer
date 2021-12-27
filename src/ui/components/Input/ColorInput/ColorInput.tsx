import React, {useCallback} from 'react';

import {TextInputInput, TextInputStyleProps} from '../TextInput';

export interface ColorInputProps {
  value: string | null;
  onChange: (value: string) => void;
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
  size?: TextInputStyleProps['sizeHeight'];
  color?: TextInputStyleProps['color'];
}

export function ColorInput(props: ColorInputProps): React.ReactElement {
  const {value, onChange, size, color, ...restProps} = props;
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLElement>,
  ) => {
    // Try to parse the value index
    onChange((e.target as HTMLInputElement).value);
  }, [onChange]);
  return (
    <TextInputInput
      {...restProps}
      value={value ?? ''}
      onChange={handleChange}
      size={1}
      sizeHeight={size}
      color={color}
      type="color"
    />
  );
}
