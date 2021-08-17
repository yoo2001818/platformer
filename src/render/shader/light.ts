export const POINT_LIGHT = /* glsl */`
  struct PointLight {
    vec3 position;
    vec3 color;
    vec3 intensity;
  };

  vec3 calcPoint(vec3 viewPos, MaterialInfo mInfo, PointLight light) {
    vec3 L = light.position - mInfo.position;
    vec3 V = normalize(viewPos - mInfo.position);
    vec3 N = mInfo.normal;

    float lightDist = length(L);
    L = L / lightDist;

    float attenuation = light.intensity.x /
      (0.001 + (lightDist * lightDist));
    float window = pow(max(1.0 - pow(lightDist / light.intensity.z, 4.0), 0.0), 2.0);
    
    float dotNL = max(dot(N, L), 0.0);

    vec3 radiance = window * attenuation * dotNL * light.color;

    return radiance * calcBRDF(L, V, N, mInfo);
  }
`;

export const DIRECTIONAL_LIGHT = /* glsl */`
  struct DirectionalLight {
    vec4 direction;
    vec3 color;
  };

  vec3 calcDirectional(vec3 viewPos, MaterialInfo mInfo, DirectionalLight light) {
    vec3 L = normalize(light.direction.xyz);
    vec3 V = normalize(viewPos - mInfo.position);
    vec3 N = mInfo.normal;

    float dotNL = max(dot(N, L), 0.0);

    vec3 radiance = light.direction.w * dotNL * light.color;

    return radiance * calcBRDF(L, V, N, mInfo);
  }
`;

export const ENVIRONMENT_MAP = /* glsl */`
  vec3 calcEnvironmentMap(vec3 viewPos, MaterialInfo mInfo, sampler2D brdfMap, sampler2D envMap, vec2 mapSize, float power) {
    vec3 albedo = mix(mInfo.albedo, vec3(0.0), mInfo.metalic);
    vec3 fresnel = mix(vec3(0.04), mInfo.albedo, mInfo.metalic);
    float roughness = mInfo.roughness;

    vec3 V = normalize(viewPos - mInfo.position);
    vec3 N = mInfo.normal;
    vec3 R = reflect(-V, N);
    float dotNV = max(dot(N, V), 0.0);
    float lodMax = floor(log2(0.5 / mapSize.x) - 3.0);
    // This tries to take advantage of mipmap when zooming out
    #ifdef FORWARD
      #ifdef GL_OES_standard_derivatives
      vec3 lodDiff = max(abs(dFdx(R)), abs(dFdy(R)));
      float lodTarget = log2(max(lodDiff.x, max(lodDiff.y, lodDiff.z)) / 90.0 / (mapSize.x * 0.5) + 1.0);
      float lod = max(roughness * (lodMax - 1.0), lodTarget);
      #elif defined(WEBGL2)
      vec3 lodDiff = max(abs(dFdx(R)), abs(dFdy(R)));
      float lodTarget = log2(max(lodDiff.x, max(lodDiff.y, lodDiff.z)) / 90.0 / (mapSize.x * 0.5) + 1.0);
      float lod = max(roughness * (lodMax - 1.0), lodTarget);
      #else
      float lod = roughness * (lodMax - 1.0);
      #endif
    #else
    float lod = roughness * (lodMax - 1.0);
    #endif
    vec3 envColor = textureCubePackLodHDR(envMap, R, lod, mapSize) * power;
    vec3 F = fresnelSchlickRoughness(dotNV, fresnel, roughness * roughness);
    vec2 envBRDF = texture2D(brdfMap, vec2(dotNV, roughness)).rg;

    vec3 spec = envColor * (F * envBRDF.x + envBRDF.y);

    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;

    vec3 irradiance = textureCubePackLodHDR(envMap, N, lodMax, mapSize) * power;

    return kD * albedo * irradiance + spec;
  }
`;
