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
    vec4 uvSize,
    float receiver
  ) {
    float lightInten = 1.0;
    vec2 moments = texture2D(shadowMap, uv * uvSize.zw + uvSize.xy).rg;
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
    vec4 uvSize,
    float receiver
  ) {
    float occluder = texture2D(shadowMap, uv * uvSize.zw + uvSize.xy).r;
    float receiver = (min(receiver, 1.0) + 1.0) / 2.0;
    return pow(min(1.0, max(0.0, exp(-2.0 * (receiver - occluder)))), 20.0);
  }
`;

export const BAKE_PCF = /* glsl */`
  vec4 bakePCF(float intensity) {
    return vec4(intensity, 0.0, 0.0, 0.0);
  }
`;

export const PCF = /* glsl */`
  float unpackPCF(
    sampler2D shadowMap,
    vec2 uv,
    vec4 uvSize,
    float receiver
  ) {
    vec2 shadowMapSize = vec2(1024.0, 1024.0);
    float sum = 0.0;
    for (float y = -1.5; y <= 1.5; y += 1.0) {
      for (float x = -1.5; x <= 1.5; x += 1.0) {
        float occluder = texture2D(
          shadowMap,
          (uv + vec2(x, y) / shadowMapSize) * uvSize.zw + uvSize.xy
        ).r;
        if (receiver < occluder + 0.01) {
          sum += 1.0;
        }
      }
    }
    return sum / 16.0;
  }
`;
