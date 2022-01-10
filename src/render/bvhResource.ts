import {BVHTexture} from './raytrace/BVHTexture';
import {MaterialInjector} from './raytrace/MaterialInjector';
import {WorldBVH} from './raytrace/WorldBVH';
import {Renderer} from './Renderer';

export function getWorldBVH(renderer: Renderer): WorldBVH {
  return renderer.getResource('worldBVH', () => {
    return new WorldBVH(renderer.entityStore);
  });
}

export function getMaterialInjector(renderer: Renderer): MaterialInjector {
  return renderer.getResource('bvhMaterialInjector', () => {
    return new MaterialInjector(renderer);
  });
}

export function getBVHTexture(renderer: Renderer): BVHTexture {
  const bvh = getWorldBVH(renderer);
  const injector = getMaterialInjector(renderer);
  return renderer.getResource('bvhTexture', () => {
    return new BVHTexture(renderer.entityStore, bvh, injector);
  });
}
