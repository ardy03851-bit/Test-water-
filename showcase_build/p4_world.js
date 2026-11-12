/* ============ World: islands, terrain, trees, balls, particles, critters ============ */
const ISLDEF=[{fx:.20,w:150,ph:150},{fx:.53,w:105,ph:85},{fx:.83,w:175,ph:175},{fx:.37,w:120,ph:-34}];
const ISL=[null,null,null,null];
function islK(){return clamp(Math.min(V.w/1100,V.h/750),.55,1.7);}
function layoutIslands(){
  const k=islK()*P.islSize;
  for(let i=0;i<4;i++){const d=ISLDEF[i];
    if(!ISL[i]) ISL[i]={cx:0,w:0,ph:0,seed:i*7.3+1,on:true,trees:[],tufts:[],rocks:[],crab:[]};
    const s=ISL[i];s.fx=(s.fx===undefined?d.fx:s.fx);s.cx=s.fx*V.w;s.w=d.w*k;
    s.ph=d.ph*(d.ph<0?(0.5+P.islSize*0.5):k);s.on=i<P.islN&&!(i===3&&d.ph>0);
    if(s.on&&s.tufts.length===0){for(let j=0;j<9;j++)s.tufts.push({dx:(j/8-.5)*1.5,s:rnd(.6,1.3),ph:rnd(TAU)});
      for(let j=0;j<3;j++)s.rocks.push({dx:rnd(-1,1),r:rnd(9,20)*k,ph:rnd(TAU)});}
  }
  syncTrees();
}
function bedCPU(x){return bedBase()-26*Math.sin(x*.004+1)-14*Math.sin(x*.011+.5);}
function groundY(x){
  const wl=waterLevel();let g=bedCPU(x);
  for(let i=0;i<4;i++){const s=ISL[i];if(!s||!s.on||s.w<1)continue;
    const d=(x-s.cx)/s.w,top=wl-s.ph,b=bedCPU(x);
    g=Math.min(g,b-(b-top)*Math.exp(-d*d*1.8));}
  return g;
}
/* waterline crossings for foam / crabs */
function shoreX(s){
  const wl=waterLevel(),b=bedCPU(s.cx),top=wl-s.ph,out=[];
  if(top>=b)return out;
  const r=(b-wl)/(b-top);
  if(r<=0||r>=1)return out;
  const d=Math.sqrt(-Math.log(r)/1.8)*s.w;
  out.push(s.cx-d,s.cx+d);return out;
}

/* ---- Trees (AI PNG sprites, DOM composited) ---- */
const treeLayer=document.getElementById('treeLayer');
let treeImgs={};
function syncTrees(){
  if(!treeImgs.tall)return;
  const spots=[-.52,-.18,.22,.55,-.78];
  for(let i=0;i<4;i++){const s=ISL[i];if(!s)continue;
    const want=(s.on&&s.ph>34)?Math.min(P.trees,5):0;
    while(s.trees.length>want){const t=s.trees.pop();t.el.remove();}
    while(s.trees.length<want){const j=s.trees.length;
      const el=document.createElement('img');
      const tall=(j%2===0);
      el.src=tall?treeImgs.tall:treeImgs.fan;el.alt='';el.draggable=false;
      treeLayer.appendChild(el);
      s.trees.push({el,tall,dx:spots[j]+rnd(-.06,.06),sc:rnd(.8,1.2),ph:rnd(TAU),rot:0,lean:rnd(-4,4)});}
    for(const tr of s.trees){const want=tr.tall?treeImgs.tall:treeImgs.fan;
      if(tr.el.getAttribute('src')!==want)tr.el.src=want;}
  }
}
function treeFrame(s,t,sky){
  const k=islK()*P.islSize;
  const day=1-sky.night*.55, dark=(1-P.cloud*.3-P.storm*.25)+V.flash*.9;
  for(const tr of s.trees){
    const x=s.cx+tr.dx*s.w*.95, y=groundY(x)-3;
    const h=(tr.tall?205:128)*tr.sc*k, w=h*(tr.tall?.52:1.22);
    const wnd=P.wind*(1+P.gust*.5*Math.sin(V.t*.7+tr.ph));
    let r=tr.lean-P.wind*.05
      +Math.sin(V.t*1.9+tr.ph)*(1.5+Math.abs(wnd)*.14)
      +Math.sin(V.t*4.7+tr.ph*1.7)*Math.abs(wnd)*.07*P.gust
      +Math.sin(V.t*13+tr.ph*3)*6*P.storm
      +Math.sin(V.t*31+tr.ph)*1.1*P.rain;
    r=clamp(r,-30,30);
    const rv=(r-tr.rot);
    tr.el.style.transform=`translate(${x-w/2}px,${y-h}px) rotate(${r}deg) skewX(${clamp(r*.18,-6,6)}deg)`;
    tr.el.style.width=w+'px';tr.el.style.height=h+'px';
    tr.el.style.filter=`brightness(${(day*dark).toFixed(3)})`;
    if(Math.abs(rv)>.9&&Math.random()<.06)spawnLeaf(x+r*.8,y-h*.82);
    if(P.storm>.5&&Math.random()<.0016*P.storm)spawnBall(2,x,y-h*.7,rnd(-40,40),rnd(-30,0),15);
    tr.rot=r;
  }
}

