export const FILMIC = /* glsl */`
vec3 tonemap(vec3 x) {
  x = x / (1.0 + x);
  x = pow(x, vec3(1.0 / 2.2));
  return x;
}
`;
