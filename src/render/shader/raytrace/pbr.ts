export const RAYTRACE_PBR = /* glsl */`
float luminance(vec3 rgb) {
  vec3 W = vec3(0.2125, 0.7154, 0.0721);
  return dot(rgb, W);
}

float probabilityToSampleDiffuse(vec3 diffuseColor, vec3 specColor) {
  float lumDiffuse = luminance(diffuseColor);
  float lumSpecular = luminance(specColor);
  return lumDiffuse / (lumDiffuse + lumSpecular);
}
`;
