import React from 'react';
import styled from '@emotion/styled';

import {Entity} from '../../../core/Entity';
import {COLORS} from '../../styles/colors';
import {RESET_BUTTON} from '../../styles/utils';

export interface EntityListItemProps {
  className?: string;
  isSelected?: boolean;
  onClick?: () => void;
  entity: Entity;
}

export function EntityListItem(
  props: EntityListItemProps,
): React.ReactElement {
  const {className, isSelected, onClick, entity} = props;
  return (
    <ItemButton
      className={className}
      type="button"
      aria-pressed={isSelected}
      isSelected={Boolean(isSelected)}
      onClick={onClick}
    >
      { entity.get('name') }
    </ItemButton>
  );
}

const ItemButton = styled.button<{isSelected: boolean;}>`
  ${RESET_BUTTON}
  width: 100%;
  padding: 5px 16px;
  background-color: ${COLORS.gray0};
  color: ${COLORS.gray90};
  font-size: 13px;
  &:hover {
    background-color: ${COLORS.blue60};
    color: ${COLORS.gray0};
  }
  ${({isSelected}) => isSelected && `
    background-color: ${COLORS.blue60};
    color: ${COLORS.gray0};
  `}
`;
