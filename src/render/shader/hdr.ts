export const RGBE = /* glsl */`

  #define unpackHDR unpackRGBE
  #define packHDR packRGBE

  vec3 unpackRGBE(vec4 value) {
    vec3 rgb = value.rgb;
    rgb *= pow(2.0, value.a * 255.0 - 128.0);
    return rgb;
  }

  vec4 packRGBE(vec3 value) {
    float v = max(value.r, max(value.g, value.b));
    float e = ceil(log2(v));
    float s = pow(2.0, e);
    return vec4(value / s, (e + 128.0) / 255.0);
  }
`;
