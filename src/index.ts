import {mat4} from 'gl-matrix';

import {EntityStore} from './core/EntityStore';
import {createComponent} from './core/components/createComponent';

const mat = mat4.create();

console.log(mat);

const store = new EntityStore();

store.registerComponents({
  pos: createComponent(),
  vel: createComponent(),
});

const entity = store.create();
entity.set('pos', {x: 5, y: 3});
entity.set('vel', {x: 1, y: 1});

store.sort();

entity.destroy();

console.log(store);
