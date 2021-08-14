/* eslint-disable */

// Until now, Material made their own shader and issued draw all - this is
// no longer possible due to deferred rendering.

// The pipeline must support both forward and deferred rendering procedure,
// which effectively means that the shader must be composed by the pipeline.
// The deferred pipeline will compose the shader like this:
// - MaterialInfo -> packing
// - unpacking -> light -> output
// The forward pipeline will compose the shader like this:
// - MaterialInfo -> light -> output.
// In this sense, the material itself is unaware of the lighting code and 
// the pipeline completely controls the lighting.
// 
// Note that this ONLY applies to deferred material - forward material must be
// rendered as-is.
// 
// First, the pipeline must be able to gather all the lights in the scene and
// prepare the shader snippets, uniforms, shadow maps (which incurs another
// draw call, ...)
//
// Shadow map is another concern too, let's just say that it executes another
// function to render the scene.
//
// Then, forward materials can request for this information. Forward renderer
// can use this to translate deferred material to forward shader.
// 
const shader = renderer.getDeferredShader(ID, () => ({
  vert: /* glsl */`
    // Just the usual - it can be even omitted if you're not interested in this
  `,
  frag: /* glsl */`
    // Note that you still have to define varying and uniform needed to set all
    // the properties
    void material(MaterialInfo mInfo) {
      mInfo.normal = vec3(0.0, 0.0, 1.0);
      // And so on...
    }
  `,
}));
renderer.drawDeferred({
  geometry,
  shader,
  uniforms: {
    // ...
  },
})

// That's it actually. Lights must provided their own shader code too.
// In a sense, lights are just treated like a mesh (especially in deferred) -
// which will default to fullscreen quad if not overriden.

