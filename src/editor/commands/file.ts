import {Engine} from '../../core/Engine';

export function newFile(engine: Engine): void {
  engine.entityStore.deleteAll();
}

export function loadFile(engine: Engine): void {

}

export function saveFile(engine: Engine): void {
  // console.log(engine.entityStore.toJSON());
}
