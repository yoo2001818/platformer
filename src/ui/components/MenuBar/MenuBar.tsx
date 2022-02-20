import React from 'react';
import styled from '@emotion/styled';

export interface MenuBarProps {
  className?: string;
}

export function MenuBar(
  props: MenuBarProps,
): React.ReactElement {
  const {className} = props;
  return (
    <MenuDiv className={className}>
      File...
    </MenuDiv>
  );
}

const MenuDiv = styled.div`
  flex: 0 0 auto;
`;


