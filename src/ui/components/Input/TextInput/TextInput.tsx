import React from 'react';
import styled from '@emotion/styled';

import {COLORS} from '../../../styles';

export interface TextInputProps {
  className?: string;
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TextInput(
  props: TextInputProps,
): React.ReactElement {
  const {className, value, onChange, placeholder} = props;
  return (
    <Input
      className={className}
      type="text"
      value={value ?? ''}
      onChange={(e) => {
        onChange(e.currentTarget.value);
      }}
      placeholder={placeholder}
    />
  );
}

const Input = styled.input`
  color: ${COLORS.gray90};
`;
