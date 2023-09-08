import { useRenderer, useStats } from '../init';

// animation params
export type TickData = {
  timestamp: number;
  timeDiff: number;
  fps: number;
};

const localTickData: TickData = {
  timestamp: 0,
  timeDiff: 0,
  fps: 0,
};

const localFrameOpts = {
  data: localTickData,
};

const frameEvent = new MessageEvent('tick', localFrameOpts);

class TickManager extends EventTarget {
  timestamp: number;
  timeDiff: number;
  lastTimestamp: number;
  fps: number;

  constructor({ timestamp, timeDiff } = localTickData) {
    super();

    this.timestamp = timestamp;
    this.timeDiff = timeDiff;
    this.lastTimestamp = 0;
    this.fps = 0;
  }

  startLoop() {
    const renderer = useRenderer();
    // const scene = useScene()
    // const camera = useCamera()
    const stats = useStats();

    if (!renderer) {
      throw new Error('Updating Frame Failed : Uninitialized Renderer');
    }

    const animate = () => {
      const now = performance.now();
      this.timestamp = now;
      this.timeDiff = this.timestamp - this.lastTimestamp;

      const timeDiffCapped = Math.min(Math.max(this.timeDiff, 0), 100);

      // performance tracker start
      this.fps = 1000 / this.timeDiff;
      this.lastTimestamp = this.timestamp;

      this.tick(this.timestamp, timeDiffCapped, this.fps);

      stats.update();

      // performance tracker end

      requestAnimationFrame(() => {
        animate();
      });
    };

    animate();
  }

  tick(timestamp: number, timeDiff: number, fps: number) {
    localTickData.timestamp = timestamp;
    localTickData.timeDiff = timeDiff;
    localTickData.fps = fps;
    this.dispatchEvent(frameEvent);
  }
}

export default TickManager;
