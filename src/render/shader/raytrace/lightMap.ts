export const LIGHT_MAP = /* glsl */`
  const int LIGHT_MAP_SIZE = 4;

  vec4 lightMapTexelFetch(
    int addr,
    sampler2D lightMap,
    vec2 lightMapSize,
    vec2 lightMapSizeInv
  ) {
    float addrFloat = float(addr);
    #ifdef WEBGL2
      ivec2 coord = ivec2(
        int(mod(addrFloat, lightMapSize.x)),
        int(addrFloat * lightMapSizeInv.x)
      );
      return texelFetch(lightMap, coord, 0);
    #else
      vec2 coord = vec2(
        mod(addrFloat, lightMapSize.x),
        addrFloat * lightMapSizeInv.x
      ) * lightMapSizeInv;
      return texture2D(lightMap, coord);
    #endif
  }

  int lightMapUnpackType(
    int addr,
    sampler2D lightMap,
    vec2 lightMapSize,
    vec2 lightMapSizeInv
  ) {
    vec4 texel = lightMapTexelFetch(addr, lightMap, lightMapSize, lightMapSizeInv);
    return int(texel.w);
  }

  void lightMapUnpackPoint(
    out PointLight light,
    int addr,
    sampler2D lightMap,
    vec2 lightMapSize,
    vec2 lightMapSizeInv
  ) {
    // (pos, type), (color), (power, radius, range)
    vec4 tex1 = lightMapTexelFetch(addr, lightMap, lightMapSize, lightMapSizeInv);
    light.position = tex1.xyz;
    vec4 tex2 = lightMapTexelFetch(addr + 1, lightMap, lightMapSize, lightMapSizeInv);
    light.color = tex2.xyz;
    vec4 tex3 = lightMapTexelFetch(addr + 2, lightMap, lightMapSize, lightMapSizeInv);
    light.intensity = tex3.xyz;
  }
`;
