import React from 'react';
import styled from '@emotion/styled';

import {NumberInput} from '../NumberInput';

export interface DimensionInputProps<T extends number[] | Float32Array> {
  className?: string;
  dimensions: number;
  scale?: number;
  value: T;
  onChange: (value: T) => void;
}

export function DimensionInput<T extends number[] | Float32Array>(
  props: DimensionInputProps<T>,
): React.ReactElement {
  const {className, dimensions, scale, value, onChange} = props;
  return (
    <InputDiv className={className}>
      { Array.from({length: dimensions}, (_, i) => (
        <InputNumberInput
          key={i}
          value={value[i]}
          onChange={(newVal) => {
            const newArray = value.map((v, j) => (i === j ? newVal : v));
            onChange(newArray as T);
          }}
          scale={scale}
        />
      )) }
    </InputDiv>
  );
}

const InputDiv = styled.div`
  display: flex;
  margin: 0 -2.5px;
`;

const InputNumberInput = styled(NumberInput)`
  flex: 1 0 0px;
  margin: 0 2.5px;
`;
