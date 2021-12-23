import {vec3} from 'gl-matrix';

const EPSILON = 0.0000001;

export function intersectRayAABB(
  bounds: Float32Array,
  origin: vec3,
  dir: vec3,
): boolean {
  const tx1 = (bounds[0] - origin[0]) / dir[0];
  const tx2 = (bounds[3] - origin[0]) / dir[0];
  let tmin = Math.min(tx1, tx2);
  let tmax = Math.max(tx1, tx2);
  const ty1 = (bounds[1] - origin[1]) / dir[1];
  const ty2 = (bounds[4] - origin[1]) / dir[1];
  tmin = Math.max(tmin, Math.min(ty1, ty2));
  tmax = Math.min(tmax, Math.max(ty1, ty2));
  const tz1 = (bounds[2] - origin[2]) / dir[2];
  const tz2 = (bounds[5] - origin[2]) / dir[2];
  tmin = Math.max(tmin, Math.min(tz1, tz2));
  tmax = Math.min(tmax, Math.max(tz1, tz2));
  return tmax >= tmin;
}

export function intersectRayTriangle(
  outputPos: vec3,
  outputBarycentric: vec3,
  v0: vec3,
  v1: vec3,
  v2: vec3,
  origin: vec3,
  dir: vec3,
): boolean {
  const e1 = vec3.create();
  const e2 = vec3.create();
  vec3.sub(e1, v1, v0);
  vec3.sub(e2, v2, v0);
  const h = vec3.create();
  vec3.cross(h, dir, e2);
  const a = vec3.dot(e1, h);
  if (a > -EPSILON && a < EPSILON) {
    // The ray is parallel to the triangle.
    return false;
  }
  const f = 1 / a;
  const s = vec3.create();
  vec3.sub(s, origin, v0);
  const u = f * vec3.dot(s, h);
  if (u < 0 || u > 1) {
    return false;
  }
  const q = vec3.create();
  vec3.cross(q, s, e1);
  const v = f * vec3.dot(dir, q);
  if (v < 0 || v > 1) {
    return false;
  }
  outputBarycentric[0] = u;
  outputBarycentric[1] = v;

  const t = f * vec3.dot(e2, q);
  if (t > EPSILON) {
    vec3.scaleAndAdd(outputPos, origin, dir, t);
    outputBarycentric[2] = t;
    return true;
  } else {
    return false;
  }
}

export function intersectRayPlane(
  outputPos: vec3,
  normal: vec3,
  center: vec3,
  origin: vec3,
  dir: vec3,
): boolean {
  const denom = vec3.dot(normal, dir);
  if (Math.abs(denom) > 0.000001) {
    vec3.sub(outputPos, center, origin);
    const t = vec3.dot(outputPos, normal) / denom;
    if (t >= 0) {
      vec3.scaleAndAdd(outputPos, origin, dir, t);
      return true;
    }
  }
  return false;
}
