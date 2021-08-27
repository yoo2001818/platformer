import {ObjectFutureComponent} from '../core/components/ObjectFutureComponent';
import {EntityFuture} from '../core/EntityFuture';

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
      targets: value.targets.map((target): AnimationTarget => {
        if (target.entity instanceof EntityFuture) {
          return {...target, entity: getFuture(target.entity)};
        }
        return target as AnimationTarget;
      }),
    }));
  }
}
