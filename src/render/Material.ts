import {Entity} from '../core/Entity';

import {GLGeometry} from './gl/GLGeometry';
import {GLRenderer} from './gl/GLRenderer';

export interface Material {
  render(entity: Entity, geometry: GLGeometry, renderer: GLRenderer): void;
  dispose(): void;
}
