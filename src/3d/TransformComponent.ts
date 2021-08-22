import {ObjectComponent} from '../core/components';
import {Entity} from '../core/Entity';

import {Transform} from './Transform';

export class TransformComponent extends ObjectComponent<Transform> {
  // TODO: EntityGroup
  set(entity: Entity, value: Transform): void {
    super.set(entity, value);
    value.register(entity);
  }
}
