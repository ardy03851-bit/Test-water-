/* ============ WebGL single-pass lagoon renderer + CPU ripple field ============ */
const RIP_N=256, ripH=new Float32Array(RIP_N), ripV=new Float32Array(RIP_N);
const ripPx=new Uint8Array(RIP_N*4);
function ripExcite(x,s){
  const f=clamp(x/V.w,0,.999)*RIP_N, i=f|0;
  ripV[i]+=s; if(i>0)ripV[i-1]+=s*.5; if(i<RIP_N-1)ripV[i+1]+=s*.5;
}
function ripSample(x){
  const f=clamp(x/V.w,0,.999)*RIP_N, i=f|0, fr=f-i;
  const a=ripH[i], b=ripH[Math.min(RIP_N-1,i+1)];
  return clamp(a+(b-a)*fr,-1.5,1.5);
}
function ripStep(dt){
  const n=Math.max(1,Math.round(dt*120));
  for(let k=0;k<n;k++){
    for(let i=1;i<RIP_N-1;i++) ripV[i]+=((ripH[i-1]+ripH[i+1])*.5-ripH[i])*.32;
    ripV[0]+=((ripH[1]+ripH[0])*.5-ripH[0])*.32; ripV[RIP_N-1]+=((ripH[RIP_N-2]+ripH[RIP_N-1])*.5-ripH[RIP_N-1])*.32;
    for(let i=0;i<RIP_N;i++){ripV[i]*=.9965;ripH[i]+=ripV[i];}
  }
}
/* CPU mirror of the shader wave sum — MUST match GLSL exactly */
const WV={f1:.0075,f2:.019,f3:.052,a1:0,a2:0,a3:0,s1:1.5,s2:2.2,s3:3.1};
function waveCPU(x,t){
  return Math.sin(x*WV.f1+t*WV.s1)*WV.a1+Math.sin(x*WV.f2-t*WV.s2+1.7)*WV.a2+Math.sin(x*WV.f3+t*WV.s3+4.2)*WV.a3;
}
const RIP_AMP=16;
function surfY(x){return waterLevel()+waveCPU(x,V.t)+ripSample(x)*RIP_AMP;}

const VSRC=`attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
const FSRC=`
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;uniform float uScale,uTime,uWL,uBed,uChop,uAmp,uRipAmp,uGlit,uBio;
uniform vec2 uSunPos,uMoonPos;uniform vec3 uSunCol;uniform float uSunI,uMoonI;
uniform vec3 uSkyTop,uSkyMid,uSkyHor;uniform float uNight,uCloud,uCloudDark,uFlash,uFog,uRain;
uniform vec3 uW1,uW2,uW3;uniform vec2 uWindT;
uniform vec3 uShal,uDeep;uniform float uClarity,uFoam,uTilt,uGrain;
uniform vec4 uIsl[4];uniform vec4 uBall[12];
uniform sampler2D uRip,uSand,uGrass,uRock;
float hash21(vec2 q){q=fract(q*vec2(234.34,435.345));q+=dot(q,q+34.23);return fract(q.x*q.y);}
float vnoise(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);
 float a=hash21(i),b=hash21(i+vec2(1.,0.)),c=hash21(i+vec2(0.,1.)),d=hash21(i+vec2(1.,1.));
 return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm3(vec2 q){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*vnoise(q);q=q*2.03+11.7;a*=.5;}return v;}
float bedY(float x){return uBed-26.*sin(x*.004+1.)-14.*sin(x*.011+.5);}
float groundY(float x){float b=bedY(x),g=b;
 for(int i=0;i<4;i++){vec4 I=uIsl[i];
  if(I.y>.5){float d=(x-I.x)/I.y;float top=uWL-I.z;g=min(g,b-(b-top)*exp(-d*d*1.8));}}
 return g;}
float waveY(float x,float t,float W){
 float r=texture2D(uRip,vec2(clamp(x/W,0.,1.),.5)).r*2.-1.;
 return sin(x*uW1.x+t*uW1.z)*uW1.y+sin(x*uW2.x-t*uW2.z+1.7)*uW2.y+sin(x*uW3.x+t*uW3.z+4.2)*uW3.y+r*uRipAmp;}
