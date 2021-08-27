import {ObjectFutureComponent} from '../core/components/ObjectFutureComponent';
import {EntityFuture} from '../core/EntityFuture';

import {
  AnimationController,
  AnimationControllerWithFuture,
  AnimationTarget,
} from './AnimationController';

export class AnimationControllerComponents extends ObjectFutureComponent<
  AnimationController,
  AnimationControllerWithFuture
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