/* ---- Balls & physics ---- */
const BALLLIST=[];const MAG={x:0,y:0,on:false};
function spawnBall(ti,x,y,vx=0,vy=0,rOv){
  const d=BALLS[ti];
  if(BALLLIST.length>=40){const old=BALLLIST.shift();popPuff(old.x,old.y,old.r);}
  const b={t:ti,x:clamp(x,10,V.w-10),y:y,vx:vx,vy:vy,a:rnd(TAU),va:rnd(-2,2),
    r:rOv||P.ballR*({beach:1.25,tennis:.8,bowl:.95,metal:.85,bubble:1.1,coco:.75}[d.id]||1),
    d:d.d,rest:d.rest,sub:0,foamK:0,wasIn:false,dead:false};
  BALLLIST.push(b);return b;
}
function popPuff(x,y,r){
  for(let i=0;i<10;i++)spawnP(0,x+rnd(-r,r),y+rnd(-r,r),rnd(-160,160),rnd(-260,40),rnd(.3,.7),rnd(2,4));
  auPop();
}
function physStep(dt){
  const wl=waterLevel();
  for(const b of BALLLIST){
    const ty=BALLS[b.t];
    let ax=P.wind*3.0/(ty.d+.6), ay=P.grav;
    if(MAG.on){const dx=MAG.x-b.x,dy=MAG.y-b.y,d=Math.hypot(dx,dy)+40;
      ax+=dx/d*3200*(120/d+0.4);ay+=dy/d*3200*(120/d+0.4);}
    const sy=surfY(b.x);
    const sub=clamp((sy-(b.y-b.r))/(2*b.r),0,1);
    b.sub=sub;
    if(sub>0){
      ay=P.grav*(1-sub/ty.d);
      if(ty.id==='bubble')ay=-900*sub-200;
      const f=Math.exp(-2.6*sub*dt);b.vx*=f;b.vy*=f;
      const sl=(surfY(b.x+8)-surfY(b.x-8))/16;
      b.vx+=-sl*420*sub*dt+(P.wind*1.5-b.vx)*1.6*sub*dt;
      b.va*=Math.exp(-3*dt);
      if(!b.wasIn&&b.vy>260){splashFX(b.x,sy,clamp(b.vy/1100,0,1.2),b.r);ripExcite(b.x,clamp(b.vy/750,.25,1.5));auSplash(b.vy/1200);b.foamK=1;}
      b.foamK=Math.max(b.foamK,sub*clamp(.3+Math.hypot(b.vx,b.vy)/1400,0,1));
      if(Math.abs(b.vy)>60)ripExcite(b.x,clamp(b.vy/6000,-.05,.05));
    }else{
      const f=Math.exp(-(ty.id==='bubble'?1.4:.10)*dt);b.vx*=f;b.vy*=f;b.va*=Math.exp(-.4*dt);
      if(ty.id==='bubble'){ay=-280;b.vy=Math.max(b.vy,-130);}
      if(b.wasIn&&b.vy<-180)for(let i=0;i<4;i++)spawnP(0,b.x+rnd(-b.r,b.r),b.y+b.r,rnd(-40,40),rnd(0,120),.4,2.5);
    }
    b.wasIn=sub>0;b.x+=b.vx*dt;b.y+=b.vy*dt;b.a+=b.va*dt;
    b.vx+=ax*dt;b.vy+=ay*dt;
    b.foamK*=Math.exp(-1.6*dt);
    /* terrain */
    const gy=groundY(b.x);
    if(b.y+b.r>gy){
      const sl=(groundY(b.x+4)-groundY(b.x-4))/8;
      const il=1/Math.hypot(sl,1),nx=sl*il,ny=-il;
      b.y=gy-b.r;
      const vn=b.vx*nx+b.vy*ny;
      if(vn<0){
        const rest=b.rest*P.bounce;
        b.vx-=(1+rest)*vn*nx;b.vy-=(1+rest)*vn*ny;
        const tx=-ny,ty2=nx;let vt=b.vx*tx+b.vy*ty2;vt*=.88;
        const vn2=b.vx*nx+b.vy*ny;b.vx=tx*vt+nx*vn2;b.vy=ty2*vt+ny*vn2;
        b.va=vt/b.r*.6;
        const imp=-vn;
        if(ty.id==='bubble'&&imp>650){b.dead=true;popPuff(b.x,b.y,b.r);continue;}
        if(imp>320){splashFX(b.x,gy-2,clamp(imp/1400,0,.7),b.r*.6,true);ripExcite(b.x,.3);}
      }else{b.va*=Math.exp(-2*dt);}
    }
    if(b.x<b.r){b.x=b.r;b.vx=Math.abs(b.vx)*b.rest;}
    if(b.x>V.w-b.r){b.x=V.w-b.r;b.vx=-Math.abs(b.vx)*b.rest;}
    if(b.y<-400){b.y=-400;b.vy=Math.abs(b.vy)*.5;}
  }
  /* ball vs ball */
  for(let i=0;i<BALLLIST.length;i++)for(let j=i+1;j<BALLLIST.length;j++){
    const a=BALLLIST[i],b=BALLLIST[j];
    const dx=b.x-a.x,dy=b.y-a.y,rr=a.r+b.r,d2=dx*dx+dy*dy;
    if(d2>0&&d2<rr*rr){
      const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,ov=(rr-d)/2;
      a.x-=nx*ov;a.y-=ny*ov;b.x+=nx*ov;b.y+=ny*ov;
      const ma=a.d*a.r*a.r,mb=b.d*b.r*b.r;
      const vn=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
      if(vn<0){const e=Math.min(a.rest,b.rest)*P.bounce,jimp=-(1+e)*vn/(1/ma+1/mb);
        a.vx-=jimp*nx/ma;a.vy-=jimp*ny/ma;b.vx+=jimp*nx/mb;b.vy+=jimp*ny/mb;
        if(-vn>300){auSplash(-vn/2500);for(let k=0;k<5;k++)spawnP(0,(a.x+b.x)/2,(a.y+b.y)/2,rnd(-200,200),rnd(-260,0),.4,2.5);}}
    }
  }
  for(let i=BALLLIST.length-1;i>=0;i--)if(BALLLIST[i].dead)BALLLIST.splice(i,1);
}

