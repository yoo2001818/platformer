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
    float roughness;
    float metalic;
  }

  #define GBUFFER_SIZE 2

  void packMaterialInfo(MaterialInfo info, vec4 output[GBUFFER_SIZE]) {
    // albedo.rgb, roughness
    output[0] = vec4(info.albedo, info.roughness);
    output[1] = vec4(info.normal, info.metalic);
  }

  void unpackMaterialInfo(
    float depth,
    vec4 input[GBUFFER_SIZE],
    vec2 ndc,
    mat4 inverseProjection,
    mat4 inverseView,
    MaterialInfo output,
  ) {
    // TODO: This is not a well-written code
    vec4 viewPos = uInverseProjection * vec4(vPosition.xy, depth, 1.0);
    viewPos /= viewPos.w;
    output.position = (uInverseView * viewPos).xyz;

    output.albedo = input[0].rgb;
    output.roughness = input[0].a;
    output.normal = input[1].rgb;
    output.metalic = input[1].a;

    return output;
  }

  vec3 calcBRDF(vec3 L, vec3 V, vec3 N, MaterialInfo mInfo) {
    vec3 albedo = mix(mInfo.albedo, vec3(0.0), mInfo.metalic);
    vec3 fresnel = mix(vec3(0.04), mInfo.albedo, mInfo.metalic);

    return brdfCookTorr(L, V, N, mInfo.roughness * mInfo.roughness, albedo, fresnel);
  }
`;
