import {mat4} from 'gl-matrix';

import {EntityStore} from '../core/EntityStore';
import {ObjectComponent} from '../core/components';

const mat = mat4.create();

console.log(mat);

const store = new EntityStore();

const posComp = new ObjectComponent<{x: number; y: number;}>();
const velComp = new ObjectComponent<{x: number; y: number;}>();

store.registerComponents({
  pos: posComp,
  vel: velComp,
});

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d')!;

canvas.width = 800;
canvas.height = 600;

document.body.appendChild(canvas);

function update() {
  const entity = store.create();
  entity.set('pos', {x: 400, y: 0});
  entity.set('vel', {x: Math.random() * 10 - 5, y: 5});

  store.forEachWith([posComp, velComp], (entity, pos, vel) => {
    pos.x += vel.x;
    pos.y += vel.y;
    if (pos.y > 600) {
      entity.destroy();
    }
  });

  store.sort();

  ctx.clearRect(0, 0, 800, 600);
  ctx.fillStyle = '#000';

  store.forEachWith([posComp, velComp], (entity, pos, vel) => {
    ctx.fillRect(pos.x, pos.y, 10, 10);
  });

  requestAnimationFrame(update);
}

requestAnimationFrame(update);

console.log(store);
