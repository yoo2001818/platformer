import React, {useMemo} from 'react';
import styled from '@emotion/styled';

import {SplitDivider} from './SplitDivider';

export interface SplitListProps {
  className?: string;
  direction: 'vertical' | 'horizontal';
  children?: React.ReactNode;
}

export function SplitList(
  props: SplitListProps,
): React.ReactElement {
  const {className, direction, children} = props;
  const mappedChildren = useMemo(() => {
    const childList = React.Children.toArray(children);
    const output: React.ReactNode[] = [];
    childList.forEach((child, i) => {
      if (i > 0) {
        output.push((
          <SplitDivider key={`d-${i}`} />
        ));
      }
      if (React.isValidElement(child)) {
        output.push(React.cloneElement(child, {direction}));
      }
    });
    return output;
  }, [direction, children]);
  return (
    <ContainerDiv className={className}>
      { mappedChildren }
    </ContainerDiv>
  );
}

const ContainerDiv = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
`;
