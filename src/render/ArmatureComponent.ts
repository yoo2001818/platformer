import {ObjectFutureComponent} from '../core/components/ObjectFutureComponent';
import {Entity} from '../core/Entity';

import {Armature, ArmatureOptionsWithFuture} from './Armature';

export class ArmatureComponent extends ObjectFutureComponent<
  Armature,
  Armature | ArmatureOptionsWithFuture
> {
  constructor() {
    super(
      // TODO: The clone may want to change references
      (value) => value.clone(),
      (value, getFuture) => {
        if (value instanceof Armature) {
          return value;
        }
        return new Armature({
          ...value,
          joints: value.joints.map(getFuture),
          skeleton: value.skeleton != null
            ? getFuture(value.skeleton)
            : null,
        });
      },
    );
  }

  set(entity: Entity, value: Armature | ArmatureOptionsWithFuture): Armature {
    const result = super.set(entity, value);
    result.register(this.entityStore!);
    return result;
  }
}

