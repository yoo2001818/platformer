import {Signal} from './Signal';

export class UpstreamSignal extends Signal {
  _handler: () => void;
  _getUpstream: () => Signal;
  _getVersion: () => number;
  prevUpstream: Signal | null;
  prevVersion: number;

  constructor(
    getUpstream: () => Signal,
    getVersion: () => number,
  ) {
    super(() => {
      const upstream = this._getUpstream();
      upstream.add(this._handler);
      this.prevUpstream = upstream;
      this.prevVersion = this._getVersion();
    }, () => {
      if (this.prevUpstream != null) {
        this.prevUpstream.remove(this._handler);
      }
    });
    // Is this a good way to achieve this?
    this._handler = () => {
      const currentVersion = this._getVersion();
      if (currentVersion > this.prevVersion) {
        this.prevVersion = currentVersion;
        this.emit();
      }
    };
    this._getUpstream = getUpstream;
    this._getVersion = getVersion;
    this.prevUpstream = null;
    this.prevVersion = -1;
  }

  updateUpstream(): void {
    const newUpstream = this._getUpstream();
    if (this.isActive() && newUpstream !== this.prevUpstream) {
      if (this.prevUpstream != null) {
        this.prevUpstream.remove(this._handler);
      }
      newUpstream.add(this._handler);
      this.prevUpstream = newUpstream;
    }
  }
}
