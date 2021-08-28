import {ObjectFutureComponent} from '../core/components/ObjectFutureComponent';

import {Armature, ArmatureWithFuture} from './Armature';

export class ArmatureComponent extends ObjectFutureComponent<
  Armature,
  ArmatureWithFuture
> {
  constructor() {
    super((value, getFuture) => ({
      ...value,
      joints: value.joints.map(getFuture),
      skeleton: value.skeleton != null
        ? getFuture(value.skeleton)
        : null,
    }));
  }
}

