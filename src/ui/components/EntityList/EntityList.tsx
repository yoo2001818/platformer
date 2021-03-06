import React from 'react';
import styled from '@emotion/styled';

import {Entity} from '../../../core/Entity';
import {useEngineValue} from '../../hooks/useEngineValue';
import {selectedEntity} from '../../states/selection';
import {useAtom} from '../../hooks/useAtom';

import {EntityListItem} from './Item';

export function EntityList(): React.ReactElement {
  const [selected, setSelected] = useAtom(selectedEntity);
  const entities = useEngineValue(
    (engine) => {
      const result: Entity[] = [];
      engine.entityStore
        .query()
        .forEach((entity) => {
          result.push(entity);
        });
      return result;
    },
    (engine) => {
      const {entityStore} = engine;
      const nameComp = entityStore.getComponent('name');
      return {
        signals: [entityStore.signal],
        getVersion: () => {
          return Math.max(
            entityStore.componentVersions[nameComp.getIndex()!] ?? 0,
            entityStore.structureVersion,
          );
        },
      };
    },
    [],
  );
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
