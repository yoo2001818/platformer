export const PBR = /* glsl */`
  float distributionGGX(vec3 N, vec3 M, float a) {
    float a2 = a * a;
    float dotNM = max(dot(N, M), 0.0);
    float dotNM2 = dotNM * dotNM;
    float nom = dotNM * a2;
    float denom = (dotNM2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;
    return nom / denom;
  }

  float lambdaGGX(float a) {
    float a2 = a * a;
    float nom = sqrt(1.0 + 1.0 / a2) - 1.0;
    return nom / 2.0;
  }

  float geometrySmith(vec3 L, vec3 V, vec3 M, float lambdaL, float lambdaV) {
    float dotMV = max(dot(M, V), 0.0);
    float dotML = max(dot(M, L), 0.0);
    return (dotMV * dotML) / (1.0 + lambdaV + lambdaL);
  }

  vec3 fresnelSchlick(float dotNL, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - dotNL, 5.0);
  }

  vec3 specCookTorr(float D, vec3 F, float G, float dotNL, float dotNV) {
    vec3 nom = D * G * F;
    float denom = 4.0 * max(dotNL, 0.0) * max(dotNV, 0.0);
    return nom / max(denom, 0.001);
  }

  vec3 brdfCookTorr(
    vec3 L,
    vec3 V,
    vec3 N,
    float roughness,
    vec3 albedo,
    vec3 reflection
  ) {
    float dotNL = max(dot(N, L), 0.0);
    float dotNV = max(dot(N, V), 0.0);

    vec3 H = normalize(V + L);

    float D = distributionGGX(N, H, roughness);
    vec3 F = fresnelSchlick(dotNL, reflection);
    float G = geometrySmith(L, V, N, lambdaGGX(roughness), lambdaGGX(roughness));

    vec3 spec = specCookTorr(D, F, G, dotNL, dotNV);

    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;

    return kD * albedo / PI + spec;
  }
`;
