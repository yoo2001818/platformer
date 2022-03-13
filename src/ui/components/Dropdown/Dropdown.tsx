import React, {useState, useCallback} from 'react';
import styled from '@emotion/styled';

export interface DropdownChildProps {
  toggle: () => void;
}

export interface DropdownProps {
  className?: string;
  renderButton: (props: DropdownChildProps) => React.ReactElement;
  children: React.ReactNode;
}

export function Dropdown(
  props: DropdownProps,
): React.ReactElement {
  const {className, renderButton, children} = props;
  const [isOpen, setOpen] = useState(false);
  const handleToggle = useCallback(() => {
    setOpen((v) => !v);
  }, []);
  return (
    <DropdownContainer className={className}>
      { renderButton({
        toggle: handleToggle,
      }) }
      { isOpen && (
        <DropdownChild>
          { children }
        </DropdownChild>
      ) }
    </DropdownContainer>
  );
}

const DropdownContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const DropdownChild = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
`;
