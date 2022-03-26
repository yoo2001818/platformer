import React from 'react';
import styled from '@emotion/styled';

import {DropdownListItem} from '../DropdownList/DropdownItem';
import {COLORS} from '../../styles';
import {newFile} from '../../../editor/commands/file';
import {useEngine} from '../../hooks/useEngine';

import {MenuItem} from './MenuItem';
import {MenuItemDropdown} from './MenuItemDropdown';

export interface MenuBarProps {
  className?: string;
}

export function MenuBar(
  props: MenuBarProps,
): React.ReactElement {
  const {className} = props;
  const engine = useEngine();
  return (
    <MenuDiv className={className}>
      <MenuItemDropdown label="File">
        <DropdownListItem
          onClick={() => {
            newFile(engine);
          }}
        >
          New
        </DropdownListItem>
        <DropdownListItem>Open...</DropdownListItem>
        <DropdownListItem>Save</DropdownListItem>
      </MenuItemDropdown>
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
