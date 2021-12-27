import {AnimationComponent} from '../anim/AnimationComponent';
import {ObjectComponent} from '../core/components';
import {ArmatureComponent} from '../render/ArmatureComponent';
import {Light} from '../render/light/Light';
import {MeshComponent} from '../render/MeshComponent';

import {Camera} from './Camera';
import {ParentComponent} from './ParentComponent';
import {TransformComponent} from './TransformComponent';

export function create3DComponents() {
  return {
    name: new ObjectComponent<string>(),
    transform: new TransformComponent(),
    parent: new ParentComponent(),
    camera: new ObjectComponent<Camera>(
      (camera) => camera.clone(),
      (value) => Camera.fromJSON(value),
    ),
    light: new ObjectComponent<Light>(
      (light) => light.clone(),
    ),
    mesh: new MeshComponent(),
    animation: new AnimationComponent(),
    armature: new ArmatureComponent(),
  };
}