/* ---- Particles (pooled, zero per-frame allocation) ---- */
const PT=[];let PT_CAP=650;
function spawnP(t,x,y,vx,vy,life,size,ex){
  if(PT.length>=PT_CAP)return;
  PT.push({t,x,y,vx,vy,life,max:life,size,ex:ex||0,ph:rnd(TAU)});
}
function spawnLeaf(x,y){spawnP(5,x,y,rnd(-30,30)+P.wind*2,rnd(-20,20),rnd(2,4),rnd(3,6),rnd(TAU));}
function splashFX(x,y,power,r,sandy){
  const n=Math.round(6+power*22);
  for(let i=0;i<n;i++)spawnP(0,x+rnd(-r*.5,r*.5),y,rnd(-260,260)*(0.4+power)+P.wind*2,rnd(-720,-80)*power,rnd(.35,.8),rnd(1.5,3.5));
  spawnP(4,x,y,0,0,.55,r*.9);
  if(power>.45)spawnP(4,x,y,0,0,.8,r*1.3);
  for(let i=0;i<Math.round(power*7);i++)spawnP(1,x+rnd(-r,r),y-2,rnd(-60,60)+P.wind*3,rnd(-30,10),rnd(1,2.5),rnd(2,5));
  if(power>.6)spawnP(8,x,y-6,0,-30,.9,r*1.2);
}
function partStep(dt,sky){
  const wl=waterLevel();
  if(P.rain>.02){let n=P.rain*260*dt;while(n-->0&&Math.random()<1)spawnP(3,rnd(V.w),-10,P.wind*9,1500,.9,rnd(8,16));}
  if(P.fog>.25&&Math.random()<P.fog*.25)spawnP(8,rnd(V.w),wl+rnd(-30,30),(P.wind*4),0,rnd(3,6),rnd(40,90));
  if(sky.night>.4&&P.bio>.1&&Math.random()<P.bio*sky.night*.5){
    const x=rnd(V.w),sy=surfY(x);if(groundY(x)-sy>40)spawnP(10,x,rnd(sy+10,groundY(x)-10),rnd(-8,8),rnd(-6,6),rnd(2,5),rnd(1,2.5));}
  if(P.storm>.4)for(const s of ISL){if(!s||!s.on)continue;
    for(const cx of shoreX(s)){if(Math.random()<P.storm*.35){
      spawnP(0,cx+rnd(-8,8),surfY(cx),rnd(-120,120),rnd(-420,-140),rnd(.4,.8),rnd(2,4));
      if(Math.random()<.4)spawnP(1,cx+rnd(-14,14),surfY(cx),rnd(-40,40),0,rnd(1,2),rnd(2,5));}}}
  for(let i=PT.length-1;i>=0;i--){
    const p=PT[i];p.life-=dt;if(p.life<=0){PT.splice(i,1);continue;}
    const sy=surfY(p.x);
    switch(p.t){
      case 0:p.vy+=P.grav*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.y>sy+4){PT.splice(i,1);}break;
      case 1:p.x+=(p.vx+P.wind*3)*dt;p.y+=(sy-3-p.y)*Math.min(1,8*dt);p.vx*=.99;break;
      case 2:p.vy-=500*dt;p.vy=Math.max(p.vy,-160);p.x+=(p.vx+Math.sin(V.t*9+p.ph)*22)*dt;p.y+=p.vy*dt;if(p.y<sy-6){PT.splice(i,1);}break;
      case 3:p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.y>sy){if(Math.random()<.25){ripExcite(p.x,-.12*P.rain-.04);spawnP(9,p.x,sy,0,-140,.22,3);}PT.splice(i,1);}break;
      case 4:p.ex+=160*dt;break;
      case 5:p.vy=Math.min(p.vy+380*dt,120);p.x+=(P.wind*3+Math.sin(V.t*5+p.ph)*40)*dt;p.y+=p.vy*dt;p.ex+=3*dt;
        if(p.y>sy){ripExcite(p.x,-.05);PT.splice(i,1);}break;
      case 6:p.vy-=160*dt;p.x+=(p.vx+P.wind*6)*dt;p.y+=p.vy*dt;break;
      case 7:p.x+=(p.vx+P.wind*7)*dt;p.y+=p.vy*dt;p.vy-=12*dt;p.size+=26*dt;break;
      case 8:p.x+=(p.vx)*dt;break;
      case 9:p.vy+=1600*dt;p.y+=p.vy*dt;break;
      case 10:p.x+=p.vx*dt+Math.sin(V.t*2+p.ph)*8*dt;p.y+=p.vy*dt;if(p.y<sy){PT.splice(i,1);}break;
    }
  }
}

