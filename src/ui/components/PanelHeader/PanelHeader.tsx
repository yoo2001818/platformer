import React from 'react';
import styled from '@emotion/styled';

import {COLORS} from '../../constants/colors';

export interface PanelHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export function PanelHeader(
  props: PanelHeaderProps,
): React.ReactElement {
  const {className, children} = props;
  return (
    <Div className={className}>
      { children }
    </Div>
  );
}

const Div = styled.div`
  padding: 6px 10px;
  font-size: 13px;
  font-weight: bold;
  background-color: ${COLORS.gray70};
  color: ${COLORS.gray0};
`;
