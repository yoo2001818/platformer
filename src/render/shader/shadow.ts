export const BAKE_VSM = /* glsl */`
  vec4 bakeVSM(float intensity) {
    float dx = dFdx(intensity);
    float dy = dFdy(intensity);
    float moment = intensity * intensity + 0.25 * (dx * dx + dy * dy);
    return vec4(intensity, moment, 0.0, 1.0);
  }
`;

export const VSM = /* glsl */`
  float unpackVSM(
    sampler2D shadowMap,
    vec2 uv,
    float receiver
  ) {
    float lightInten = 1.0;
    vec2 moments = texture2D(shadowMap, uv).rg;
    float targetZ = min(receiver, 1.0);
    if (targetZ > moments.x) {
      float variance = max(moments.y - moments.x * moments.x, 0.00025);
      float d = targetZ - moments.x;
      float pMax = variance / (variance + d * d);
      lightInten = mix(0.0, 1.0, pMax);
    }
    return lightInten;
  }
`;

export const BAKE_ESM = /* glsl */`
  vec4 bakeESM(float intensity) {
    return vec4(intensity, 0.0, 0.0, 0.0);
  }
`;

export const ESM = /* glsl */`
  float unpackESM(
    sampler2D shadowMap,
    vec2 uv,
    float receiver
  ) {
    float occluder = texture2D(shadowMap, uv).r;
    float receiver = (min(receiver, 1.0) + 1.0) / 2.0;
    return pow(min(1.0, max(0.0, exp(-2.0 * (receiver - occluder)))), 20.0);
  }
`;
