#!/usr/bin/env node
/* Build Lagoon Lab: concatenate the source parts and inject the AI textures.
 *
 *   node showcase_build/build.js            -> writes index.html + check.js
 *
 * Sources:  p1_head.html (markup + CSS + <script> opener), p2..p6 (the app),
 *           textures.json (base64 data URIs extracted from the generated page).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const root = path.join(dir, '..');
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');

const head = read('p1_head.html').replace(/\s*$/, '\n');
const parts = ['p2_core.js', 'p3_gl.js', 'p4_world.js', 'p5_render.js', 'p6_ui.js'].map(read);
const tex = JSON.parse(read('textures.json'));

let js = parts.join('\n');

// replace %%TOKEN%% placeholders with the embedded textures (split/join keeps `$` literal)
const tokens = {
  '%%SAND%%': 'sand',
  '%%GRASS%%': 'grass',
  '%%ROCK%%': 'rock',
  '%%PALM_TALL%%': 'palm_tall',
  '%%PALM_FAN%%': 'palm_fan',
};
for (const [token, key] of Object.entries(tokens)) {
  if (!tex[key]) throw new Error('textures.json is missing "' + key + '"');
  js = js.split(token).join(tex[key]);
}
const leftover = js.match(/%%[A-Z_]+%%/g);
if (leftover) throw new Error('unreplaced placeholders: ' + [...new Set(leftover)].join(', '));

const html = head + js + '\n</script>\n</body>\n</html>\n';
fs.writeFileSync(path.join(root, 'index.html'), html);

// check.js is the bare script, handy for syntax checks / diffing
fs.writeFileSync(path.join(dir, 'check.js'), '\n"use strict";\n' + js.replace(/^"use strict";\n/, ''));

const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log('index.html written:', kb(Buffer.byteLength(html)));
console.log('check.js   written:', kb(fs.statSync(path.join(dir, 'check.js')).size));
