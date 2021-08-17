export const FILMIC = /* glsl */`
vec3 uncharted2TonemapPartial(vec3 x) {
    float A = 0.15;
    float B = 0.50;
    float C = 0.10;
    float D = 0.20;
    float E = 0.02;
    float F = 0.30;
    return ((x*(A*x+C*B)+D*E)/(x*(A*x+B)+D*F))-E/F;
}
vec3 tonemap(vec3 v) {
    float exposure_bias = 2.0;
    vec3 curr = uncharted2TonemapPartial(v * exposure_bias);

    vec3 W = vec3(11.2);
    vec3 white_scale = vec3(1.0) / uncharted2TonemapPartial(W);
    return pow(curr * white_scale, vec3(1.0 / 2.2));
}

`;
