import React from 'react';
import styled from '@emotion/styled';

export interface PanelContentProps {
  className?: string;
  children: React.ReactNode;
}

export function PanelContent(
  props: PanelContentProps,
): React.ReactElement {
  const {className, children} = props;
  return (
    <Div className={className}>
      { children }
    </Div>
  );
}

const Div = styled.div`
  flex: 1 0 0px;
  min-height: 0;
  overflow: auto;
`;
