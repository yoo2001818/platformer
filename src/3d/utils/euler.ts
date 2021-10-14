import {quat, mat3, vec3} from 'gl-matrix';

const MAT3_BUFFER = mat3.create();

// TODO: This is all YZX

export function quaternionToEulerXYZ(
  out: Float32Array,
  inQuat: Float32Array,
): Float32Array {
  const mat = mat3.fromQuat(MAT3_BUFFER, inQuat);
  let x;
  let y;
  const z = Math.asin(Math.min(1, Math.max(-1, mat[1])));
  if (Math.abs(mat[1]) < 0.99999) {
    x = Math.atan2(-mat[7], mat[4]);
    y = Math.atan2(-mat[2], mat[0]);
  } else {
    x = 0;
    y = Math.atan2(mat[6], mat[8]);
  }
  vec3.set(out, x, y, z);
  return out;
}

export function quaternionFromEulerXYZ(
  out: Float32Array,
  euler: Float32Array,
): Float32Array {
  quat.identity(out);
  quat.rotateY(out, out, euler[1]);
  quat.rotateZ(out, out, euler[2]);
  quat.rotateX(out, out, euler[0]);
  return out;
}

