import React from 'react';

import {Dropdown} from '../Dropdown/Dropdown';
import {DropdownList} from '../DropdownList/DropdownList';

import {MenuItem} from './MenuItem';

export interface MenuItemDropdownProps {
  label: React.ReactNode;
  children: React.ReactNode;
}

export function MenuItemDropdown(
  props: MenuItemDropdownProps,
): React.ReactElement {
  const {label, children} = props;
  return (
    <Dropdown
      renderButton={({toggle}) => (
        <MenuItem onClick={toggle}>{ label }</MenuItem>
      )}
    >
      <DropdownList>
        { children }
      </DropdownList>
    </Dropdown>
  );
}
