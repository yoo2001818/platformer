import React from 'react';
import styled from '@emotion/styled';

export interface LayoutTreeProps {
  className?: string;
  children: React.ReactNode;
}

export function LayoutTree(
  props: LayoutTreeProps,
): React.ReactElement {
  const {className, children} = props;
  return (
    <TreeDiv className={className}>
      { children }
    </TreeDiv>
  );
}

const TreeDiv = styled.div`
  width: 100%;
  height: 100%;
`;

