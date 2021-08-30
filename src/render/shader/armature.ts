export const ARMATURE = /* glsl */`
  void fetchArmatureSingle(
    inout mat4 mat,
    int index,
    float weight,
    sampler2D armatureMap,
    vec2 texelSize
  ) {
    if (weight > 0.0) {
      vec2 coord = vec2((float(index * 4) + 0.5) * texelSize.x, 0.5);
      mat4 outMat = mat4(
        vec4(texture2D(armatureMap, coord)),
        vec4(texture2D(armatureMap, coord + vec2(1.0, 0.0) * texelSize)),
        vec4(texture2D(armatureMap, coord + vec2(2.0, 0.0) * texelSize)),
        vec4(texture2D(armatureMap, coord + vec2(3.0, 0.0) * texelSize))
      );
      mat += weight * outMat;
    }
  }

  void fetchArmature(
    inout mat4 mat,
    vec4 index,
    vec4 weight,
    sampler2D armatureMap,
    vec2 texelSize
  ) {
    for (int i = 0; i < 4; ++i) {
      fetchArmatureSingle(mat, int(index[i]), weight[i], armatureMap, texelSize);
    }
  }
`;
