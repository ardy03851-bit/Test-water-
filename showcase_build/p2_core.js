/* ============ LAGOON LAB core: utils, state, presets, audio ============ */
const TAU = Math.PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const rnd=(a=1,b)=>b===undefined?Math.random()*a:a+Math.random()*(b-a);
const pick=a=>a[(Math.random()*a.length)|0];
function hex(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255];}
function mix3(a,b,t){return [lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];}
function css(c,a=1){return `rgba(${(c[0]*255)|0},${(c[1]*255)|0},${(c[2]*255)|0},${a})`;}

/* AI-generated textures (injected as data URIs at build time) */
const TEX_SAND="%%SAND%%", TEX_GRASS="%%GRASS%%", TEX_ROCK="%%ROCK%%",
      TEX_PALM_T="%%PALM_TALL%%", TEX_PALM_F="%%PALM_FAN%%";

/* Viewport / world (world units = CSS px, y down) */
const V={w:0,h:0,scale:1,dpr:1,wl:0,bed:0,t:0,slowmo:false,paused:false,shake:0,flash:0,quality:0,qMode:'auto'};
function waterLevel(){return V.h*0.60+P.tide;}
function bedBase(){return V.h*0.97;}

/* Live params (P) ease toward targets (T) every frame => buttery preset morphs */
const P={time:10.5,cycle:false,cloud:.35,fog:.15,
  wind:12,gust:.5,rain:0,storm:0,temp:.7,
  tide:0,wave:9,chop:.45,clarity:.7,foam:.8,glitter:.9,bio:.6,warmth:.65,
  islN:3,islSize:1,trees:3,fire:true,hut:true,crabs:true,
  grav:1600,ballR:26,bounce:1,slowmo:false,grain:true};
const T=JSON.parse(JSON.stringify(P));

/* Ball catalogue: density 1 = neutrally buoyant, rest = bounciness */
const BALLS=[
 {id:'beach', e:'🏖️', name:'Beach ball', d:.28, rest:.78, bg:'linear-gradient(135deg,#ff5a5a,#ff9a3d 40%,#3fa9ff)'},
 {id:'tennis',e:'🎾', name:'Tennis',     d:.55, rest:.82, bg:'linear-gradient(135deg,#b8d61a,#7ba300)'},
 {id:'coco',  e:'🥥', name:'Coconut',    d:.72, rest:.42, bg:'linear-gradient(135deg,#7a5230,#3d2612)'},
 {id:'bowl',  e:'🎳', name:'Bowling',    d:1.9, rest:.30, bg:'linear-gradient(135deg,#5b2a4a,#1d0f22)'},
 {id:'metal', e:'🔩', name:'Steel',      d:2.6, rest:.38, bg:'linear-gradient(135deg,#e8eef5,#7b8ca3 55%,#39465a)'},
 {id:'bubble',e:'🫧', name:'Bubble',     d:.05, rest:.92, bg:'linear-gradient(135deg,rgba(190,230,255,.35),rgba(150,190,255,.15))'},
];
let ballType=0;

/* Sky keyframes over 24h: [hour, top, mid, horizon, sunCol, sunI, night] */
const SKY=[
 [0,  '#020409','#060a18','#0d1626', '#9db8ff', .00, 1],
 [4.5,'#020409','#060a18','#0d1626', '#9db8ff', .00, 1],
 [5.5,'#1a2a55','#4a4a7a','#ff9a5a', '#ffb37a', .35, .25],
 [7,  '#2f7fd0','#8ec3ee','#ffe3b3', '#fff2cf', .95, 0],
 [12, '#1f6fd6','#6fbdf2','#cfeef7', '#ffffff', 1.15,0],
 [16.5,'#2a6fc4','#7fb8ec','#f6e2ac','#fff6da', 1.0, 0],
 [18, '#2c3a72','#c65f6e','#ffb054', '#ff9448', .55, .08],
 [19.2,'#141b45','#4a2f5e','#e0604f','#ff7a50', .18, .45],
 [20.5,'#020409','#0a1024','#182238', '#9db8ff', .02, .92],
 [24, '#020409','#060a18','#0d1626', '#9db8ff', .00, 1],
].map(k=>({h:k[0],top:hex(k[1]),mid:hex(k[2]),hor:hex(k[3]),sun:hex(k[4]),sunI:k[5],night:k[6]}));
function skyAt(t){
  let a=SKY[0],b=SKY[SKY.length-1];
  for(let i=0;i<SKY.length-1;i++) if(t>=SKY[i].h&&t<=SKY[i+1].h){a=SKY[i];b=SKY[i+1];break;}
  const f=(t-a.h)/Math.max(.001,b.h-a.h);
  return {top:mix3(a.top,b.top,f),mid:mix3(a.mid,b.mid,f),hor:mix3(a.hor,b.hor,f),
    sun:mix3(a.sun,b.sun,f),sunI:lerp(a.sunI,b.sunI,f),night:lerp(a.night,b.night,f)};
}
function sunPos(){
  const f=clamp((P.time-6)/12,0,1), el=Math.sin(f*Math.PI);
  return {x:V.w*(0.10+0.80*f), y:V.h*0.60-el*V.h*0.52, el};
}
function moonPos(){
  const mt=(P.time+12)%24, f=clamp((mt-6)/12,0,1), el=Math.sin(f*Math.PI);
  return {x:V.w*(0.12+0.76*f), y:V.h*0.58-el*V.h*0.5, el};
}

