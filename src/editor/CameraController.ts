import {quat, vec3} from 'gl-matrix';

import {Entity} from '../core/Entity';
import {Transform} from '../3d/Transform';

import {Viewport} from './Viewport';

function easeInOutQuad(t: number): number {
  let o: number = t * 2;
  if (o < 1) {
    return o * o / 2;
  }
  o--;
  return (o * (o - 2) - 1) / -2;
}

export class CameraController {
  center: vec3;
  radius: number;

  mouseHeld: boolean;
  mouseX: number;
  mouseY: number;
  rotateDir: number;

  slerpStart: quat;
  slerpEnd: quat;
  slerpCounter: number;

  lerpStart: vec3;
  lerpEnd: vec3;
  lerpCounter: number;

  mode: boolean;
  hasChanged: boolean;

  entity: Entity | null;

  constructor(radius = 6) {
    // Blender-like control mode
    this.center = vec3.create();
    this.radius = radius;

    this.mouseHeld = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.rotateDir = 0;

    this.slerpStart = quat.create();
    this.slerpEnd = quat.create();
    this.slerpCounter = -1;

    this.lerpStart = vec3.create();
    this.lerpEnd = vec3.create();
    this.lerpCounter = -1;

    // false - Blender-like control
    // true - FPS-like control
    this.mode = false;
    this.hasChanged = true;

    this.entity = null;
  }

  setEntity(entity: Entity | null): void {
    if (this.entity !== entity) {
      this.entity = entity;
      this.hasChanged = true;
    }
  }

