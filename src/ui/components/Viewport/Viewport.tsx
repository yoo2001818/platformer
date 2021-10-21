import React, {useEffect, useRef} from 'react';
import styled from '@emotion/styled';
import {useRecoilValue} from 'recoil';

import {COLORS} from '../../styles';
import {useEngine} from '../../hooks/useEngine';
import {GLRenderer} from '../../../render/gl/GLRenderer';
import {Renderer} from '../../../render/Renderer';
import {RENDER_PHASE, UPDATE_PHASE} from '../../../core/Engine';
import {OrbitCameraController} from '../../../input/OrbitCameraController';
import {selectedEntity} from '../../states/selection';
import {useEntity} from '../../hooks/useEntity';

import {SelectedEffect} from './SelectedEffect';

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
  const selectedEntityHandle = useRecoilValue(selectedEntity);
  const selectedEntityVal = useEntity(selectedEntityHandle);
  useEffect(() => {
    const canvasElem = canvasRef.current;
    if (canvasElem == null) {
      return;
    }
    const clientRect = canvasElem.getBoundingClientRect();
    canvasElem.width = clientRect.width;
    canvasElem.height = clientRect.height;
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
    glRenderer.setViewport();

    const orbitController = new OrbitCameraController(
      canvasElem,
      canvasElem,
      null,
      3,
    );

    engine.registerSystem(UPDATE_PHASE, (v) => orbitController.update(v));
    engine.registerSystem(RENDER_PHASE, (v) => renderer.render(v));

    rendererRef.current = renderer;

    let animId: number;
    let lastTime = 0;

    function update(time: number) {
      const delta = time - lastTime;
      lastTime = time;

      // Look up any entity with camera for now..
      engine.entityStore.query().with('camera').forEach((camera) => {
        renderer.setCamera(camera);
        orbitController.setEntity(camera);
      });

      engine.update(delta / 1000);

      animId = requestAnimationFrame(update);
    }

    animId = requestAnimationFrame(update);

    // eslint-disable-next-line consistent-return
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [engine]);
  useEffect(() => {
    const renderer = rendererRef.current;
    if (renderer != null) {
      renderer.gizmoEffects.forEach((v) => v.dispose());
      const selectedEffect = new SelectedEffect(renderer);
      selectedEffect.setEntity(selectedEntityVal);
      renderer.gizmoEffects = [selectedEffect];
    }
  }, [selectedEntityVal]);
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
