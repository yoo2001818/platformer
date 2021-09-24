import React from 'react';
import styled from '@emotion/styled';

import {Entity} from '../../core/Entity';
import {useEngineValue} from '../hooks/useEngineValue';
import {COLORS} from '../constants/colors';

export function EntityList(): React.ReactElement {
  const entities = useEngineValue((engine) => {
    const result: Entity[] = [];
    engine.entityStore
      .query()
      .without('parent')
      .forEach((entity) => {
        result.push(entity);
      });
    return result;
  });
  return (
    <EntityListUl>
      { entities.map((entity, i) => (
        <EntityListItem key={entity.handle.id}>
          { entity.get('name') }
        </EntityListItem>
      )) }
    </EntityListUl>
  );
}

const EntityListUl = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const EntityListItem = styled.li`
  padding: 5px 16px;
  background-color: ${COLORS.gray0};
  color: ${COLORS.gray90};
  font-size: 13px;
  &:hover {
    background-color: ${COLORS.blue50};
    color: ${COLORS.gray0};
  }
`;
