import {ObjectFutureComponent} from '../core/components/ObjectFutureComponent';

import {
  Animation,
  AnimationWithFuture,
  AnimationTarget,
} from './Animation';

export class AnimationComponent extends ObjectFutureComponent<
  Animation,
  AnimationWithFuture
> {
  constructor() {
    super((value, getFuture) => ({
      ...value,
      targets: value.targets.map((target): AnimationTarget => ({
        ...target,
        entity: getFuture(target.entity),
      })),
    }));
  }
}
