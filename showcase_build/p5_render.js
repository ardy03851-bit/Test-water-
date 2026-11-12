/* ============ Overlay renderer (Canvas2D): decals, balls, particles, cinema ============ */
const fx=document.getElementById('fx'), g=fx.getContext('2d');
const FIRE={x:0,y:0,on:false,fl:1};
function fireStep(dt){
  const s=ISL[0];
  FIRE.on=!!(s&&s.on&&P.fire&&s.ph>34);
  if(!FIRE.on)return;
  FIRE.x=s.cx-s.w*.42;FIRE.y=groundY(FIRE.x)-4;
  FIRE.fl=.82+.12*Math.sin(V.t*23)+.06*Math.sin(V.t*47+1);
  if(Math.random()<dt*36)spawnP(6,FIRE.x+rnd(-8,8),FIRE.y-14,rnd(-24,24),rnd(-140,-60),rnd(.6,1.4),rnd(1.5,3));
  if(Math.random()<dt*14)spawnP(7,FIRE.x+rnd(-6,6),FIRE.y-44,rnd(-10,10),rnd(-46,-30),rnd(1.5,3),rnd(6,10));
}
function drawDecals(sky,sun){
  const W=V.w,night=sky.night;
  for(let i=0;i<4;i++){const s=ISL[i];if(!s||!s.on)continue;
    const dk=(1-night*.5)*(1-P.cloud*.22-P.storm*.2);
    /* tree shadows */
    for(const tr of s.trees){
      const x=s.cx+tr.dx*s.w*.95,y=groundY(x);
      g.fillStyle=`rgba(0,20,10,${.28*dk})`;
      g.beginPath();g.ellipse(x+(sun.x<x?14:-14)*(1-night*.6),y+3,26*islK(),7*islK(),0,0,TAU);g.fill();
    }
    /* rocks */
    for(const r of s.rocks){
      const x=s.cx+r.dx*s.w*.8,y=groundY(x)+2,uw=y>waterLevel();
      const gr=g.createRadialGradient(x-r.r*.3,y-r.r*.4,r.r*.1,x,y,r.r*1.2);
      gr.addColorStop(0,uw?'#5a7688':'#8d8d99');gr.addColorStop(1,uw?'#1c303c':'#3c3c46');
      g.fillStyle=gr;g.beginPath();g.ellipse(x,y,r.r,r.r*.62,0,0,TAU);g.fill();
      g.fillStyle=`rgba(255,255,255,${.18*dk})`;g.beginPath();g.ellipse(x-r.r*.3,y-r.r*.25,r.r*.4,r.r*.2,-.4,0,TAU);g.fill();
    }
    /* grass tufts */
    const sway=P.wind*.05;
    g.lineWidth=2;g.lineCap='round';
    for(const tf of s.tufts){
      const x=s.cx+tf.dx*s.w*.9,y=groundY(x);
      if(y>waterLevel()-2)continue;
      g.strokeStyle=`rgba(${40*dk|0},${120*dk|0},${60*dk|0},.95)`;
      for(let bIdx=0;bIdx<5;bIdx++){
        const a=-Math.PI/2+(bIdx-2)*.28;
        const wob=Math.sin(V.t*3+tf.ph+bIdx)*sway*8;
        g.beginPath();g.moveTo(x,y);
        g.quadraticCurveTo(x+Math.cos(a)*8*tf.s+wob*.4,y+Math.sin(a)*10*tf.s,x+Math.cos(a)*13*tf.s+wob,y+Math.sin(a)*16*tf.s);
        g.stroke();}
    }
    /* fireflies */
    if(night>.55)for(let f=0;f<8;f++){
      const x=s.cx+Math.sin(V.t*.7+f*2.4)*s.w*.8, y=groundY(s.cx)-30-Math.abs(Math.sin(V.t*.9+f*1.7))*70;
      const a=(.4+.6*Math.abs(Math.sin(V.t*2.2+f*3)))*night;
      g.fillStyle=`rgba(190,255,120,${a})`;g.beginPath();g.arc(x,y,2,0,TAU);g.fill();
    }
  }
  /* hut on island 1 */
  const h=ISL[1];
  if(h&&h.on&&P.hut&&h.ph>46){
    const hx=h.cx+h.w*.42,hy=groundY(hx),k=islK(),night=sky.night,dk=(1-night*.55);
    g.strokeStyle=`rgba(70,45,25,${dk})`;g.lineWidth=4*k;
    g.beginPath();g.moveTo(hx-26*k,hy);g.lineTo(hx-26*k,hy-34*k);g.moveTo(hx+26*k,hy);g.lineTo(hx+26*k,hy-34*k);g.stroke();
    g.fillStyle=`rgba(138,90,51,${dk})`;g.fillRect(hx-30*k,hy-72*k,60*k,40*k);
    g.fillStyle=`rgba(60,35,18,${dk})`;
    for(let l=0;l<4;l++)g.fillRect(hx-30*k,hy-68*k+l*10*k,60*k,2);
    g.fillStyle=`rgba(91,61,32,${dk})`;
    g.beginPath();g.moveTo(hx-42*k,hy-70*k);g.lineTo(hx,hy-104*k);g.lineTo(hx+42*k,hy-70*k);g.closePath();g.fill();
    g.strokeStyle=`rgba(50,32,16,${dk})`;g.lineWidth=2;
    for(let l=0;l<4;l++){const yy=hy-72*k-l*8*k,ww=(42-10*l)*k;
      g.beginPath();g.moveTo(hx-ww,yy);g.lineTo(hx+ww,yy);g.stroke();}
    const glow=night*.9+.1;
    g.fillStyle=`rgba(255,190,90,${glow})`;g.fillRect(hx-9*k,hy-56*k,18*k,24*k);
    g.fillStyle=`rgba(60,30,10,${dk})`;g.fillRect(hx-9*k,hy-56*k,18*k,4*k);
    if(night>.3){g.save();g.globalCompositeOperation='lighter';
      const gr=g.createRadialGradient(hx,hy-44*k,4,hx,hy-44*k,70*k);
      gr.addColorStop(0,`rgba(255,170,70,${.35*night})`);gr.addColorStop(1,'rgba(255,170,70,0)');
      g.fillStyle=gr;g.fillRect(hx-70*k,hy-114*k,140*k,140*k);g.restore();}
  }
  /* crabs */
  if(P.crabs)for(const c of CRABS){
    if(!c.s.on)continue;
    const x=c.s.cx+c.off*c.s.w,y=groundY(x)-2;
    if(y>waterLevel()-4)continue;
    const dk=1-night*.5,s2=islK(),wig=Math.sin(V.t*10+c.ph)*1.5;
    g.fillStyle=`rgba(220,80,50,${dk})`;
    g.beginPath();g.ellipse(x,y-3*s2,7*s2,4.5*s2,0,0,TAU);g.fill();
    g.beginPath();g.arc(x+c.dir*9*s2,y-6*s2+wig,2.6*s2,0,TAU);g.arc(x+c.dir*4*s2,y-7*s2-wig,2*s2,0,TAU);g.fill();
    g.strokeStyle=`rgba(200,70,45,${dk})`;g.lineWidth=1.5;
    for(let l=0;l<3;l++){g.beginPath();g.moveTo(x-4*s2+l*4*s2,y-1*s2);g.lineTo(x-6*s2+l*4*s2,y+2.5*s2);g.stroke();}
    g.fillStyle='#111';g.beginPath();g.arc(x+c.dir*3*s2,y-5.5*s2,1*s2,0,TAU);g.fill();
  }
  /* campfire */
  if(FIRE.on){
    const {x,y}=FIRE,lean=clamp(P.wind*.5,-26,26),fl=FIRE.fl,night=sky.night;
    g.fillStyle='rgba(120,120,130,.9)';
    for(let st=0;st<7;st++){const a=st/7*TAU;g.beginPath();g.arc(x+Math.cos(a)*16,y+Math.sin(a)*5+2,4,0,TAU);g.fill();}
    g.save();g.translate(x,y);g.rotate(.3);g.fillStyle='#5a3a1e';g.fillRect(-16,-6,32,7);
    g.rotate(-.6);g.fillStyle='#4a2e16';g.fillRect(-16,-6,32,7);g.restore();
    g.save();g.globalCompositeOperation='lighter';
    const gr=g.createRadialGradient(x,y-20,4,x,y-20,110*(1+night));
    gr.addColorStop(0,`rgba(255,150,50,${.5*fl+.15})`);gr.addColorStop(1,'rgba(255,120,30,0)');
    g.fillStyle=gr;g.fillRect(x-120,y-160,240,200);
    const blob=(w,h2,dy,c)=>{g.fillStyle=c;g.beginPath();
      g.moveTo(x-w,y);g.quadraticCurveTo(x-w+lean*.4,y-h2*.7,x+lean,y-h2-dy);
      g.quadraticCurveTo(x+w+lean*.4,y-h2*.7,x+w,y);g.closePath();g.fill();};
    blob(15*fl,52*fl,6,`rgba(255,90,20,${.75*fl})`);
    blob(10*fl,38*fl,4,`rgba(255,190,60,${.85*fl})`);
    blob(5.5*fl,24*fl,2,`rgba(255,246,200,${.95*fl})`);
    g.restore();
  }
}
function drawBalls(sky,sun){
  const wl=waterLevel();
  for(const b of BALLLIST){
    const ty=BALLS[b.t];
    const floorY=Math.min(groundY(b.x),b.sub>0?groundY(b.x):surfY(b.x));
    const hgt=clamp(1-(floorY-b.y)/500,.15,1);
    g.fillStyle=`rgba(0,10,20,${.3*hgt*(1-sky.night*.4)})`;
    g.beginPath();g.ellipse(b.x,floorY+5,b.r*(0.6+.4*hgt),b.r*.22*hgt+2,0,0,TAU);g.fill();
    const sp=Math.hypot(b.vx,b.vy);
    if(sp>950){g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=2;
      for(let i=1;i<4;i++){const f=i*sp*.012;
        g.beginPath();g.moveTo(b.x-b.vx/sp*f,b.y-b.vy/sp*f);
        g.lineTo(b.x-b.vx/sp*(f+14),b.y-b.vy/sp*(f+14));g.stroke();}}
    g.save();g.translate(b.x,b.y);
    const r=b.r;
    if(ty.id==='bubble'){
      const gr=g.createRadialGradient(-r*.3,-r*.3,r*.1,0,0,r);
      gr.addColorStop(0,'rgba(255,255,255,.06)');gr.addColorStop(.8,'rgba(170,210,255,.14)');gr.addColorStop(1,'rgba(220,240,255,.5)');
      g.fillStyle=gr;g.beginPath();g.arc(0,0,r,0,TAU);g.fill();
      g.strokeStyle='rgba(230,245,255,.7)';g.lineWidth=1.5;g.stroke();
      g.strokeStyle='rgba(255,150,220,.35)';g.lineWidth=3;
      g.beginPath();g.arc(0,0,r*.78,-2.4,-1.2);g.stroke();
    }else{
      const lx=(sun.x-b.x),ly=(sun.y-b.y),ll=Math.hypot(lx,ly)||1;
      const gr=g.createRadialGradient(lx/ll*r*.5,ly/ll*r*.5,r*.1,0,0,r*1.15);
      const base={beach:['#ffffff','#ffd9d9'],tennis:['#e2f55a','#8aa800'],coco:['#9a6b3f','#3a2410'],
        bowl:['#8a4a6a','#1c0d18'],metal:['#ffffff','#5a6a80']}[ty.id];
      gr.addColorStop(0,base[0]);gr.addColorStop(1,base[1]);
      g.fillStyle=gr;g.beginPath();g.arc(0,0,r,0,TAU);g.fill();
      g.save();g.beginPath();g.arc(0,0,r,0,TAU);g.clip();g.rotate(b.a);
      if(ty.id==='beach'){for(let i=0;i<6;i++){g.fillStyle=i%2?'#ff5a5a':(i%4===0?'#ffffff':'#3fa9ff');
          g.beginPath();g.moveTo(0,0);g.arc(0,0,r,i/6*TAU,(i+1)/6*TAU);g.closePath();g.fill();}
        g.fillStyle='#fff';g.beginPath();g.arc(0,0,r*.22,0,TAU);g.fill();}
      if(ty.id==='tennis'){g.strokeStyle='#f4f8ff';g.lineWidth=r*.12;
        for(const s of [-1,1]){g.beginPath();g.arc(s*r*1.15,0,r*.85,Math.PI*.62,Math.PI*1.38);g.stroke();}}
      if(ty.id==='bowl'){g.fillStyle='#0a0512';
        for(const [hx,hy] of [[-.2,-.35],[.25,-.2],[0,.15]]){g.beginPath();g.arc(hx*r,hy*r,r*.11,0,TAU);g.fill();}}
      if(ty.id==='metal'){g.fillStyle='rgba(255,255,255,.75)';g.fillRect(-r,-r*.5,r*2,r*.16);
        g.fillStyle='rgba(20,30,45,.5)';g.fillRect(-r,r*.25,r*2,r*.2);}
      if(ty.id==='coco'){g.strokeStyle='rgba(40,22,8,.6)';g.lineWidth=1.5;
        for(let i=0;i<8;i++){g.beginPath();g.arc(0,0,r*(.3+i*.09),i,i+2.2);g.stroke();}
        g.fillStyle='#1d0f04';for(const [hx,hy] of [[-.25,-.2],[.25,-.2],[0,.25]]){g.beginPath();g.arc(hx*r,hy*r,r*.1,0,TAU);g.fill();}}
      g.restore();
      g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=1.5;g.beginPath();g.arc(0,0,r,0,TAU);g.stroke();
    }
    if(b.sub>0){g.fillStyle=`rgba(30,140,190,${.28*b.sub})`;g.beginPath();g.arc(0,0,r,0,TAU);g.fill();
      g.strokeStyle=`rgba(200,245,255,${.5*b.sub})`;g.lineWidth=2;
      g.beginPath();g.arc(0,0,r*.7,-.6+.2*Math.sin(V.t*6),.8+.2*Math.sin(V.t*6));g.stroke();}
    const lx2=(sun.x-b.x),ly2=(sun.y-b.y),ll2=Math.hypot(lx2,ly2)||1;
    g.fillStyle='rgba(255,255,255,.85)';
    g.beginPath();g.arc(lx2/ll2*r*.42,ly2/ll2*r*.42,Math.max(1.5,r*.1),0,TAU);g.fill();
    g.restore();
  }
}
function drawParts(){
  /* normal pass */
  for(const p of PT){
    const f=p.life/p.max;
    if(p.t===0){g.fillStyle=`rgba(200,235,255,${.85*f})`;g.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size*1.4);}
    else if(p.t===1){g.fillStyle=`rgba(240,250,255,${.8*f})`;g.beginPath();g.arc(p.x,p.y,p.size*(1.2-f*.4),0,TAU);g.fill();}
    else if(p.t===2){g.strokeStyle=`rgba(200,240,255,${.7*f})`;g.lineWidth=1;g.beginPath();g.arc(p.x,p.y,p.size,0,TAU);g.stroke();}
    else if(p.t===3){g.strokeStyle=`rgba(170,200,235,${.4*Math.min(1,P.rain*2+.1)})`;g.lineWidth=1.5;
      g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x-P.wind*.5,p.y-p.size);g.stroke();}
    else if(p.t===4){g.strokeStyle=`rgba(235,248,255,${.75*f})`;g.lineWidth=2;
      g.beginPath();g.ellipse(p.x,p.y,p.ex,p.ex*.32,0,0,TAU);g.stroke();}
    else if(p.t===5){g.save();g.translate(p.x,p.y);g.rotate(p.ex);
      g.fillStyle=`rgba(70,160,70,${.9*f})`;g.beginPath();g.ellipse(0,0,p.size,p.size*.45,0,0,TAU);g.fill();g.restore();}
    else if(p.t===7){const gr=g.createRadialGradient(p.x,p.y,1,p.x,p.y,p.size);
      gr.addColorStop(0,`rgba(120,120,130,${.35*f})`);gr.addColorStop(1,'rgba(120,120,130,0)');
      g.fillStyle=gr;g.beginPath();g.arc(p.x,p.y,p.size,0,TAU);g.fill();}
    else if(p.t===8){const gr=g.createRadialGradient(p.x,p.y,1,p.x,p.y,p.size);
      gr.addColorStop(0,`rgba(220,235,245,${.16*f})`);gr.addColorStop(1,'rgba(220,235,245,0)');
      g.fillStyle=gr;g.beginPath();g.arc(p.x,p.y,p.size,0,TAU);g.fill();}
    else if(p.t===9){g.strokeStyle=`rgba(240,250,255,${.8*f})`;g.lineWidth=1.5;
      g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x,p.y-5*f-1);g.stroke();}
  }
  /* additive glow pass */
  g.save();g.globalCompositeOperation='lighter';
  for(const p of PT){
    const f=p.life/p.max;
    if(p.t===6){g.fillStyle=`rgba(255,${(120+120*f)|0},30,${f})`;g.beginPath();g.arc(p.x,p.y,p.size*f+0.5,0,TAU);g.fill();}
    else if(p.t===10){const a=(.35+.65*Math.abs(Math.sin(V.t*3+p.ph)))*f;
      g.fillStyle=`rgba(60,255,220,${a})`;g.beginPath();g.arc(p.x,p.y,p.size+1,0,TAU);g.fill();}
  }
  g.restore();
}
function drawLightning(){
  if(LT.life<=0)return;
  const a=clamp(LT.life*4,0,1)*(0.6+0.4*Math.sin(V.t*90));
  g.save();g.lineJoin='round';
  g.strokeStyle=`rgba(170,195,255,${.4*a})`;g.lineWidth=8;
  g.beginPath();LT.pts.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.stroke();
  g.strokeStyle=`rgba(255,255,255,${.95*a})`;g.lineWidth=2.5;g.stroke();
  g.restore();
}
function drawGulls(sky){
  if(sky.night>.5||P.storm>.55)return;
  g.strokeStyle=`rgba(30,40,55,${.8*(1-sky.night)})`;g.lineWidth=2.5;g.lineCap='round';
  for(const gu of GULLS){
    const x=((gu.x*V.w+V.t*gu.sp*(1+P.wind*.015))%(V.w+240)+V.w+240)%(V.w+240)-120;
    const y=gu.y*V.h+Math.sin(V.t*1.2+gu.ph)*14,fl=Math.sin(V.t*7+gu.ph)*5;
    g.beginPath();g.moveTo(x-11,y-fl);g.quadraticCurveTo(x-4,y+2,x,y);
    g.quadraticCurveTo(x+4,y+2,x+11,y-fl);g.stroke();
  }
}
function drawRainbow(sky){
  if(rainbowT<=0||sky.sunI<.2)return;
  const wl=waterLevel(),cx=V.w*.5,cy=V.h*1.02,R=Math.min(V.w,V.h)*.78;
  g.save();g.beginPath();g.rect(0,0,V.w,wl-30);g.clip();
  g.globalAlpha=clamp(rainbowT/20,0,1)*.30;g.lineWidth=11;
  const cols=['#ff5a5a','#ff9a3d','#ffe14d','#5aff8a','#5ab0ff','#b45aff'];
  cols.forEach((c,i)=>{g.strokeStyle=c;g.beginPath();g.arc(cx,cy,R-i*11,Math.PI,TAU);g.stroke();});
  g.restore();
}
let AIM=null;
function drawAim(){
  if(!AIM)return;
  const dx=AIM.x0-AIM.x1,dy=AIM.y0-AIM.y1;
  g.save();g.strokeStyle='rgba(255,255,255,.7)';g.setLineDash([6,6]);g.lineWidth=2;
  g.beginPath();g.moveTo(AIM.x0,AIM.y0);g.lineTo(AIM.x1,AIM.y1);g.stroke();g.setLineDash([]);
  let px=AIM.x0,py=AIM.y0,vx=clamp(dx*4,-2200,2200),vy=clamp(dy*4,-2200,2200);
  g.fillStyle='rgba(255,255,255,.8)';
  for(let i=0;i<18;i++){vx*=.995;vy=vy*.995+P.grav*.016;px+=vx*.016;py+=vy*.016;
    g.globalAlpha=.8*(1-i/18);g.beginPath();g.arc(px,py,3,0,TAU);g.fill();}
  g.restore();
  const aim=document.getElementById('aim');
  aim.style.display='block';aim.style.left=AIM.x0+'px';aim.style.top=AIM.y0+'px';
  aim.style.width=aim.style.height=(P.ballR*2)+'px';
}
function hideAim(){AIM=null;document.getElementById('aim').style.display='none';}
