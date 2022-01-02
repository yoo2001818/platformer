import {Component} from '../../core/components';
import {Entity} from '../../core/Entity';
import {EntityQuery} from '../../core/EntityQuery';
import {EntityStore} from '../../core/EntityStore';
import {GLTexture2D} from '../gl/GLTexture2D';
import {Light} from '../light/Light';

// The light texture should contain the following data.
// Point light:
// - position: vec3
// - color: vec3
// - power: float
// - radius: float
// - range is only used for deferred rendering; we omit it
// Directional light:
// - direction: vec3
// - color: vec3
// - power: float
// Area light:
// - position: vec3
// - normal: vec3
// - tangent: vec3
// - size: vec2
// - color: vec3
// - power: float
// It'd be better to put them in uniform numbers of texels to allow lookups
// without an address table.
// Therefore, we can assign 4 texels for each light. (This is subject to change)

const LIGHT_SIZE = 4;

export class LightTexture {
  entityStore: EntityStore;
  lightBuffer: Float32Array | null;
  lightTexture: GLTexture2D;
  numLights: number;
  lastVersion = -1;
  query: EntityQuery;

  constructor(
    entityStore: EntityStore,
  ) {
    this.entityStore = entityStore;
    this.lightBuffer = null;
    this.lightTexture = new GLTexture2D({
      minFilter: 'nearest',
      magFilter: 'nearest',
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      format: 'rgba',
      type: 'float',
      width: 1,
      height: 1,
      mipmap: false,
      source: null,
    });
    this.numLights = 0;
    this.query = entityStore.query()
      .with('transform', 'light');
  }

  dispose(): void {
    this.lightTexture.dispose();
    this.query.dispose();
  }

  checkShouldUpdate(): boolean {
    return this.query.getTopicVersion('transform', 'light') > this.lastVersion;
  }

  update(): void {
    // Determine light version
    // TODO: However we are not able to do this at this moment.
    // Let's just use entityStore's version
    const {entityStore} = this;
    const nextVersion = this.query.getTopicVersion('transform', 'light');
    if (this.lastVersion >= nextVersion) {
      return;
    }
    this.lastVersion = nextVersion;

    const lightComp = entityStore.getComponent<Component<Light>>('light');

    const entities: Entity[] = [];
    this.query.forEach((entity) => {
      const light = entity.get(lightComp)!;
      if (light.canRaytrace) {
        entities.push(entity);
      }
    });

    // Determine required texels
    const requiredTexels = entities.length * LIGHT_SIZE;

    // Determine the width / height of the resulting texture. For simplicity,
    // we'll just use multiples of 1024.
    // NOTE: We can have no lights in the scene (although that means nothing
    // gets rendered). We still have to generate light texture though, so just
    // send an empty texture with height of 1.
    const width = 1024;
    const height = Math.max(Math.ceil(requiredTexels / 1024), 1);

    const output = new Float32Array(width * height * 4);
    entities.forEach((entity, i) => {
      const light = entity.get(lightComp)!;
      light.writeTexture(entity, output, i * LIGHT_SIZE * 4);
    });

    // Update the texture...
    this.lightBuffer = output;
    this.lightTexture.setOptions({
      minFilter: 'nearest',
      magFilter: 'nearest',
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      format: 'rgba',
      type: 'float',
      width,
      height,
      mipmap: false,
      source: output,
    });
    this.numLights = entities.length;
  }
}
