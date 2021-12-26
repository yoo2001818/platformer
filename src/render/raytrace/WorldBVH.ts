import {vec2, vec3, vec4} from 'gl-matrix';

import {BVH, BVHNode, createBVH} from '../../3d/BVH';
import {intersectRayAABB, intersectRayTriangle} from '../../3d/collision';
import {TransformComponent} from '../../3d/TransformComponent';
import {Entity} from '../../core/Entity';
import {EntityStore} from '../../core/EntityStore';
import {Geometry} from '../Geometry';
import {flattenBuffer} from '../gl/utils';
import {Mesh} from '../Mesh';
import {MeshComponent} from '../MeshComponent';

const EPSILON = 0.000001;

export interface WorldBVHIntersectionResult {
  entity: Entity;
  mesh: Mesh;
  geometry: Geometry;
  geometryId: number;
  faceId: number;
  uv: vec2;
  t: number;
  position: vec3;
}

export class WorldBVH {
  entityStore: EntityStore;
  bvh: BVH | null = null;
  children: [Entity, number, Geometry, Float32Array][] | null = null;
  metNodes: BVHNode[] = [];
  counter = 0;
  lastVersion = -1;

  constructor(entityStore: EntityStore) {
    this.entityStore = entityStore;
  }

  update(): void {
    // Try to build entities array with mesh
    const {entityStore} = this;
    const transformComp =
      entityStore.getComponent<TransformComponent>('transform');
    const meshComp = entityStore.getComponent<MeshComponent>('mesh');
    const children: [Entity, number, Geometry, Float32Array][] = [];
    // EntityStore didn't change at all; do nothing
    if (entityStore.version === this.lastVersion) {
      return;
    }
    let actualLastVersion = -1;
    // Try to record an actual last version
    entityStore.forEachChunkWith(['transform', 'mesh'], (chunk) => {
      const mesh = chunk.getAt(0)!.get(meshComp)!;
      if (mesh.options.castRay === false) {
        return;
      }
      actualLastVersion = chunk.version;
    });
    if (actualLastVersion !== this.lastVersion) {
      return;
    }
    this.lastVersion = actualLastVersion;
    entityStore.forEachWith(['transform', 'mesh'], (entity) => {
      const mesh = entity.get(meshComp)!;
      if (mesh.options.castRay === false) {
        return;
      }
      mesh.geometries.forEach((geom, i) => {
        const aPosition = geom.options.attributes.aPosition;
        if (aPosition == null) {
          throw new Error('aPosition must be present');
        }
        if (geom.options.indices == null) {
          throw new Error('indices must be present');
        }
        children.push([
          entity,
          i,
          geom,
          flattenBuffer(aPosition.data) as Float32Array,
        ]);
      });
    });
    // Calculate mesh bounds
    const bounds = new Float32Array(children.length * 6);
    const tmp = vec3.create();
    children.forEach(([entity, geomId], i) => {
      const transform = entity.get(transformComp)!;
      const mat = transform.getMatrixWorld();
      const mesh = entity.get(meshComp)!;
      const geometry = mesh.geometries[geomId];
      // This is called to cache the results first
      geometry.getBVH();
      geometry.getBoundPoints().forEach((point, j) => {
        // Transform local space to world space...
        vec3.transformMat4(tmp, point as vec3, mat);
        // Then calculate the bounds.
        if (j === 0) {
          for (let k = 0; k < 3; k += 1) {
            bounds[i * 6 + k] = tmp[k] - EPSILON;
            bounds[i * 6 + 3 + k] = tmp[k] + EPSILON;
          }
        } else {
          for (let k = 0; k < 3; k += 1) {
            bounds[i * 6 + k] = Math.min(tmp[k] - EPSILON, bounds[i * 6 + k]);
            bounds[i * 6 + 3 + k] = Math.max(tmp[k] + EPSILON, bounds[i * 6 + 3 + k]);
          }
        }
      });
    });
    // Generate BVH
    const bvh = createBVH(bounds);
    this.children = children;
    this.bvh = bvh;
  }

