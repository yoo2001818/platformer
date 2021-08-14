export const POINT_LIGHT = /* glsl */`
  struct PointLight {
    vec3 position;
    vec3 color;
    vec2 intensity;
  };

  vec3 calcPoint(vec3 viewPos, MaterialInfo mInfo, PointLight light) {
    vec3 L = light.position - mInfo.position;
    vec3 V = normalize(viewPos - mInfo.position);
    vec3 N = mInfo.normal;

    float lightDist = length(L);
    L = L / lightDist;

    float attenuation = 1.0 /
      (1.0 + light.intensity.y * (lightDist * lightDist));
    
    float dotNL = max(dot(N, L), 0.0);

    vec3 radiance = light.intensity.x * attenuation * dotNL * light.color;

    return radiance * calcBRDF(L, V, N, mInfo);
  }
`;

export const ENVIRONMENT_MAP = /* glsl */`
  vec3 calcEnvironmentMap(vec3 viewPos, MaterialInfo mInfo) {
    vec3 albedo = mix(mInfo.albedo, vec3(0.0), mInfo.metalic);
    vec3 fresnel = mix(vec3(0.04), mInfo.albedo, mInfo.metalic);
    float roughness = mInfo.roughness;

    float dotNV = max(dot(N, V), 0.0);
    vec3 V = normalize(viewPos - mInfo.position);
    vec3 N = mInfo.normal;
    vec3 R = reflect(-V, N);
    float lodMax = floor(log2(0.5 / uEnvironmentMapSize.x) - 3.0);
    // This tries to take advantage of mipmap when zooming out
    #ifdef GL_OES_standard_derivatives
    vec3 lodDiff = max(abs(dFdx(WR)), abs(dFdy(WR)));
    float lodTarget = log2(max(lodDiff.x, max(lodDiff.y, lodDiff.z)) / 90.0 / (uEnvironmentMapSize.x * 0.5) + 1.0);
    float lod = max(roughness * (lodMax - 1.0), lodTarget);
    #elif defined(WEBGL2)
    vec3 lodDiff = max(abs(dFdx(WR)), abs(dFdy(WR)));
    float lodTarget = log2(max(lodDiff.x, max(lodDiff.y, lodDiff.z)) / 90.0 / (uEnvironmentMapSize.x * 0.5) + 1.0);
    float lod = max(roughness * (lodMax - 1.0), lodTarget);
    #else
    float lod = roughness * (lodMax - 1.0);
    #endif
    vec3 envColor = textureCubePackLodHDR(uEnvironmentMap, WR, lod, uEnvironmentMapSize);
    vec3 F = fresnelSchlickRoughness(dotNV, fresnel, roughness * roughness);
    vec2 envBRDF = texture2D(uBRDFMap, vec2(dotNV, roughness)).rg;

    vec3 spec = envColor * (F * envBRDF.x + envBRDF.y);

    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;

    vec3 irradiance = textureCubePackLodHDR(uEnvironmentMap, WN, lodMax, uEnvironmentMapSize);

    return kD * albedo * irradiance + spec;
  }
`;
