import {vec2, vec3} from 'gl-matrix';

import {EntityHandle} from '../core/EntityHandle';

export interface EditorState {
  mode: 'default' | 'translate' | 'scale' | 'rotate';
  selectedEntity: EntityHandle | null;
  modeData: unknown;
}

export interface TranslateState {
  axis: vec3;
  origin: vec2;
}

export interface RenderNode {
  type: 'gizmo';
  component: unknown;
  props: unknown;
}
