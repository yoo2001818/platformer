import React from 'react';
import styled from '@emotion/styled';

import {COLORS, RESET_BUTTON} from '../../styles';

export interface MenuItemProps {
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

export function MenuItem(
  props: MenuItemProps,
): React.ReactElement {
  const {className, onClick, children} = props;
  return (
    <ItemButton
      className={className}
      onClick={onClick}
      type="button"
    >
      { children }
    </ItemButton>
  );
}

const ItemButton = styled.button`
  ${RESET_BUTTON}
  display: inline-block;
  background-color: ${COLORS.gray80};
  color: ${COLORS.gray0};
  padding: 5px 9px;
  border-radius: 3px;
  &:hover {
    background-color: ${COLORS.gray70};
  }
`;
