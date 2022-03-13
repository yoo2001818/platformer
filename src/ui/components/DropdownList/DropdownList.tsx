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
    <ListDiv className={className}>
      { children }
    </ListDiv>
  );
}

const ListDiv = styled.div`
  min-width: 110px;
  box-sizing: border-box;
  padding: 4px 0;
  border: 1px solid ${COLORS.gray40};
  background-color: ${COLORS.gray0};
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, .10);
  overflow: auto;
`;
