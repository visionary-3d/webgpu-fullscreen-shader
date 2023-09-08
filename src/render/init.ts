// @ts-ignore
import Stats from 'stats-js';

import TickManager from './controllers/tick-manager';
import { PerspectiveCamera } from './math/Camera';
import { Quaternion } from './math/Quaternion';
import { Vector2 } from './math/Vector2';
import { Vector3 } from './math/Vector3';
import { Vector4 } from './math/Vector4';

// @ts-ignore
import { GUI } from './libs/lil-gui.module.min.js';

type WindowSize = { width: number; height: number };
type WindowResizeFunction = (width: number, height: number) => void;

let stats: Stats,
  navigator: Navigator,
  adapter: GPUAdapter | null,
  device: GPUDevice,
  canvas: HTMLCanvasElement,
  context: GPUCanvasContext | null,
  renderer: Renderer,
  camera: PerspectiveCamera,
  resizeFunctions: WindowResizeFunction[] = [],
  gui: GUI,
  windowSize: WindowSize = { width: 0, height: 0 },
  renderTickManager: TickManager;

// Pad to 16 byte chunks of 2, 4 (std140 layout)
const pad2 = (n: number) => n + (n % 2);
const pad4 = (n: number) => n + ((4 - (n % 4)) % 4);

// convert nested objects into a single array using index without of array.push
const recursiveObjectToArray = (
  obj: any,
  array: Array<number>,
  index: number = 0
) => {
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = obj[key];
    if (value instanceof Object) {
      index = recursiveObjectToArray(value, array, index);
    } else if (value instanceof Array) {
      for (let j = 0; j < value.length; j++) {
        array[index++] = value[j];
      }
    } else {
      array[index++] = value;
    }
  }
  return index;
};

type UniformPrimitive<T> = T[] | Uniform<T> | Vector4 | Vector3 | Vector2 | T;
type UniformReference<T> = UniformPrimitive<T> | Object;

export type UniformList<T> = Record<string, Uniform<T>>;

export class Uniform<T> {
  value: UniformReference<T>;
  readonly array: T[] | number[] | Float32Array;
  extraPadding: number;

  constructor(input: UniformReference<T>) {
    this.value = input;
    this.extraPadding = 0;

    if (input instanceof Uniform) {
      this.array = new Array(input.array.length);
      this.copy(input);
    } else if (input instanceof Array) {
      this.array = new Array<T>(input.length);
      for (let i = 0; i < input.length; i++) {
        this.array[i] = input[i];
      }
    } else if (input instanceof Vector2) {
      const arr = new Array<number>(2).fill(0);
      this.array = input.toArray(arr);
    } else if (input instanceof Vector4 /*  || input instanceof Vector3 */) {
      // we consider vec3 to be vec4 cause it's easier to handle
      const arr = new Array<number>(4).fill(0);
      this.array = input.toArray(arr);
    } else if (input instanceof Vector3) {
      const arr = new Array<number>(3).fill(0);
      this.array = input.toArray(arr);
    } else if (input instanceof Quaternion) {
      const arr = new Array<number>(4).fill(0);
      this.array = input.toArray(arr);
    } else if (input instanceof Object) {
      const values = Object.values(input);
      const keys = Object.keys(input);
      const list = {} as UniformList<T>;
      for (let i = 0; i < values.length; i++) {
        list[keys[i]] = new Uniform(values[i]);
      }
      this.value = list;
      this.array = [];
    } else {
      this.array = [input];
    }
  }

  set(value: UniformReference<T>) {
    this.value = value;
  }

  copy(u: Uniform<T>) {
    this.value = u.value;

    for (let i = 0; i < this.array.length; i++) {
      this.array[i] = u.array[i];
    }
  }

  update() {
    // copy reference into value

    if (this.value instanceof Uniform) {
      this.copy(this.value);
      return this.array;
    } else if (this.value instanceof Array) {
      for (let i = 0; i < this.value.length; i++) {
        this.array[i] = this.value[i];
      }
      return this.array;
    } else if (
      this.value instanceof Vector2 ||
      this.value instanceof Vector3 ||
      this.value instanceof Vector4 ||
      this.value instanceof Quaternion
    ) {
      this.value.toArray(this.array as number[]);
      return this.array;
    } else if (this.value instanceof Object) {
      // nothing, because the object is flattened
      // and the references to the uniforms have changed
      // so the update happens at the individual uniforms
      return this.array;
    } else {
      this.array[0] = this.value;
      return this.array;
    }
  }
}

export class Renderer {
  canvasContext: GPUCanvasContext;
  device: GPUDevice;
  presentationFormat: GPUTextureFormat;
  width: number;
  height: number;

  constructor(
    context: GPUCanvasContext,
    device: GPUDevice,
    width: number,
    height: number,
    presentationFormat: GPUTextureFormat
  ) {
    this.canvasContext = context;
    this.presentationFormat = presentationFormat;
    this.device = device;
    this.width = width;
    this.height = height;
  }
}

type UniformSize = { number: number };
const calculateUniformSizeRecursive = (
  uniform: Uniform<any>,
  size: UniformSize
) => {
  const elements = Object.values(uniform.value);
  if (elements[0] instanceof Uniform) {
    const values = Object.values(uniform.value);
    for (let i = 0; i < values.length; i++) {
      const val = values[i] as Uniform<any>;
      calculateUniformSizeRecursive(val, size);
    }
  } else {
    size.number += uniform.array.length;
  }

  return size.number;
};

