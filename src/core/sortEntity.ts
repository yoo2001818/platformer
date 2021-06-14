import type {EntityStore} from './EntityStore';

export function sortEntity(store: EntityStore): void {
  // Read all floating entities and place them onto the entity group.
  store.floatingEntities.forEach((entity) => {
    // Drop the invalid entity immediately
    if (!entity.isValid()) {
      return;
    }
    const group = store.getGroup(entity);
    group.allocate(entity);
  });
}
