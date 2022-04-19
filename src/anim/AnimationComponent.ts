import {ObjectComponent} from '../core/components/ObjectComponent';

import {
  Animation,
  AnimationTarget,
} from './Animation';

export class AnimationComponent extends ObjectComponent<Animation> {
  constructor() {
    super(
      (value) => value,
      undefined,
      (value, resolveEntity) => ({
        ...value,
        targets: value.targets.map((target): AnimationTarget => ({
          ...target,
          entity: resolveEntity(target.entity)!,
        })),
      }),
    );
  }
}
