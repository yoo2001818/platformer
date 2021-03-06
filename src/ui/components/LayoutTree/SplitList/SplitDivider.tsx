import React from 'react';
import styled from '@emotion/styled';

import {COLORS} from '../../../styles/colors';

export interface SplitDividerProps {
  className?: string;
}

export function SplitDivider(
  props: SplitDividerProps,
): React.ReactElement {
  const {className} = props;
  return (
    <Divider className={className} />
  );
}

const Divider = styled.hr`
  flex: 0 0 2px;
  display: block;
  margin: 0;
  padding: 0;
  border: none;
  background-color: ${COLORS.gray80};
`;
