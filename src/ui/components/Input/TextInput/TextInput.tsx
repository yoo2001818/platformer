import React from 'react';
import styled from '@emotion/styled';

import {COLORS} from '../../../styles';

export interface TextInputProps extends
Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  className?: string;
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TextInput(
  props: TextInputProps,
): React.ReactElement {
  const {className, value, onChange, placeholder, ...restProps} = props;
  return (
    <TextInputInput
      className={className}
      type="text"
      value={value ?? ''}
      size={1}
      onChange={(e) => {
        onChange(e.currentTarget.value);
      }}
      placeholder={placeholder}
      {...restProps}
    />
  );
}

export const TextInputInput = styled.input`
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 4px 8px 5px;
  margin: 0;
  font-size: 13px;
  line-height: 19px;
  border: 1px solid ${COLORS.gray40};
  background: ${COLORS.gray0};
  color: ${COLORS.gray100};
  border-radius: 2px;
`;
