import React, {useState, useCallback, useEffect, useRef} from 'react';
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setOpen] = useState(false);
  const handleToggle = useCallback(() => {
    setOpen((v) => !v);
  }, []);
  useEffect(() => {
    const containerElem = containerRef.current;
    if (!isOpen || containerElem == null) {
      return;
    }
    const handleClick = (e: MouseEvent): void => {
      const elem = e.target;
      if (elem instanceof Element && !containerElem.contains(elem)) {
        setOpen(false);
      }
    };
    window.addEventListener('click', handleClick);
    // eslint-disable-next-line consistent-return
    return () => {
      window.removeEventListener('click', handleClick);
    };
  }, [isOpen]);
  return (
    <DropdownContainer
      className={className}
      ref={containerRef}
    >
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
