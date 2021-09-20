import type {EntityStore} from './EntityStore';

export function sortEntity(store: EntityStore): void {
  // Read all floating entities and place them onto the entity group.
  store.floatingEntities.forEach((entity) => {
    // Drop the invalid entity immediately
    if (!entity.floating || !entity.isValid()) {
      return;
    }
    const group = store.getGroupOf(entity);
    group.allocate(entity);
  });
  store.floatingEntities = [];
}
