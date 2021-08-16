import {GLRenderer} from './GLRenderer';
import {
  GLCullFaceMode,
  GLFrontFace,
  GLStateBlendEquation,
  GLStateBlendFunc,
  GLStateOptions,
  GLStateStencilOpArgs,
  GLStateTestFunc,
} from './types';
import {
  BLEND_EQUATION,
  BLEND_FUNC,
  CULL_FACE_MODE, FRONT_FACE, STENCIL_OP, TEST_FUNC,
} from './utils';

function arrayEqual(a: unknown[], b: unknown[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

interface GLStateManagerState {
  blend: {
    enabled: boolean;
    color: number[];
    equation: [GLStateBlendEquation, GLStateBlendEquation];
    func: [
      [GLStateBlendFunc, GLStateBlendFunc],
      [GLStateBlendFunc, GLStateBlendFunc],
    ];
  };
  colorMask: boolean[];
  depthMask: boolean;
  stencilMask: [number, number];
  cull: {
    enabled: boolean;
    mode: GLCullFaceMode;
  };
  frontFace: GLFrontFace;
  depth: {
    enabled: boolean;
    test: GLStateTestFunc;
    range: [number, number];
  };
  dither: boolean;
  stencil: {
    enabled: boolean;
    func: [[GLStateTestFunc, number, number], [GLStateTestFunc, number, number]];
    op: [GLStateStencilOpArgs, GLStateStencilOpArgs];
  };
  viewport: [number, number, number, number];
  scissor: {
    enabled: boolean;
    scissor: [number, number, number, number];
  };
  polygonOffset: {
    enabled: boolean;
    offset: [number, number];
  };
}

export class GLStateManager {
  renderer: GLRenderer;
  state: GLStateManagerState;
  constructor(renderer: GLRenderer) {
    this.renderer = renderer;
    this.state = {
      blend: {
        enabled: false,
        color: [1, 1, 1, 1],
        equation: ['add', 'add'],
        func: [
          ['one', 'zero'],
          ['one', 'zero'],
        ],
      },
      colorMask: [true, true, true, true],
      depthMask: true,
      stencilMask: [0xFFFF, 0xFFFF],
      cull: {
        enabled: false,
        mode: 'back',
      },
      frontFace: 'ccw',
      depth: {
        enabled: false,
        test: 'less',
        range: [0, 1],
      },
      dither: false,
      stencil: {
        enabled: false,
        func: [
          ['always', 0, 0xFFFF],
          ['always', 0, 0xFFFF],
        ],
        op: [['keep', 'keep', 'keep'], ['keep', 'keep', 'keep']],
      },
      viewport: [0, 0, 0, 0],
      scissor: {
        enabled: false,
        scissor: [0, 0, 0, 0],
      },
      polygonOffset: {
        enabled: false,
        offset: [0, 0],
      },
    };
  }

  setState(options: GLStateOptions): void {
    const {state} = this;
    const {gl} = this.renderer;
    if (options.blend) {
      const blend = options.blend;
      if (!state.blend.enabled) {
        gl.enable(gl.BLEND);
        state.blend.enabled = true;
      }
      const color = blend.color;
      if (color != null && !arrayEqual(color, state.blend.color)) {
        gl.blendColor(color[0], color[1], color[2], color[3]);
        state.blend.color = color;
      }

      let equation: [GLStateBlendEquation, GLStateBlendEquation];
      if (typeof blend.equation === 'string') {
        equation = [blend.equation, blend.equation];
      } else {
        equation = blend.equation;
      }
      if (!arrayEqual(equation, state.blend.equation)) {
        gl.blendEquationSeparate(
          BLEND_EQUATION[equation[0]],
          BLEND_EQUATION[equation[1]],
        );
        state.blend.equation = equation;
      }

      let func: [
        [GLStateBlendFunc, GLStateBlendFunc],
        [GLStateBlendFunc, GLStateBlendFunc],
      ];
      if (typeof blend.func[0] === 'string') {
        const optionsFunc = blend.func as [GLStateBlendFunc, GLStateBlendFunc];
        func = [optionsFunc, optionsFunc];
      } else {
        func = blend.func as typeof func;
      }
      if (!arrayEqual(func, state.blend.func)) {
        gl.blendFuncSeparate(
          BLEND_FUNC[func[0][0]],
          BLEND_FUNC[func[0][1]],
          BLEND_FUNC[func[1][0]],
          BLEND_FUNC[func[1][1]],
        );
        state.blend.func = func;
      }
    } else if (state.blend.enabled) {
      gl.disable(gl.BLEND);
      state.blend.enabled = false;
    }
    const colorMask = options.colorMask ?? [true, true, true, true];
    if (!arrayEqual(state.colorMask, colorMask)) {
      gl.colorMask(colorMask[0], colorMask[1], colorMask[2], colorMask[3]);
      state.colorMask = colorMask;
    }
    const depthMask = options.depthMask ?? true;
    if (depthMask !== state.depthMask) {
      gl.depthMask(depthMask);
      state.depthMask = depthMask;
    }
    const stencilMask = options.stencilMask ?? 0xFFFF;
    const stencilMaskArr = Array.isArray(stencilMask)
      ? stencilMask
      : [stencilMask, stencilMask] as [number, number];
    if (!arrayEqual(state.stencilMask, stencilMaskArr)) {
      gl.stencilMaskSeparate(gl.FRONT, stencilMaskArr[0]);
      gl.stencilMaskSeparate(gl.BACK, stencilMaskArr[1]);
      state.stencilMask = stencilMaskArr;
    }
    const cull = options.cull ?? 'back';
    if (cull) {
      if (!state.cull.enabled) {
        gl.enable(gl.CULL_FACE);
        state.cull.enabled = true;
      }
      if (cull !== state.cull.mode) {
        gl.cullFace(CULL_FACE_MODE[cull]);
        state.cull.mode = cull;
      }
    } else if (state.cull.enabled) {
      gl.disable(gl.CULL_FACE);
      state.cull.enabled = false;
    }
    const frontFace = options.frontFace ?? 'ccw';
    if (frontFace !== state.frontFace) {
      gl.frontFace(FRONT_FACE[frontFace]);
      state.frontFace = frontFace;
    }
    const depth = options.depth ?? 'lequal';
    if (depth) {
      if (!state.depth.enabled) {
        gl.enable(gl.DEPTH_TEST);
        state.depth.enabled = true;
      }
      let func;
      let range: [number, number];
      if (typeof depth === 'string') {
        func = depth;
        range = [0, 1];
      } else {
        func = depth.func;
        range = depth.range;
      }
      if (func !== state.depth.test) {
        gl.depthFunc(TEST_FUNC[func]);
        state.depth.test = func;
      }
      if (!arrayEqual(range, state.depth.range)) {
        gl.depthRange(range[0], range[1]);
        state.depth.range = range;
      }
    } else if (state.depth.enabled) {
      gl.disable(gl.DEPTH_TEST);
      state.depth.enabled = false;
    }
    // TODO dither
    if (options.stencil) {
      const stencil = options.stencil;
      if (!state.stencil.enabled) {
        gl.enable(gl.STENCIL_TEST);
        state.stencil.enabled = true;
      }
      let func: [
        [GLStateTestFunc, number, number],
        [GLStateTestFunc, number, number],
      ];
      if (typeof stencil.func[0] === 'string') {
        const optionsFunc = stencil.func as [GLStateTestFunc, number, number];
        func = [optionsFunc, optionsFunc];
      } else {
        func = stencil.func as typeof func;
      }
      if (!arrayEqual(func, state.stencil.func)) {
        gl.stencilFuncSeparate(
          gl.FRONT,
          TEST_FUNC[func[0][0]],
          func[0][1],
          func[0][2],
        );
        gl.stencilFuncSeparate(
          gl.BACK,
          TEST_FUNC[func[1][0]],
          func[1][1],
          func[1][2],
        );
        state.stencil.func = func;
      }

      let op: [GLStateStencilOpArgs, GLStateStencilOpArgs];
      if (typeof stencil.op[0] === 'string') {
        const optionsOp = stencil.op as GLStateStencilOpArgs;
        op = [optionsOp, optionsOp];
      } else {
        op = stencil.op as typeof op;
      }
      if (!arrayEqual(op, state.stencil.op)) {
        gl.stencilOpSeparate(
          gl.FRONT,
          STENCIL_OP[op[0][0]],
          STENCIL_OP[op[0][1]],
          STENCIL_OP[op[0][2]],
        );
        gl.stencilOpSeparate(
          gl.BACK,
          STENCIL_OP[op[1][0]],
          STENCIL_OP[op[1][1]],
          STENCIL_OP[op[1][2]],
        );
        state.stencil.op = op;
      }
    } else if (state.stencil.enabled) {
      gl.disable(gl.STENCIL_TEST);
      state.stencil.enabled = false;
    }
    // TODO viewport
    // TODO scissor
    // TODO polygonOffset
  }
}
