export const POINT_LIGHT = /* glsl */`
  struct PointLight {
    vec3 position;
    vec3 color;
    vec2 intensity;
  };

  vec3 calcPoint(vec3 L, vec3 V, vec3 N, PointLight light, float lightDist) {
    float attenuation = 1.0 /
      (1.0 + light.intensity.y * (lightDist * lightDist));
    
    float dotNL = max(dot(N, L), 0.0);

    return light.intensity.x * attenuation * dotNL * light.color;
  }
`;
