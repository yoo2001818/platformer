import React from 'react';
import styled from '@emotion/styled';

import {Dropdown} from '../Dropdown/Dropdown';
import {DropdownListItem} from '../DropdownList/DropdownItem';
import {DropdownList} from '../DropdownList/DropdownList';
import {COLORS} from '../../styles';

import {MenuItem} from './MenuItem';

export interface MenuBarProps {
  className?: string;
}

export function MenuBar(
  props: MenuBarProps,
): React.ReactElement {
  const {className} = props;
  return (
    <MenuDiv className={className}>
      <Dropdown
        renderButton={({toggle}) => (
          <MenuItem onClick={toggle}>File</MenuItem>
        )}
      >
        <DropdownList>
          <DropdownListItem>Test</DropdownListItem>
          <DropdownListItem>Test</DropdownListItem>
          <DropdownListItem>Test</DropdownListItem>
        </DropdownList>
      </Dropdown>
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
