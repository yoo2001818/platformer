import {mat4} from 'gl-matrix';

import {EntityStore} from '../core/EntityStore';
import {Component, Float32ArrayComponent} from '../core/components';

const store = new EntityStore();

const posComp = new Float32ArrayComponent(16);
const velComp = new Float32ArrayComponent(4);

store.registerComponents({
  pos: posComp,
  vel: velComp,
});

function main() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl');

  canvas.width = 800;
  canvas.height = 600;

  document.body.appendChild(canvas);

  if (gl == null) {
    alert('WebGL is not supported');
    return;
  }

  gl.viewport(0, 0, 800, 600);

  function update() {
    const entity = store.create();
    entity.set('pos', [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);
    entity.set('vel', [
      Math.random() * 10 - 5,
      Math.random() * 10 - 5,
      Math.random() * 10 - 5,
      1,
    ]);

    store.forEachWith([posComp, velComp], (entity, pos, vel) => {
      pos[12] += vel[0];
      pos[13] += vel[1];
      pos[14] += vel[2];
    });

    store.sort();

    store.forEachWith([posComp, velComp], (entity, pos, vel) => {
      ctx.fillRect(pos.x, pos.y, 10, 10);
    });

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
  console.log(store);
}

main();
