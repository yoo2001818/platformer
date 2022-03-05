import React from 'react';
import styled from '@emotion/styled';

import {COLORS, RESET_BUTTON} from '../../styles';

export interface MenuBarProps {
  className?: string;
}

export function MenuBar(
  props: MenuBarProps,
): React.ReactElement {
  const {className} = props;
  return (
    <MenuDiv className={className}>
      <MenuItem>File</MenuItem>
      <MenuItem>Edit</MenuItem>
      <MenuItem>View</MenuItem>
      <MenuItem>Help</MenuItem>
    </MenuDiv>
  );
}

const MenuDiv = styled.div`
  flex: 0 0 auto;
  background-color: ${COLORS.gray80};
  color: ${COLORS.gray0};
  padding: 0 9px;
  font-size: 14px;
`;

const MenuItem = styled.button`
  ${RESET_BUTTON}
  display: inline-block;
  color: ${COLORS.gray0};
  padding: 5px 9px;
`;
