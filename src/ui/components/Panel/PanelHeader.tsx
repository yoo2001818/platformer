import React from 'react';
import styled from '@emotion/styled';

import {COLORS} from '../../styles/colors';

export interface PanelHeaderProps {
  className?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}

export function PanelHeader(
  props: PanelHeaderProps,
): React.ReactElement {
  const {className, children, right} = props;
  return (
    <HeaderContainer className={className}>
      <HeaderTitle>
        { children }
      </HeaderTitle>
      { right && (
        <HeaderSection>
          { right }
        </HeaderSection>
      ) }
    </HeaderContainer>
  );
}

const HeaderContainer = styled.div`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  padding: 3px;
  box-sizing: border-box;
  background-color: ${COLORS.gray70};
  color: ${COLORS.gray0};
  font-size: 13px;
`;

const HeaderSection = styled.div`
  display: flex;
  align-items: center;
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  font-weight: bold;
  padding-left: 6px;
`;
