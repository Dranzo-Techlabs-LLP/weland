"use client";

// Draws the volumetric fog (cloudShader.ts) with plain WebGL2: one
// full-screen triangle and one 3D noise texture, no 3D library needed.
// Drawn at a fraction of the screen's resolution (clouds are soft; the photo
// underneath stays sharp), and lighter still if the device can't keep up.
import { useEffect, useRef } from "react";
import { buildCloudNoise, NOISE_SIZE } from "./cloudNoise";
import { cloudFragment, cloudVertex } from "./cloudShader";

type Ref<T> = { current: T };

/** Where things are on the stage, in CSS pixels (MistSection measures them). */
export type MistView = {
  /** the resort */
  focus: { x: number; y: number };
  /** the photo's box before any zoom */
  photo: { x: number; y: number; w: number; h: number };
};

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "Shader did not compile");
  }
  return shader;
}

export default function CloudCanvas({
  progress,
  view,
  zoom,
  active,
  onReady,
  onFail,
}: {
  /** 0 inside the cloud .. 1 fog down in the valley (the scroll timeline's progress) */
  progress: Ref<number>;
  view: Ref<MistView>;
  /** How much the photo is scaled up by the end (0.14 = 14%); the camera matches it */
  zoom: number;
  /** Draw only while the section is on screen */
  active: boolean;
  onReady: () => void;
  onFail: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  const wake = useRef<() => void>(() => {});

  useEffect(() => {
    activeRef.current = active;
    if (active) wake.current();
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    if (!canvas || !gl) {
      onFail();
      return;
    }

    const small = window.matchMedia("(max-width: 899px)").matches;
    let scale = small ? 0.6 : 0.55;
    let program: WebGLProgram;
    try {
      const defines = `#define STEPS ${small ? 26 : 44}\n#define LIGHT_STEPS ${small ? 1 : 2}\n`;
      program = gl.createProgram() as WebGLProgram;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, cloudVertex));
      gl.attachShader(
        program,
        compile(gl, gl.FRAGMENT_SHADER, cloudFragment.replace("precision highp float;", `precision highp float;\n${defines}`)),
      );
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "Link failed");
    } catch (error) {
      console.warn("Clouds unavailable, using the simple mist instead:", error);
      onFail();
      return;
    }

    gl.useProgram(program);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    let texture: WebGLTexture | null = null;
    const u = {
      res: gl.getUniformLocation(program, "uRes"),
      time: gl.getUniformLocation(program, "uTime"),
      progress: gl.getUniformLocation(program, "uProgress"),
      focus: gl.getUniformLocation(program, "uFocus"),
      photo: gl.getUniformLocation(program, "uPhoto"),
      zoom: gl.getUniformLocation(program, "uZoom"),
    };
    gl.uniform1i(gl.getUniformLocation(program, "uNoise"), 0);

    let raf = 0;
    let running = false;
    let textured = false;
    let announced = false;
    let last = 0;
    let time = 0;
    let frames = 0;
    let slow = 0;
    let disposed = false;

    const draw = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      // stage pixels to 0..1 across the canvas, y up (the canvas overhangs the stage a little)
      const cw = Math.max(1, canvas.clientWidth);
      const ch = Math.max(1, canvas.clientHeight);
      const { focus, photo } = view.current;
      gl.uniform2f(u.res, w, h);
      gl.uniform1f(u.time, time);
      gl.uniform1f(u.progress, progress.current);
      gl.uniform1f(u.zoom, 1 + zoom * progress.current);
      gl.uniform2f(u.focus, (focus.x - canvas.offsetLeft) / cw, 1 - (focus.y - canvas.offsetTop) / ch);
      gl.uniform4f(
        u.photo,
        (photo.x - canvas.offsetLeft) / cw,
        1 - (photo.y + photo.h - canvas.offsetTop) / ch,
        photo.w / cw,
        photo.h / ch,
      );
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!announced) {
        announced = true;
        onReady();
      }
    };

    const frame = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
      last = now;
      time += dt;
      draw();
      // Too slow for this device? Draw fewer pixels.
      frames++;
      if (dt > 1 / 30) slow++;
      if (frames === 40) {
        if (slow > 16 && scale > 0.3) scale *= 0.8;
        frames = 0;
        slow = 0;
      }
      if (activeRef.current && !disposed) {
        raf = requestAnimationFrame(frame);
      } else {
        running = false;
        last = 0;
      }
    };

    wake.current = () => {
      if (running || !textured || disposed) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };

    buildCloudNoise(
      (data) => {
        if (disposed) return;
        gl.activeTexture(gl.TEXTURE0);
        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_3D, texture);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        for (const axis of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) {
          gl.texParameteri(gl.TEXTURE_3D, axis, gl.REPEAT);
        }
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8, NOISE_SIZE, NOISE_SIZE, NOISE_SIZE, 0, gl.RED, gl.UNSIGNED_BYTE, data);
        textured = true;
        if (activeRef.current) wake.current();
      },
      () => disposed,
    );

    const lost = (e: Event) => {
      e.preventDefault();
      onFail();
    };
    canvas.addEventListener("webglcontextlost", lost);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("webglcontextlost", lost);
      // Free what we made, but leave the context itself alone: React may mount
      // this canvas again (it does, on purpose, in development), and a context
      // killed with loseContext() would come back dead.
      gl.deleteTexture(texture);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    };
    // Set up once; the latest values arrive through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="mist-clouds" aria-hidden="true" />;
}
