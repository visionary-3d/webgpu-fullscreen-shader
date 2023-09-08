# WebGpu Quad 

This is some simple code for setting up uniforms and a fullscreen quad shader in webgpu. (check warnings down below before using this)

## https://youtu.be/YinfynTz77s
[![WebGPU Introduction](https://user-images.githubusercontent.com/64514807/235347853-9411d7d7-1508-42a7-82aa-232650b13ee7.png)](https://youtu.be/YinfynTz77s)


## WARNING:
**don't use vec3 variables in the uniforms. it currently has some bugs. use a vec4 instead.**

## Installation

Clone this repo and npm install.

```bash
npm i
```

## Usage

### Development server

```bash
npm run dev
```

### Production build

```bash
npm run build
```