/* Interaction harness: boots the app in jsdom, then exercises UI controls and
   pointer input while running frames, reporting any runtime exception. */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: false, virtualConsole: vc });
const { window } = dom;

const gradient = () => ({ addColorStop() {} });
function make2D() {
  const ctx = {
    globalAlpha: 1, globalCompositeOperation: 'source-over', fillStyle: '', strokeStyle: '',
    lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', font: '',
    save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
    quadraticCurveTo() {}, bezierCurveTo() {}, arc() {}, ellipse() {}, rect() {},
    fill() {}, stroke() {}, clip() {}, translate() {}, rotate() {}, scale() {},
    setTransform() {}, setLineDash() {}, drawImage() {}, fillRect() {}, clearRect() {},
    strokeRect() {}, fillText() {}, strokeText() {}, measureText: () => ({ width: 10 }),
    createLinearGradient: gradient, createRadialGradient: gradient,
    createPattern: () => null, getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData() {}, toDataURL: () => 'data:image/png;base64,',
  };
  return ctx;
}
function makeGL(mode) {
  if (mode === 'none') return null;
  const gl = {};
  let n = 0x1000;
  for (const c of ['TEXTURE_2D', 'RGB', 'RGBA', 'UNSIGNED_BYTE', 'TEXTURE0', 'TEXTURE1', 'TEXTURE2',
    'TEXTURE3', 'TEXTURE_WRAP_S', 'TEXTURE_WRAP_T', 'TEXTURE_MIN_FILTER', 'TEXTURE_MAG_FILTER',
    'REPEAT', 'CLAMP_TO_EDGE', 'LINEAR', 'LINEAR_MIPMAP_LINEAR', 'VERTEX_SHADER', 'FRAGMENT_SHADER',
    'COMPILE_STATUS', 'LINK_STATUS', 'ARRAY_BUFFER', 'STATIC_DRAW', 'FLOAT', 'TRIANGLES'])
    gl[c] = n++;
  gl.drawingBufferWidth = 1200; gl.drawingBufferHeight = 800;
  for (const m of ['useProgram', 'attachShader', 'bindBuffer', 'bufferData', 'enableVertexAttribArray',
    'vertexAttribPointer', 'activeTexture', 'bindTexture', 'texImage2D', 'texSubImage2D',
    'texParameteri', 'generateMipmap', 'uniform1i', 'uniform1f', 'uniform2f', 'uniform3f',
    'uniform4fv', 'viewport', 'drawArrays', 'linkProgram', 'pixelStorei', 'getExtension',
    'clearColor', 'clear', 'deleteProgram', 'deleteTexture', 'isContextLost']) gl[m] = () => {};
  gl.getParameter = p => (p === 0x1B01 ? 224 : 224);
  gl.createShader = () => ({}); gl.createProgram = () => ({});
  gl.createBuffer = () => ({}); gl.createTexture = () => ({});
  gl.shaderSource = () => {}; gl.compileShader = () => {};
  gl.getShaderParameter = () => true; gl.getShaderInfoLog = () => '';
  gl.getProgramParameter = () => true; gl.getProgramInfoLog = () => '';
  gl.getAttribLocation = () => 0; gl.getUniformLocation = (p, name) => ({ name });
  gl.getError = () => 0;
  return gl;
}
const GL_MODE = process.env.GL_MODE || 'ok';
// expose the fake GL only for a webgl2 request so the app's fallback ordering is exercised
window.HTMLCanvasElement.prototype.getContext = function (type) {
  if (type === '2d') return make2D();
  if (/webgl2/.test(type)) return makeGL(GL_MODE);
  if (/webgl/.test(type)) return makeGL(GL_MODE === 'none' ? 'none' : 'ok');
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
    connect() {}, gain: { value: 0, setTargetAtTime() {}, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
    frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
    type: '', Q: { value: 0 }, buffer: null, loop: false, start() {}, stop() {},
  });
  return {
    currentTime: 0, sampleRate: 44100, state: 'running', resume() {},
    createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
    createBufferSource: node, createBiquadFilter: node, createGain: node, createOscillator: node,
    destination: {},
  };
};
window.matchMedia = window.matchMedia || (() => ({ matches: false }));
window.devicePixelRatio = 2;
Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
window.requestAnimationFrame = cb => { window.__raf = cb; return 1; };

