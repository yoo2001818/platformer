import React, {useEffect, useRef} from 'react';
import styled from '@emotion/styled';

import {COLORS} from '../../styles';
import {useEngine} from '../../hooks/useEngine';
import {GLRenderer} from '../../../render/gl/GLRenderer';
import {Renderer} from '../../../render/Renderer';
import {RENDER_PHASE} from '../../../core/Engine';
import {ViewportModel} from '../../../editor/models/ViewportModel';
import {Viewport as RendererViewport} from '../../../editor/Viewport';
import {Transform} from '../../../3d/Transform';
import {Camera} from '../../../3d/Camera';

export interface ViewportProps {
  className?: string;
}

export function Viewport(
  props: ViewportProps,
): React.ReactElement {
  const {className} = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const engine = useEngine();
  useEffect(() => {
    const canvasElem = canvasRef.current;
    if (canvasElem == null) {
      return;
    }
    // Initialize WebGL environment
    const gl =
      canvasElem.getContext('webgl2') || canvasElem.getContext('webgl') ||
      canvasElem.getContext('experimental-webgl') as WebGLRenderingContext;
    if (gl == null) {
      alert('This browser does not support WebGL.');
      return;
    }
    const glRenderer = new GLRenderer(gl);
    const renderer = new Renderer(glRenderer, engine.entityStore);

    const viewport = new RendererViewport(canvasElem, renderer);
    engine.getModel<ViewportModel>('viewport').addViewport(viewport);

    const camera = engine.entityStore.create({
      name: 'Editor Camera',
      transform: new Transform(),
      camera: new Camera({
        type: 'perspective',
        fov: 70 / 180 * Math.PI,
        far: 1000,
        near: 0.3,
      }),
    });
    renderer.setCamera(camera);

    engine.registerSystem(RENDER_PHASE, (v) => {
      // Check if the canvas size has been changed.
      const clientRect = canvasElem.getBoundingClientRect();
      const nextWidth = Math.floor(clientRect.width);
      const nextHeight = Math.floor(clientRect.height);
      if (
        nextWidth !== canvasElem.width ||
        nextHeight !== canvasElem.height
      ) {
        canvasElem.width = nextWidth;
        canvasElem.height = nextHeight;
        renderer.markSizeChanged();
      }
      renderer.render(v);
    });

    rendererRef.current = renderer;
  }, [engine]);
  return (
    <Canvas className={className} ref={canvasRef} tabIndex={0} />
  );
}

const Canvas = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
  background-color: ${COLORS.gray0};
`;
