import { TickData } from './render/controllers/tick-manager';
import {
  Pass,
  Renderer,
  Uniform,
  UniformList,
  useGpuDevice,
  useRenderer,
  useResize,
  useTick,
} from './render/init';
import { Vector2 } from './render/math/Vector2';
import { Vector3 } from './render/math/Vector3';
import { Vector4 } from './render/math/Vector4';
import quadShader from './shaders/quad.wgsl?raw';

const commandBufferArray = new Array<GPUCommandBuffer>(1);
const submitCommandBuffer = (
  device: GPUDevice,
  commandEncoder: GPUCommandEncoder
) => {
  commandBufferArray[0] = commandEncoder.finish();
  device.queue.submit(commandBufferArray);
};

class FullscreenPass extends Pass {
  bindGroupLayout: GPUBindGroupLayout;
  bindGroup: GPUBindGroup;
  renderPipeline: GPURenderPipeline;
  renderPassDescriptor: any;

  constructor(renderer: Renderer, shader: string, uniforms: UniformList<any>) {
    super(renderer, shader, uniforms);

    // The data that we're going to send to the shader
    this.bindGroupLayout = this.createBindGroupLayout();
    this.bindGroup = this.createBindGroup();

    this.renderPipeline = this.createRenderPipeline();

    this.renderPassDescriptor = {
      colorAttachments: [
        {
          view: this.renderer.canvasContext.getCurrentTexture().createView(), // Assigned later

          clearValue: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };
  }

  createBindGroupLayout = () => {
    const device = this.renderer.device;
    return device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {
            type: 'uniform',
          },
        },
      ],
    });
  };

  createBindGroup = () => {
    const device = this.renderer.device;

    const bindGroupDescriptor = {
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.uniformBuffer.buffer,
          },
        },
      ],
    };
    return device.createBindGroup(bindGroupDescriptor);
  };

  createRenderPipeline = () => {
    const device = this.renderer.device;

    return device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [this.bindGroupLayout],
      }),

      vertex: {
        module: device.createShaderModule({
          code: this.shader,
        }),
        entryPoint: 'vert_main',
      },

      fragment: {
        module: device.createShaderModule({
          code: this.shader,
        }),
        entryPoint: 'frag_main',
        targets: [
          {
            format: this.renderer.presentationFormat as GPUTextureFormat,
          },
        ],
      },

      primitive: {
        topology: 'triangle-list',
      },
    });
  };

  draw(commandEncoder: GPUCommandEncoder) {
    this.renderPassDescriptor.colorAttachments[0].view =
      this.renderer.canvasContext.getCurrentTexture().createView();

    const passEncoder = commandEncoder.beginRenderPass(
      this.renderPassDescriptor
    );

    passEncoder.setPipeline(this.renderPipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.draw(6, 1, 0, 0);

    passEncoder.end();
  }

  render(commandEncoder: GPUCommandEncoder, timestamp: number) {
    super.update();
    this.draw(commandEncoder);
    submitCommandBuffer(this.renderer.device, commandEncoder);
  }
}

const resolutionVec2 = new Vector2();
const uResolution = new Uniform(resolutionVec2);
const uAspect = new Uniform(0);

const updateUniforms = (width: number, height: number) => {
  uResolution.set(resolutionVec2.set(width, height));
  uAspect.set(width / height);
};

export const startApp = async () => {
  const renderer = useRenderer();
  const device = useGpuDevice();

  useResize((width: number, height: number) => {
    updateUniforms(width, height);
  });

  updateUniforms(renderer.width, renderer.height);

  const uTime = new Uniform(0);

  // ! WARNING: Use Vector4 instead of Vector3
  const uColor = new Uniform(new Vector4(1, 0, 0, 1));

  const fullscreenPass = new FullscreenPass(renderer, quadShader, {
    uResolution,
    uAspect,
    uTime,
    uColor,
  });

  useTick(({ timestamp }: TickData) => {
    const commandEncoder = device.createCommandEncoder();
    fullscreenPass.render(commandEncoder, timestamp);

    uTime.set(timestamp / 1000);
  });
};
