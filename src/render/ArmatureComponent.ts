import {ObjectComponent} from '../core/components/ObjectComponent';
import {Entity} from '../core/Entity';

import {Armature, ArmatureOptions} from './Armature';

export class ArmatureComponent extends ObjectComponent<
  Armature, Armature | ArmatureOptions
> {
  constructor() {
    super(
      // TODO: The clone may want to change references
      (value) => value.clone(),
      (value) => {
        if (value instanceof Armature) {
          return value;
        }
        return new Armature({
          ...value,
          joints: value.joints,
          skeleton: value.skeleton,
        });
      },
      (value, resolveEntity) => {
        // TODO: Maybe we can do this without cloning...?
        return new Armature({
          ...value.options,
          joints: value.options.joints.map(resolveEntity),
          skeleton: resolveEntity(value.options.skeleton),
        });
      },
    );
  }

  set(entity: Entity, value: Armature | ArmatureOptions): Armature {
    const result = super.set(entity, value);
    result.register(this.entityStore!);
    return result;
  }
}