  processEvent(type: string, viewport: Viewport, ...args: any[]): boolean {
    if (this.entity == null) {
      return false;
    }
    switch (type) {
      case 'mousemove': {
        const e: MouseEvent = args[0];
        if (!this.mouseHeld) {
          return false;
        }
        const offsetX = e.clientX - this.mouseX;
        const offsetY = e.clientY - this.mouseY;
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        const transform = this.entity.getMutate<Transform>('transform')!;
        if (e.shiftKey) {
          // Do translation instead - we'd need two vectors to make translation
          // relative to the camera rotation
          const vecX = vec3.create();
          const vecY = vec3.create();
          vec3.transformQuat(vecX, [-offsetX * this.radius / 600, 0, 0],
            transform.rotation);
          vec3.transformQuat(vecY, [0, offsetY * this.radius / 600, 0],
            transform.rotation);
          vec3.add(this.center, this.center, vecX);
          vec3.add(this.center, this.center, vecY);
          this.hasChanged = true;
          return true;
        }
        // rotation....
        transform.getRotation();
        const rot = quat.create();
        quat.rotateY(rot, rot, Math.PI / 180 * -offsetX *
          this.rotateDir / 4);
        quat.multiply(transform.rotation, rot, transform.rotation);
        quat.rotateX(transform.rotation, transform.rotation,
          Math.PI / 180 * -offsetY / 4);
        transform.markChanged();
        this.hasChanged = true;
        return true;
      }
      case 'mousedown': {
        const e: MouseEvent = args[0];
        if (e.button === 0) {
          return false;
        }
        this.mouseHeld = true;
        const transform = this.entity.get<Transform>('transform')!;
        // Determine if we should go clockwise or anticlockwise.
        const upLocal = vec3.create();
        const up = vec3.fromValues(0, 1, 0);
        vec3.transformQuat(upLocal, [0, 1, 0], transform.getRotation());
        const upDot = vec3.dot(up, upLocal);
        this.rotateDir = upDot >= 0 ? 1 : -1;
        // Set position
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        e.preventDefault();
        break;
      }
      case 'mouseup': {
        const e: MouseEvent = args[0];
        if (e.button === 0) {
          return false;
        }
        this.mouseHeld = false;
        e.preventDefault();
        return true;
      }
      case 'contextmenu': {
        const e: Event = args[0];
        e.preventDefault();
        return true;
      }
      case 'wheel': {
        const e: WheelEvent = args[0];
        let diff = e.deltaY / 50;
        if (e.deltaMode === 0) {
          diff /= 12;
        }
        const transform = this.entity.get<Transform>('transform')!;
        if (e.shiftKey) {
          const vecY = vec3.create();
          vec3.transformQuat(vecY, [0, -diff * this.radius, 0],
            transform.getRotation());
          vec3.add(this.center, this.center, vecY);
          this.hasChanged = true;
          e.preventDefault();
          return true;
        } else if (e.ctrlKey) {
          const vecX = vec3.create();
          vec3.transformQuat(vecX, [diff * this.radius, 0, 0],
            transform.getRotation());
          vec3.add(this.center, this.center, vecX);
          this.hasChanged = true;
          e.preventDefault();
          return true;
        }
        this.radius += this.radius * diff;
        this.hasChanged = true;
        e.preventDefault();
        return true;
      }
    }

    /*
    const {mouseElem, keyElem} = this;
    mouseElem.addEventListener('mousemove', (e) => {
      if (!this.mouseHeld) {
        return;
      }
      if (this.entity == null) {
        return;
      }
      const offsetX = e.clientX - this.mouseX;
      const offsetY = e.clientY - this.mouseY;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      const transform = this.entity.getMutate<Transform>('transform')!;
      if (e.shiftKey) {
        // Do translation instead - we'd need two vectors to make translation
        // relative to the camera rotation
        const vecX = vec3.create();
        const vecY = vec3.create();
        vec3.transformQuat(vecX, [-offsetX * this.radius / 600, 0, 0],
          transform.rotation);
        vec3.transformQuat(vecY, [0, offsetY * this.radius / 600, 0],
          transform.rotation);
        vec3.add(this.center, this.center, vecX);
        vec3.add(this.center, this.center, vecY);
        this.hasChanged = true;
        return;
      }
      // rotation....
      transform.getRotation();
      const rot = quat.create();
      quat.rotateY(rot, rot, Math.PI / 180 * -offsetX *
        this.rotateDir / 4);
      quat.multiply(transform.rotation, rot, transform.rotation);
      quat.rotateX(transform.rotation, transform.rotation,
        Math.PI / 180 * -offsetY / 4);
      transform.markChanged();
      this.hasChanged = true;
    });
    mouseElem.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
    mouseElem.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.mouseHeld = true;
      if (this.entity == null) {
        return;
      }
      const transform = this.entity.get<Transform>('transform')!;
      // Determine if we should go clockwise or anticlockwise.
      const upLocal = vec3.create();
      const up = vec3.fromValues(0, 1, 0);
      vec3.transformQuat(upLocal, [0, 1, 0], transform.getRotation());
      const upDot = vec3.dot(up, upLocal);
      this.rotateDir = upDot >= 0 ? 1 : -1;
      // Set position
      this.mouseX = e.changedTouches[0].pageX;
      this.mouseY = e.changedTouches[0].pageY;
    }, false);
    mouseElem.addEventListener('touchmove', (e) => {
      if (!this.mouseHeld) {
        return;
      }
      if (this.entity == null) {
        return;
      }
      const offsetX = e.changedTouches[0].pageX - this.mouseX;
      const offsetY = e.changedTouches[0].pageY - this.mouseY;
      this.mouseX = e.changedTouches[0].pageX;
      this.mouseY = e.changedTouches[0].pageY;
      const transform = this.entity.getMutate<Transform>('transform')!;
      // rotation....
      transform.getRotation();
      const rot = quat.create();
      quat.rotateY(rot, rot, Math.PI / 180 * -offsetX *
        this.rotateDir / 4);
      quat.multiply(transform.rotation, rot, transform.rotation);
      quat.rotateX(transform.rotation, transform.rotation,
        Math.PI / 180 * -offsetY / 4);
      transform.markChanged();
      this.hasChanged = true;
    });
    mouseElem.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.mouseHeld = false;
    }, false);
    mouseElem.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this.mouseHeld = false;
    }, false);
    mouseElem.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        return;
      }
      if (this.entity == null) {
        return;
      }
      this.mouseHeld = true;
      const transform = this.entity.get<Transform>('transform')!;
      // Determine if we should go clockwise or anticlockwise.
      const upLocal = vec3.create();
      const up = vec3.fromValues(0, 1, 0);
      vec3.transformQuat(upLocal, [0, 1, 0], transform.getRotation());
      const upDot = vec3.dot(up, upLocal);
      this.rotateDir = upDot >= 0 ? 1 : -1;
      // Set position
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      e.preventDefault();
    });
    mouseElem.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        return;
      }
      this.mouseHeld = false;
      e.preventDefault();
    });
    keyElem.addEventListener('keydown', (e) => {
      if (e.shiftKey) {
        return;
      }
      if (this.entity == null) {
        return;
      }
      const transform = this.entity.get<Transform>('transform')!;
      const camera = this.entity.get<Camera>('camera')!;
      if (e.keyCode === 32) {
        vec3.copy(this.lerpStart, this.center);
        vec3.set(this.lerpEnd, 0, 0, 0);
        this.lerpCounter = 0;
      }
      // Persp - Ortho swap
      if (e.keyCode === 101 || e.keyCode === 53) {
        camera.setOptions({
          ...camera.options,
          type: camera.options.type === 'perspective' ? 'ortho' : 'perspective',
        });
        this.hasChanged = true;
      }
      // Front
      if (e.keyCode === 97 || e.keyCode === 49) {
        quat.copy(this.slerpStart, transform.getRotation());
        quat.identity(this.slerpEnd);
        if (e.ctrlKey) {
          quat.rotateY(this.slerpEnd, this.slerpEnd, Math.PI);
        }
        this.slerpCounter = 0;
      }
      // Right
      if (e.keyCode === 99 || e.keyCode === 51) {
        quat.copy(this.slerpStart, transform.getRotation());
        quat.identity(this.slerpEnd);
        quat.rotateY(this.slerpEnd, this.slerpEnd, Math.PI / 2);
        if (e.ctrlKey) {
          quat.rotateY(this.slerpEnd, this.slerpEnd, -Math.PI);
        }
        this.slerpCounter = 0;
      }
      // Top
      if (e.keyCode === 103 || e.keyCode === 55) {
        quat.copy(this.slerpStart, transform.getRotation());
        quat.identity(this.slerpEnd);
        quat.rotateX(this.slerpEnd, this.slerpEnd, -Math.PI / 2);
        if (e.ctrlKey) {
          quat.rotateX(this.slerpEnd, this.slerpEnd, Math.PI);
        }
        this.slerpCounter = 0;
      }
    });
    mouseElem.addEventListener('wheel', (e) => {
      let diff = e.deltaY / 50;
      if (e.deltaMode === 0) {
        diff /= 12;
      }
      if (this.entity == null) {
        return;
      }
      const transform = this.entity.get<Transform>('transform')!;
      if (e.shiftKey) {
        const vecY = vec3.create();
        vec3.transformQuat(vecY, [0, -diff * this.radius, 0],
          transform.getRotation());
        vec3.add(this.center, this.center, vecY);
        this.hasChanged = true;
        e.preventDefault();
        return;
      } else if (e.ctrlKey) {
        const vecX = vec3.create();
        vec3.transformQuat(vecX, [diff * this.radius, 0, 0],
          transform.getRotation());
        vec3.add(this.center, this.center, vecX);
        this.hasChanged = true;
        e.preventDefault();
        return;
      }
      this.radius += this.radius * diff;
      this.hasChanged = true;
      e.preventDefault();
    });
    */
    return false;
  }

  update(delta: number): void {
    if (this.entity == null) {
      return;
    }
    const transform = this.entity.get<Transform>('transform')!;
    if (this.lerpCounter !== -1) {
      this.lerpCounter = Math.min(1, this.lerpCounter + delta * 4);
      vec3.lerp(this.center,
        this.lerpStart, this.lerpEnd, easeInOutQuad(this.lerpCounter));
      this.hasChanged = true;
      if (this.lerpCounter >= 1) {
        this.lerpCounter = -1;
      }
    }
    if (this.slerpCounter !== -1) {
      this.slerpCounter = Math.min(1, this.slerpCounter + delta * 4);
      quat.slerp(transform.getRotation(),
        this.slerpStart, this.slerpEnd, easeInOutQuad(this.slerpCounter));
      this.hasChanged = true;
      if (this.slerpCounter >= 1) {
        this.slerpCounter = -1;
      }
    }
    if (this.hasChanged) {
      vec3.transformQuat(transform.getPosition(), [0, 0, this.radius],
        transform.getRotation());
      vec3.add(transform.getPosition(), transform.getPosition(), this.center);
      transform.markChanged();
      this.hasChanged = false;
      this.entity.markChanged('transform');
    }
  }
}
