const renderer = new Renderer();

// VBO functions. This directly correspond to WebGL's raw buffer.
const vbo = renderer.createVBO('static');
const ebo = renderer.createEBO('dynamic');
vbo.replace(new Float32Array([1, 2, 3]));
ebo.replace(new Int32Array([1, 2, 3]));

// Unlike prior one, this'll persist between context
const vbo2 = renderer.createVBO([0, 1, 2, 3, 4, 5]);

// VAO functions.
const vao = renderer.createVAO();
vao.set(0, vbo, 3);
vao.set(1, vbo, 4);

vao.set(0, {
  buffer: vbo,
  size: 3,
  // type: 'float', // This will be automatically inferred
  // normalized: false,
  stride: 0,
  offset: 0,
  divisor: 1,
});

vao.setElementBuffer(ebo);
vao.drawTriangles(0, 100, 100);

// It is possible to reserve attribute names to share VAOs between shaders
renderer.bindAttribLocations([
  'aPosition',
  'aNormal',
  'aTexCoord',
  'aTangent',
]);

// Shader functions
const shader = new Shader(VERTEX_SHADER, FRAGMENT_SHADER);
shader.bind(renderer);
shader.setUniforms({
  uModel: [0, 0, 0, 0],
});
shader.setAttributes(vao, {
  aPosition: vbo,
  aNormal: vbo,
  aTexCoord: {
    buffer: vbo,
    stride: 0,
    offset: 0,
    divisor: 0,
  },
});

// Geometry models are created using them, which enables the data to persist.
// Also it automatically utilizes VAO and stuff.
const geometry = new Geometry({
  aPosition: vbo,
  aNormal: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  aTexCoord: [0, 1, 2, 3, 4, 5],
  indices: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  mode: 'triangles',
});

const geometry2 = new Geometry({
  ...geometry.getDescriptor(),
});

// In order to issue the draw call, the following code can be used.
shader.bind(renderer);
shader.setUniforms({});
geometry.draw(renderer);

// Merging everything to one, the following is also possible:
renderer.draw(shader, geometry, {
  uModel: [0, 0, 0, 0],
});

// Textures
const texture = new Texture();

// WebGL 2 makes it possible to utilize UBOs. it can be done like this:

// First, extract the uniform block descriptor like:
const uboDescriptor = shader.getUBODescriptor('uCamera');
const ubo = new UniformBuffer(uboDescriptor);
const ubo2 = new UniformBuffer({
  uModel: 'mat4',
  uView: 'mat4',
  uProjection: 'mat4',
});

// Fill up the variables. This will trigger the dirty flag in the UBO.
ubo.setUniforms({uModel: [0, 0, 0, 0]});

// ...
renderer.draw(shader, geometry, {
  uCamera: ubo,
});
