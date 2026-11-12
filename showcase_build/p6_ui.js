/* ============ UI, input, main loop, boot ============ */
let TOOL='throw';
const $=s=>document.querySelector(s);
function toast(msg,ms=2600){const t=$('#toast');t.textContent=msg;t.classList.add('show');
  clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),ms);}
function slider(page,label,min,max,step,get,set,fmt,hint){
  const d=document.createElement('div');d.className='ctl';
  d.innerHTML=`<div class="row"><label>${label}</label><output></output></div>${hint?`<div class="hint">${hint}</div>`:''}`;
  const inp=document.createElement('input');inp.type='range';inp.min=min;inp.max=max;inp.step=step;inp.value=get();
  const out=d.querySelector('output');
  const ref=()=>{out.textContent=fmt?fmt(+inp.value):(+inp.value).toFixed(2);
    inp.style.setProperty('--p',((inp.value-min)/(max-min)*100)+'%');};
  inp.addEventListener('input',()=>{set(+inp.value);presetOn=-1;markChips();ref();});ref();
  d.appendChild(inp);page.appendChild(d);return{ref,resync:v=>{inp.value=v;ref();}};
}
function toggle(page,label,get,set){
  const d=document.createElement('div');d.className='tgl';d.innerHTML=`<span>${label}</span>`;
  const sw=document.createElement('div');sw.className='sw'+(get()?' on':'');
  sw.addEventListener('click',()=>{set(!sw.classList.contains('on'));sw.classList.toggle('on');});
  d.appendChild(sw);page.appendChild(d);
}
function stepper(page,label,min,max,get,set){
  const d=document.createElement('div');d.className='stepper';
  d.innerHTML=`<span style="font-size:12.5px;font-weight:600">${label}</span>`;
  const b=document.createElement('b');const m=document.createElement('button');m.textContent='−';
  const p=document.createElement('button');p.textContent='+';
  const ref=()=>b.textContent=get();
  m.addEventListener('click',()=>{set(Math.max(min,get()-1));ref();});
  p.addEventListener('click',()=>{set(Math.min(max,get()+1));ref();});ref();
  d.append(m,b,p);page.appendChild(d);
}
function action(page,label,fn,hot){
  const b=document.createElement('button');b.className='abtn'+(hot?' hot':'');b.textContent=label;
  b.addEventListener('click',fn);page.appendChild(b);
}
let uiRefs={};
function buildUI(){
  /* dock */
  const dock=$('#dock');
  const tools=[['throw','🎯','Throw'],['ripple','💧','Ripple'],['move','🏝️','Move'],['magnet','🧲','Magnet']];
  const mkLbl=t=>{const s=document.createElement('div');s.className='lbl';s.textContent=t;dock.appendChild(s);};
  mkLbl('TOOLS');
  for(const [id,e,nm] of tools){const b=document.createElement('button');
    b.className='tool'+(TOOL===id?' on':'');b.innerHTML=`${e}<small>${nm}</small>`;b.title=nm;
    b.addEventListener('click',()=>{TOOL=id;document.querySelectorAll('.tool').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');toast({throw:'Drag & release to hurl balls — tap water for a plop',ripple:'Poke & stir the water — try two fingers',move:'Drag islands to reshape the lagoon',magnet:'Hold to bend gravity around your finger'}[id]);});
    dock.appendChild(b);}
  mkLbl('BALLS');
  BALLS.forEach((bd,i)=>{const b=document.createElement('button');
    b.className='bbtn'+(i===0?' on':'');b.style.background=bd.bg;b.textContent=bd.e;b.title=bd.name;
    b.addEventListener('click',()=>{ballType=i;document.querySelectorAll('.bbtn').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');auPop();toast(`${bd.e} ${bd.name} — density ${bd.d}`);});
    dock.appendChild(b);});
  mkLbl('CLEAR');
  const cb=document.createElement('button');cb.className='tool';cb.innerHTML='🧹<small>balls</small>';
  cb.addEventListener('click',()=>{BALLLIST.length=0;toast('Balls cleared');});dock.appendChild(cb);
  /* panel tabs */
  const tabs=$('#tabs'),pages=$('#pages');
  const defs=[['Ocean','🌊'],['Sky','☁️'],['Storm','⛈️'],['Isles','🏝️'],['FX','✨']];
  const pg={};
  defs.forEach(([nm,e],i)=>{const b=document.createElement('button');b.textContent=`${e} ${nm}`;
    const p=document.createElement('div');p.className='page';pages.appendChild(p);pg[nm]=p;
    b.addEventListener('click',()=>{document.querySelectorAll('#tabs button').forEach(x=>x.classList.remove('on'));
      document.querySelectorAll('.page').forEach(x=>x.classList.remove('on'));b.classList.add('on');p.classList.add('on');});
    if(i===0){b.classList.add('on');p.classList.add('on');}tabs.appendChild(b);});
  const F0=v=>v.toFixed(0),F1=v=>v.toFixed(1),F2=v=>v.toFixed(2);
  const H=Math.round;
  slider(pg.Ocean,'Tide level',-50,50,1,()=>T.tide,v=>T.tide=v,v=>v+' px','Raises the whole sea over beaches & reefs');
  slider(pg.Ocean,'Wave height',0,30,.5,()=>T.wave,v=>T.wave=v,v=>v+' px','Gerstner-style triple swell');
  slider(pg.Ocean,'Choppiness',0,1,.01,()=>T.chop,v=>T.chop=v,F2,'Whitecaps & glitter breakup');
  slider(pg.Ocean,'Water clarity',0,1,.01,()=>T.clarity,v=>T.clarity=v,F2,'Gin-clear lagoon ↔ murky storm sea');
  slider(pg.Ocean,'Foam amount',0,1,.01,()=>T.foam,v=>T.foam=v,F2,'Shoreline lace & crest foam');
  slider(pg.Ocean,'Sun glitter',0,1,.01,()=>T.glitter,v=>T.glitter=v,F2,'Sparkling sun path on waves');
  slider(pg.Ocean,'Bioluminescence',0,1,.01,()=>T.bio,v=>T.bio=v,F2,'Night plankton glow — best at 🌙');
  slider(pg.Ocean,'Water warmth',0,1,.01,()=>T.warmth,v=>T.warmth=v,F2,'Tropical turquoise ↔ cold ocean blue');
  slider(pg.Sky,'Time of day',0,24,.1,()=>T.time,v=>{T.time=v%24;},v=>{const h=Math.floor(v),m=Math.floor(v%1*60);return `${h}:${m<10?'0':''}${m}`;},'Sun, sunset & starfield follow');
  slider(pg.Sky,'Cloud cover',0,1,.01,()=>T.cloud,v=>T.cloud=v,F2);
  slider(pg.Sky,'Fog & haze',0,1,.01,()=>T.fog,v=>T.fog=v,F2);
  toggle(pg.Sky,'Auto day cycle',()=>P.cycle,v=>{P.cycle=v;T.cycle=v;});
  action(pg.Sky,'🌇 Jump to golden hour',()=>{T.time=18.05;presetOn=-1;markChips();});
  slider(pg.Storm,'Wind',-60,60,1,()=>T.wind,v=>T.wind=v,v=>(v>0?'+':'')+v+' kn','Drives waves, palms, spray & clouds');
  slider(pg.Storm,'Gustiness',0,1,.01,()=>T.gust,v=>T.gust=v,F2);
  slider(pg.Storm,'Rain',0,1,.01,()=>T.rain,v=>T.rain=v,F2,'Ripples, crowns & runoff rings');
  slider(pg.Storm,'Storm',0,1,.01,()=>T.storm,v=>T.storm=v,F2,'Lightning, black seas, flying coconuts 🥥');
  slider(pg.Storm,'Air warmth',0,1,.01,()=>T.temp,v=>T.temp=v,F2,'Warm rain steams off the lagoon');
  action(pg.Storm,'⚡ Strike lightning now',()=>strike(rnd(V.w*.15,V.w*.85)),true);
  stepper(pg.Isles,'Islands',1,4,()=>P.islN,v=>{P.islN=v;T.islN=v;layoutIslands();});
  slider(pg.Isles,'Island size',.6,1.5,.01,()=>T.islSize,v=>{T.islSize=v;P.islSize=v;layoutIslands();},F2);
  stepper(pg.Isles,'Palms / island',0,5,()=>P.trees,v=>{P.trees=v;T.trees=v;syncTrees();});
  toggle(pg.Isles,'Campfire 🔥',()=>P.fire,v=>P.fire=v);
  toggle(pg.Isles,'Fisherman hut',()=>P.hut,v=>P.hut=v);
  toggle(pg.Isles,'Crabs 🦀',()=>P.crabs,v=>P.crabs=v);
  action(pg.Isles,'🎲 Shuffle islands',()=>{for(const s of ISL)if(s)s.fx=rnd(.08,.92);layoutIslands();});
  slider(pg.FX,'Gravity',200,3000,10,()=>T.grav,v=>T.grav=v,v=>v+' px/s²','Moon float ↔ Jupiter slam');
  slider(pg.FX,'Ball size',12,60,1,()=>T.ballR,v=>{T.ballR=v;P.ballR=v;},v=>v+' px');
  slider(pg.FX,'Bounciness',.2,1.1,.01,()=>T.bounce,v=>T.bounce=v,F2);
  toggle(pg.FX,'Slow motion',()=>P.slowmo,v=>P.slowmo=v);
  toggle(pg.FX,'Film grain',()=>P.grain,v=>P.grain=v);
  toggle(pg.FX,'Sound 🔊',()=>AU.on,v=>{AU.on=v;auInit();});
  toggle(pg.FX,'Screen shake',()=>V.shakeOn!==false,v=>V.shakeOn=v);
  action(pg.FX,'📷 Save snapshot',snapshot);
  const q=action(pg.FX,'Quality: AUTO',()=>{});
  q.id='qBtn';q.addEventListener('click',()=>{
    V.qMode=V.qMode==='auto'?'high':V.qMode==='high'?'med':V.qMode==='med'?'low':'auto';
    q.textContent='Quality: '+V.qMode.toUpperCase();applyQMode();});
  $('#panelToggle').addEventListener('click',()=>$('#panel').classList.toggle('hide'));
  /* presets + systems */
  const pr=$('#presets');
  PRESETS.forEach((p,i)=>{const c=document.createElement('button');c.className='chip';c.textContent=p.n;
    c.addEventListener('click',()=>{Object.assign(T,p.p);presetOn=i;markChips();toast(p.n+' — morphing…');auPop();});
    pr.appendChild(c);});
  const dv=document.createElement('div');dv.className='vdiv';pr.appendChild(dv);
  const mkSys=(e,fn)=>{const b=document.createElement('button');b.className='sys';b.textContent=e;
    b.addEventListener('click',fn);pr.appendChild(b);return b;};
  const pb=mkSys('⏸️',()=>{V.paused=!V.paused;pb.textContent=V.paused?'▶️':'⏸️';});
  mkSys('🔊',e=>{AU.on=!AU.on;auInit();e.target.textContent=AU.on?'🔊':'🔇';});
  mkSys('📷',snapshot);
  mkSys('❓',()=>$('#help').classList.add('show'));
  $('#helpClose').addEventListener('click',()=>$('#help').classList.remove('show'));
}
function markChips(){document.querySelectorAll('#presets .chip').forEach((c,i)=>c.classList.toggle('on',i===presetOn));}
function snapshot(){
  const c=document.createElement('canvas');c.width=V.w;c.height=V.h;
  const x=c.getContext('2d');
  x.drawImage(document.getElementById('gl'),0,0,V.w,V.h);
  x.drawImage(fx,0,0,V.w,V.h);
  const a=document.createElement('a');a.download='lagoon-lab.png';a.href=c.toDataURL('image/png');a.click();
  toast('📷 Snapshot saved');
}
/* ---- input ---- */
const PTRS=new Map();let moveGrab=null;
function evPos(e){return {x:e.clientX,y:e.clientY};}
function bindInput(){
  const uiSel='nav,aside,header,#presets,#help,.glass button,.glass input,#panelToggle';
  addEventListener('pointerdown',e=>{
    auInit();if(AU.ctx&&AU.ctx.state==='suspended')AU.ctx.resume();
    if(e.target.closest(uiSel))return;
    const p=evPos(e);PTRS.set(e.pointerId,{x:p.x,y:p.y,t:performance.now()});
    if(TOOL==='throw'&&PTRS.size===1){AIM={x0:p.x,y0:p.y,x1:p.x,y1:p.y};}
    else if(TOOL==='ripple'){poke(p.x,p.y);}
    else if(TOOL==='move'){moveGrab=null;
      for(const s of ISL){if(s&&s.on&&Math.abs(p.x-s.cx)<s.w*1.5){moveGrab=s;break;}}}
    else if(TOOL==='magnet'){MAG.on=true;MAG.x=p.x;MAG.y=p.y;}
  },{passive:true});
  addEventListener('pointermove',e=>{
    const q=PTRS.get(e.pointerId);if(!q)return;
    const p=evPos(e);
    if(TOOL==='throw'&&AIM){AIM.x1=p.x;AIM.y1=p.y;}
    else if(TOOL==='ripple'){poke(p.x,p.y);if(Math.random()<.5)spawnP(1,p.x,surfY(p.x),0,0,1.2,4);}
    else if(TOOL==='move'&&moveGrab){moveGrab.fx=clamp(p.x/V.w,.06,.94);layoutIslands();}
    else if(TOOL==='magnet'){MAG.x=p.x;MAG.y=p.y;}
    q.x=p.x;q.y=p.y;
  },{passive:true});
  const up=e=>{
    const q=PTRS.get(e.pointerId);PTRS.delete(e.pointerId);
    if(TOOL==='magnet'&&PTRS.size===0)MAG.on=false;
    if(TOOL==='throw'&&AIM&&q){
      const p=evPos(e),dx=AIM.x0-p.x,dy=AIM.y0-p.y,d=Math.hypot(dx,dy);
      if(d<12){spawnBall(ballType,AIM.x0,AIM.y0,rnd(-60,60),rnd(-40,20));auPop();}
      else{const b=spawnBall(ballType,AIM.x0,AIM.y0,clamp(dx*4,-2200,2200),clamp(dy*4,-2200,2200));auPop();}
      hideAim();
    }
    if(TOOL==='move')moveGrab=null;
  };
  addEventListener('pointerup',up);addEventListener('pointercancel',up);
  addEventListener('keydown',e=>{
    if(e.code==='Space'){V.paused=!V.paused;e.preventDefault();}
    const n=parseInt(e.key);if(n>=1&&n<=6)document.querySelectorAll('.bbtn')[n-1]?.click();
  });
}
function poke(x,y){
  const sy=surfY(x);
  ripExcite(x,-.7);
  if(y>sy-60){spawnP(4,x,sy,0,0,.5,10);
    for(let i=0;i<4;i++)spawnP(0,x+rnd(-8,8),sy,rnd(-200,200),rnd(-400,-100),.5,3);}
}
/* ---- resize / quality ---- */
const TIERS={high:{s:1,pt:800},med:{s:.8,pt:500},low:{s:.62,pt:260}};
let tier='high';
function applyQMode(){
  tier=V.qMode==='auto'?tier:V.qMode;
  V.scale=Math.min(devicePixelRatio||1,2)*TIERS[tier].s;
  PT_CAP=TIERS[tier].pt;resize();
  $('#qDot').textContent='● '+(V.qMode==='auto'?'AUTO·'+tier.toUpperCase():tier.toUpperCase());
}
function resize(){
  V.w=innerWidth;V.h=innerHeight;
  for(const id of ['gl','fx']){
    const c=document.getElementById(id);
    c.width=Math.round(V.w*V.scale);c.height=Math.round(V.h*V.scale);
  }
  g.setTransform(V.scale,0,0,V.scale,0,0);
  layoutIslands();
}
addEventListener('resize',resize);
addEventListener('orientationchange',()=>setTimeout(resize,300));
/* ---- main loop ---- */
let lastT=0,acc=0,fpsE=60,qTimer=0,upTimer=0,hasGL=true,windT={x:0,y:0};
const EASEK=['time','cloud','fog','wind','gust','rain','storm','temp','tide','wave','chop','clarity','foam','glitter','bio','warmth','grav','bounce','islSize','ballR'];
function loop(ms){
  requestAnimationFrame(loop);
  const raw=Math.min(.05,(ms-lastT)/1000||.016);lastT=ms;
  fpsE=lerp(fpsE,1/Math.max(raw,1e-4),.05);
  if(V.paused)return;
  const dt=raw*(P.slowmo?.32:1);
  if(P.cycle){T.time=(T.time+raw*.6)%24;P.time=T.time;}
  const e=Math.min(1,raw*2.4);
  for(const k of EASEK){if(k==='time'&&P.cycle)continue;P[k]+=(T[k]-P[k])*e;}
  V.t+=dt;
  const sky=skyAt(P.time),sun=sunPos(),moon=moonPos();
  const wk=Math.abs(P.wind)/50;
  WV.a1=P.wave;WV.a2=P.wave*.42;WV.a3=P.wave*.2*(.4+.6*P.chop);
  WV.s1=1.5+wk*.9;WV.s2=2.3+wk*1.1;WV.s3=3.2+wk*1.4;
  windT.x+=dt*P.wind*.004*(0.5+P.gust);windT.y+=dt*.0016;
  ripStep(dt);
  if(P.rain>.03)for(let i=0;i<P.rain*6;i++)ripExcite(rnd(V.w),rnd(-.22,-.03)*P.rain);
  if(P.storm>.3)for(let i=0;i<P.storm*4;i++)ripExcite(rnd(V.w),rnd(-.3,.3)*P.storm);
  acc+=dt;let n=0;const h=1/120;
  while(acc>h&&n<8){physStep(h);acc-=h;n++;}if(n===8)acc=0;
  partStep(dt,sky);crabStep(dt);fireStep(dt);
  /* bubbles from submerged balls */
  for(const b of BALLLIST)if(b.sub>.6&&Math.random()<.12)
    spawnP(2,b.x+rnd(-b.r,b.r)*.6,b.y,rnd(-14,14),rnd(-90,-30),rnd(.8,2),rnd(1.5,3.5));
  /* lightning director */
  nextStrike-=raw;
  if(P.storm>.4&&nextStrike<0){strike(rnd(V.w*.1,V.w*.9));nextStrike=rnd(1.2,7)*(1.25-P.storm);}
  LT.life-=raw;V.flash*=Math.exp(-5*raw);
  V.shake*=Math.exp(-3*raw);
  if(V.shake>.3&&V.shakeOn!==false){
    const sx=rnd(-V.shake,V.shake),sy2=rnd(-V.shake,V.shake);
    for(const id of ['gl','fx','treeLayer'])document.getElementById(id).style.transform=`translate(${sx}px,${sy2}px)`;
  }else for(const id of ['gl','fx','treeLayer'])document.getElementById(id).style.transform='';
  /* rainbow after rain */
  if(P.rain>.5)wasRainy=true;
  if(wasRainy&&P.rain<.12&&sky.sunI>.3){rainbowT=22;wasRainy=false;toast('🌈 The storm is clearing…');}
  rainbowT-=raw;
  /* render */
  if(hasGL)glFrame(sky,sun,moon,windT);
  g.clearRect(0,0,V.w,V.h);
  if(!hasGL)fallbackDraw(g,sky,sun);
  drawDecals(sky,sun);drawBalls(sky,sun);drawParts();drawLightning();drawGulls(sky);drawRainbow(sky);drawAim();
  for(let i=0;i<4;i++){const s=ISL[i];if(s&&s.on)treeFrame(s,V.t,sky);}
  auUpdate();
  /* fps + auto quality */
  qTimer+=raw;upTimer+=raw;
  if(upTimer>.5){upTimer=0;$('#fps').textContent=Math.round(fpsE);
    $('#fps').style.color=fpsE>50?'var(--acc)':fpsE>30?'var(--warn)':'#ff6a6a';}
  if(V.qMode==='auto'&&qTimer>2.5){qTimer=0;
    if(fpsE<45&&tier!=='low'){tier=tier==='high'?'med':'low';applyQMode();}
    else if(fpsE>57&&tier!=='high'){tier=tier==='low'?'med':'high';applyQMode();}}
}
/* ---- boot ---- */
function loadImg(src){return new Promise((res,rej)=>{const i=new Image();
  i.onload=()=>res(i);i.onerror=rej;i.src=src;});}
async function boot(){
  V.shakeOn=true;
  buildUI();bindInput();
  applyQMode();
  try{
    const [sand,grass,rock,tall,fan]=await Promise.all(
      [TEX_SAND,TEX_GRASS,TEX_ROCK,TEX_PALM_T,TEX_PALM_F].map(loadImg));
    treeImgs={tall:TEX_PALM_T,fan:TEX_PALM_F};
    syncTrees();
    try{hasGL=glInit({sand,grass,rock});}catch(err){hasGL=false;}
  }catch(err){hasGL=false;treeImgs={tall:'',fan:''};}
  layoutIslands();resize();
  Object.assign(T,PRESETS[0].p);Object.assign(P,PRESETS[0].p);presetOn=0;markChips();
  spawnBall(0,V.w*.3,V.h*.25,140,0);spawnBall(1,V.w*.7,V.h*.2,-120,0);
  $('#help').classList.add('show');
  setTimeout(()=>toast('Drag anywhere to throw balls 🤿 Open ⚙️ for 25+ live controls',3600),600);
  requestAnimationFrame(loop);
}
boot();
</script>
</body>
</html>
