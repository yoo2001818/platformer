import React from 'react';
import styled from '@emotion/styled';

import {COLORS} from '../../../styles';

export interface TextInputProps extends
Omit<React.InputHTMLAttributes<HTMLInputElement>,
'value' | 'onChange' | 'color' | 'size'>,
Omit<TextInputStyleProps, 'sizeHeight'> {
  className?: string;
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: TextInputStyleProps['sizeHeight'];
}

export function TextInput(
  props: TextInputProps,
): React.ReactElement {
  const {className, value, onChange, placeholder, size, ...restProps} = props;
  return (
    <TextInputInput
      className={className}
      type="text"
      value={value ?? ''}
      size={1}
      sizeHeight={size}
      onChange={(e) => {
        onChange(e.currentTarget.value);
      }}
      placeholder={placeholder}
      {...restProps}
    />
  );
}

export interface TextInputStyleProps {
  color?: 'light' | 'dark';
  sizeHeight?: 26 | 30;
}

const SIZE_MAP: {[key: string]: string;} = {
  26: `
    padding: 2px 8px;
    font-size: 13px;
    line-height: 20px;
  `,
  30: `
    padding: 4px 8px;
    font-size: 13px;
    line-height: 20px;
  `,
};

const COLOR_MAP: {[key: string]: string;} = {
  light: `
    border: 1px solid ${COLORS.gray40};
    background: ${COLORS.gray0};
    color: ${COLORS.gray100};
    &:hover {
      background: ${COLORS.gray10};
    }
  `,
  dark: `
    border: 1px solid ${COLORS.gray90};
    background: ${COLORS.gray80};
    color: ${COLORS.gray0};
    &:hover {
      background: ${COLORS.gray70};
    }
  `,
};

export const TextInputInput = styled.input<TextInputStyleProps>`
  -webkit-appearance: none;
  -moz-appearance: none;
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  font-size: 13px;
  line-height: 20px;
  border: 1px solid ${COLORS.gray40};
  background: ${COLORS.gray0};
  color: ${COLORS.gray100};
  border-radius: 3px;
  ${({sizeHeight}) => SIZE_MAP[sizeHeight ?? 30]}
  ${({color}) => COLOR_MAP[color ?? 'light']}
`;