/* ---- Critters, gulls, lightning, rainbow ---- */
const CRABS=[];
function crabStep(dt){
  for(const s of ISL){if(!s||!s.on||s.ph<40)continue;
    if(!s.crabInit){s.crabInit=true;for(let k=0;k<3;k++)CRABS.push({s,off:rnd(-.6,.6),dir:pick([-1,1]),sp:rnd(14,30),ph:rnd(TAU)});}}
  for(const c of CRABS){
    if(!c.s.on||!P.crabs)continue;
    let sp=c.sp;c.dir=c.dir;
    for(const b of BALLLIST){const bx=c.s.cx+c.off*c.s.w;
      if(Math.hypot(b.x-bx,b.y-groundY(bx))<80){c.dir=(bx<b.x)?-1:1;sp=c.sp*4;break;}}
    c.off+=c.dir*sp*dt/c.s.w;
    const wl=waterLevel(),x=c.s.cx+c.off*c.s.w;
    if(Math.abs(c.off)>.85||groundY(x)>wl-6)c.dir*=-1;
  }
}
const GULLS=[];for(let i=0;i<4;i++)GULLS.push({x:rnd(1),y:rnd(.12,.3),sp:rnd(14,30),ph:rnd(TAU)});
const LT={pts:[],life:0,x:0};let nextStrike=3;
function strike(x){
  LT.x=x;LT.life=.4;LT.pts=[];let px=x,py=V.h*.08;
  const gy=Math.min(groundY(x),surfY(x));
  LT.pts.push([px,py]);
  for(let i=0;i<16;i++){py+=(gy-py)*rnd(.08,.2);px+=rnd(-34,34);LT.pts.push([px,py]);}
  V.flash=1;V.shake=Math.max(V.shake,9);
  auThunder(clamp(Math.abs(x-V.w/2)/V.w*1.4,.1,1.4),.8+P.storm*.4);
  ripExcite(x,1.2);spawnP(4,x,surfY(x),0,0,.8,20);spawnP(8,x,surfY(x)-10,0,-20,1.2,50);
}
