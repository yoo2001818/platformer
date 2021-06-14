import type {Component} from '../components';
import type {Entity} from '../Entity';

export function getHashCode(
  entity: Entity,
  components: Component<any>[],
): number {
  let value = 0;
  for (const component of components) {
    const componentValue = component.get(entity);
    value = value * 7 + component.getHashCode(componentValue);
  }
  return value;
}
