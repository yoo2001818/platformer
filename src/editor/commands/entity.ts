import {Engine} from '../../core/Engine';
import {Entity} from '../../core/Entity';

// TODO: Let's think about its structure later, as it's not important for now
// (This will be important when we need to implement undo/redo)

export function duplicateEntity(
  engine: Engine,
  entity: Entity,
): Entity {
  const {entityStore} = engine;
  // FIXME: Clone
  console.log(entity.toJSON());
  return entityStore.create(entity.getMap());
}

export function deleteEntity(
  engine: Engine,
  entity: Entity,
): void {
  entity.destroy();
}