  intersectRay(origin: vec3, dir: vec3): WorldBVHIntersectionResult | null {
    const {entityStore, bvh, children} = this;
    const transformComp =
      entityStore.getComponent<TransformComponent>('transform');
    const meshComp = entityStore.getComponent<MeshComponent>('mesh');
    if (bvh == null || children == null) {
      throw new Error('World BVH is not updated');
    }
    // Starting from the root node, traverse down...
    const stack: BVHNode[] = [bvh.root];
    // If stack index is higher than this, it'll be considered as triangle
    // intersection.
    let stackDivider = 0;
    let tlLeafIndex = 0;
    let result: WorldBVHIntersectionResult | null = null;
    const blOrigin = vec3.create();
    const blDir = vec4.create() as vec3;
    let blBVH: BVH | null = null;
    let blEntity: Entity | null = null;
    let blGeometry: Geometry | null = null;
    let blGeometryId = 0;
    let blPositions: Float32Array | null = null;
    let blIndices: number[] | Uint8Array | Uint16Array | Uint32Array | null = null;
    let blResultFaceId = -1;
    let blResultT = Infinity;
    const blResultPos = vec3.create();
    const blResultUV = vec3.create();
    const tmp = vec3.create();
    const tmp2 = vec3.create();
    const v0 = vec3.create();
    const v1 = vec3.create();
    const v2 = vec3.create();
    const tlBounds = new Float32Array(6);
    while (stack.length > 0) {
      const index = stack.length - 1;
      const item = stack[index];
      // this.metNodes.push(item);
      let isPopping = false;
      if (index <= stackDivider && item.isLeaf) {
        // Top layer
        let hasChild = false;
        for (let i = tlLeafIndex; i < item.length; i += 1) {
          const childIndex = bvh.indices[item.offset + i];
          for (let j = 0; j < 6; j += 1) {
            tlBounds[j] = bvh.bounds[childIndex * 6 + j];
          }
          if (intersectRayAABB(tlBounds, origin, dir)) {
            const [entity, geomId, geometry, positions] = children[childIndex];
            const transform = entity.get(transformComp)!;
            // Convert ray into local space
            const mat = transform.getMatrixInverseWorld();
            vec3.transformMat4(blOrigin, origin, mat);
            vec3.copy(blDir, dir);
            blDir[3] = 0;
            vec4.transformMat4(blDir as vec4, blDir as vec4, mat);
            vec3.normalize(blDir, blDir);
            // Retrieve local BVH and check bounds
            blBVH = geometry.getBVH();
            tlLeafIndex = i + 1;
            hasChild = true;
            // Traverse down to the bottom layer.
            blEntity = entity;
            blGeometry = geometry;
            blGeometryId = geomId;
            blPositions = positions;
            blIndices = geometry.options.indices!;
            blResultFaceId = -1;
            blResultT = Infinity;
            stackDivider = index;
            stack.push(blBVH.root);
            break;
          }
        }
        if (!hasChild) {
          tlLeafIndex = 0;
          stack.pop();
          isPopping = true;
        }
      } else if (item.isLeaf) {
        // Bottom layer
        for (let i = 0; i < item.length; i += 1) {
          const faceId = blBVH!.indices[item.offset + i];
          const v0Id = blIndices![faceId * 3];
          const v1Id = blIndices![faceId * 3 + 1];
          const v2Id = blIndices![faceId * 3 + 2];
          for (let j = 0; j < 3; j += 1) {
            v0[j] = blPositions![v0Id * 3 + j];
            v1[j] = blPositions![v1Id * 3 + j];
            v2[j] = blPositions![v2Id * 3 + j];
          }

          const intersects = intersectRayTriangle(
            tmp,
            tmp2,
            v0,
            v1,
            v2,
            blOrigin,
            blDir,
          );
          if (intersects && tmp2[2] < blResultT) {
            // Write results to blResult
            blResultFaceId = faceId;
            vec3.copy(blResultPos, tmp);
            blResultT = tmp2[2];
            vec3.copy(blResultUV, tmp2);
          }
        }
        this.counter += item.length;
        stack.pop();
        isPopping = true;
      } else {
        const isTop = index <= stackDivider;
        const currOrigin = isTop ? origin : blOrigin;
        const currDir = isTop ? dir : blDir;
        const leftIntersects =
          intersectRayAABB(item.left.bounds, currOrigin, currDir);
        const rightIntersects =
          intersectRayAABB(item.right.bounds, currOrigin, currDir);
        if (leftIntersects && rightIntersects) {
          stack[index] = item.right;
          stack.push(item.left);
          if (index <= stackDivider) {
            stackDivider += 1;
          }
        } else if (leftIntersects) {
          stack[index] = item.left;
        } else if (rightIntersects) {
          stack[index] = item.right;
        } else {
          stack.pop();
          isPopping = true;
        }
      }
      if (stackDivider + 1 === index && isPopping) {
        if (blResultFaceId !== -1) {
          // Write back blResult to actual result, if it is good enough.
          const transform = blEntity!.get(transformComp)!;
          const mesh = blEntity!.get(meshComp)!;
          vec3.transformMat4(tmp, blResultPos, transform.getMatrixWorld());
          const t = vec3.dist(tmp, origin);
          if (result == null || t < result.t) {
            // Write back result!
            result = {
              entity: blEntity!,
              mesh,
              geometry: blGeometry!,
              geometryId: blGeometryId,
              faceId: blResultFaceId,
              uv: vec2.copy(vec2.create(), blResultUV as vec2),
              t,
              position: vec3.copy(vec3.create(), tmp),
            };
          }
        }
      }
    }
    // console.log(counter);
    return result;
  }
}
