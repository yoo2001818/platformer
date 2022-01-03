// From https://www.shadertoy.com/view/wtt3W2
// Also read http://www.ppsloan.org/publications/StupidSH36.pdf

export const SH = /* glsl */`
  void shZero(inout vec3[9] sh) {
    for (int i = 0; i < 9; i += 1) {
      sh[i] = vec3(0.0);
    }
  }

  void shScale(inout vec3[9] sh, vec3 scale) {
    for (int i = 0; i < 9; i += 1) {
      sh[i] *= scale;
    }
  }

  void shAddWeighted(inout vec3[9] accSh, in vec3[9] sh, vec3 weight) {
    for (int i = 0; i < 9; i += 1) {
      accSh[i] += sh[i] * weight;
    }
  }

  vec3 shDot(in vec3[9] shA, in vec3[9] shB) {
    vec3 result = vec3(0.0);
    for (int i = 0; i < 9; i += 1) {
      result += shA[i] * shB[i];
    }
    return result;
  }

  void shEvaluate(out vec3[9] sh, vec3 p) {
    // From Peter-Pike Sloan's Stupid SH Tricks
    // http://www.ppsloan.org/publications/StupidSH36.pdf
    // https://github.com/dariomanesku/cmft/blob/master/src/cmft/cubemapfilter.cpp#L130

    vec3[9] result;

    float x = -p.x;
    float y = -p.y;
    float z = p.z;

    float x2 = x*x;
    float y2 = y*y;
    float z2 = z*z;

    float z3 = z2*z;

    float x4 = x2*x2;
    float y4 = y2*y2;
    float z4 = z2*z2;

    result[0] = vec3(1.0/(2.0*sqrtPI));
    result[1] = vec3(-sqrt(3.0/(4.0*PI))*y);
    result[2] = vec3( sqrt(3.0/(4.0*PI))*z);
    result[3] = vec3(-sqrt(3.0/(4.0*PI))*x);
    result[4] = vec3( sqrt(15.0/(4.0*PI))*y*x );
    result[5] = vec3(-sqrt(15.0/(4.0*PI))*y*z );
    result[6] = vec3( sqrt(5.0/(16.0*PI))*(3.0*z2-1.0) );
    result[7] = vec3(-sqrt(15.0/(4.0*PI))*x*z );
    result[8] = vec3( sqrt(15.0/(16.0*PI))*(x2-y2) );
  }

  vec3 shEvaulateDiffuse(in vec3[9] sh, vec3 direction) {

    vec3[9] directionSh;
    shEvaluate(directionSh, direction);
    // https://cseweb.ucsd.edu/~ravir/papers/envmap/envmap.pdf equation 8

    vec3 result = sh[0] * directionSh[0] * 1.0;
    result += sh[1] * directionSh[1] * (2.0 / 3.0);
    result += sh[2] * directionSh[2] * (2.0 / 3.0);
    result += sh[3] * directionSh[3] * (2.0 / 3.0);
    result += sh[4] * directionSh[4] * (1.0 / 4.0);
    result += sh[5] * directionSh[5] * (1.0 / 4.0);
    result += sh[6] * directionSh[6] * (1.0 / 4.0);
    result += sh[7] * directionSh[7] * (1.0 / 4.0);
    result += sh[8] * directionSh[8] * (1.0 / 4.0);

    return result;
  }
`;
