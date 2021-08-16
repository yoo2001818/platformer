export const HDR = /* glsl */`

  #if defined(HDR_INPUT_rgbe)
    #define HDR_MANUAL_BILINEAR
    #define unpackHDR unpackRGBE
  #elif defined(HDR_INPUT_float)
    #define unpackHDR unpackFloat
  #elif defined(HDR_INPUT_halfFloat)
    #define unpackHDR unpackFloat
  #elif defined(HDR_INPUT_halfFloatManual)
    #define HDR_MANUAL_BILINEAR
    #define unpackHDR unpackFloat
  #endif

  #if defined(HDR_OUTPUT_rgbe)
    #define packHDR packRGBE
  #elif defined(HDR_OUTPUT_float)
    #define packHDR packFloat
  #elif defined(HDR_OUTPUT_halfFloat)
    #define packHDR packFloat
  #elif defined(HDR_OUTPUT_halfFloatManual)
    #define packHDR packFloat
  #endif

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

  vec3 unpackFloat(vec4 value) {
    return value.rgb;
  }

  vec4 packFloat(vec3 value) {
    return vec4(value, 1.0);
  }

  vec3 unpackSRGB(vec4 value) {
    return pow(value.rgb, vec3(1.0 / 2.2));
  }

  vec4 packSRGB(vec3 value) {
    return vec4(pow(value, vec3(2.2)), 1.0);
  }
`;
