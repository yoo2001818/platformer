import React from 'react';
import styled from '@emotion/styled';

import {COLORS} from '../../styles';

export interface DropDownListItemProps {
  className?: string;
  children: React.ReactNode;
}

export function DropDownListItem(
  props: DropDownListItemProps,
): React.ReactElement {
  const {className, children} = props;
  return (
    <Div className={className}>
      { children }
    </Div>
  );
}

const Div = styled.div`
  color: ${COLORS.gray90};
`;
