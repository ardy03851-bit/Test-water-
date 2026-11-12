/* Validate the app's WebGL shaders with Khronos glslang (WASM) for both WebGL 1 and 2. */
const fs = require('fs');
const path = require('path');
const { validate, formatDiagnostic, LIMITS } = require('@moreplease/glslang');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function grab(name) {
  const i = js.indexOf('const ' + name + '=`');
  if (i < 0) throw new Error('missing ' + name);
  const start = js.indexOf('`', i) + 1;
  const end = js.indexOf('`', start);
  return js.slice(start, end);
}

(async () => {
  const vs = grab('VSRC');
  const fsSrc = grab('FSRC');
  let bad = false;
  for (const target of ['webgl1', 'webgl2']) {
    const res = await validate(
      [
        { name: 'lagoon.vert', source: vs, stage: 'vertex' },
        { name: 'lagoon.frag', source: fsSrc, stage: 'fragment' },
      ],
      { target }
    );
    console.log(`[${target}] ok=${res.ok}`);
    for (const d of res.diagnostics) console.log('  ' + formatDiagnostic(d));
    if (!res.ok) bad = true;
    else if (res.program) {
      const u = res.program.uniforms || [];
      console.log('  uniforms used:', u.map(x => x.name + (x.arraySize ? `[${x.arraySize}]` : '')).join(', ') || '(none)');
      // cross-check with the JS uniform locations the app fetches
      const wanted = [...js.matchAll(/'u[A-Z]\w*'/g)].map(m => m[0].slice(1, -1));
      const used = new Set(u.map(x => x.name));
      const missing = [...new Set(wanted)].filter(n => !used.has(n));
      if (missing.length) console.log('  WARNING uniform locations requested but unused/dropped:', missing.join(', '));
    }
  }
  // WebGL1 only guarantees 16 fragment uniform vectors; real GPUs expose far more.
  // Check the shader against device-class limits (tablet/phone GPUs: 64-224).
  for (const vecs of [224, 64, 32]) {
    const r = await validate(
      [{ name: 'lagoon.vert', source: vs, stage: 'vertex' },
       { name: 'lagoon.frag', source: fsSrc, stage: 'fragment' }],
      { target: 'webgl1', limits: { ...LIMITS.webgl1, maxFragmentUniformVectors: vecs } }
    );
    console.log(`[webgl1 @ ${vecs} uniform vectors] ok=${r.ok}`);
    for (const d of r.diagnostics) console.log('  ' + formatDiagnostic(d));
  }
  process.exit(bad ? 1 : 0);
})();