/* One-tap moods */
const PRESETS=[
 {n:'🏝️ Lagoon', p:{time:10.5,cloud:.3,fog:.12,wind:10,gust:.4,rain:0,storm:0,tide:6,wave:7,chop:.35,clarity:.85,foam:.85,glitter:1,bio:.5,warmth:.75}},
 {n:'☀️ Midday', p:{time:13,cloud:.12,fog:.05,wind:18,gust:.5,rain:0,storm:0,tide:0,wave:11,chop:.5,clarity:.7,foam:.7,glitter:1,bio:.3,warmth:.6}},
 {n:'🌅 Sunset', p:{time:18.1,cloud:.42,fog:.22,wind:8,gust:.35,rain:0,storm:0,tide:10,wave:8,chop:.4,clarity:.7,foam:.8,glitter:1,bio:.55,warmth:.9}},
 {n:'⛈️ Storm',  p:{time:16.5,cloud:.95,fog:.4,wind:-48,gust:1,rain:.85,storm:.9,tide:26,wave:26,chop:1,clarity:.35,foam:1,glitter:.2,bio:.4,warmth:.35}},
 {n:'🌙 Night',  p:{time:23.5,cloud:.25,fog:.18,wind:6,gust:.3,rain:0,storm:0,tide:-6,wave:6,chop:.3,clarity:.8,foam:.7,glitter:.6,bio:1,warmth:.5}},
 {n:'🌈 Clearing',p:{time:17.2,cloud:.5,fog:.15,wind:22,gust:.7,rain:.12,storm:.15,tide:4,wave:14,chop:.6,clarity:.75,foam:.9,glitter:1,bio:.5,warmth:.7}},
];
let presetOn=-1, wasRainy=false, rainbowT=0;

/* ============ Synthesized audio (zero assets, WebAudio) ============ */
const AU={ctx:null,on:true,windG:null,rainG:null,started:false};
function auInit(){
  if(AU.started) return; AU.started=true;
  try{ AU.ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; }
  const c=AU.ctx, len=c.sampleRate*2, buf=c.createBuffer(1,len,c.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
  const mk=(type,freq,q)=>{const s=c.createBufferSource();s.buffer=buf;s.loop=true;
    const f=c.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;
    const g=c.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(c.destination);s.start();return g;};
  AU.windG=mk('lowpass',420,.6); AU.rainG=mk('highpass',2800,.4);
}
function auUpdate(){
  if(!AU.ctx||!AU.on){ if(AU.ctx&&!AU.on){AU.windG.gain.value=0;AU.rainG.gain.value=0;} return; }
  const t=AU.ctx.currentTime;
  AU.windG.gain.setTargetAtTime(Math.min(.5,.04+Math.abs(P.wind)/160*(0.6+P.gust*.6)),t,.4);
  AU.rainG.gain.setTargetAtTime(P.rain*.30+P.storm*.12,t,.4);
}
let lastSplash=0;
function auSplash(power=1){
  if(!AU.ctx||!AU.on) return; const t=AU.ctx.currentTime; if(t-lastSplash<.07) return; lastSplash=t;
  const c=AU.ctx, len=c.sampleRate*.35, b=c.createBuffer(1,len,c.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.2);
  const s=c.createBufferSource();s.buffer=b;
  const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=700+Math.random()*900;f.Q.value=.8;
  const g=c.createGain();g.gain.value=Math.min(.6,.12+power*.3);
  s.connect(f);f.connect(g);g.connect(c.destination);s.start();
}
function auThunder(delay=0,power=1){
  if(!AU.ctx||!AU.on) return; const c=AU.ctx, t0=c.currentTime+delay;
  const len=c.sampleRate*2.2, b=c.createBuffer(1,len,c.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,1.4);
  const s=c.createBufferSource();s.buffer=b;
  const f=c.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(160,t0);
  f.frequency.exponentialRampToValueAtTime(45,t0+1.8);
  const g=c.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(.7*power,t0+.06);
  g.gain.exponentialRampToValueAtTime(.001,t0+2.1);
  s.connect(f);f.connect(g);g.connect(c.destination);s.start(t0);
}
function auPop(){
  if(!AU.ctx||!AU.on) return; const c=AU.ctx,t=c.currentTime;
  const o=c.createOscillator(),g=c.createGain();o.type='sine';
  o.frequency.setValueAtTime(420,t);o.frequency.exponentialRampToValueAtTime(140,t+.12);
  g.gain.setValueAtTime(.25,t);g.gain.exponentialRampToValueAtTime(.001,t+.14);
  o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.15);
}
