/* Renders the 2D layer of the app for real (Skia canvas) so canvas-drawing
   errors surface and the composition can be eyeballed as a PNG. */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { createCanvas } = require('@napi-rs/canvas');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const errors = [];
const warns = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
vc.on('warn', (...a) => warns.push('console.warn: ' + a.join(' ')));

const dom = new JSDOM(html, { runScripts: 'outside-only', virtualConsole: vc });
const { window } = dom;
const document = window.document;
const GL_MODE = process.env.GL_MODE || 'none';

const bound = new WeakMap();
function ctxFor(el) {
  if (bound.has(el)) return bound.get(el).ctx;
  const cv = createCanvas(Math.max(1, el.width || 1200), Math.max(1, el.height || 800));
  const ctx = cv.getContext('2d');
  const rec = { cv, ctx };
  bound.set(el, rec);
  // drawImage: map jsdom canvases to their Skia twin, skip anything unmappable
  const di = ctx.drawImage.bind(ctx);
  ctx.drawImage = (src, ...rest) => {
    const twin = src && src.__skia;
    if (twin) return di(twin, ...rest);
    return undefined;
  };
  el.__skia = cv;
  // keep the Skia surface in sync when the app sizes its canvas
  for (const dim of ['width', 'height']) {
    Object.defineProperty(el, dim, {
      configurable: true,
      get: () => rec.cv[dim],
      set: v => { rec.cv[dim] = Math.max(1, Math.round(v)); },
    });
  }
  return ctx;
}

function makeGL(mode) {
  if (mode === 'none') return null;
  const gl = {};
  let n = 0x1000;
  for (const c of ['TEXTURE_2D', 'RGB', 'RGBA', 'UNSIGNED_BYTE', 'TEXTURE0', 'TEXTURE1', 'TEXTURE2',
    'TEXTURE3', 'TEXTURE_WRAP_S', 'TEXTURE_WRAP_T', 'TEXTURE_MIN_FILTER', 'TEXTURE_MAG_FILTER',
    'REPEAT', 'CLAMP_TO_EDGE', 'LINEAR', 'LINEAR_MIPMAP_LINEAR', 'VERTEX_SHADER', 'FRAGMENT_SHADER',
    'COMPILE_STATUS', 'LINK_STATUS', 'ARRAY_BUFFER', 'STATIC_DRAW', 'FLOAT', 'TRIANGLES',
    'COLOR_BUFFER_BIT', 'VERSION', 'MAX_FRAGMENT_UNIFORM_VECTORS']) gl[c] = n++;
  gl.drawingBufferWidth = 1200; gl.drawingBufferHeight = 800;
  for (const m of ['useProgram', 'attachShader', 'bindBuffer', 'bufferData', 'enableVertexAttribArray',
    'vertexAttribPointer', 'activeTexture', 'bindTexture', 'texImage2D', 'texSubImage2D',
    'texParameteri', 'generateMipmap', 'uniform1i', 'uniform1f', 'uniform2f', 'uniform3f',
    'uniform4fv', 'viewport', 'drawArrays', 'linkProgram', 'pixelStorei', 'getExtension',
    'clearColor', 'clear']) gl[m] = () => {};
  gl.createShader = () => ({}); gl.createProgram = () => ({});
  gl.createBuffer = () => ({}); gl.createTexture = () => ({});
  gl.shaderSource = () => {}; gl.compileShader = () => {};
  gl.getShaderParameter = () => true; gl.getShaderInfoLog = () => '';
  gl.getProgramParameter = () => true; gl.getProgramInfoLog = () => '';
  gl.getAttribLocation = () => 0; gl.getUniformLocation = (p, name) => ({ name });
  gl.getParameter = () => 224; gl.getError = () => 0;
  return gl;
}

window.HTMLCanvasElement.prototype.getContext = function (type) {
  if (type === '2d') return ctxFor(this);
  if (/webgl2/.test(type)) return makeGL(GL_MODE);
  if (/webgl/.test(type)) return makeGL(GL_MODE);
  return null;
};
window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';

class FakeImage {
  set src(v) { this._src = v; setTimeout(() => this.onload && this.onload(), 0); }
  get src() { return this._src; }
  getAttribute(k) { return k === 'src' ? this._src : null; }
  setAttribute() {} remove() {}
}
window.Image = FakeImage;
window.AudioContext = function () {
  const node = () => ({
    connect() {},
    gain: { value: 0, setTargetAtTime() {}, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
    frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
    type: '', Q: { value: 0 }, buffer: null, loop: false, start() {}, stop() {},
  });
  return { currentTime: 0, sampleRate: 44100, state: 'running', resume() {},
    createBuffer: (c, l) => ({ getChannelData: () => new Float32Array(l) }),
    createBufferSource: node, createBiquadFilter: node, createGain: node, createOscillator: node,
    destination: {} };
};
window.matchMedia = () => ({ matches: false });
window.devicePixelRatio = 2;
Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
window.requestAnimationFrame = cb => { window.__raf = cb; return 1; };
process.on('unhandledRejection', r => errors.push('unhandledRejection: ' + (r && r.stack || r)));

(async () => {
  try {
    await window.eval(html.match(/<script>([\s\S]*?)<\/script>/)[1] +
      '\nwindow.__dbg=()=>({hasGL,GL_VER,GL_ERR,BALLLIST,PT,ISL,skyAt,sunPos,moonPos});' +
      '\nwindow.__throw=()=>{for(let i=0;i<5;i++)spawnBall(i,V.w*(.2+i*.15),V.h*.25,rnd(-200,200),0);};' +
      '\nwindow.__pause=()=>{V.paused=true;};');
    await new Promise(r => setTimeout(r, 120));
    for (let i = 0; i < 240; i++) {
      const cb = window.__raf; if (!cb) break; window.__raf = null;
      try { cb(1000 + i * 16.7); } catch (e) { errors.push('frame ' + i + ': ' + (e.stack || e)); break; }
    }
    // throw a few balls so the overlay has content
    window.__throw();
    for (let i = 0; i < 60; i++) {
      const cb = window.__raf; if (!cb) break; window.__raf = null;
      try { cb(6000 + i * 16.7); } catch (e) { errors.push('frame: ' + (e.stack || e)); break; }
    }
    window.__pause();
    const d = window.__dbg();

    // composite: 2D backdrop (as the app draws it) + overlay canvas
    const fx = document.getElementById('fx');
    const out = createCanvas(fx.width, fx.height);
    const octx = out.getContext('2d');
    octx.drawImage(fx.__skia, 0, 0);
    fs.writeFileSync(path.join(__dirname, `preview-${GL_MODE}.png`), out.toBuffer('image/png'));
    console.log('saved preview-' + GL_MODE + '.png', out.width + 'x' + out.height);
    console.log('hasGL:', d.hasGL, 'balls:', d.BALLLIST.length, 'particles:', d.PT.length,
      'islands:', d.ISL.filter(s => s && s.on).length);
  } catch (e) { errors.push('harness: ' + (e.stack || e)); }
  console.log('errors:', errors.length);
  errors.slice(0, 8).forEach(e => console.log('---\n' + e));
  console.log('warnings:', warns.length);
  warns.slice(0, 8).forEach(w => console.log('  ' + w));
})();
