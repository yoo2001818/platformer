import {ObjectComponent} from '../core/components';
import {Entity} from '../core/Entity';

import {Transform} from './Transform';

export class TransformComponent
  extends ObjectComponent<Transform, Transform | any> {
  globalVersion = 0;

  constructor() {
    super(
      (v) => v.clone(),
      (v) => Transform.fromJSON(v),
    );
  }

  markGlobalDirty(): void {
    this.globalVersion += 1;
  }

  // TODO: EntityGroup
  set(entity: Entity, value: Transform | unknown): Transform {
    const result = super.set(entity, value);
    result.register(entity, this);
    return result;
  }
}
