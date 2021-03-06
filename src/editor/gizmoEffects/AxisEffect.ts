import {mat4, vec3} from 'gl-matrix';

import {LINES} from '../../geom/types';
import {GizmoEffect} from '../../render/effect/GizmoEffect';
import {GLGeometry} from '../../render/gl/GLGeometry';
import {GLShader} from '../../render/gl/GLShader';
import {Renderer} from '../../render/Renderer';

const AXIS_SHADER = new GLShader(
  /* glsl */`
    precision highp float;

    attribute vec3 aPosition;

    uniform mat4 uView;
    uniform mat4 uProjection;
    uniform mat4 uModel;
    
    void main() {
      gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
    }
  `,
  /* glsl */`
    precision highp float;

    uniform vec4 uColor;

    void main() {
      gl_FragColor = uColor;
    }
  `,
);
const AXIS_GEOM = new GLGeometry({
  attributes: {
    aPosition: {
      data: [-1, 0, 0, 1, 0, 0],
      size: 3,
    },
  },
  mode: LINES,
});

export interface AxisEffectProps {
  position: vec3;
  axis: vec3;
  color: string;
}

export class AxisEffect implements GizmoEffect<AxisEffectProps> {
  renderer: Renderer | null = null;

  bind(renderer: Renderer): void {
    this.renderer = renderer;
  }

  dispose(): void {
  }

  render(props: AxisEffectProps): void {
    const {renderer} = this;
    const {glRenderer, pipeline} = renderer!;
    const {position, axis, color} = props;
    const camUniforms = pipeline.getCameraUniforms();

    const modelMat = mat4.fromValues(
      axis[0] * 1000, axis[1] * 1000, axis[2] * 1000, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
      position[0], position[1], position[2], 1,
    );

    glRenderer.draw({
      shader: AXIS_SHADER,
      geometry: AXIS_GEOM,
      uniforms: {
        ...camUniforms,
        uModel: modelMat,
        uColor: color,
      },
      state: {
        depth: false,
      },
    });
  }

}
