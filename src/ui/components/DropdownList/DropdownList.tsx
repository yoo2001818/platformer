import React from 'react';
import styled from '@emotion/styled';

import {COLORS} from '../../styles';

export interface DropdownListProps {
  className?: string;
  children: React.ReactNode;
}

export function DropdownList(
  props: DropdownListProps,
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
