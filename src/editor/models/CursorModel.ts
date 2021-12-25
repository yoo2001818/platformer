import {mat4} from 'gl-matrix';

import {Atom, atom} from '../../core/Atom';
import {Engine} from '../../core/Engine';

export const cursorAtom = atom<mat4>({
  name: 'cursor$cursor',
  defaultState: mat4.create(),
});

/**
 * Manages the 3D cursor on the screen.
 */
export class CursorModel {
  engine: Engine;
  cursorAtom: Atom<mat4>;

  constructor(engine: Engine) {
    this.engine = engine;
    this.cursorAtom = engine.entityStore.getAtom(cursorAtom);
  }

  getCursor(): mat4 {
    return this.cursorAtom.state;
  }

  setCursor(mat: mat4): void {
    this.cursorAtom.setState(mat);
  }
}
