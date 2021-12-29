// In order to implement deferred rendering, all the parameters needed to
// represent a material must be stored inside G-buffer.

// This is the G-buffer layout of the renderer:
// DEPTH_STENCIL: depth, stencil
// RT0: albedo.rgb, roughness
// RT1: normal.xyz, metalic
// Note that the position is not stored in here - it can be easily restored
// using depth value, combining with inverse projection matrix.

export const MATERIAL_INFO = /* glsl */`
  struct MaterialInfo {
    vec3 albedo;
    vec3 normal;
    vec3 position;
    float depth;
    float roughness;
    float metalic;
  };

  #define GBUFFER_SIZE 2

  void packMaterialInfo(MaterialInfo info, out vec4 vecOut[GBUFFER_SIZE]) {
    // albedo.rgb, roughness
    vecOut[0] = vec4(info.albedo, info.roughness);
    vecOut[1] = vec4(info.normal * 0.5 + 0.5, info.metalic);
  }

  vec3 depthToViewPos(
    float depth,
    vec2 ndc,
    mat4 inverseProjection
  ) {
    vec4 viewPos = inverseProjection * vec4(ndc.xy, depth * 2.0 - 1.0, 1.0);
    viewPos /= viewPos.w;
    return viewPos.xyz;
  }

  vec3 depthToWorldPos(
    float depth,
    vec2 ndc,
    mat4 inverseProjection,
    mat4 inverseView
  ) {
    vec4 viewPos = vec4(depthToViewPos(depth, ndc, inverseProjection), 1.0);
    return (inverseView * viewPos).xyz;
  }

  void unpackMaterialInfo(
    float depth,
    vec4 vecIn[GBUFFER_SIZE],
    vec2 ndc,
    mat4 inverseProjection,
    mat4 inverseView,
    out MaterialInfo mOut
  ) {
    mOut.position = depthToWorldPos(depth, ndc, inverseProjection, inverseView);
    mOut.depth = depth;
    mOut.albedo = vecIn[0].rgb;
    mOut.roughness = vecIn[0].a;
    mOut.normal = normalize(vecIn[1].rgb * 2.0 - 1.0);
    mOut.metalic = vecIn[1].a;
  }

  vec3 calcBRDF(vec3 L, vec3 V, vec3 N, MaterialInfo mInfo) {
    float roughness = mInfo.roughness * mInfo.roughness;
    vec3 albedo = mix(mInfo.albedo, vec3(0.0), mInfo.metalic);
    vec3 fresnel = mix(vec3(0.04), mInfo.albedo, mInfo.metalic);

    return brdfCookTorr(L, V, N, max(roughness, 0.000001), albedo, fresnel);
  }
`;
