# Lagoon Lab 🌊

A single-file, self-contained WebGL lagoon showcase (`index.html`): GPU water,
shore foam, day/night sky, islands, palms, crabs, a campfire, synthesized audio
and ~25 live controls. No network requests, no dependencies — open the file and
it runs.

## Why the scene wasn't loading

`buildUI()` crashed on startup:

```js
const q = action(pg.FX, 'Quality: AUTO', () => {});  // action() returned undefined
q.id = 'qBtn';                                       // TypeError
```

`action()` created a button but never returned it, so `buildUI()` threw a
`TypeError: Cannot set properties of undefined (setting 'id')`. `boot()` is
`async` and nothing caught the rejection, so execution never reached
`requestAnimationFrame(loop)` — the UI was half-built and both canvases stayed
black. `action()` now returns the button it creates.

## Other things fixed along the way

| Area | Problem | Fix |
| --- | --- | --- |
| Boot | The whole scene waited on `await`ing five base64 textures; any slow/failed decode meant a permanently black page | The animation loop starts immediately and the 2D backdrop paints while textures decode; textures load in the background with a 12 s timeout |
| Boot | One exception in `buildUI()`/`bindInput()` could kill the renderer | UI and input setup are individually guarded; a UI fault can no longer stop the scene |
| Renderer status | Failures were swallowed (`catch(err){hasGL=false}`) with a flat fallback and no explanation | A live badge in the header shows `LOADING…` → `WEBGL 2`/`WEBGL 1` or `2D FALLBACK` (hover for the reason); the real reason is logged once to the console |
| WebGL 1 | Sand/grass/rock textures are 1254×1254 (non-power-of-two) but uploaded with mipmaps + `REPEAT`, which is invalid on WebGL 1 and samples as black terrain | Textures are redrawn into ≤1024 power-of-two canvases before upload |
| Context loss | iPad Safari drops WebGL contexts when backgrounded; the scene never came back | `webglcontextlost` / `webglcontextrestored` are handled and the renderer is rebuilt |
| Frame loop | A renderer exception repeated every frame | The GL frame is guarded; after repeated failures it degrades to the 2D layer with a toast |
| Frame loop | First frame could compute a negative `dt` (rAF timestamp older than `performance.now()` at boot) | `dt` clamped to `[0, 0.05]` |
| Snapshot | 📷 produced an empty PNG: the WebGL drawing buffer is cleared after compositing | A fresh GPU frame is rendered synchronously right before the capture |
| Diagnostics | Nothing verified the GPU output | After the first frame the pixels are sampled once; a blank/black result is reported in the console |

The shaders themselves were fine: they validate with Khronos `glslang` for
WebGL 2 and for WebGL 1 (50 fragment uniform vectors — fine on any real GPU,
which exposes 64–224+).

## Layout

```
index.html                 generated, self-contained app (open this)
showcase_build/
  build.js                 concatenates the parts + injects textures.json -> index.html
  p1_head.html             markup, CSS, <script> opener
  p2_core.js               utils, state, presets, sky, audio
  p3_gl.js                 GLSL water renderer + ripple field + fallbacks
  p4_world.js              islands, terrain, palms, balls, particles, critters
  p5_render.js             Canvas2D overlay (balls, spray, fire, lightning…)
  p6_ui.js                 panels, input, main loop, boot
  check.js                 generated: the bare script (for syntax checks / diffs)
  textures.json            base64 scene textures embedded at build time
showcase_assets/           original AI textures
tools/                     headless test tooling (not shipped)
```

## Working on it

```bash
npm install
npm run build          # regenerate index.html after editing showcase_build/*.js
npm test               # boot + 300 frames + full UI/pointer sweep, with and without WebGL
npm run test:shaders   # validate the GLSL with Khronos glslang (WebGL 1 + 2)
npm run preview:2d     # render the Canvas2D layer to tools/preview-*.png
```

`npm test` runs the real app in jsdom against stub canvas/WebGL contexts and
fails on any exception in boot, the frame loop, or the interaction sweep. It is
what catches the class of bug that broke this app: a startup exception that
never lets `requestAnimationFrame` start.

Serve the folder (or just open `index.html`) to use it:

```bash
python3 -m http.server 8000
```

## Controls

- **Throw** – drag and release to hurl balls at the lagoon
- **Ripple** – poke/stir the water, sculpt propagating waves
- **Move** – drag islands around
- **Magnet** – hold to bend gravity
- **Presets** – 🏝️ ☀️ 🌅 ⛈️ 🌙 🌈 at the bottom, ⚙️ for 25+ live sliders
- `Space` to pause, `1`–`6` to pick a ball
