import {quad} from '../../../geom/quad';
import {GizmoEffect} from '../../../render/effect/GizmoEffect';
import {GLGeometry} from '../../../render/gl/GLGeometry';
import {GLShader} from '../../../render/gl/GLShader';
import {Renderer} from '../../../render/Renderer';

const TEST_QUAD = new GLGeometry(quad());
const TEST_SHADER = new GLShader(
  /* glsl */`
    precision highp float;
    attribute vec3 aPosition;

    varying vec3 vColor;
    
    void main() {
      vColor = aPosition * 0.5 + 0.5;
      gl_Position = vec4(aPosition.xy * 0.5, -1.0, 1.0);
    }
  `,
  /* glsl */`
    precision highp float;

    varying vec3 vColor;

    void main() {
      gl_FragColor = vec4(vColor, 1.0);
    }
  `,
);

export class TestEffect implements GizmoEffect<{}> {
  renderer: Renderer | null = null;

  bind(renderer: Renderer): void {
    this.renderer = renderer;
  }

  render(props: {}, deltaTime?: number): void {
    this.renderer!.glRenderer.draw({
      geometry: TEST_QUAD,
      shader: TEST_SHADER,
      uniforms: {},
    });
  }

  dispose(): void {
    this.renderer = null;
  }
}
