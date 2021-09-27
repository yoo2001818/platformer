import React from 'react';
import styled from '@emotion/styled';
import {useRecoilState} from 'recoil';

import {Entity} from '../../../core/Entity';
import {useEngineValue} from '../../hooks/useEngineValue';
import {selectedEntity} from '../../states/selection';

import {EntityListItem} from './Item';

export function EntityList(): React.ReactElement {
  const [selected, setSelected] = useRecoilState(selectedEntity);
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
        <EntityListLi key={entity.handle.id}>
          <EntityListItem
            entity={entity}
            isSelected={selected === entity.handle}
            onClick={() => {
              setSelected(entity.handle);
            }}
          />
        </EntityListLi>
      )) }
    </EntityListUl>
  );
}

const EntityListUl = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const EntityListLi = styled.li`
`;