const log = [];
function frames(n, t0 = 0) {
  for (let i = 0; i < n; i++) {
    const cb = window.__raf;
    if (!cb) { log.push('rAF chain stopped at frame ' + i); return false; }
    window.__raf = null;
    try { cb(t0 + i * 16.7); } catch (e) { errors.push('frame: ' + (e.stack || e)); return false; }
  }
  return true;
}
function ptr(type, x, y) {
  const ev = new window.Event(type, { bubbles: true, cancelable: true });
  ev.clientX = x; ev.clientY = y; ev.pointerId = 1; ev.pointerType = 'mouse';
  try { document.body.dispatchEvent(ev); } catch (e) { errors.push(type + ': ' + e.message); }
}
const fire = (el, type, init = {}) => {
  try {
    const ev = new window.MouseEvent(type, { bubbles: true, cancelable: true, ...init });
    el.dispatchEvent(ev);
  } catch (e) { errors.push(`${type} on ${el.tagName}: ${e.message}`); }
};
const clickAll = sel => {
  document.querySelectorAll(sel).forEach(el => fire(el, 'click'));
};

const document = window.document;
process.on('unhandledRejection', r => errors.push('unhandledRejection: ' + (r && r.stack || r)));

(async () => {
 try {
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  try {
    await window.eval(script + '\nwindow.__dbg=()=>({hasGL,GL_VER,GL_ERR,fpsE,BALLLIST,PT,ISL,V,tier,P,T});');
  } catch (e) { errors.push('boot: ' + (e.stack || e)); }
  await new Promise(r => setTimeout(r, 150));
  log.push('after boot, rAF pending: ' + !!window.__raf);
  frames(90);

  // UI: every tool, ball, tab, preset, toggle, action, stepper, slider
  clickAll('#dock .tool'); clickAll('#dock .bbtn'); clickAll('#tabs button');
  clickAll('#presets .chip'); clickAll('.tgl'); clickAll('.stepper button'); clickAll('.abtn');
  document.querySelectorAll('input[type=range]').forEach(inp => {
    inp.value = inp.max; inp.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  frames(120);

  // panel toggle + snapshot + help
  fire(document.getElementById('panelToggle'), 'click');
  fire(document.getElementById('helpClose'), 'click');
  frames(30);

  // pointer: throw, ripple, move, magnet at various spots
  const pts = [[300, 200], [600, 700], [900, 420], [100, 90], [1190, 790]];
  for (const mode of ['throw', 'ripple', 'move', 'magnet']) {
    window.eval(`TOOL=${JSON.stringify(mode)}`);
    for (const [x, y] of pts) {
      ptr('pointerdown', x, y);
      ptr('pointermove', x + 40, y + 20);
      ptr('pointerup', x + 80, y + 40);
      frames(10);
    }
  }
  // keyboard
  for (const key of ['1', '2', '3', '4', '5', '6', ' ']) {
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key, code: key === ' ' ? 'Space' : undefined, bubbles: true }));
  }
  // resize + quality cycling
  window.innerWidth = 820; window.innerHeight = 1180;
  window.dispatchEvent(new window.Event('resize'));
  frames(30);
  const qbtn = document.getElementById('qBtn');
  if (qbtn) for (let i = 0; i < 5; i++) fire(qbtn, 'click');
  frames(60);

  const d = window.__dbg();
  const state = { hasGL: d.hasGL, glVer: d.GL_VER, glErr: d.GL_ERR, fps: Math.round(d.fpsE),
    balls: d.BALLLIST.length, parts: d.PT.length, isl: d.ISL.filter(s => s && s.on).length,
    w: d.V.w, h: d.V.h, scale: d.V.scale, tier: d.tier, vtime: d.V.t.toFixed(2),
    badge: document.getElementById('glBadge').textContent };

  console.log('GL_MODE:', GL_MODE);
  console.log('state:', JSON.stringify(state));
  console.log(log.join('\n'));
  console.log('errors:', errors.length);
  errors.slice(0, 15).forEach(e => console.log('---\n' + e));
 } catch (e) { errors.push('harness: ' + (e.stack || e)); }
  console.log('errors:', errors.length);
  errors.slice(0, 15).forEach(e => console.log('---\n' + e));
  process.exit(errors.length ? 1 : 0);
})();
