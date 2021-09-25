import React from 'react';
import styled from '@emotion/styled';

export interface SplitContainerProps {
  className?: string;
  direction: 'vertical' | 'horizontal';
  children?: React.ReactNode;
}

export function SplitContainer(
  props: SplitContainerProps,
): React.ReactElement {
  const {className, children} = props;
  return (
    <ContainerDiv className={className}>
      A container
      { children }
    </ContainerDiv>
  );
}

const ContainerDiv = styled.div`
`;
