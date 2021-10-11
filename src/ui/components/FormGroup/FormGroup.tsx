import React from 'react';
import styled from '@emotion/styled';

import {COLORS} from '../../styles';

export interface FormGroupProps {
  className?: string;
  label: React.ReactNode;
  children: React.ReactNode;
}

export function FormGroup(
  props: FormGroupProps,
): React.ReactElement {
  const {className, label, children} = props;
  return (
    <GroupContainer className={className}>
      <GroupLabel>
        { label }
      </GroupLabel>
      <GroupContent>
        { children }
      </GroupContent>
    </GroupContainer>
  );
}

const GroupContainer = styled.div`
  display: flex;
  align-items: center;
  font-size: 13px;
  padding: 5px 9px;
`;

const GroupLabel = styled.div`
  flex: 0 1 auto;
  width: 86px;
  color: ${COLORS.gray80};
`;

const GroupContent = styled.div`
  flex: 1 0 0px;
  min-width: 0;
`;
