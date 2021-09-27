import React from 'react';
import styled from '@emotion/styled';

export interface SplitCellProps {
  className?: string;
  direction?: 'vertical' | 'horizontal';
  size: number;
  children: React.ReactNode;
}

export function SplitCell(
  props: SplitCellProps,
): React.ReactElement {
  const {className, direction, size, children} = props;
  return (
    <SplitCellDiv
      className={className}
      direction={direction}
      size={size}
    >
      { children }
    </SplitCellDiv>
  );
}

const SplitCellDiv = styled.div<{direction?: string; size: number;}>`
  overflow: auto;
  ${({size}) => `
    flex: ${size * 100} 0 0px;
    min-width: 0;
    min-height: 0;
  `}
`;
