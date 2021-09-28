import React from 'react';
import styled from '@emotion/styled';

export interface PanelProps {
  className?: string;
  children: React.ReactNode;
}

export function Panel(props: PanelProps): React.ReactElement {
  const {className, children} = props;
  return (
    <Div className={className}>
      { children }
    </Div>
  );
}

const Div = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: auto;
`;