void main(){
 float t=uTime,W=uRes.x/uScale,H=uRes.y/uScale;
 vec2 p=vec2(vUv.x,1.-vUv.y)*uRes/uScale;
 float gy=groundY(p.x);
 float ws=uWL+waveY(p.x,t,W);
 vec3 col;float suv=p.y/H;
 if(p.y<ws&&p.y<gy){
  /* ---- SKY ---- */
  float h=clamp(suv/.62,0.,1.);
  col=mix(uSkyHor,uSkyMid,smoothstep(0.,.55,h));
  col=mix(col,uSkyTop,smoothstep(.45,1.,h));
  vec2 sp=floor(p/2.5);float sh=hash21(sp);
  float star=step(.9986,sh)*(.5+.5*sin(t*3.+sh*40.))*uNight*(1.-smoothstep(.35,.6,suv));
  col+=vec3(.8,.88,1.)*star;
  float sd=length(p-uSunPos);
  col+=uSunCol*(smoothstep(30.,24.,sd)*1.7*uSunI+exp(-sd*.011)*.34*uSunI+exp(-sd*.0018)*.13*uSunI);
  float md=length(p-uMoonPos);
  float mo=smoothstep(21.,17.5,md)*uMoonI*(.82+.18*vnoise(p*.3));
  col+=vec3(.88,.92,1.)*mo*.95+vec3(.5,.6,.9)*exp(-md*.02)*.25*uMoonI;
  vec2 cuv=vec2(p.x/W*1.5,p.y/H*2.4)+uWindT;
  float f=fbm3(cuv*vec2(1.,1.6));
  float f2=fbm3(cuv*vec2(1.,1.6)+vec2(.06,.09));
  float cl=smoothstep(1.-uCloud-.30,1.-uCloud+.34,f)*(1.-smoothstep(.56,.63,suv));
  float litF=.5+clamp((f-f2)*5.,-.5,.5);
  vec3 cLit=mix(vec3(.55,.6,.7),mix(vec3(1.02),uSunCol,.4),clamp(uSunI,0.,1.));
  cLit=mix(cLit,vec3(.10,.13,.24),uNight*.92);
  vec3 cSh=cLit*(.34+.28*(1.-uCloudDark));
  col=mix(col,mix(cSh,cLit,litF),clamp(cl*.94,0.,1.));
  float veil=uRain*.22*(.5+.5*vnoise(vec2(p.x*.02+t*.15,p.y*.006)))*(1.-smoothstep(.5,.62,suv));
  col=mix(col,vec3(.52,.60,.70)*(1.-uNight*.65),clamp(veil,0.,.45));
  col=mix(col,uSkyHor,uFog*.55*smoothstep(.25,.6,suv));
  col+=uFlash*vec3(.82,.88,1.)*(.32+.68*cl);
 }else if(p.y<gy){
  /* ---- WATER ---- */
  float tot=max(gy-ws,4.);
  float dep=clamp((p.y-ws)/tot,0.,1.);
  vec3 wcol=mix(uShal,uDeep,pow(dep,.5+.4*(1.-uClarity)));
  wcol*=1.-dep*.22*(1.-uClarity);
  float fres=exp(-(p.y-ws)*.035);
  wcol=mix(wcol,uSkyHor*(1.-uNight*.55)+uSunCol*.07,fres*.78);
  float wh=waveY(p.x,t,W);
  float sl=(waveY(p.x+3.,t,W)-waveY(p.x-3.,t,W))/6.;
  float crest=smoothstep(.3,.95,wh/max(uAmp,1.)*.5+.5)*uChop;
  float sb=exp(-(p.y-ws)*.10);
  float foamN=vnoise(vec2(p.x*.085,t*1.3))*vnoise(vec2(p.x*.03-t*.6,p.y*.05));
  float sFoam=sb*smoothstep(.30,.62,foamN*1.6+crest*.6+abs(sl)*.35)*uFoam;
  float gsun=exp(-abs(p.x-uSunPos.x)/(50.+260.*uChop))*exp(-(p.y-ws)*.006);
  float spk=pow(vnoise(vec2(p.x*.5,p.y*.14+t*2.6)),6.)*9.+pow(vnoise(vec2(p.x*.23-t*1.8,p.y*.3)),8.)*11.;
  wcol+=uSunCol*gsun*(.22+min(spk,1.6))*uSunI*uGlit;
  float gmon=exp(-abs(p.x-uMoonPos.x)/120.)*exp(-(p.y-ws)*.008);
  wcol+=vec3(.6,.7,1.)*gmon*(.15+min(spk,1.2)*.5)*uMoonI*uGlit;
  vec2 cq=vec2(p.x*.045+t*.28,p.y*.06-t*.2);
  float ca=pow(vnoise(cq)*vnoise(cq*1.35+7.3),1.4)*4.5;
  wcol+=vec3(.65,.92,1.)*ca*pow(1.-dep,1.6)*(uSunI*(.3+.7*uClarity))*.9;
  float shft=pow(.5+.5*sin((p.x-(p.y-ws)*uTilt)*.045+t*.45),6.)*exp(-(p.y-ws)*.005);
  wcol+=vec3(.5,.8,.9)*shft*uSunI*uClarity*.16;
  float shD=gy-p.y;
  float shore=exp(-max(shD,0.)*.055)*step(0.,shD);
  float lap=.5+.5*sin(shD*.5-t*3.6);
  float shFoam=shore*smoothstep(.28,.72,lap*.62+foamN*1.7)*uFoam;
  for(int i=0;i<12;i++){vec4 B=uBall[i];
   if(B.z>.5){vec2 dd=p-B.xy;float d=length(dd);
    float ring=exp(-pow((d-B.z-3.)/7.,2.));
    wcol=mix(wcol,vec3(.90,.96,1.),clamp(ring*B.w,0.,.85));
    float uw=exp(-d*d/(B.z*B.z*4.))*B.w;wcol*=1.-uw*.22;
    float br=(B.z+48.);
    wcol+=vec3(.08,.85,.70)*exp(-d*d/(br*br))*B.w*uBio*uNight*1.4;}}
  float bp=pow(vnoise(p*.06+vec2(0.,-t*.45)),7.)*7.*uBio*uNight*exp(-(p.y-ws)*.02);
  wcol+=vec3(.05,.8,.7)*min(bp,1.2);
  vec3 foamC=vec3(.93,.97,1.)*(1.-uNight*.55)+uSunCol*.07;
  wcol=mix(wcol,foamC,clamp(sFoam+shFoam,0.,1.));
  wcol=mix(wcol,vec3(.72,.74,.55)*(1.-uNight*.6),pow(1.-dep,3.)*.42);
  wcol=mix(wcol,uSkyHor,uFog*.4*(1.-dep*.5));
  wcol*=1.-uNight*.22;
  wcol+=uFlash*vec3(.7,.8,1.)*.22;
  col=wcol;
 }else{
  /* ---- TERRAIN ---- */
  float hAbove=uWL-p.y;
  float gs=(groundY(p.x+4.)-groundY(p.x-4.))/8.;
  vec3 sand=texture2D(uSand,p*.006).rgb;
  vec3 grass=texture2D(uGrass,p*.008).rgb;
  vec3 rock=texture2D(uRock,p*.010).rgb;
  float en=vnoise(p*.02)*16.;
  vec3 tcol;
  if(hAbove>-3.){
   float gm=smoothstep(30.+en,62.+en,hAbove);
   tcol=mix(sand*vec3(1.,.96,.86),grass*vec3(.88,1.,.82),gm);
   tcol=mix(tcol,rock,smoothstep(1.0,2.0,abs(gs))*.85);
   float wet=1.-smoothstep(-3.,8.,hAbove);
   tcol*=1.-wet*.40;
   tcol+=uSunCol*wet*pow(max(0.,1.-abs(gs)*.5),2.)*.16*uSunI;
   float wlf=exp(-abs(p.y-ws)*.16)*smoothstep(.25,.65,vnoise(vec2(p.x*.08,t*2.2))+.35)*uFoam;
   tcol=mix(tcol,vec3(.93,.97,1.)*(1.-uNight*.5)+uSunCol*.06,clamp(wlf,0.,.9));
  }else{
   float ud=p.y-max(ws,uWL);
   tcol=mix(sand*vec3(.80,.84,.72),rock*vec3(.62,.68,.76),smoothstep(1.1,2.4,abs(gs)));
   tcol*=clamp(1.-ud*.0016,.32,1.);
   tcol*=exp(-ud*.004*vec3(.45,.22,.10));
   vec2 cq2=vec2(p.x*.045+t*.28,p.y*.06-t*.2);
   float ca2=pow(vnoise(cq2)*vnoise(cq2*1.35+7.3),1.4)*4.5;
   tcol+=vec3(.6,.9,1.)*ca2*uSunI*uClarity*.8;
   float bp2=pow(vnoise(p*.06+vec2(0.,-t*.45)),7.)*7.*uBio*uNight;
   tcol+=vec3(.05,.8,.7)*min(bp2,1.);
  }
  vec2 n=normalize(vec2(gs,-1.));
  vec2 S=normalize(uSunPos-p+vec2(0.,10.));
  float dif=clamp(dot(n,S),0.,1.);
  tcol*=(.50+.28*(1.-uNight)+uNight*.22)+.55*dif*max(uSunI,.10);
  vec2 Mn=normalize(uMoonPos-p+vec2(0.,10.));
  tcol+=tcol*clamp(dot(n,Mn),0.,1.)*uMoonI*.30*vec3(.7,.8,1.);
  tcol*=1.-uCloudDark*.38;
  tcol+=uFlash*vec3(.8,.86,1.)*.32;
  col=tcol;
 }
 col=col*1.06/(1.+col*.12);
 col+=(hash21(p*1.7+fract(t)*91.)-.5)*uGrain;
 gl_FragColor=vec4(col,1.);
}`;

/* ---- GL engine ---- */
let GL=null, U={}, glRipTex=null, GL_VER=0, GL_ERR='', GL_IMGS=null, glFails=0, glChecked=false;
const TEX_MAX=1024;
/* WebGL 1 rejects non-power-of-two textures that use mipmaps + REPEAT wrapping
   (they sample as solid black), so every texture is first drawn into a POT canvas. */
function potImage(img){
  const iw=img.naturalWidth||img.width||1, ih=img.naturalHeight||img.height||1;
  const pot=v=>{let p=1;while(p*2<=v&&p*2<=TEX_MAX)p*=2;return Math.max(1,p);};
  const w=pot(iw), h=pot(ih);
  if(w===iw&&h===ih) return img;
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const x=c.getContext('2d');
  if(!x) return img;
  x.imageSmoothingEnabled=true;if('imageSmoothingQuality' in x)x.imageSmoothingQuality='high';
  x.drawImage(img,0,0,w,h);
  return c;
}
function glTex(img,slot){
  const gl=GL;gl.activeTexture(gl.TEXTURE0+slot);
  const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,potImage(img));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);return t;
}
/* A GPU problem must never kill the scene silently: record why, then fall back to 2D. */
function glFail(msg){
  GL_ERR=msg;hasGL=false;
  console.error('[Lagoon Lab] '+msg);
  if(typeof toast==='function')toast('GPU renderer unavailable — 2D fallback',4200);
  if(typeof updateGLBadge==='function')updateGLBadge();
}
function glInit(imgs){
  const cv=document.getElementById('gl');
  if(!cv){GL_ERR='missing #gl canvas';return false;}
  GL_IMGS=imgs||GL_IMGS;
  try{
    GL=cv.getContext('webgl2',{antialias:false,alpha:false,depth:false,stencil:false,powerPreference:'high-performance'})
      ||cv.getContext('webgl',{antialias:false,alpha:false,depth:false,stencil:false,powerPreference:'high-performance'})
      ||cv.getContext('experimental-webgl',{antialias:false,alpha:false,depth:false,stencil:false});
  }catch(err){GL=null;}
  if(!GL){GL_ERR='WebGL is not available in this browser';return false;}
  GL_VER=(window.WebGL2RenderingContext&&GL instanceof WebGL2RenderingContext)?2:1;
  if(!cv._lagoonCtxBound){
    cv._lagoonCtxBound=true;
    cv.addEventListener('webglcontextlost',e=>{
      e.preventDefault();hasGL=false;GL_ERR='WebGL context lost';
      console.warn('[Lagoon Lab] WebGL context lost — waiting for restore');
      if(typeof updateGLBadge==='function')updateGLBadge();
    },{passive:false});
    cv.addEventListener('webglcontextrestored',()=>{
      console.warn('[Lagoon Lab] WebGL context restored — rebuilding renderer');
      try{hasGL=glInit(GL_IMGS);}catch(err){glFail('Renderer restore failed: '+(err&&err.message||err));}
      if(typeof updateGLBadge==='function')updateGLBadge();
    });
  }
  try{
    if(!GL_IMGS||!GL_IMGS.sand) throw new Error('scene textures are not loaded yet');
    const gl=GL;
    const sh=(ty,src)=>{const s=gl.createShader(ty);gl.shaderSource(s,src);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error('shader compile: '+gl.getShaderInfoLog(s));};
    const pr=gl.createProgram();
    gl.attachShader(pr,sh(gl.VERTEX_SHADER,VSRC));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FSRC));
    gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS)) throw new Error('program link: '+gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    U={};
    ['uRes','uScale','uTime','uWL','uBed','uChop','uAmp','uRipAmp','uGlit','uBio','uSunPos','uMoonPos','uSunCol',
     'uSunI','uMoonI','uSkyTop','uSkyMid','uSkyHor','uNight','uCloud','uCloudDark','uFlash','uFog','uRain',
     'uW1','uW2','uW3','uWindT','uShal','uDeep','uClarity','uFoam','uTilt','uGrain','uRip','uSand','uGrass','uRock']
     .forEach(n=>U[n]=gl.getUniformLocation(pr,n));
    U.uIsl=gl.getUniformLocation(pr,'uIsl[0]');U.uBall=gl.getUniformLocation(pr,'uBall[0]');
    glTex(GL_IMGS.sand,1);glTex(GL_IMGS.grass,2);glTex(GL_IMGS.rock,3);
    gl.uniform1i(U.uSand,1);gl.uniform1i(U.uGrass,2);gl.uniform1i(U.uRock,3);
    gl.activeTexture(gl.TEXTURE0);glRipTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,glRipTex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,RIP_N,1,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.uniform1i(U.uRip,0);
    gl.clearColor(0.016,0.027,0.051,1);gl.clear(gl.COLOR_BUFFER_BIT);
    console.info('[Lagoon Lab] WebGL '+GL_VER+' renderer ready ('+
      (gl.getParameter(gl.VERSION)||'')+', fragment uniform vectors: '+gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS)+')');
    glFails=0;
    return true;
  }catch(err){
    GL_ERR='WebGL setup failed: '+(err&&err.message||err);
    console.error('[Lagoon Lab] '+GL_ERR);
    return false;
  }
}

const islU=new Float32Array(16), ballU=new Float32Array(48);
function glFrame(sky,sun,moon,windT){
  const gl=GL;if(!gl)return;
  for(let i=0;i<RIP_N;i++){ripPx[i*4]=clamp(128+ripH[i]*95,0,255);ripPx[i*4+3]=255;}
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,glRipTex);
  gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,RIP_N,1,gl.RGBA,gl.UNSIGNED_BYTE,ripPx);
  gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);
  gl.uniform2f(U.uRes,gl.drawingBufferWidth,gl.drawingBufferHeight);
  gl.uniform1f(U.uScale,V.scale);gl.uniform1f(U.uTime,V.t);
  gl.uniform1f(U.uWL,waterLevel());gl.uniform1f(U.uBed,bedBase());
  gl.uniform1f(U.uChop,P.chop);gl.uniform1f(U.uAmp,Math.max(2,P.wave*1.62));
  gl.uniform1f(U.uRipAmp,RIP_AMP);gl.uniform1f(U.uGlit,P.glitter);gl.uniform1f(U.uBio,P.bio);
  gl.uniform2f(U.uSunPos,sun.x,sun.y);gl.uniform2f(U.uMoonPos,moon.x,moon.y);
  gl.uniform3f(U.uSunCol,sky.sun[0],sky.sun[1],sky.sun[2]);
  gl.uniform1f(U.uSunI,sky.sunI*(1-P.cloud*.72)*(1-P.storm*.5));
  gl.uniform1f(U.uMoonI,sky.night*(1-P.cloud*.8));
  gl.uniform3f(U.uSkyTop,sky.top[0],sky.top[1],sky.top[2]);
  gl.uniform3f(U.uSkyMid,sky.mid[0],sky.mid[1],sky.mid[2]);
  gl.uniform3f(U.uSkyHor,sky.hor[0],sky.hor[1],sky.hor[2]);
  gl.uniform1f(U.uNight,sky.night);
  gl.uniform1f(U.uCloud,clamp(P.cloud+P.storm*.25,0,1));
  gl.uniform1f(U.uCloudDark,clamp(P.cloud*.6+P.storm*.55,0,1));
  gl.uniform1f(U.uFlash,V.flash);gl.uniform1f(U.uFog,P.fog);gl.uniform1f(U.uRain,P.rain);
  gl.uniform3f(U.uW1,WV.f1,WV.a1,WV.s1);gl.uniform3f(U.uW2,WV.f2,WV.a2,WV.s2);gl.uniform3f(U.uW3,WV.f3,WV.a3,WV.s3);
  gl.uniform2f(U.uWindT,windT.x,windT.y);
  const shal=mix3(hex('#2fd6c0'),hex('#2f9fd6'),1-P.warmth);
  const deep=mix3(hex('#0a4a63'),hex('#0a2c63'),1-P.warmth);
  const dk=1-sky.night*.72;
  gl.uniform3f(U.uShal,shal[0]*dk,shal[1]*dk,shal[2]*dk);
  gl.uniform3f(U.uDeep,deep[0]*dk,deep[1]*dk,deep[2]*dk);
  gl.uniform1f(U.uClarity,P.clarity);gl.uniform1f(U.uFoam,P.foam);
  gl.uniform1f(U.uTilt,clamp((sun.x/V.w-.5)*2,-1,1));
  gl.uniform1f(U.uGrain,P.grain?.028:0);
  for(let i=0;i<4;i++){const s=ISL[i];
    islU[i*4]=(s&&s.on)?s.cx:0;islU[i*4+1]=(s&&s.on)?s.w:0;
    islU[i*4+2]=(s&&s.on)?s.ph:0;islU[i*4+3]=(s&&s.on)?s.seed:0;}
  gl.uniform4fv(U.uIsl,islU);
  for(let i=0;i<12;i++){const b=BALLLIST[i];
    ballU[i*4]=b?b.x:-9999;ballU[i*4+1]=b?b.y:0;ballU[i*4+2]=b?b.r:0;ballU[i*4+3]=b?b.foamK:0;}
  gl.uniform4fv(U.uBall,ballU);
  gl.drawArrays(gl.TRIANGLES,0,3);
  if(!glChecked){glChecked=true;glSelfCheck();}
}
/* One-off sanity check: if the very first GPU frame comes back as one flat
   colour, the renderer failed (incomplete texture, lost context, black canvas).
   Say so instead of leaving the user staring at an empty screen. */
function glSelfCheck(){
  const gl=GL;if(!gl||!gl.readPixels)return;
  try{
    const err=gl.getError?gl.getError():0;
    if(err)console.warn('[Lagoon Lab] GL error on first frame: 0x'+(err>>>0).toString(16));
    const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
    if(!w||!h)return;
    const px=new Uint8Array(16*16*4);
    const spots=[[w*.5,h*.15],[w*.2,h*.55],[w*.8,h*.85]];
    let lo=1e9,hi=-1e9;
    for(const [x,y] of spots){
      const rx=Math.max(0,Math.min(w-16,x-8))|0, ry=Math.max(0,Math.min(h-16,y-8))|0;
      gl.readPixels(rx,ry,16,16,gl.RGBA,gl.UNSIGNED_BYTE,px);
      for(let i=0;i<px.length;i+=4){
        const l=px[i]*.299+px[i+1]*.587+px[i+2]*.114;
        if(l<lo)lo=l; if(l>hi)hi=l;
      }
    }
    if(hi-lo<1.5)console.warn('[Lagoon Lab] first GPU frame looks blank (luma '+
      lo.toFixed(1)+'..'+hi.toFixed(1)+') — textures or context problem');
    else console.info('[Lagoon Lab] first GPU frame rendered (luma '+lo.toFixed(1)+'..'+hi.toFixed(1)+')');
    if(gl.getError)gl.getError(); // clear the flag our probing may have set
  }catch(e){console.warn('[Lagoon Lab] self-check skipped:',e.message);}
}
/* Minimal 2D fallback if WebGL is missing */
function fallbackDraw(g,sky,sun){
  const W=V.w,H=V.h,wl=waterLevel();
  const gr=g.createLinearGradient(0,0,0,wl);
  gr.addColorStop(0,css(sky.top));gr.addColorStop(.7,css(sky.mid));gr.addColorStop(1,css(sky.hor));
  g.fillStyle=gr;g.fillRect(0,0,W,wl+2);
  g.fillStyle=css(sky.sun,.9);g.beginPath();g.arc(sun.x,sun.y,26,0,TAU);g.fill();
  const wg=g.createLinearGradient(0,wl,0,H);
  wg.addColorStop(0,'#2fbfae');wg.addColorStop(1,'#0a2c63');
  g.fillStyle=wg;g.fillRect(0,wl,W,H-wl);
  g.fillStyle='#e8d9a8';
  for(const s of ISL){ if(!s||!s.on)continue;
    g.beginPath();g.moveTo(s.cx-s.w*1.6,bedBase());
    g.quadraticCurveTo(s.cx,wl-s.ph*1.5,s.cx+s.w*1.6,bedBase());g.closePath();g.fill();}
  g.fillStyle='rgba(255,255,255,.7)';g.fillRect(0,wl-2,W,4);
}
