import {atom, AtomDescriptor} from '../core/Atom';
import {Engine} from '../core/Engine';
import {GizmoEffect} from '../render/effect/GizmoEffect';
import {DeferredPipeline} from '../render/pipeline/DeferredPipeline';
import {ForwardPipeline} from '../render/pipeline/ForwardPipeline';
import {RaytracedPipeline} from '../render/pipeline/RaytracedPipeline';
import {WorldBVH} from '../render/raytrace/WorldBVH';
import {Renderer} from '../render/Renderer';
import {createId} from '../render/utils/createId';

import {ViewportModel} from './models/ViewportModel';
import {ViewportEffect} from './ViewportEffect';

export interface ViewportState {
  renderer: 'forward' | 'deferred' | 'raytrace';
}

export class Viewport {
  id: number;
  engine: Engine | null;
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  viewportEffect: ViewportEffect;
  unattachFn: (() => void) | null;
  stateAtom: AtomDescriptor<ViewportState>;

  constructor(
    canvas: HTMLCanvasElement,
    renderer: Renderer,
  ) {
    this.id = createId();
    this.engine = null;
    this.canvas = canvas;
    this.renderer = renderer;
    this.unattachFn = null;
    this.viewportEffect = new ViewportEffect(this);
    this.stateAtom = atom({
      name: `viewportState.${this.id}`,
      defaultState: {
        renderer: 'deferred',
      },
    });
  }

  attach(engine: Engine): void {
    this.engine = engine;
    const viewportModel = engine.getModel<ViewportModel>('viewport');
    const callbacks = [
      'mousedown',
      'mousemove',
      'mouseup',
      'click',
      'contextmenu',
      'touchstart',
      'wheel',
    ].map((name) => {
      const callback =
        (...args: any[]) => viewportModel.emitter.emit(name, [this, ...args]);
      this.canvas.addEventListener(name, callback);
      return {name, callback};
    });
    const windowCallbacks = [
      'keydown',
      'keyup',
    ].map((name) => {
      const callback =
        (...args: any[]) => viewportModel.emitter.emit(name, [this, ...args]);
      window.addEventListener(name, callback);
      return {name, callback};
    });
    const atomInst = engine.entityStore.getAtom(this.stateAtom);
    let prevState = atomInst.state;
    const handleAtomChange = () => {
      const nextState = atomInst.state;
      if (nextState.renderer !== prevState.renderer) {
        switch (nextState.renderer) {
          case 'forward': {
            this.renderer.pipeline.dispose();
            this.renderer.setPipeline(new ForwardPipeline(this.renderer));
            break;
          }
          case 'deferred': {
            this.renderer.pipeline.dispose();
            this.renderer.setPipeline(new DeferredPipeline(this.renderer));
            break;
          }
          case 'raytrace': {
            // TODO: This can be used anywhere
            const worldBVH = new WorldBVH(engine.entityStore);
            this.renderer.pipeline.dispose();
            this.renderer.setPipeline(new RaytracedPipeline(
              this.renderer,
              worldBVH,
            ));
            break;
          }
        }
      }
      prevState = nextState;
    };
    atomInst.signal.add(handleAtomChange);
    this.unattachFn = () => {
      callbacks.forEach(({name, callback}) => {
        this.canvas.removeEventListener(name, callback);
      });
      windowCallbacks.forEach(({name, callback}) => {
        window.removeEventListener(name, callback);
      });
      atomInst.signal.remove(handleAtomChange);
    };
    this.renderer.gizmoEffects.push(this.viewportEffect);
  }

  unattach(): void {
    if (this.unattachFn != null) {
      this.unattachFn();
      this.unattachFn = null;
    }
  }

  getEffect<T extends GizmoEffect<any>>(key: string): T | null {
    return this.viewportEffect.get(key);
  }
}