const flattenUniforms = (
  uniforms: UniformList<any>,
  list: UniformList<any> = {},
  keyword?: string
) => {
  const values = Object.values(uniforms);
  const keys = Object.keys(uniforms);

  for (let i = 0; i < values.length; i++) {
    const u = values[i];
    const uniforms = Object.values(u.value) as Uniform<any>[];
    if (uniforms[0] instanceof Uniform) {
      flattenUniforms(u.value, list, keys[i] + '.');
      const size = calculateUniformSizeRecursive(u, { number: 0 });
      uniforms[uniforms.length - 1].extraPadding = pad4(size) - size;
    } else {
      let name = keys[i];
      if (keyword) {
        name = keyword + name;
      }
      list[name] = u;
    }
  }

  return list;
};

// * This class is inspired by: https://github.com/CodyJasonBennett/four
export class UniformBuffer {
  renderer: Renderer;
  uniformsArray: Float32Array;
  buffer: GPUBuffer;
  uniforms: UniformList<any>;
  offsets: Float32Array;
  count: number;

  constructor(renderer: Renderer, uniforms: UniformList<any>) {
    this.renderer = renderer;
    this.uniforms = flattenUniforms(uniforms);
    this.count = this.getUniformBufferElementsCount();
    this.uniformsArray = new Float32Array(this.count);
    this.offsets = this.initOffsets();
    this.buffer = this.initUniformBuffer();
  }

  initUniformBuffer() {
    const device = this.renderer.device;

    const uniformBufferSize = this.getUniformBufferSize();

    const uniformBuffer = device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    return uniformBuffer;
  }

  getUniformBufferSize = () => {
    return this.count * Float32Array.BYTES_PER_ELEMENT;
  };

  getUniformBufferElementsCount = () => {
    const uniforms = Object.values(this.uniforms);

    let size = 0;
    for (let i = 0; i < uniforms.length; i++) {
      const u = uniforms[i];
      const value = u.array;
      if (value.length == 1) {
        size += 1;
      } else {
        const pad = value.length == 2 ? pad2 : pad4;
        size = pad(size) + pad(value.length);
      }

      size += u.extraPadding;
    }

    return pad4(size);
  };

  initOffsets = () => {
    const offsets = new Float32Array(Object.keys(this.uniforms).length);
    const values = Object.values(this.uniforms);

    let offset = 0;
    for (let i = 0; i < values.length; i++) {
      const u = values[i];
      const value = u.array;

      offsets[i] = offset;

      if (value.length == 1) {
        offset++;
      } else {
        const pad = value.length <= 2 ? pad2 : pad4;
        offsets[i] = pad(offset);
        offset = pad(offset) + pad(value.length);
      }

      offset += u.extraPadding;
    }

    return offsets;
  };

  updateUniformBuffer = () => {
    const uniforms = Object.values(this.uniforms);

    // Pack buffer
    for (let i = 0; i < uniforms.length; i++) {
      const u = uniforms[i];
      const offset = this.offsets[i];

      u.update();

      const value = u.array;

      if (value.length == 1) {
        this.uniformsArray[offset] = value[0];
      } else {
        this.uniformsArray.set(value, offset);
      }
    }

    const device = this.renderer.device;
    device.queue.writeBuffer(this.buffer, 0, this.uniformsArray.buffer);
  };
}

export class Pass {
  renderer: Renderer; // this holds some useful information

  shader: string; // shader code
  uniforms: UniformList<any>; // uniforms list
  uniformBuffer: UniformBuffer; // uniform buffer (GPU)

  constructor(renderer: Renderer, shader: string, uniforms: UniformList<any>) {
    this.renderer = renderer;
    this.shader = shader;
    this.uniforms = uniforms;
    this.uniformBuffer = new UniformBuffer(renderer, uniforms);
  }

  update() {
    this.uniformBuffer.updateUniformBuffer();
  }
}

export const initEngine = async () => {
  stats = new Stats();
  document.body.appendChild(stats.dom);

  navigator = window.navigator as any;
  if (!navigator.gpu)
    throw new Error('WebGPU not supported, falling back to WebGL');

  adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('No adapter found');

  device = (await adapter.requestDevice()) as GPUDevice;
  canvas = document.getElementById('canvas') as HTMLCanvasElement;

  if (!canvas) throw new Error('No canvas found');

  context = canvas.getContext('webgpu');

  const setCanvasSize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width;
    canvas.height = height;

    renderer.width = width;
    renderer.height = height;

    for (const f of resizeFunctions) {
      f(width, height);
    }
  };

  const canvasWidth = canvas.clientWidth;
  const canvasHeight = canvas.clientHeight;

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  if (!context) throw new Error('No context found');

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'opaque',
  });

  renderer = new Renderer(
    context,
    device,
    canvasWidth,
    canvasHeight,
    presentationFormat
  );

  gui = new GUI();

  window.addEventListener('resize', () => {
    setCanvasSize();
  });

  setCanvasSize();

  camera = new PerspectiveCamera(
    50,
    renderer.width / renderer.height,
    0.1,
    1000
  );

  // camera.position.x = 1;
  // camera.position.y = 3;
  camera.position.z = 30;

  camera.lookAt(new Vector3(0, 0, 0));

  renderTickManager = new TickManager();
  renderTickManager.startLoop();
};

export const useRenderer = () => renderer;
export const useCamera = () => camera;
export const useCanvas = () => canvas;
export const useGpuDevice = () => device;
export const useGpuAdapter = () => adapter;
export const useCanvasContext = () => context;
export const useStats = () => stats;
export const useResize = (f: WindowResizeFunction) => resizeFunctions.push(f);
export const useGui = () => gui;
export const useTick = (fn: Function) => {
  if (renderTickManager) {
    const _tick = (e: any) => {
      fn(e.data);
    };
    renderTickManager.addEventListener('tick', _tick);
  } else {
    throw new Error('useTick function call failed. No tick manager found.');
  }
};
export const useRendererSize = () => {
  windowSize.width = renderer.width;
  windowSize.height = renderer.height;
  return windowSize;
};
