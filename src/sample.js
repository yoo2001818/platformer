/* eslint-disable */
// Yet another code sample...
// There would be two "modes" in the game engine; this somewhat resembles
// OLTP and OLAP mode - Once the entity is not actively moving, it'll be
// moved to "batch" mode, which is ... batched.

const store = new EntityStore();
// All components are managed by Component itself
const pos = createComponent(
  ({ x, y }) => ({ x, y }),
);
const mesh = createComponent();

store.addComponent('pos', pos);
store.addComponent('mesh', mesh);

// OLTP mode
const entity = store.create();
const entityHandle = entity.getHandle();

entity.add(pos, { x: 1, y: 1 });
entity.add(mesh, { geometry: [], material: [] });

// OLAP mode
store.forEachWith([pos, mesh], (entity, pos) => {
  pos.x += 1;
  pos.y += 1;
});

// That's it! ...
