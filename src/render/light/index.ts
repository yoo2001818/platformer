import {AmbientLight} from './AmbientLight';
import {DirectionalLight} from './DirectionalLight';
import {DirectionalShadowLight} from './DirectionalShadowLight';
import {EnvironmentLight} from './EnvironmentLight';
import {Light} from './Light';
import {PointLight} from './PointLight';
import {ProbeGridLight} from './ProbeGridLight';

export interface LightConstructor<T = any> {
  new(options?: T): Light<T>;
}

export const LIGHT_TABLE: {[key: string]: LightConstructor;} = {
  point: PointLight,
  directional: DirectionalLight,
  directionalShadow: DirectionalShadowLight,
  environment: EnvironmentLight,
  ambient: AmbientLight,
  probeGrid: ProbeGridLight,
};
