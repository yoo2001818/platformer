import React from 'react';
import styled from '@emotion/styled';

import {COLORS, RESET_BUTTON} from '../../styles';

export interface DropdownListItemProps {
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

export function DropdownListItem(
  props: DropdownListItemProps,
): React.ReactElement {
  const {className, onClick, children} = props;
  return (
    <ItemButton
      className={className}
      type="button"
      onClick={onClick}
    >
      { children }
    </ItemButton>
  );
}

const ItemButton = styled.button`
  ${RESET_BUTTON}
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 5px 12px 6px;
  font-size: 13px;
  line-height: normal;
  color: ${COLORS.gray70};
  text-align: left;
  &:hover {
    background-color: ${COLORS.gray20};
  }
`;
