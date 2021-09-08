import {vec3} from 'gl-matrix';

const EPSILON = 0.0000001;

// https://github.com/erich666/GraphicsGems/blob/master/gems/RayBox.c
export function intersectRayAABB(
  output: vec3,
  bounds: Float32Array,
  origin: vec3,
  dir: vec3,
): boolean {
  let inside = true;
  const quadrant = [0, 0, 0];
  let plane = 0;
  const maxT = [0, 0, 0];
  const candidatePlane = [0, 0, 0];

  /* Find candidate planes; this loop can be avoided if
     rays cast all from the eye(assume perpsective view) */
  for (let i = 0; i < 3; i += 1) {
    if (origin[i] < bounds[i]) {
      quadrant[i] = 0;
      candidatePlane[i] = bounds[i];
      inside = false;
    } else if (origin[i] > bounds[i + 3]) {
      quadrant[i] = 2;
      candidatePlane[i] = bounds[i + 3];
      inside = false;
    } else {
      quadrant[i] = 1;
    }
  }

  /* Ray origin inside bounding box */
  if (inside) {
    vec3.copy(output, origin);
    return true;
  }

  /* Calculate T distances to candidate planes */
  for (let i = 0; i < 3; i += 1) {
    if (quadrant[i] !== 1 && Math.abs(dir[i]) > EPSILON) {
      maxT[i] = (candidatePlane[i] - origin[i]) / dir[i];
    } else {
      maxT[i] = -1;
    }
  }

  /* Get largest of the maxT's for final choice of intersection */
  for (let i = 1; i < 3; i += 1) {
    if (maxT[plane] < maxT[i]) {
      plane = i;
    }
  }

  /* Check final candidate actually inside box */
  if (maxT[plane] < 0) {
    return false;
  }
  for (let i = 0; i < 3; i += 1) {
    if (plane !== i) {
      output[i] = origin[i] + maxT[plane + 3] * dir[i];
      if (output[i] < bounds[i] || output[i] > bounds[i + 3]) {
        return false;
      }
    } else {
      output[i] = candidatePlane[i];
    }
  }

  return true;
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
