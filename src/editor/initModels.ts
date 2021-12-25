import {Engine} from '../core/Engine';

import {ModeModel} from './models/ModeModel';
import {SelectionModel} from './models/SelectionModel';
import {ViewportModel} from './models/ViewportModel';
import {CursorModel} from './models/CursorModel';

export function initModels(engine: Engine): void {
  engine.registerModel('selection', new SelectionModel(engine));
  engine.registerModel('viewport', new ViewportModel(engine));
  engine.registerModel('mode', new ModeModel(engine));
  engine.registerModel('cursor', new CursorModel(engine));
}
