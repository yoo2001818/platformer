import React from 'react';
import styled from '@emotion/styled';

export interface FormRowProps {
  className?: string;
  children: React.ReactNode;
}

export function FormRow(
  props: FormRowProps,
): React.ReactElement {
  const {className, children} = props;
  return (
    <Div className={className}>
      { children }
    </Div>
  );
}

const Div = styled.div`
  & + & {
    margin: 5px 0 0;
  }
`;
