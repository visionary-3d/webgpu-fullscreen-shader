struct Uniforms {
  resolution: vec2<f32>,
  aspect: f32,
  time: f32,
  color: vec4<f32>,
};

// stuff we send to shader land
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  // A built-in output value is used by the shader to convey control information to later processing steps in the pipeline.
  @builtin(position) position: vec4<f32>,
};

@vertex
// A built-in input value provides access to system-generated control information.
fn vert_main(@builtin(vertex_index) index: u32) -> VertexOutput {

  let pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(1.0, -1.0),
    vec2<f32>(1.0, 1.0),

    vec2<f32>(-1.0, -1.0),
    vec2<f32>(-1.0, 1.0),
    vec2<f32>(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4<f32> (pos[index], 0.0, 1.0);
  return output;

}

fn get_uvs(coord: vec2<f32>) -> vec2<f32> {
    var uv = coord / uniforms.resolution;

    uv.y = 1.0 - uv.y;

    return uv;
}

@fragment
fn frag_main(@builtin(position) coord: vec4<f32>) -> @location(0) vec4<f32> {

  let uv = get_uvs(coord.xy);
  return uniforms.color * abs(sin(uniforms.time));

}