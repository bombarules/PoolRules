/* PoolRules: the seven pools, their boiler and heater rooms, roads, and the residents who visit. */
(function(){
"use strict";
var N=30, KEY="poolrules.v2";
var T={GRASS:0,ROAD:1,BLD:2,TREE:3};
var SIZE={pool:[4,3],boiler:[2,2],heater:[2,2],house:[1,1]};
var COST={pool:8000,boiler:2500,heater:1800,house:400,road:15};
var POOLS=[
  {n:"Splash Landing",c:"#45b8b0"},
  {n:"Aviator",c:"#5b8def"},
  {n:"F-15",c:"#e0874a"},
  {n:"Jet Stream",c:"#b06fd8"},
  {n:"Puddle Jumper",c:"#e8c547"},
  {n:"Maverick",c:"#d75b5b"},
  {n:"Runway 35",c:"#6cc070"}
];
var CAP=40, OPEN=0, CLOSE=840, DAYLEN=900; // minutes after 6:00
var clamp=function(v,a,b){return v<a?a:v>b?b:v};
var $=function(id){return document.getElementById(id)};
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
function rnd(a,b){return a+Math.random()*(b-a)}

/* ================= state ================= */
var S;
function blank(){
  return {v:1,day:1,t:120,money:20000,tiles:new Array(N*N).fill(0),own:new Array(N*N).fill(-1),blds:[],nid:1,visitsTotal:0,happy:80};
}
function poolDefaults(b,o){
  b.level=100;b.ph=7.5;b.fc=3;b.temp=82;b.visits=0;b.mood=85;b.cond=100;b.clar=95;
  if(o)for(var k in o)b[k]=o[k];
}
function canPlace(type,x,y){
  var s=SIZE[type];
  for(var j=0;j<s[1];j++)for(var i=0;i<s[0];i++){var X=x+i,Y=y+j;
    if(X<0||Y<0||X>=N||Y>=N)return false;
    var t=S.tiles[Y*N+X]; if(t===T.BLD||t===T.ROAD)return false}
  return true;
}
function place(type,x,y,extra,free){
  if(!canPlace(type,x,y))return null;
  var s=SIZE[type],b={id:S.nid++,type:type,x:x,y:y,w:s[0],h:s[1]};
  if(type==="pool")poolDefaults(b,extra); else if(extra)for(var k in extra)b[k]=extra[k];
  for(var j=0;j<b.h;j++)for(var i=0;i<b.w;i++){var q=(y+j)*N+x+i;S.tiles[q]=T.BLD;S.own[q]=b.id}
  S.blds.push(b); if(!free)S.money-=COST[type];
  return b;
}
function road(x,y,free){var q=y*N+x;if(S.tiles[q]===T.BLD||S.tiles[q]===T.ROAD)return false;S.tiles[q]=T.ROAD;if(!free)S.money-=COST.road;return true}
function remove(b){
  for(var j=0;j<b.h;j++)for(var i=0;i<b.w;i++){var q=(b.y+j)*N+b.x+i;S.tiles[q]=T.GRASS;S.own[q]=-1}
  S.blds.splice(S.blds.indexOf(b),1);
}
function bld(id){for(var i=0;i<S.blds.length;i++)if(S.blds[i].id===id)return S.blds[i];return null}
function pools(){return S.blds.filter(function(b){return b.type==="pool"})}
function info(b){for(var i=0;i<POOLS.length;i++)if(POOLS[i].n===b.name)return POOLS[i];return {n:b.name,c:"#7fc4e8"}}
function gap(a,b){var dx=Math.max(0,a.x-(b.x+b.w),b.x-(a.x+a.w)),dy=Math.max(0,a.y-(b.y+b.h),b.y-(a.y+a.h));return Math.max(dx,dy)}

/* boiler and heater rooms serve the closest pool within 4 tiles */
function relink(){
  var ps=pools(); ps.forEach(function(p){p.boilerId=null;p.heaterId=null});
  ["boiler","heater"].forEach(function(kind){
    S.blds.filter(function(b){return b.type===kind}).forEach(function(r){
      r.serves=null; var best=null,bd=5;
      ps.forEach(function(p){var d=gap(r,p); if(d<bd&&!p[kind+"Id"]){bd=d;best=p}});
      if(best){best[kind+"Id"]=r.id;r.serves=best.id}
    });
  });
  ensureEquip();
}

/* ================= seed: the seven pools ================= */
function seed(){
  S=blank();
  var x,y,i;
  [4,10,20].forEach(function(r){for(x=0;x<N;x++)road(x,r,true)});
  [9,20].forEach(function(c){for(y=0;y<N;y++)road(c,y,true)});
  var P=function(name,px,py,o){return place("pool",px,py,Object.assign({name:name},o||{}),true)};
  P("Splash Landing",2,7,{ph:7.4,fc:3.2});      place("boiler",6,8,null,true); place("heater",0,8,null,true);
  P("Aviator",12,7,{ph:8.05,fc:1.1});           place("boiler",16,8,null,true); place("heater",10,8,null,true);
  P("F-15",23,7,{temp:73,fc:2.6});              place("heater",27,8,null,true);
  P("Jet Stream",2,11,{ph:7.6,fc:2.4});          place("boiler",6,11,null,true); place("heater",0,11,null,true);
  P("Puddle Jumper",12,11,{ph:7.4,fc:3.6});     place("boiler",16,11,null,true); place("heater",10,11,null,true);
  P("Maverick",23,11,{level:83,fc:.6,ph:7.7});  place("boiler",27,11,null,true);
  P("Runway 35",2,21,{ph:7.5,fc:2.9});          place("boiler",6,21,null,true); place("heater",0,21,null,true);
  var H=function(hx,hy){place("house",hx,hy,{style:Math.floor(Math.random()*6),fam:2+Math.floor(Math.random()*4)},true)};
  for(x=0;x<N;x++){ if(x===9||x===20)continue; if(x%2===0){H(x,3);H(x,5)} }
  [[8,14],[8,16],[8,18],[1,19],[3,19],[5,19],[7,19],[11,19],[13,19],[15,19],[17,19],[19,15],[19,17],
   [21,15],[21,17],[22,19],[24,19],[26,19],[28,19],[8,23],[8,25],[8,27],[10,22],[10,24],[10,26],[10,28],
   [19,22],[19,24],[19,26],[19,28],[12,21],[14,21],[16,21],[21,22],[21,24],[21,26],[21,28],[23,21],[25,21],[27,21],[1,9],[29,9]].forEach(function(h){H(h[0],h[1])});
  for(i=0;i<N*N;i++){ if(S.tiles[i]===T.GRASS&&Math.random()<.45)S.tiles[i]=T.TREE }
  // keep a green around the park pools
  for(y=14;y<19;y++)for(x=11;x<19;x++)if(S.tiles[y*N+x]===T.TREE&&Math.random()<.5)S.tiles[y*N+x]=T.GRASS;
  relink();
  // some of the plant is already tired on day one
  var hurt=function(pool,kind,k,c,num){var p=pools().filter(function(q){return q.name===pool})[0];if(!p)return;var r=bld(p[kind+"Id"]);if(!r)return;
    var e=r.eq.filter(function(q){return q.k===k})[num||0];if(e)e.c=c};
  hurt("Aviator","boiler","filter",14,0);hurt("Aviator","boiler","filter",31,1);hurt("Maverick","boiler","pump",0,0);
  hurt("Runway 35","heater","tank",22,1);hurt("Jet Stream","boiler","pump",38,2);hurt("Splash Landing","heater","exp",44);hurt("Puddle Jumper","boiler","feeder",27);
  pools().forEach(function(p){if(p.name==="Aviator")p.clar=72;if(p.name==="Maverick")p.clar=78});
}
function fresh(){
  S=blank(); var x,y,i;
  for(x=0;x<N;x++)road(x,15,true); for(y=0;y<N;y++)road(15,y,true);
  var H=function(hx,hy){place("house",hx,hy,{style:Math.floor(Math.random()*6),fam:3},true)};
  for(x=1;x<N;x+=2){ if(x!==15){H(x,14);H(x,16)} }
  for(i=0;i<N*N;i++){ if(S.tiles[i]===T.GRASS&&Math.random()<.35)S.tiles[i]=T.TREE }
  relink();
}
/* ---- saving: automatic, on this device, plus a backup copy and save files to move between devices ---- */
var lastSaved=0,saveWarned=false,lastBackup=0;
function snapshot(){return JSON.stringify(S,function(k,v){return k.charAt(0)==="_"?undefined:v})}
function save(){
  if(!S)return;S.savedAt=Date.now();
  try{var j=snapshot();localStorage.setItem(KEY,j);lastSaved=S.savedAt;
    if(lastSaved-lastBackup>60000){localStorage.setItem(KEY+".backup",j);lastBackup=lastSaved}
    var el=document.getElementById("saveState");if(el)el.textContent="Saved "+new Date(lastSaved).toLocaleTimeString([],{hour:"numeric",minute:"2-digit",second:"2-digit"});
  }catch(e){if(!saveWarned){saveWarned=true;toast("This browser isn't letting PoolRules save. Private or incognito windows can't keep progress.")}}
}
function valid(s){return s&&s.v===1&&Array.isArray(s.tiles)&&s.tiles.length===N*N&&Array.isArray(s.blds)}
function load(){
  var tries=[KEY,KEY+".backup"];
  for(var i=0;i<tries.length;i++){try{var s=JSON.parse(localStorage.getItem(tries[i]));if(valid(s)){S=s;lastSaved=s.savedAt||0;relink();return true}}catch(e){}}
  return false;
}
function loadFrom(text){
  var s;try{s=JSON.parse(text)}catch(e){toast("That isn't a PoolRules save.");return false}
  if(!valid(s)){toast("That isn't a PoolRules save.");return false}
  if(roomView)exitRoom();S=s;relink();buildWorld();drawTools();save();closePanel();toast("Save loaded: day "+S.day+", "+fmtTime(S.t)+".");return true;
}
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}

/* ================= pool chemistry and mood ================= */
function swimmers(p){return p._swim||0}
function moodOf(p){
  var m=100,why=[];
  var pen=function(v,txt){if(v>0.5){m-=v;why.push([v,txt])}};
  pen(p.level<92?(92-p.level)*3:0,"Water is low");
  pen(p.ph<7.2?(7.2-p.ph)*120:p.ph>7.8?(p.ph-7.8)*120:0,p.ph<7.2?"pH too low: stings eyes":"pH too high: cloudy water");
  pen(p.fc<1?(1-p.fc)*45:p.fc>5?(p.fc-5)*12:0,p.fc<1?"Chlorine too low":"Smells of chlorine");
  pen(p.temp<78?(78-p.temp)*6:p.temp>88?(p.temp-88)*5:0,p.temp<78?"Water is cold":"Water is too warm");
  var pl=plant(p);if(p.clar==null)p.clar=95;
  pen(p.clar<80?(80-p.clar)*.9:0,"Cloudy water: "+(pl.circ<1?"a pump is down":pl.br?"filters need backwashing":"no filtration room"));
  pen(pl.showers==="cold"?15:pl.showers==="warm"?6:0,pl.showers==="cold"?"Cold showers":"Showers are lukewarm");
  pen(swimmers(p)>CAP*.9?12:0,"Too crowded");
  pen(p.roadOk===false?0:0,"");
  why.sort(function(a,b){return b[0]-a[0]});
  return {m:clamp(Math.round(m),0,100),why:why.map(function(w){return w[1]})};
}
function moodWord(m){return m>=80?"Excited":m>=60?"Happy":m>=40?"Grumbling":m>=20?"Unhappy":"Staying away"}
function moodCol(m){return m>=80?"#86d98f":m>=60?"#c9de7a":m>=40?"#f3c66b":m>=20?"#ff9f6b":"#ff6f61"}
function quality(p){ // 0 clean .. 1 green
  var a=p.fc<1?(1-p.fc):0, b=p.ph>7.8?(p.ph-7.8)/0.4:0; var cl=p.clar==null?0:clamp((90-p.clar)/60,0,1); return clamp(a*.9+b*.7+cl*.8,0,1)}
function stepPools(dm){ // dm = game minutes
  var ambient=66+6*Math.sin((S.t/DAYLEN)*Math.PI);
  wearRooms(dm);
  pools().forEach(function(p){
    var sw=swimmers(p);
    p.level=clamp(p.level-dm*(0.006+sw*0.0011),40,100);
    p.fc=clamp(p.fc-dm*(0.0016+sw*0.00028),0,10);
    p.ph=clamp(p.ph+dm*(0.00045+sw*0.00002),6.6,8.6);
    var pl=plant(p),target=ambient+(83-ambient)*pl.heat*(.4+.6*pl.circ), rate=pl.heat>0?0.012:0.006;
    p.temp+= (target-p.temp)*clamp(rate*dm,0,1);
    if(pl.feeder&&pl.circ>0&&p.fc<3)p.fc=Math.min(3,p.fc+dm*.006*pl.circ);
    if(p.clar==null)p.clar=95;var ct=100*(.35+.65*pl.filt)*(.3+.7*pl.circ);p.clar+=(ct-p.clar)*clamp(dm*.008,0,1);
    var mo=moodOf(p); p.mood+= (mo.m-p.mood)*clamp(dm*0.05,0,1); p._why=mo.why;
  });
}

/* ================= roads, paths ================= */
var pathCache={};
function adjRoads(b){
  var out=[];
  for(var i=-1;i<=b.w;i++)for(var j=-1;j<=b.h;j++){
    if((i===-1||i===b.w)&&(j===-1||j===b.h))continue;
    if(i>=0&&i<b.w&&j>=0&&j<b.h)continue;
    var X=b.x+i,Y=b.y+j; if(X<0||Y<0||X>=N||Y>=N)continue;
    if(S.tiles[Y*N+X]===T.ROAD)out.push(Y*N+X);
  }
  return out;
}
function bfs(from,toSet){
  var prev={},q=[from],seen={};seen[from]=1;
  while(q.length){var c=q.shift(); if(toSet[c]){var path=[c];while(prev[c]!=null){c=prev[c];path.unshift(c)}return path}
    var x=c%N,y=(c/N)|0;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){var X=x+d[0],Y=y+d[1];if(X<0||Y<0||X>=N||Y>=N)return;var n=Y*N+X;
      if(!seen[n]&&S.tiles[n]===T.ROAD){seen[n]=1;prev[n]=c;q.push(n)}});
  }
  return null;
}
function pathFor(h,p){
  var k=h.id+"|"+p.id; if(k in pathCache)return pathCache[k];
  var a=adjRoads(h),bs=adjRoads(p),set={}; bs.forEach(function(q){set[q]=1});
  var res=null; if(a.length&&bs.length)res=bfs(a[0],set);
  if(res&&res.length>60)res=null;
  return pathCache[k]=res;
}
function poolReachable(p){return adjRoads(p).length>0}

/* ================= rendering ================= */
var renderer,scene,camera,sun,hemi,world,clock;
var cam={tx:14,tz:13,dist:50,az:Math.PI*.25,el:.95,taz:Math.PI*.25,tdist:50};
var SKY=new THREE.Color("#a8d7e3");
var G={},Mt={};
function mat(c,o){var k=c+(o?JSON.stringify(o):"");if(Mt[k])return Mt[k];var m=new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.85,metalness:0},o||{}));return Mt[k]=m}
function initGeo(){
  G.box=new THREE.BoxGeometry(1,1,1).translate(0,.5,0);
  G.cyl=new THREE.CylinderGeometry(.5,.5,1,14).translate(0,.5,0);
  G.cone=new THREE.ConeGeometry(.5,1,7).translate(0,.5,0);
  G.ico=new THREE.IcosahedronGeometry(.5,0);
  G.sph=new THREE.SphereGeometry(.5,10,8);
  var r=new THREE.BufferGeometry();
  r.setAttribute("position",new THREE.Float32BufferAttribute([-.5,0,-.5,.5,0,-.5,0,.6,-.5, -.5,0,.5,.5,0,.5,0,.6,.5, -.5,0,-.5,0,.6,-.5,0,.6,.5,-.5,0,-.5,0,.6,.5,-.5,0,.5, .5,0,-.5,.5,0,.5,0,.6,.5,.5,0,-.5,0,.6,.5,0,.6,-.5],3));
  r.computeVertexNormals(); G.roof=r;
  G.ring=new THREE.RingGeometry(.42,.5,4,1,Math.PI/4).rotateX(-Math.PI/2);
}
function box(g,w,h,d,c,x,y,z,o){var m=new THREE.Mesh(G.box,mat(c,o));m.scale.set(w,h,d);m.position.set(x||0,y||0,z||0);m.castShadow=true;m.receiveShadow=true;g.add(m);return m}
function cyl(g,r,h,c,x,y,z,o){var m=new THREE.Mesh(G.cyl,mat(c,o));m.scale.set(r*2,h,r*2);m.position.set(x||0,y||0,z||0);m.castShadow=true;m.receiveShadow=true;g.add(m);return m}

function init(canvas){
  renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,powerPreference:"high-performance",preserveDrawingBuffer:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  scene=new THREE.Scene();scene.background=SKY;scene.fog=new THREE.Fog(SKY,70,170);
  camera=new THREE.PerspectiveCamera(38,1,.5,400);
  hemi=new THREE.HemisphereLight("#fff4dd","#4f6f86",1.25);scene.add(hemi);
  sun=new THREE.DirectionalLight("#fff0d4",2.3);sun.position.set(N/2-22,38,N/2+14);sun.target.position.set(N/2,0,N/2);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  var sc=sun.shadow.camera;sc.left=-30;sc.right=30;sc.top=30;sc.bottom=-30;sc.near=5;sc.far=110;sun.shadow.bias=-.0006;sun.shadow.normalBias=.03;
  scene.add(sun);scene.add(sun.target);scene.add(new THREE.AmbientLight("#9fb8d0",.25));
  initGeo();
  var g=new THREE.Mesh(new THREE.PlaneGeometry(400,400),mat("#7fae5a"));g.rotation.x=-Math.PI/2;g.position.set(N/2,-.02,N/2);g.receiveShadow=true;scene.add(g);
  ghost=new THREE.Mesh(G.box,new THREE.MeshBasicMaterial({color:"#86d98f",transparent:true,opacity:.6,depthWrite:false}));ghost.visible=false;ghost.renderOrder=3;scene.add(ghost);
  clock=new THREE.Clock();
  window.addEventListener("resize",resize);resize();input(canvas);
}
function resize(){var w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}

var waterMeshes={},smokers=[],puffs=[],ghost;
var GRASS_T=["#86b862","#7fb05b","#8bbd66","#81b35e"];
function buildWorld(){
  if(world){scene.remove(world);world.traverse(function(o){if(o.geometry&&!isShared(o.geometry))o.geometry.dispose()})}
  world=new THREE.Group();scene.add(world);waterMeshes={};smokers=[];
  // ground tiles with variation
  var gg=new THREE.PlaneGeometry(N,N,N,N).rotateX(-Math.PI/2).translate(N/2,0,N/2);
  var cols=[],c=new THREE.Color(),pos=gg.attributes.position;
  for(var i=0;i<pos.count;i++){var x=Math.min(N-1,Math.floor(pos.getX(i))),z=Math.min(N-1,Math.floor(pos.getZ(i)));c.set(GRASS_T[(x*7+z*13)%4]);cols.push(c.r,c.g,c.b)}
  gg.setAttribute("color",new THREE.Float32BufferAttribute(cols,3));
  var gm=new THREE.Mesh(gg,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95}));gm.receiveShadow=true;world.add(gm);
  // roads (instanced) + dashes + sidewalks
  var rq=[];for(var q=0;q<N*N;q++)if(S.tiles[q]===T.ROAD)rq.push(q);
  var walk=new THREE.InstancedMesh(new THREE.BoxGeometry(1,.04,1),mat("#d9d3c4"),rq.length);
  var rm=new THREE.InstancedMesh(new THREE.BoxGeometry(.78,.06,.78),mat("#55595e",{roughness:.9}),rq.length);
  var dashes=[],m4=new THREE.Matrix4();
  rq.forEach(function(q,k){var x=q%N,z=(q/N)|0;m4.makeTranslation(x+.5,.02,z+.5);walk.setMatrixAt(k,m4);m4.makeTranslation(x+.5,.03,z+.5);rm.setMatrixAt(k,m4);
    var h=(x>0&&S.tiles[q-1]===T.ROAD)||(x<N-1&&S.tiles[q+1]===T.ROAD), v=(z>0&&S.tiles[q-N]===T.ROAD)||(z<N-1&&S.tiles[q+N]===T.ROAD);
    if(h&&!v)dashes.push([x+.5,z+.5,.34,.05]);else if(v&&!h)dashes.push([x+.5,z+.5,.05,.34]);
    // fill the gaps so neighbouring road tiles join up
    if(x<N-1&&S.tiles[q+1]===T.ROAD)dashes.push([x+1,z+.5,.24,.78,1]);
    if(z<N-1&&S.tiles[q+N]===T.ROAD)dashes.push([x+.5,z+1,.78,.24,1]);
  });
  walk.receiveShadow=true;rm.receiveShadow=true;world.add(walk);world.add(rm);
  var dm=new THREE.InstancedMesh(new THREE.BoxGeometry(1,.062,1),mat("#f4efe2"),dashes.length),fm=new THREE.InstancedMesh(new THREE.BoxGeometry(1,.06,1),mat("#55595e",{roughness:.9}),dashes.length);
  var nd=0,nf=0;dashes.forEach(function(d){m4.makeScale(d[2],1,d[3]);m4.setPosition(d[0],.031,d[1]);if(d[4])fm.setMatrixAt(nf++,m4);else dm.setMatrixAt(nd++,m4)});
  dm.count=nd;fm.count=nf;fm.receiveShadow=true;world.add(fm);world.add(dm);
  // trees
  for(q=0;q<N*N;q++)if(S.tiles[q]===T.TREE){var tx=q%N+.5+rnd(-.15,.15),tz=((q/N)|0)+.5+rnd(-.15,.15),s=rnd(.7,1.1);
    var tr=new THREE.Mesh(G.cyl,mat("#7a5a3c"));tr.scale.set(.12*s,.35*s,.12*s);tr.position.set(tx,0,tz);world.add(tr);
    var cn=new THREE.Mesh(Math.random()<.5?G.cone:G.ico,mat(["#3f8f45","#4d9e4f","#357f3e","#5aa957"][q%4],{flatShading:true}));
    if(cn.geometry===G.cone){cn.scale.set(.75*s,1.1*s,.75*s);cn.position.set(tx,.3*s,tz)}else{cn.scale.set(.8*s,.8*s,.8*s);cn.position.set(tx,.7*s,tz)}
    cn.castShadow=true;world.add(cn)}
  S.blds.forEach(function(b){world.add(bldMesh(b))});
  // pipes from rooms to the pool they serve
  S.blds.forEach(function(b){if((b.type==="boiler"||b.type==="heater")&&b.serves){var p=bld(b.serves);if(!p)return;
    var ax=b.x+b.w/2,az=b.y+b.h/2,bx=clamp(ax,p.x,p.x+p.w),bz=clamp(az,p.y,p.y+p.h),col=b.type==="boiler"?"#e0874a":"#5aa7e0";
    var len=Math.hypot(bx-ax,bz-az);if(len<.1)return;var pm=box(world,.1,.1,len,col,(ax+bx)/2,.02,(az+bz)/2,{roughness:.5});pm.rotation.y=Math.atan2(bx-ax,bz-az)}});
  pathCache={};
  people.forEach(function(a){scene.remove(a.g)});people=[];pools().forEach(function(p){p._swim=0});
  buildLabels();
}
function isShared(g){for(var k in G)if(G[k]===g)return true;return false}
var WALLS=["#f4e3c3","#f7d4b2","#e8efd6","#f5e6a4","#d8ebee","#f2cfc4"],ROOFS=["#c8643b","#b5532f","#d9794a","#c25a36"];
function bldMesh(b){
  var g=new THREE.Group();g.position.set(b.x,0,b.y);g.userData.id=b.id;
  if(b.type==="house"){var w=WALLS[b.style%6];box(g,.7,.5,.62,w,.5,0,.5);var r=new THREE.Mesh(G.roof,mat(ROOFS[b.style%4]));r.scale.set(.8,.6,.7);r.position.set(.5,.5,.5);r.castShadow=true;if(b.style%2)r.rotation.y=Math.PI/2;g.add(r);box(g,.14,.24,.02,"#7a5a3c",.5,0,.82)}
  else if(b.type==="pool"){
    var c=info(b).c;
    box(g,b.w,.14,b.h,"#ece5d6",b.w/2,0,b.h/2);
    box(g,b.w-.7,.03,b.h-.7,"#1d6f8a",b.w/2,.12,b.h/2);
    var wm=new THREE.Mesh(G.box,new THREE.MeshStandardMaterial({color:"#3fc1dc",roughness:.15,metalness:.05,transparent:true,opacity:.92}));
    wm.scale.set(b.w-.7,.02,b.h-.7);wm.position.set(b.w/2,.13,b.h/2);g.add(wm);waterMeshes[b.id]=wm;
    for(var l=1;l<4;l++)box(g,b.w-.8,.02,.03,l%2?c:"#ffffff",b.w/2,.155,.35+l*(b.h-.7)/4,{roughness:.4});
    box(g,b.w,.02,.12,c,b.w/2,.14,.06);  // coloured coping, the pool's colour
    // loungers and umbrellas on the deck corners
    [[.35,.3],[b.w-.35,b.h-.3]].forEach(function(pnt,k){cyl(g,.025,.75,"#e9e4d8",pnt[0],.14,pnt[1]);var um=new THREE.Mesh(G.cone,mat(k?c:"#f4efe2",{flatShading:true}));um.scale.set(.6,.18,.6);um.position.set(pnt[0],.82,pnt[1]);um.castShadow=true;g.add(um)});
    box(g,.12,.3,.04,"#c9ced2",b.w-.4,.14,.36,{metalness:.6,roughness:.3});
    if(b.name==="Splash Landing"||b.name==="Puddle Jumper"){ // slide tower
      box(g,.5,.9,.5,c,b.w-.45,.14,b.h-.45);
      var sl=box(g,.28,.06,1.3,"#f3c66b",b.w-1.1,.6,b.h-.6,{roughness:.4});sl.rotation.x=0;sl.rotation.z=0;sl.rotation.y=Math.PI/2;sl.rotation.order="YXZ";sl.rotation.x=-.45;
    }
    if(b.name==="Runway 35"||b.name==="Aviator"){box(g,.3,.25,.9,"#d9d3c4",.35,.14,b.h/2);box(g,.14,.03,.8,"#f4efe2",.75,.38,b.h/2)}
    cyl(g,.03,1.3,"#c9ced2",.12,.14,b.h-.12);box(g,.4,.24,.02,c,.33,1.18,b.h-.12);
  }
  else if(b.type==="boiler"){
    box(g,1.7,.95,1.7,"#cfc6b8",1,0,1);box(g,1.8,.08,1.8,"#7d746a",1,.95,1);
    box(g,.42,.55,.02,"#e0874a",1,0,1.86);
    var ch=cyl(g,.16,1.0,"#9a8f84",1.45,.95,.55);smokers.push({g:g,x:1.45,y:2.0,z:.55,b:b});
    box(g,.5,.2,.02,"#2b3b45",.5,.6,1.86);
  }
  else if(b.type==="heater"){
    box(g,1.5,.75,1.6,"#d8e2e6",.85,0,1);box(g,1.6,.07,1.7,"#6f7f88",.85,.75,1);
    box(g,.38,.5,.02,"#5aa7e0",.85,0,1.81);
    cyl(g,.26,.95,"#e9eef0",1.75,0,.55,{metalness:.3,roughness:.4});cyl(g,.27,.06,"#5aa7e0",1.75,.95,.55);
  }
  return g;
}

/* ================= people ================= */
var people=[],SUITS=["#e0564f","#f3c66b","#5b8def","#b06fd8","#45b8b0","#f08fb0","#6cc070","#ff9f43"],SKIN=["#f1c6a0","#d9a27a","#a96f4b","#7a4a2e","#f6d7b9"];
var faceTex={};
function faceTexture(kind){
  if(faceTex[kind])return faceTex[kind];
  var cv=document.createElement("canvas");cv.width=cv.height=96;var x=cv.getContext("2d");
  var col={excited:"#86d98f",happy:"#c9de7a",meh:"#f3c66b",angry:"#ff6f61",heart:"#ff7aa2"}[kind];
  x.fillStyle="rgba(30,47,57,.9)";x.beginPath();x.arc(48,44,40,0,7);x.fill();x.beginPath();x.moveTo(36,80);x.lineTo(48,94);x.lineTo(60,80);x.fill();
  if(kind==="heart"){x.fillStyle=col;x.beginPath();x.moveTo(48,66);x.bezierCurveTo(14,44,26,16,48,32);x.bezierCurveTo(70,16,82,44,48,66);x.fill()}
  else{x.fillStyle=col;x.beginPath();x.arc(48,44,30,0,7);x.fill();x.fillStyle="#1e2f39";x.strokeStyle="#1e2f39";x.lineWidth=5;x.lineCap="round";
    x.beginPath();x.arc(37,38,4.5,0,7);x.arc(59,38,4.5,0,7);x.fill();
    x.beginPath();
    if(kind==="excited"){x.arc(48,50,13,0,Math.PI);x.fill()}
    else if(kind==="happy"){x.arc(48,48,11,.15*Math.PI,.85*Math.PI);x.stroke()}
    else if(kind==="meh"){x.moveTo(38,58);x.lineTo(58,58);x.stroke()}
    else{x.arc(48,66,11,1.15*Math.PI,1.85*Math.PI);x.stroke();x.beginPath();x.moveTo(30,27);x.lineTo(42,32);x.moveTo(66,27);x.lineTo(54,32);x.stroke()}}
  var t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return faceTex[kind]=new THREE.SpriteMaterial({map:t,depthWrite:false,transparent:true});
}
function moodKind(m){return m>=80?"excited":m>=60?"happy":m>=40?"meh":"angry"}
function makePerson(){
  var g=new THREE.Group(),suit=SUITS[(Math.random()*SUITS.length)|0],skin=SKIN[(Math.random()*SKIN.length)|0];
  var body=new THREE.Mesh(G.cyl,mat(suit));body.scale.set(.13,.2,.13);body.position.y=.08;body.castShadow=true;g.add(body);
  var legs=new THREE.Mesh(G.cyl,mat(skin));legs.scale.set(.1,.09,.1);legs.position.y=0;g.add(legs);
  var head=new THREE.Mesh(G.sph,mat(skin));head.scale.setScalar(.12);head.position.y=.34;head.castShadow=true;g.add(head);
  var s=1.15+Math.random()*.4;g.scale.setScalar(s);g.userData.body=body;
  return g;
}
function spawn(p){
  var hs=S.blds.filter(function(b){return b.type==="house"&&adjRoads(b).length});if(!hs.length)return false;
  // nearer homes come more often
  hs.sort(function(a,b){return gap(a,p)-gap(b,p)});var h=hs[Math.min(hs.length-1,Math.floor(Math.pow(Math.random(),1.8)*hs.length))];
  var path=pathFor(h,p);if(!path)return false;
  var pts=[[h.x+.5,h.y+.5]],side=rnd(-.28,.28);
  path.forEach(function(q){pts.push([q%N+.5+side,((q/N)|0)+.5+side])});
  var gx=clamp(pts[pts.length-1][0],p.x+.2,p.x+p.w-.2),gz=clamp(pts[pts.length-1][1],p.y+.2,p.y+p.h-.2);pts.push([gx,gz]);
  var a={g:makePerson(),pts:pts,i:0,u:0,st:"walk",pool:p.id,home:h.id,sp:rnd(1.6,2.3),bub:null,bubT:0};
  a.g.position.set(pts[0][0],0,pts[0][1]);scene.add(a.g);people.push(a);return true;
}
function bubble(a,kind,secs){
  if(a.bub){a.g.remove(a.bub)}a.bub=new THREE.Sprite(faceTexture(kind));a.bub.scale.set(.5,.5,1);a.bub.position.y=.85;a.g.add(a.bub);a.bubT=secs||2.2;
}
function stepPeople(dt,spd){
  var mv=dt*spd;
  for(var i=people.length-1;i>=0;i--){var a=people[i],p=bld(a.pool);
    if(!p){scene.remove(a.g);people.splice(i,1);continue}
    if(a.bubT>0){a.bubT-=dt;if(a.bubT<=0&&a.bub){a.g.remove(a.bub);a.bub=null}}
    if(a.st==="walk"||a.st==="home"){
      var pts=a.pts,k=a.i,nx=pts[k+1];
      if(!nx){ if(a.st==="home"){scene.remove(a.g);people.splice(i,1);continue}
        // arrived at the gate: decide to swim or turn around
        var m=p.mood;
        if(S.t>CLOSE||swimmers(p)>=CAP||Math.random()*100>m+25){a.st="home";a.pts=pts.slice().reverse();a.i=0;bubble(a,"angry",2.6);continue}
        a.st="swim";p._swim=(p._swim||0)+1;p.visits++;S.visitsTotal++;S.money+=4;
        a.swimT=rnd(30,70);a.sx=rnd(p.x+.6,p.x+p.w-.6);a.sz=rnd(p.y+.55,p.y+p.h-.55);a.ph=rnd(0,6);
        a.g.position.set(a.sx,.02,a.sz);bubble(a,moodKind(m),2.4);continue}
      var cx=a.g.position.x,cz=a.g.position.z,dx=nx[0]-cx,dz=nx[1]-cz,d=Math.hypot(dx,dz),step=a.sp*mv;
      if(step>=d){a.g.position.set(nx[0],0,nx[1]);a.i++}else{a.g.position.x+=dx/d*step;a.g.position.z+=dz/d*step}
      if(d>.001)a.g.rotation.y=Math.atan2(dx,dz);
      a.g.position.y=Math.abs(Math.sin((a.g.position.x+a.g.position.z)*9))*.04;
    } else if(a.st==="swim"){
      a.swimT-=mv; a.ph+=dt*1.6;
      var wl=.13*(.6+.4*p.level/100)-.05;
      a.g.position.set(a.sx+Math.sin(a.ph)*.15,wl-.22+Math.sin(a.ph*2)*.02,a.sz+Math.cos(a.ph*.7)*.12);
      if(!a.bub&&Math.random()<dt*.03)bubble(a,p.mood>=80?(Math.random()<.5?"heart":"excited"):moodKind(p.mood),2);
      if(a.swimT<=0||S.t>CLOSE+20){p._swim=Math.max(0,(p._swim||1)-1);a.st="home";
        var back=a.pts.slice(0,-1).reverse();a.pts=[[a.sx,a.sz]].concat(back);a.i=0}
    }
  }
}

/* ================= simulation step ================= */
var speed=1,acc=0,news=[],lastMood={};
function demand(t){if(t<OPEN||t>CLOSE)return 0;var h=t/60+6;return clamp(Math.exp(-Math.pow((h-14.5)/3.2,2))*1.1+.12,0,1.3)}
function step(dt){ // dt real seconds
  if(!speed){stepPeople(dt,0);return}
  var dm=dt*2*speed; S.t+=dm;
  if(S.t>=DAYLEN){S.t=0;S.day++;pools().forEach(function(p){p.visits=0});say("A new day. Pools open at 6:00.");save()}
  stepPools(dm);
  var homes=S.blds.filter(function(b){return b.type==="house"}).length;
  pools().forEach(function(p){
    if(!poolReachable(p))return;
    var rate=dm*demand(S.t)*(0.018+homes*0.0021)*Math.pow(clamp(p.mood,5,100)/100,1.3);
    p._acc=(p._acc||0)+rate;
    while(p._acc>=1){p._acc-=1;if(people.length<230)spawn(p)}
    var w=moodKind(p.mood);if(lastMood[p.id]&&lastMood[p.id]!==w){
      if(w==="angry")say("Residents are complaining about "+p.name+". "+(p._why&&p._why[0]||"")+".");
      else if(w==="excited")say("Families are flocking to "+p.name+". The water is perfect.");}
    lastMood[p.id]=w;
  });
  stepPeople(dt,speed);
  var ps=pools(),tot=0,wsum=0;ps.forEach(function(p){var w=1+swimmers(p);tot+=p.mood*w;wsum+=w});S.happy=wsum?tot/wsum:50;
}

/* ================= camera + input ================= */
function updateCamera(dt){
  var k=1-Math.pow(.0015,dt);cam.az+=(cam.taz-cam.az)*k;cam.dist+=(cam.tdist-cam.dist)*k;
  cam.el=.82+(cam.dist-9)/53*.32;cam.tx=clamp(cam.tx,-2,N+2);cam.tz=clamp(cam.tz,-2,N+2);
  camera.position.set(cam.tx+Math.sin(cam.az)*Math.cos(cam.el)*cam.dist,Math.sin(cam.el)*cam.dist,cam.tz+Math.cos(cam.az)*Math.cos(cam.el)*cam.dist);
  camera.lookAt(cam.tx,0,cam.tz);scene.fog.near=cam.dist*2.4;scene.fog.far=cam.dist*5.5+70;
}
var ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),v2=new THREE.Vector2(),hit=new THREE.Vector3();
function groundAt(sx,sy){v2.set(sx/window.innerWidth*2-1,-(sy/window.innerHeight)*2+1);ray.setFromCamera(v2,camera);return ray.ray.intersectPlane(plane,hit)?{x:hit.x,z:hit.z}:null}
function tileAt(sx,sy){var p=groundAt(sx,sy);if(!p)return null;var x=Math.floor(p.x),y=Math.floor(p.z);return x>=0&&y>=0&&x<N&&y<N?{x:x,y:y}:null}
function input(el){
  var ptrs={},mode=null,start=null,last=null,gest=null,downT=0;
  var list=function(){return Object.keys(ptrs).map(function(k){return ptrs[k]})};
  var cen=function(a){var x=0,y=0;a.forEach(function(p){x+=p.x;y+=p.y});return{x:x/a.length,y:y/a.length}};
  el.addEventListener("pointerdown",function(e){if(roomView){el.setPointerCapture(e.pointerId);roomPointer(e,"down");return}el.setPointerCapture(e.pointerId);ptrs[e.pointerId]={x:e.clientX,y:e.clientY};var a=list();
    if(a.length===1){downT=performance.now();start={x:e.clientX,y:e.clientY};last=start;mode=tool==="road"||tool==="bulldoze"?"paint":"pan";
      if(mode==="paint")paint(tileAt(e.clientX,e.clientY),true)}
    else if(a.length===2){mode="gesture";var c=cen(a);gest={c:c,d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),ang:Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x)}}});
  el.addEventListener("pointermove",function(e){
    if(roomView){roomPointer(e,"move");return}
    if(!ptrs[e.pointerId]){if(e.pointerType==="mouse")hover(tileAt(e.clientX,e.clientY));return}
    ptrs[e.pointerId].x=e.clientX;ptrs[e.pointerId].y=e.clientY;var a=list();
    if(mode==="pan"&&a.length===1){var p0=groundAt(last.x,last.y),p1=groundAt(e.clientX,e.clientY);if(p0&&p1){cam.tx-=p1.x-p0.x;cam.tz-=p1.z-p0.z;updateCamera(0)}last={x:e.clientX,y:e.clientY};hover(tileAt(e.clientX,e.clientY))}
    else if(mode==="paint")paint(tileAt(e.clientX,e.clientY));
    else if(mode==="gesture"&&a.length===2){var c=cen(a),d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),ang=Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x);
      var g0=groundAt(gest.c.x,gest.c.y),g1=groundAt(c.x,c.y);if(g0&&g1){cam.tx-=g1.x-g0.x;cam.tz-=g1.z-g0.z}
      if(d>10&&gest.d>10){cam.tdist=clamp(cam.tdist*gest.d/d,8,60);cam.dist=cam.tdist}
      var da=ang-gest.ang;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;cam.taz-=da;cam.az=cam.taz;gest={c:c,d:d,ang:ang};updateCamera(0)}});
  function up(e){if(roomView){roomPointer(e,"up");return}if(!ptrs[e.pointerId])return;var was=mode,moved=start?Math.hypot(e.clientX-start.x,e.clientY-start.y):99;delete ptrs[e.pointerId];
    if(was==="paint"&&!list().length)paintEnd();
    if(was==="pan"&&!list().length&&moved<9&&performance.now()-downT<450)tap(tileAt(e.clientX,e.clientY));
    if(!list().length)mode=null;else if(list().length===1&&was==="gesture"){mode="pan";var r=list()[0];last={x:r.x,y:r.y};start=null}}
  el.addEventListener("pointerup",up);el.addEventListener("pointercancel",function(e){delete ptrs[e.pointerId];mode=null});
  el.addEventListener("contextmenu",function(e){e.preventDefault()});
  el.addEventListener("wheel",function(e){e.preventDefault();if(roomView){rcam.tdist=clamp(rcam.tdist*(e.deltaY>0?1.1:1/1.1),6,34);return}cam.tdist=clamp(cam.tdist*(e.deltaY>0?1.12:1/1.12),8,60)},{passive:false});
}

/* ================= tools ================= */
var tool="inspect",poolChoice=null,painted=0;
var ICON={
  inspect:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  road:'<path d="M8 3L5 21M16 3l3 18M12 4v3M12 11v3M12 18v2"/>',
  pool:'<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M6 13c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 3 0"/>',
  boiler:'<rect x="4" y="9" width="12" height="11" rx="1"/><path d="M16 9V4h3v16M8 15c0-2 2-2 2-4 0 2 2 2 2 4a2 2 0 0 1-4 0z"/>',
  heater:'<rect x="7" y="3" width="10" height="18" rx="5"/><path d="M10 9h4M12 13v4"/>',
  house:'<path d="M4 11l8-7 8 7M6 10v10h12V10M10 20v-5h4v5"/>',
  bulldoze:'<path d="M3 17h11l3-6h4M5 17a2 2 0 1 0 0 .1M12 17a2 2 0 1 0 0 .1M14 11l-3-5H6v5"/>'
};
var TOOLS=[["inspect","Inspect"],["road","Road"],["pool","Pool"],["boiler","Boiler room"],["heater","Heater room"],["house","Homes"],["bulldoze","Bulldoze"]];
var HINTS={inspect:"Tap a pool to see how it's doing. Drag to move, pinch to zoom, twist to rotate.",road:"Drag to lay road ($15 a tile). Residents walk the roads to reach the pools.",
  pool:"Choose a pool, then tap where it goes. It needs a road beside it.",boiler:"Tap beside a pool. The boiler room keeps that pool's water warm ($2,500).",
  heater:"Tap beside a pool. The heater room gives it hot showers ($1,800).",house:"Tap beside a road to add homes. More homes, more visitors ($400).",bulldoze:"Tap or drag to clear roads and buildings."};
function drawTools(){
  $("tools").innerHTML=TOOLS.map(function(t){return '<button class="tool" data-tool="'+t[0]+'" aria-pressed="'+(tool===t[0])+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+ICON[t[0]]+'</svg>'+t[1]+'</button>'}).join("");
  var sub=$("sub");
  if(tool==="pool"){
    var built={};pools().forEach(function(p){built[p.name]=1});
    var opts=POOLS.map(function(p){return '<button class="opt" data-pool="'+esc(p.n)+'" aria-pressed="'+(poolChoice===p.n)+'" '+(built[p.n]?"disabled style=\"opacity:.4\"":"")+'><span class="sw" style="background:'+p.c+'"></span>'+esc(p.n)+' <small>'+(built[p.n]?"built":"$8,000")+'</small></button>'});
    opts.unshift('<button class="opt" data-pool="__new" aria-pressed="'+(poolChoice&&!POOLS.some(function(p){return p.n===poolChoice}))+'"><span class="sw" style="background:#7fc4e8"></span>New pool <small>$8,000</small></button>');
    sub.innerHTML=opts.join("");sub.classList.remove("hidden");
  } else sub.classList.add("hidden");
  $("hint").textContent=HINTS[tool];
}
function setTool(t){tool=t;if(t!=="pool")poolChoice=null;ghost.visible=false;drawTools()}
function hover(tl){
  if(!tl||["pool","boiler","heater","house"].indexOf(tool)<0||(tool==="pool"&&!poolChoice)){ghost.visible=false;return}
  var s=SIZE[tool],x=clamp(tl.x-Math.floor((s[0]-1)/2),0,N-s[0]),y=clamp(tl.y-Math.floor((s[1]-1)/2),0,N-s[1]),ok=canPlace(tool,x,y);
  ghost.visible=true;ghost.scale.set(s[0],.4,s[1]);ghost.position.set(x+s[0]/2,0,y+s[1]/2);ghost.material.color.set(ok?"#86d98f":"#ff9277");
}
function paint(tl,first){
  if(!tl)return;var q=tl.y*N+tl.x;
  if(tool==="road"){if(S.money<COST.road){toast("Not enough budget for road.");return}if(S.tiles[q]===T.TREE)S.tiles[q]=T.GRASS;if(road(tl.x,tl.y))painted++}
  else if(tool==="bulldoze"){
    if(S.tiles[q]===T.ROAD||S.tiles[q]===T.TREE){S.tiles[q]=T.GRASS;painted++}
    else if(S.tiles[q]===T.BLD&&first){var b=bld(S.own[q]);if(b&&(b.type!=="pool"||confirm("Remove "+b.name+"? Its history goes with it."))){remove(b);painted++;relink()}}
  }
  if(painted&&tool==="road"){buildWorldSoon()}
  if(painted&&tool==="bulldoze")buildWorldSoon();
}
var rebuildT=0;function buildWorldSoon(){rebuildT=.15}
function paintEnd(){if(painted){relink();buildWorld();save();drawTools()}painted=0}
function tap(tl){
  if(!tl)return;var q=tl.y*N+tl.x;
  if(tool==="inspect"){if(S.tiles[q]===T.BLD){var b=bld(S.own[q]);if(b)openBld(b)}else closePanel();return}
  if(["pool","boiler","heater","house"].indexOf(tool)>=0){
    if(tool==="pool"&&!poolChoice){toast("Pick which pool first.");return}
    var s=SIZE[tool],x=clamp(tl.x-Math.floor((s[0]-1)/2),0,N-s[0]),y=clamp(tl.y-Math.floor((s[1]-1)/2),0,N-s[1]);
    if(S.money<COST[tool]){toast("Not enough budget.");return}
    // trees get cleared for new buildings
    for(var j=0;j<s[1];j++)for(var i=0;i<s[0];i++)if(S.tiles[(y+j)*N+x+i]===T.TREE)S.tiles[(y+j)*N+x+i]=T.GRASS;
    var extra=tool==="pool"?{name:poolChoice==="__new"?"Pool "+(pools().length+1):poolChoice,level:100,ph:7.5,fc:3,temp:72}:tool==="house"?{style:Math.floor(Math.random()*6),fam:3}:null;
    var b2=place(tool,x,y,extra);
    if(!b2){toast("That spot is taken.");return}
    relink();buildWorld();save();ghost.visible=false;
    if(tool==="pool"){toast(b2.name+" is built. Add a boiler room and heater room beside it.");poolChoice=null;drawTools();if(!poolReachable(b2))toast(b2.name+" needs a road beside it so residents can get there.")}
    else if(tool==="boiler"||tool==="heater"){toast(b2.serves?"Now serving "+bld(b2.serves).name+".":"Not close enough to a pool. Build it within 4 tiles.")}
  }
  if(tool==="bulldoze")paintEnd();
}

/* ================= UI ================= */
function faceSVG(m){
  var c=moodCol(m),mouth;
  if(m>=80)mouth='<path d="M7 13.5a5 5 0 0 0 10 0z" fill="#1e2f39"/>';
  else if(m>=60)mouth='<path d="M8 14a4.5 4.5 0 0 0 8 0" stroke="#1e2f39" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
  else if(m>=40)mouth='<path d="M8.5 15h7" stroke="#1e2f39" stroke-width="1.8" stroke-linecap="round"/>';
  else mouth='<path d="M8 17a4.5 4.5 0 0 1 8 0M6.5 7.5l3 1.2M17.5 7.5l-3 1.2" stroke="#1e2f39" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="'+c+'"/><circle cx="8.6" cy="10" r="1.4" fill="#1e2f39"/><circle cx="15.4" cy="10" r="1.4" fill="#1e2f39"/>'+mouth+'</svg>';
}
var labelsOn=true,labelEls={};
function buildLabels(){
  var box=$("labels");box.innerHTML="";labelEls={};
  pools().forEach(function(p){var el=document.createElement("button");el.className="plabel";el.dataset.id=p.id;box.appendChild(el);labelEls[p.id]=el;el.onclick=function(){openBld(p)}});
  paintLabels();
}
function paintLabels(){
  pools().forEach(function(p){var el=labelEls[p.id];if(!el)return;var m=Math.round(p.mood),reach=poolReachable(p);
    var pi=[p.boilerId,p.heaterId].some(function(id){var r=id&&bld(id);return r&&r.eq&&roomIssues(r).length});el.className="plabel"+(m<40||!reach||pi?" warn":"")+(cam.dist>56?" small":"");
    el.innerHTML=faceSVG(m)+'<b class="num">'+swimmers(p)+'</b><span>'+esc(p.name)+(reach?"":" · no road")+'</span><i style="background:'+info(p).c+'"></i>'});
}
var pv=new THREE.Vector3();
function placeLabels(){
  var w=window.innerWidth,h=window.innerHeight;
  pools().forEach(function(p){var el=labelEls[p.id];if(!el)return;
    if(!labelsOn){el.style.display="none";return}
    pv.set(p.x+p.w/2,1.15,p.y+p.h/2).project(camera);
    if(pv.z>1||pv.x<-1.2||pv.x>1.2||pv.y<-1.2||pv.y>1.2){el.style.display="none";return}
    el.style.display="";el.style.transform="translate("+((pv.x+1)/2*w)+"px,"+((1-pv.y)/2*h)+"px) translate(-50%,-100%)"});
}
function fmtTime(t){var mins=Math.floor(t)+360,h=Math.floor(mins/60)%24,m=mins%60;return (h%12||12)+":"+String(m).padStart(2,"0")+(h<12?" AM":" PM")}
var DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
function hud(){
  var tot=0;pools().forEach(function(p){tot+=swimmers(p)});
  $("sSwim").textContent=tot;var h=Math.round(S.happy);$("sSat").textContent=h;
  var bar=$("satBar").firstElementChild;bar.style.width=h+"%";bar.style.background=moodCol(h);
  $("sMoney").textContent=(S.money<0?"-$":"$")+Math.abs(Math.round(S.money)).toLocaleString();
  $("date").textContent=DAYS[(S.day+5)%7]+", day "+S.day+" · "+fmtTime(S.t)+(S.t>CLOSE?" · closed":"");
  var bad=pools().filter(function(p){return p.mood<40||!poolReachable(p)}).length+S.blds.filter(function(r){return r.eq&&roomIssues(r).length}).length;
  $("cAlerts").textContent=bad||"";$("cPools").textContent=pools().length||"";
}
function say(t){news.push(t);if(news.length>6)news.shift();var tk=$("ticker");$("tickText").textContent=t;tk.classList.remove("quiet");clearTimeout(say.h);say.h=setTimeout(function(){tk.classList.add("quiet")},6500)}
function toast(t){var el=$("toast");el.textContent=t;el.classList.remove("hidden");clearTimeout(toast.h);toast.h=setTimeout(function(){el.classList.add("hidden")},2800)}

/* ---- panels ---- */
var openId=null,panelKind=null;
function closePanel(){$("panel").classList.add("hidden");openId=null;panelKind=null}
function openBld(b){
  if(b.type==="house"){toast("Home: a family of "+(b.fam||3)+". They walk to whichever pool makes them happiest.");return}
  openId=b.id;panelKind="bld";drawPanel();$("panel").classList.remove("hidden");
  cam.tx=b.x+b.w/2;cam.tz=b.y+b.h/2+ (window.innerWidth<620?3:0);
}
function gauge(label,val,txt,min,max,lo,hi,note){
  var st=val<lo||val>hi?((val<lo-(hi-lo)*.25||val>hi+(hi-lo)*.25)?"bad":"warn"):"ok";
  var pct=function(v){return clamp((v-min)/(max-min)*100,0,100)};
  return '<div class="gauge"><div class="gl"><span>'+label+'</span><b class="num '+st+'">'+txt+'</b></div><div class="gbar"><span class="band" style="left:'+pct(lo)+'%;width:'+(pct(hi)-pct(lo))+'%"></span><span class="mk" style="left:'+pct(val)+'%"></span></div>'+(note?'<small>'+note+'</small>':'')+'</div>';
}
function roomRow(kind,p){
  var id=p[kind+"Id"],r=id&&bld(id),label=kind==="boiler"?"Boiler room":"Heater room",ic=kind==="boiler"?"🔥":"🚿",bg=kind==="boiler"?"rgba(224,135,74,.25)":"rgba(90,167,224,.25)";
  if(!r)return '<div class="plant"><span class="ic" style="background:rgba(255,146,119,.18)">'+ic+'</span><span><b>'+label+' missing</b><small>'+(kind==="boiler"?"No heating, weak filtration, chlorine by hand.":"Cold showers. Residents notice.")+' Build one within 4 tiles.</small></span><button class="btn ghost" data-act="build-'+kind+'">Build</button></div>';
  var iss=roomIssues(r),worst=r.eq.slice().sort(function(a,b){return a.c-b.c})[0],pl=plant(p);
  var line=iss.length?(worst.c<=0?eqName(worst)+" is broken":eqName(worst)+" is failing")+(iss.length>1?" (+"+(iss.length-1)+" more)":""):
    (kind==="boiler"?"Heating, pumps and filters running":"Showers running "+pl.showers);
  return '<div class="plant"'+(iss.length?' style="outline:1px solid rgba(255,146,119,.5)"':'')+'><span class="ic" style="background:'+bg+'">'+ic+'</span><span><b>'+label+'</b><small style="'+(iss.length?"color:var(--bad)":"")+'">'+esc(line)+'</small></span><button class="btn" data-inside="'+r.id+'">Go inside</button></div>';
}
function drawPanel(){
  if(panelKind==="board"){drawBoard();return}
  if(panelKind==="save"){if(!$("pBody").innerHTML)drawSave();return}
  var b=bld(openId);if(!b){closePanel();return}
  var body=$("pBody");
  if(panelKind==="inside"){drawInside();return}
  if(b.type==="pool"){
    var m=Math.round(b.mood),sw=swimmers(b),why=b._why&&b._why.length?b._why.slice(0,2).join(". ")+".":"Everything is just right.";
    $("pTitle").innerHTML='<span class="sw" style="background:'+info(b).c+'"></span>'+esc(b.name);
    var walking=people.filter(function(a){return a.pool===b.id&&a.st==="walk"}).length;
    setBody('<div class="big3"><div><b class="num">'+sw+'</b><small>Swimming of '+CAP+'</small></div><div><b class="num">'+walking+'</b><small>On the way</small></div><div><b class="num">'+b.visits+'</b><small>Visits today</small></div></div>'+
      '<div class="moodline">'+faceSVG(m)+'<span><b>'+moodWord(m)+' · '+m+'</b><small>'+esc(why)+'</small></span></div>'+
      (poolReachable(b)?'':'<p style="color:var(--bad)">No road touches this pool, so nobody can get there. Lay a road beside it.</p>')+
      '<h3>Water</h3>'+
      gauge("Water level",b.level,Math.round(b.level)+"%",50,100,92,100,"Splash-out and evaporation lower it all day.")+
      gauge("pH",b.ph,b.ph.toFixed(1),6.8,8.4,7.2,7.8,"Drifts up through the day. Ideal 7.2 to 7.8.")+
      gauge("Free chlorine",b.fc,b.fc.toFixed(1)+" ppm",0,8,1,5,"Swimmers and sun use it up.")+
      gauge("Water temperature",b.temp,Math.round(b.temp)+"°F",65,95,78,86,b.boilerId?"Boiler room is heating.":"No boiler room. Water follows the air.")+
      '<div class="acts"><button class="btn" data-act="fill">Top up water <small>$60</small></button><button class="btn" data-act="chlor">Add chlorine <small>$40</small></button>'+
      '<button class="btn" data-act="acid">Add acid (pH down) <small>$30</small></button><button class="btn ghost" data-act="soda">Soda ash (pH up) <small>$30</small></button></div>'+
      '<h3>Plant</h3>'+roomRow("boiler",b)+roomRow("heater",b));
  } else {
    var p=b.serves&&bld(b.serves),kind=b.type,iss=roomIssues(b);
    $("pTitle").textContent=(kind==="boiler"?"Boiler room":"Heater room")+(p?" · "+p.name:"");
    setBody('<p>'+(p?(kind==="boiler"?"Heats "+esc(p.name)+". Water there is "+Math.round(p.temp)+"°F.":"Hot showers for "+esc(p.name)+"."):"Not serving any pool. Move it within 4 tiles of a pool that doesn't have one.")+'</p>'+
      '<p style="color:'+(iss.length?"var(--bad)":"var(--good)")+'">'+(iss.length?iss.length+" item"+(iss.length>1?"s need":" needs")+" work.":"Everything is running.")+'</p>'+
      '<div class="btns"><button class="btn" data-inside="'+b.id+'">Go inside</button></div>'+
      (p?'<div class="btns"><button class="btn ghost" data-open="'+p.id+'">Go to '+esc(p.name)+'</button></div>':''));
  }
}
function drawBoard(){
  $("pTitle").textContent="Pool board";
  var ps=pools().slice().sort(function(a,b){return a.mood-b.mood});
  var bh='<p>Worst first. Tap a pool to go there.</p>'+ps.map(function(p){var m=Math.round(p.mood);
    return '<button class="boardItem" data-open="'+p.id+'">'+faceSVG(m)+'<span><b><span class="sw" style="background:'+info(p).c+'"></span>'+esc(p.name)+'</b><small>'+moodWord(m)+(p._why&&p._why[0]?" · "+esc(p._why[0]):"")+'</small></span><span class="n"><b class="num">'+swimmers(p)+'</b><small>swimming</small></span></button>'}).join("")||'<p>No pools yet. Use the Pool tool to build one.</p>';
  var rr=S.blds.filter(function(r){return r.eq&&roomIssues(r).length});
  if(rr.length)bh+='<h3>Plant that needs work</h3>'+rr.map(function(r){var p=r.serves&&bld(r.serves),w=r.eq.slice().sort(function(a,b){return a.c-b.c})[0];
    return '<button class="boardItem" data-inside="'+r.id+'"><span class="ic" style="width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:'+(r.type==="boiler"?"rgba(224,135,74,.25)":"rgba(90,167,224,.25)")+'">'+(r.type==="boiler"?"🔥":"🚿")+'</span><span><b>'+(p?esc(p.name)+" · ":"")+(r.type==="boiler"?"Boiler room":"Heater room")+'</b><small style="color:var(--bad)">'+esc(eqName(w))+": "+condWord(Math.round(w.c)).toLowerCase()+'</small></span><span class="n"><b class="num">'+roomIssues(r).length+'</b><small>to fix</small></span></button>'}).join("");
  setBody(bh);
}
var lastBody="",holdPanel=0;
function setBody(h){if(h===lastBody&&$("pBody").innerHTML)return;if(performance.now()<holdPanel)return;lastBody=h;$("pBody").innerHTML=h}
$("panel").addEventListener("pointerdown",function(){holdPanel=performance.now()+1200});
$("panel").addEventListener("pointerup",function(){holdPanel=performance.now()+400});
function drawSave(){
  $("pTitle").textContent="Saving";
  setBody('<p style="color:var(--ink)">PoolRules saves by itself every few seconds, and whenever you build, repair or treat a pool. It keeps a backup copy too.</p>'+
    '<div class="row"><span>Last saved</span><b class="num">'+(lastSaved?new Date(lastSaved).toLocaleString([],{weekday:"short",hour:"numeric",minute:"2-digit",second:"2-digit"}):"Not yet")+'</b></div>'+
    '<div class="row"><span>Game</span><b class="num">Day '+S.day+', '+fmtTime(S.t)+'</b></div>'+
    '<div class="btns"><button class="btn" data-save="now">Save now</button></div>'+
    '<h3>Move your game to another device</h3><p>The website and the phone app each save separately. Download a save file here, then load it on the other one.</p>'+
    '<div class="btns"><button class="btn" data-save="download">Download save file</button><button class="btn ghost" data-save="upload">Load save file</button></div>'+
    '<div class="btns"><button class="btn ghost" data-save="copy">Copy save code</button><button class="btn ghost" data-save="paste">Paste save code</button></div>'+
    '<p class="tip">Saves stay in this browser. Clearing browsing data or using a private window removes them, so download a save file now and then.</p>');
}
function openSave(){panelKind="save";openId=-1;lastBody="";drawSave();$("panel").classList.remove("hidden")}
function saveAction(a){
  if(a==="now"){save();toast("Saved.");drawSave();return}
  var name="PoolRules-day"+S.day+".json";
  if(a==="download"){save();var blob=new Blob([snapshot()],{type:"application/json"}),u=URL.createObjectURL(blob),l=document.createElement("a");
    l.href=u;l.download=name;document.body.appendChild(l);l.click();setTimeout(function(){URL.revokeObjectURL(u);l.remove()},500);
    if(navigator.share&&navigator.canShare){try{var f=new File([snapshot()],name,{type:"application/json"});if(navigator.canShare({files:[f]}))navigator.share({files:[f],title:name}).catch(function(){})}catch(e){}}
    toast("Save file downloaded.");return}
  if(a==="upload"){var inp=document.createElement("input");inp.type="file";inp.accept=".json,application/json,text/plain";
    inp.style.display="none";document.body.appendChild(inp);
    inp.onchange=function(){var f=inp.files&&inp.files[0];inp.remove();if(!f)return;var rd=new FileReader();rd.onload=function(){if(confirm("Replace your current game with this save?"))loadFrom(rd.result)};rd.readAsText(f)};inp.click();return}
  if(a==="copy"){save();var t=snapshot();(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){toast("Save code copied. Paste it on the other device.")},function(){prompt("Copy this save code:",t)});return}
  if(a==="paste"){var code=prompt("Paste a PoolRules save code:");if(code&&confirm("Replace your current game with this save?"))loadFrom(code);return}
}
function openBoard(){panelKind="board";openId=-1;drawBoard();$("panel").classList.remove("hidden")}
function act(a){holdPanel=0;
  var b=bld(openId);if(!b)return;
  var cost={fill:60,chlor:40,acid:30,soda:30}[a];
  if(cost){if(S.money<cost){toast("Not enough budget.");return}S.money-=cost;
    if(a==="fill"){b.level=100;toast("Topped up "+b.name+".")}
    if(a==="chlor"){b.fc=clamp(b.fc+1.5,0,10);b.ph=clamp(b.ph+.05,6.6,8.6);toast("Chlorine added.")}
    if(a==="acid"){b.ph=clamp(b.ph-.3,6.6,8.6);toast("Acid added. pH is "+b.ph.toFixed(1)+".")}
    if(a==="soda"){b.ph=clamp(b.ph+.3,6.6,8.6);toast("Soda ash added. pH is "+b.ph.toFixed(1)+".")}
    save();drawPanel();return}
  if(a==="build-boiler"||a==="build-heater"){closePanel();setTool(a.slice(6));toast("Tap a spot within 4 tiles of "+b.name+".")}
}
document.addEventListener("click",function(e){
  var t=e.target.closest("button");if(!t)return;var d=t.dataset;holdPanel=0;
  if(d.tool){setTool(d.tool);return}
  if(d.pool){poolChoice=d.pool;drawTools();return}
  if(d.act){act(d.act);return}
  if(d.inside){enterRoom(+d.inside);return}
  if(d.save){saveAction(d.save);return}
  if(d.fix){var fx=d.fix.split(":"),fr=bld(openId);if(fr)fixEquip(fr,+fx[0],+fx[1]);return}
  if(d.open){var p=bld(+d.open);if(p)openBld(p);return}
  if(d.speed!=null){speed=+d.speed;[].forEach.call(document.querySelectorAll("#speed button"),function(x){x.setAttribute("aria-pressed",x===t)});return}
  if(d.cam){if(d.cam==="rl")cam.taz-=Math.PI/2;if(d.cam==="rr")cam.taz+=Math.PI/2;if(d.cam==="zi")cam.tdist=clamp(cam.tdist/1.25,8,60);if(d.cam==="zo")cam.tdist=clamp(cam.tdist*1.25,8,60);return}
});
$("pClose").onclick=closePanel;$("office").onclick=openBoard;$("bBoard").onclick=openBoard;
$("bAlerts").onclick=function(){var bad=pools().filter(function(p){return p.mood<40||!poolReachable(p)}).sort(function(a,b){return a.mood-b.mood});if(bad.length){openBld(bad[0]);return}
  var rr=S.blds.filter(function(r){return r.eq&&roomIssues(r).length});if(rr.length){openBld(rr[0]);return}toast("Every pool and room is doing fine.")};
$("bSave").onclick=openSave;
$("bLabels").onclick=function(){labelsOn=!labelsOn;toast(labelsOn?"Pool labels on.":"Pool labels off.")};
function begin(){document.body.classList.remove("titling");$("title").classList.add("hidden");say("Pools open at 6:00. Watch the faces: happy residents keep coming.")}
$("tGo").onclick=begin;
$("tNew").onclick=function(){if(S.blds.some(function(b){return b.type==="pool"})&&!confirm("Start a fresh map? The current map is replaced."))return;fresh();buildWorld();save();begin();setTool("pool")};

/* ================= plant: boiler rooms and heater rooms, each pool's own ================= */
// Every pool's rooms are laid out differently. Kinds: boiler, pump, filter, feeder (boiler room);
// tank, tankless, recirc, mix, exp (heater room).
var ROOMSPEC={
  "Splash Landing":{wall:"#d9cdb8",floor:"#9a958c",trim:"#45b8b0",flip:false,
    boiler:{boilers:[["gas",1]],pumps:2,filters:["sand",2],feeder:"controller"},
    heater:{tanks:["tank",2],recirc:true,mix:true,exp:true}},
  "Aviator":{wall:"#c9d3d8",floor:"#8e9296",trim:"#5b8def",flip:true,
    boiler:{boilers:[["gas",2]],pumps:2,filters:["cartridge",3],feeder:"tank"},
    heater:{tanks:["tankless",2],recirc:true,mix:true,exp:false}},
  "F-15":{wall:"#e2d6c2",floor:"#a09a8e",trim:"#e0874a",flip:false,
    boiler:{boilers:[["condensing",1]],pumps:1,filters:["sand",2],feeder:"tank"},
    heater:{tanks:["tank",1],recirc:true,mix:false,exp:true}},
  "Jet Stream":{wall:"#d5cde0",floor:"#918c99",trim:"#b06fd8",flip:true,
    boiler:{boilers:[["gas",1]],pumps:3,filters:["cartridge",4],feeder:"controller"},
    heater:{tanks:["tank",1],recirc:true,mix:true,exp:true}},
  "Puddle Jumper":{wall:"#e6dcb4",floor:"#9d9887",trim:"#e8c547",flip:false,
    boiler:{boilers:[["gas",1]],pumps:2,filters:["sand",3],feeder:"tank"},
    heater:{tanks:["tankless",2],recirc:true,mix:true,exp:true}},
  "Maverick":{wall:"#dccac6",floor:"#958c8a",trim:"#d75b5b",flip:true,
    boiler:{boilers:[["condensing",2]],pumps:2,filters:["sand",2],feeder:"controller"},
    heater:{tanks:["tank",1],recirc:false,mix:true,exp:true}},
  "Runway 35":{wall:"#cfdcc8",floor:"#8f978b",trim:"#6cc070",flip:false,
    boiler:{boilers:[["gas",1]],pumps:1,filters:["sand",3],feeder:"controller"},
    heater:{tanks:["tank",2],recirc:true,mix:true,exp:true}}
};
function specFor(name){
  if(ROOMSPEC[name])return ROOMSPEC[name];
  var h=0;for(var i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))>>>0;
  var walls=["#d9cdb8","#c9d3d8","#e2d6c2","#d5cde0","#cfdcc8"];
  return {wall:walls[h%5],floor:"#979289",trim:"#7fc4e8",flip:!!(h&1),
    boiler:{boilers:[[h&2?"gas":"condensing",1+(h>>2)%2]],pumps:1+(h>>3)%3,filters:[h&16?"sand":"cartridge",2+(h>>5)%2],feeder:h&64?"tank":"controller"},
    heater:{tanks:[h&128?"tank":"tankless",1+(h>>8)%2],recirc:true,mix:!!(h&512),exp:true}};
}
var EQ={
  boiler:{n:{gas:"Gas pool heater",condensing:"Condensing boiler"},wear:.006,cost:[450,3800],acts:["Repair","Replace"]},
  pump:{n:"Circulation pump",wear:.009,cost:[220,950],acts:["Repair","Replace"]},
  filter:{n:{sand:"Sand filter",cartridge:"Cartridge filter"},wear:.005,cost:[60,700],acts:["Backwash","New media"]},
  feeder:{n:{tank:"Chlorine feeder",controller:"Chemical controller"},wear:.007,cost:[120,550],acts:["Repair","Replace"]},
  tank:{n:"Water heater",wear:.005,cost:[280,1900],acts:["Repair","Replace"]},
  tankless:{n:"Tankless heater",wear:.006,cost:[260,1500],acts:["Repair","Replace"]},
  recirc:{n:"Recirculation pump",wear:.008,cost:[140,480],acts:["Repair","Replace"]},
  mix:{n:"Mixing valve",wear:.004,cost:[90,320],acts:["Repair","Replace"]},
  exp:{n:"Expansion tank",wear:.004,cost:[70,280],acts:["Repair","Replace"]}
};
function eqName(e){var d=EQ[e.k].n;return (typeof d==="string"?d:d[e.v])+(e.num?" "+e.num:"")}
function makeEquip(r){
  var p=r.serves&&bld(r.serves),sp=specFor(p?p.name:"Pool "+r.id),list=[],fx=1;
  var add=function(k,v,x,z,num){list.push({k:k,v:v||"",x:x*fx,z:z,num:num||0,c:Math.round(rnd(72,100))})};
  if(r.type==="boiler"){var s=sp.boiler,i;
    var nf=s.filters[1],fw=s.filters[0]==="sand"?1.15:.95;
    for(i=0;i<nf;i++)add("filter",s.filters[0],-3.3+i*fw,-2.55,nf>1?String.fromCharCode(65+i):0);
    var nb=s.boilers[0][1];for(i=0;i<nb;i++)add("boiler",s.boilers[0][0],3.2,-2.1+i*1.55,nb>1?i+1:0);
    for(i=0;i<s.pumps;i++)add("pump","",-3.2+i*1.15,.7,s.pumps>1?i+1:0);
    add("feeder",s.feeder,s.feeder==="controller"?-4.3:-3.7,s.feeder==="controller"?2.1:2.4);
  } else {var h=sp.heater,j;
    for(j=0;j<h.tanks[1];j++)add(h.tanks[0],"",-2.6+j*1.5,h.tanks[0]==="tank"?-2.6:-3.3,h.tanks[1]>1?j+1:0);
    if(h.recirc)add("recirc","",.9,.6);
    if(h.mix)add("mix","",-1.2,.4);
    if(h.exp)add("exp","",3.1,-1.4);
  }
  r.eq=list;r.eqFor=p?p.name:null;r.log=r.log||[];
}
function ensureEquip(){
  S.blds.forEach(function(r){if(r.type!=="boiler"&&r.type!=="heater")return;var p=r.serves&&bld(r.serves),nm=p?p.name:null;
    if(!r.eq||(nm&&r.eqFor!==nm))makeEquip(r)});
}
function roomIssues(r){return (r.eq||[]).filter(function(e){return e.c<=0||e.c<25})}
function condWord(c){return c<=0?"Broken":c<25?"Failing":c<55?"Worn":c<85?"Good":"Like new"}
function condCol(c){return c<=0?"#ff6f61":c<25?"#ff9f6b":c<55?"#f3c66b":"#86d98f"}
// what a pool's plant is doing right now
function plant(p){
  var br=p.boilerId&&bld(p.boilerId),hr=p.heaterId&&bld(p.heaterId),o={heat:0,circ:.55,filt:.55,feeder:false,showers:"cold",br:br,hr:hr};
  if(br&&br.eq){
    var bs=br.eq.filter(function(e){return e.k==="boiler"}),ps=br.eq.filter(function(e){return e.k==="pump"}),fs=br.eq.filter(function(e){return e.k==="filter"}),fd=br.eq.filter(function(e){return e.k==="feeder"})[0];
    o.heat=bs.length?bs.reduce(function(a,e){return a+(e.c<=0?0:e.c<20?.5:1)},0)/bs.length:0;
    o.circ=ps.length?ps.filter(function(e){return e.c>0}).length/ps.length:0;
    o.filt=fs.length?fs.reduce(function(a,e){return a+Math.max(0,e.c)},0)/fs.length/100:0;
    o.feeder=!!(fd&&fd.c>0);
  }
  if(hr&&hr.eq){
    var ts=hr.eq.filter(function(e){return e.k==="tank"||e.k==="tankless"}),rc=hr.eq.filter(function(e){return e.k==="recirc"})[0],mx=hr.eq.filter(function(e){return e.k==="mix"})[0];
    var tw=ts.filter(function(e){return e.c>0}).length;
    o.showers=!tw?"cold":(tw<ts.length||(rc&&rc.c<=0)||(mx&&mx.c<=0))?"warm":"hot";
  }
  return o;
}
function wearRooms(dm){
  var open=S.t>=OPEN&&S.t<=CLOSE;
  S.blds.forEach(function(r){if(!r.eq)return;var p=r.serves&&bld(r.serves),sw=p?swimmers(p):0;
    var expBroken=r.eq.some(function(e){return e.k==="exp"&&e.c<=0});
    r.eq.forEach(function(e){if(e.c<=0)return;
      var w=EQ[e.k].wear*(open?1:.25);
      if(e.k==="filter")w+=sw*.00035;
      if((e.k==="tank"||e.k==="tankless")&&expBroken)w*=3;
      e.c=Math.max(0,e.c-w*dm);
      if(e.c>0&&e.c<30&&Math.random()<dm*.0018*(30-e.c)/30)e.c=0;
      if(e.c<=0){e.c=0;r.log.unshift({d:S.day,t:S.t,txt:eqName(e)+" failed"});if(r.log.length>40)r.log.pop();
        say((p?p.name+": ":"")+eqName(e).toLowerCase()+" failed. "+breakNote(e));
        if(roomView&&roomView.id===r.id)paintRoomEquip()}
    });
  });
}
function breakNote(e){return {boiler:"The pool will start to cool.",pump:"Water stops circulating and will cloud.",filter:"Water will cloud.",feeder:"Chlorine won't be topped up on its own.",
  tank:"Showers are going cold.",tankless:"Showers are going cold.",recirc:"Showers run lukewarm.",mix:"Showers run lukewarm.",exp:"The water heaters will wear out fast."}[e.k]}
function fixEquip(r,i,which){holdPanel=0;
  var e=r.eq[i];if(!e)return;var price=EQ[e.k].cost[which];
  if(S.money<price){toast("Not enough budget.");return}
  S.money-=price;var act=EQ[e.k].acts[which];
  if(which===1)e.c=100;else if(e.k==="filter")e.c=Math.max(e.c,92);else e.c=Math.max(e.c<=0?55:e.c,Math.min(85,e.c+45));
  r.log.unshift({d:S.day,t:S.t,txt:(which===1?(e.k==="filter"?"New media in ":"Replaced "):(e.k==="filter"?"Backwashed ":"Repaired "))+eqName(e).toLowerCase()+" ($"+price.toLocaleString()+")"});
  if(r.log.length>40)r.log.pop();
  toast(act+" done: "+eqName(e)+".");save();
  if(roomView&&roomView.id===r.id){paintRoomEquip();sparkle(i)}
  drawPanel();
}

/* ---- map: warning markers over rooms that need work ---- */
var warnSprites={},warnMat=null;
function warnTexture(){
  if(warnMat)return warnMat;var cv=document.createElement("canvas");cv.width=cv.height=96;var x=cv.getContext("2d");
  x.fillStyle="#ff6f61";x.beginPath();x.moveTo(48,6);x.lineTo(92,86);x.lineTo(4,86);x.closePath();x.fill();
  x.fillStyle="#fff";x.fillRect(43,30,10,32);x.fillRect(43,68,10,10);
  var t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return warnMat=new THREE.SpriteMaterial({map:t,depthWrite:false,transparent:true});
}
function updateWarnings(){
  var keep={};
  S.blds.forEach(function(r){if(!r.eq||!roomIssues(r).length)return;keep[r.id]=1;
    if(!warnSprites[r.id]){var s=new THREE.Sprite(warnTexture());s.scale.set(.9,.9,1);s.position.set(r.x+r.w/2,2.3,r.y+r.h/2);scene.add(s);warnSprites[r.id]=s}});
  for(var k in warnSprites)if(!keep[k]){scene.remove(warnSprites[k]);delete warnSprites[k]}
  var t=performance.now()/1000;for(var k2 in warnSprites)warnSprites[k2].position.y=2.2+Math.sin(t*3)*.12;
}

/* ---- inside a room ---- */
var MOBD=24,MOBE=.9,MOBY=-3.6,MOBZ=-.5;var roomScene=null,roomCam=null,roomView=null,rcam={az:.7,el:.62,dist:12.5,taz:.7,tdist:12.5},roomMeshes=[],roomAnim=[],sparks=[];
var rmat=function(c,o){return new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.7,metalness:0},o||{}))};
function rb(g,w,h,d,m,x,y,z){var o=new THREE.Mesh(G.box,m);o.scale.set(w,h,d);o.position.set(x||0,y||0,z||0);o.castShadow=true;o.receiveShadow=true;g.add(o);return o}
function rc(g,r,h,m,x,y,z){var o=new THREE.Mesh(G.cyl,m);o.scale.set(r*2,h,r*2);o.position.set(x||0,y||0,z||0);o.castShadow=true;o.receiveShadow=true;g.add(o);return o}
function pipe(g,m,a,b,r){var dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],L=Math.hypot(dx,dy,dz);if(L<.01)return;
  var o=new THREE.Mesh(G.cyl,m);o.scale.set(r*2,L,r*2);o.position.set(a[0],a[1],a[2]);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(dx/L,dy/L,dz/L));o.castShadow=true;g.add(o);return o}
var STEEL=null,BLUE=null,HOT=null;
function equipMesh(e,sp){
  var g=new THREE.Group(),body,light;g.position.set(e.x,0,e.z);
  var C=function(c,o){return rmat(c,o)};
  if(e.k==="filter"){
    if(e.v==="sand"){body=rc(g,.46,1.25,C(sp.filterCol||"#3d6f9e",{roughness:.45}),0,.12,0);var dome=new THREE.Mesh(G.sph,body.material);dome.scale.set(.92,.5,.92);dome.position.y=1.37;dome.castShadow=true;g.add(dome);rc(g,.5,.12,C("#2b3b45"),0,0,0)}
    else{body=rc(g,.36,.95,C("#e9eef0",{roughness:.4}),0,.1,0);rc(g,.38,.12,C(sp.trim),0,.85,0);rc(g,.38,.1,C("#2b3b45"),0,0,0)}
    rc(g,.06,.06,C("#f4efe2"),.0,body.position.y+body.scale.y+.05,.32);light=rc(g,.05,.08,C("#86d98f",{emissive:"#000"}),.18,body.position.y+body.scale.y-.1,.38);
  } else if(e.k==="pump"){
    rb(g,.75,.12,.42,C("#2b3b45"),0,0,0);
    body=new THREE.Mesh(G.cyl,C("#3f6fa0",{roughness:.4,metalness:.3}));body.scale.set(.36,.55,.36);body.rotation.z=Math.PI/2;body.position.set(.1,.32,0);body.castShadow=true;g.add(body);
    var vol=new THREE.Mesh(G.sph,C("#2f5f8f",{metalness:.3,roughness:.4}));vol.scale.setScalar(.42);vol.position.set(-.28,.32,0);vol.castShadow=true;g.add(vol);
    var fan=rb(g,.04,.22,.04,C("#c9ced2",{metalness:.6}),.4,.21,0);roomAnim.push({m:fan,e:e,spin:true});light=rc(g,.04,.06,C("#86d98f"),.1,.52,.12);
  } else if(e.k==="boiler"){
    if(e.v==="gas"){body=rb(g,1.0,1.25,.85,C("#c4cbd0",{roughness:.45,metalness:.2}),0,0,0);rb(g,1.02,.08,.87,C(sp.trim),0,1.25,0);rb(g,.36,.24,.02,C("#1e2f39"),-.15,.85,.43);
      rc(g,.12,1.6,C("#9a8f84",{metalness:.4}),.25,1.33,-.2);var flame=rb(g,.16,.1,.02,C("#ff9f43",{emissive:"#ff7a1a",emissiveIntensity:1.2}),.2,.35,.43);roomAnim.push({m:flame,e:e,flame:true})}
    else{body=rb(g,.7,1.05,.5,C("#f1f1ee",{roughness:.35}),0,.5,0);rb(g,.72,.08,.52,C(sp.trim),0,1.55,0);rb(g,.3,.18,.02,C("#1e2f39"),0,1.2,.26);
      pipe(g,C("#e9eef0"),[-.15,1.6,0],[-.15,2.6,0],.05);pipe(g,C("#e9eef0"),[.15,1.6,0],[.15,2.6,0],.05)}
    light=rc(g,.04,.06,C("#86d98f"),.38,1.1,.43);
  } else if(e.k==="feeder"){
    if(e.v==="controller"){body=rb(g,.12,.6,.5,C("#e9eef0"),0,1.2,0);rb(g,.02,.22,.32,C("#2b6f8a",{emissive:"#2b6f8a",emissiveIntensity:.6}),.07,1.45,0);light=rc(g,.035,.04,C("#86d98f"),.08,1.28,.17)}
    else{body=rc(g,.26,.75,C("#f4f6f6",{roughness:.3,transparent:true,opacity:.9}),0,0,0);rc(g,.27,.08,C(sp.trim),0,.75,0);rb(g,.26,.18,.2,C("#2b3b45"),.4,.0,0);light=rc(g,.035,.04,C("#86d98f"),.4,.2,.1)}
  } else if(e.k==="tank"){
    body=rc(g,.42,1.65,C("#e9eef0",{roughness:.35,metalness:.15}),0,.05,0);rc(g,.44,.08,C(sp.trim),0,1.4,0);rc(g,.1,1.2,C("#9a8f84",{metalness:.4}),0,1.7,0);
    rc(g,.44,.06,C("#2b3b45"),0,0,0);light=rc(g,.04,.05,C("#86d98f"),.0,.45,.42);var fl=rb(g,.12,.06,.02,C("#ff9f43",{emissive:"#ff7a1a",emissiveIntensity:1}),0,.22,.43);roomAnim.push({m:fl,e:e,flame:true});
  } else if(e.k==="tankless"){
    body=rb(g,.6,.8,.26,C("#f1f1ee",{roughness:.35}),0,1.0,.13);rb(g,.3,.15,.02,C("#1e2f39"),0,1.55,.27);light=rc(g,.035,.04,C("#86d98f"),.2,1.2,.27);
    pipe(g,C("#c98a4a",{metalness:.5}),[-.15,1.0,.15],[-.15,.35,.15],.04);pipe(g,C("#c98a4a",{metalness:.5}),[.15,1.0,.15],[.15,.35,.15],.04);
  } else if(e.k==="recirc"){
    rb(g,.4,.08,.26,C("#2b3b45"),0,0,0);body=new THREE.Mesh(G.cyl,C("#b5532f",{roughness:.4,metalness:.3}));body.scale.set(.22,.34,.22);body.rotation.z=Math.PI/2;body.position.set(0,.2,0);body.castShadow=true;g.add(body);light=rc(g,.03,.04,C("#86d98f"),0,.33,.1);
    pipe(g,C("#c98a4a",{metalness:.5}),[.2,.2,0],[.2,2.2,0],.04);
  } else if(e.k==="mix"){
    pipe(g,C("#c98a4a",{metalness:.5}),[0,0,0],[0,2.2,0],.05);body=new THREE.Mesh(G.sph,C("#d9b44a",{metalness:.6,roughness:.3}));body.scale.setScalar(.26);body.position.y=.9;g.add(body);
    rb(g,.32,.05,.05,C("#d75b5b"),0,1.05,0);light=rc(g,.03,.04,C("#86d98f"),.0,1.2,.1);
  } else if(e.k==="exp"){
    rc(g,.05,.6,C("#9a8f84",{metalness:.4}),0,0,0);body=new THREE.Mesh(G.sph,C("#5aa7e0",{roughness:.4}));body.scale.set(.55,.75,.55);body.position.y=.95;body.castShadow=true;g.add(body);light=rc(g,.03,.04,C("#86d98f"),0,.65,.1);
  }
  g.userData={eq:e,body:body,light:light,base:body.material.color.clone()};
  return g;
}
function buildRoom(r){
  roomScene=new THREE.Scene();roomScene.background=new THREE.Color("#1a2a33");
  roomScene.add(new THREE.HemisphereLight("#fff4dd","#3b4f5c",1.0));roomScene.add(new THREE.AmbientLight("#9fb8d0",.3));
  var d=new THREE.DirectionalLight("#fff0d4",1.8);d.position.set(6,10,7);d.castShadow=true;d.shadow.mapSize.set(1024,1024);var sc=d.shadow.camera;sc.left=-8;sc.right=8;sc.top=8;sc.bottom=-8;d.shadow.bias=-.0008;roomScene.add(d);
  var pl=new THREE.PointLight("#ffe2b0",14,14);pl.position.set(-1,2.8,-1);roomScene.add(pl);
  var p=r.serves&&bld(r.serves),sp=specFor(p?p.name:"Pool "+r.id),g=new THREE.Group();roomScene.add(g);
  var W=9,D=7,fx=1;
  rb(g,W,.1,D,rmat(sp.floor,{roughness:.95}),0,-.1,0);
  rb(g,W,3.1,.15,rmat(sp.wall),0,0,-D/2-.07);rb(g,.15,3.1,D,rmat(sp.wall),-W/2*fx-.07*fx,0,0);
  rb(g,W,.18,.17,rmat(sp.trim),0,0,-D/2+.02);rb(g,.17,.18,D,rmat(sp.trim),(-W/2+.02)*fx,0,0);
  rc(g,.22,.02,rmat("#3a3f44"),.6,0,.4); // floor drain
  // door and sign
  rb(g,.06,2.1,1.0,rmat(r.type==="boiler"?"#e0874a":"#5aa7e0"),(-W/2+.05)*fx,0,1.8);
  var cv=document.createElement("canvas");cv.width=512;cv.height=128;var x=cv.getContext("2d");x.fillStyle="#1e2f39";x.fillRect(0,0,512,128);x.fillStyle=sp.trim;x.fillRect(0,0,16,128);
  x.fillStyle="#f6efe4";x.font="600 54px Barlow Condensed, Arial Narrow, sans-serif";x.fillText((p?p.name:"Unassigned")+" · "+(r.type==="boiler"?"Boiler room":"Heater room"),34,82);
  var tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;var sign=new THREE.Mesh(new THREE.PlaneGeometry(3,.75),new THREE.MeshBasicMaterial({map:tex}));sign.position.set(.4*fx,2.55,-D/2+.02);g.add(sign);
  // pipes along the back wall
  STEEL=rmat("#b9c2c8",{metalness:.5,roughness:.35});BLUE=rmat("#3f7fbf",{metalness:.2,roughness:.4});HOT=rmat(r.type==="boiler"?"#d0683f":"#c98a4a",{metalness:.4,roughness:.4});
  pipe(g,BLUE,[-W/2+.3,2.05,-D/2+.25],[W/2-.3,2.05,-D/2+.25],.08);pipe(g,HOT,[-W/2+.3,1.8,-D/2+.45],[W/2-.3,1.8,-D/2+.45],.08);
  rb(g,1.1,.08,.25,rmat("#f6efe4",{emissive:"#fff4dd",emissiveIntensity:.8}),-2*fx,2.9,-D/2+.15);
  roomMeshes=[];roomAnim=[];sparks=[];
  r.eq.forEach(function(e,i){var m=equipMesh(e,sp);m.userData.i=i;g.add(m);roomMeshes.push(m);
    var top=e.k==="boiler"?1.4:e.k==="filter"?1.3:e.k==="tank"?1.6:1.0;
    if(e.k!=="feeder"||e.v!=="controller")pipe(g,(e.k==="boiler"||e.k==="tank"||e.k==="tankless")?HOT:BLUE,[e.x,top,e.z],[e.x,e.k==="tank"||e.k==="boiler"?1.8:2.05,Math.max(e.z,-D/2+.3)],.05);
  });
  // floor piping linking pumps and filters
  if(r.type==="boiler"){var ps=r.eq.filter(function(e){return e.k==="pump"}),fs=r.eq.filter(function(e){return e.k==="filter"}),bs=r.eq.filter(function(e){return e.k==="boiler"});
    ps.forEach(function(pm){pipe(g,BLUE,[pm.x-.28*fx,.32,pm.z],[pm.x-.28*fx,.32,-1.4],.06)});
    if(ps.length&&fs.length){pipe(g,BLUE,[Math.min(ps[0].x,fs[0].x)-.3,.32,-1.4],[Math.max(ps[ps.length-1].x,fs[fs.length-1].x)+.3,.32,-1.4],.06);fs.forEach(function(f){pipe(g,BLUE,[f.x,.32,-1.4],[f.x,.32,f.z+.3],.06)})}
    if(bs.length&&fs.length){var lx=fs[fs.length-1].x,bx=bs[0].x;pipe(g,HOT,[lx,.55,-1.9],[bx,.55,-1.9],.06)}
  }
  roomCam=new THREE.PerspectiveCamera(40,window.innerWidth/window.innerHeight,.1,100);
  rcam.taz=rcam.az=.7;rcam.el=.62;rcam.tdist=rcam.dist=window.innerWidth<620?MOBD:11;if(window.innerWidth<620)rcam.el=MOBE;
  paintRoomEquip();
}
function paintRoomEquip(){
  if(!roomView)return;var r=bld(roomView.id);if(!r)return;var rust=new THREE.Color("#7b4a2c");
  roomMeshes.forEach(function(m){var e=r.eq[m.userData.i];if(!e)return;var f=clamp((70-e.c)/70,0,1)*.55;
    m.userData.body.material.color.copy(m.userData.base).lerp(rust,f);
    if(m.userData.light)m.userData.light.material.color.set(e.c<=0?"#ff3b30":e.c<25?"#ff9f43":"#4cd964"),m.userData.light.material.emissive=new THREE.Color(e.c<=0?"#ff3b30":e.c<25?"#ff9f43":"#2bb24c"),m.userData.light.material.emissiveIntensity=1.2;
    if(m.userData.mark){m.remove(m.userData.mark);m.userData.mark=null}
    if(e.c<25){var s=new THREE.Sprite(warnTexture());s.scale.set(.55,.55,1);s.position.y=2.3;m.add(s);m.userData.mark=s}
    m.userData.sel=roomView.sel===m.userData.i;
  });
}
function sparkle(i){var m=roomMeshes.filter(function(x){return x.userData.i===i})[0];if(!m)return;
  for(var k=0;k<14;k++){var s=new THREE.Mesh(G.sph,new THREE.MeshBasicMaterial({color:"#fff4c2",transparent:true}));s.scale.setScalar(.08);s.position.set(m.position.x,1+rnd(0,.6),m.position.z);
    s.userData.v=new THREE.Vector3(rnd(-1,1),rnd(1,2.2),rnd(-1,1));s.userData.l=0;roomScene.add(s);sparks.push(s)}}
function enterRoom(id){
  var r=bld(id);if(!r)return;ensureEquip();roomView={id:id,sel:null};buildRoom(r);
  document.body.classList.add("inroom");$("roomBar").classList.remove("hidden");ghost.visible=false;
  var p=r.serves&&bld(r.serves);$("rTitle").textContent=(r.type==="boiler"?"Boiler room":"Heater room");$("rSub").textContent=p?p.name:"Not serving a pool";
  openId=id;panelKind="inside";drawPanel();$("panel").classList.remove("hidden");
}
function exitRoom(){
  var r=roomView&&bld(roomView.id);roomView=null;roomScene=null;document.body.classList.remove("inroom");$("roomBar").classList.add("hidden");
  if(r&&r.serves){var p=bld(r.serves);if(p){openBld(p);return}}closePanel();
}
function updateRoomCam(dt){
  var k=1-Math.pow(.002,dt);rcam.az+=(rcam.taz-rcam.az)*k;rcam.dist+=(rcam.tdist-rcam.dist)*k;
  var mob=window.innerWidth<620,ty=mob?MOBY:.4,tx=mob?.4:1.9;
  roomCam.position.set(Math.sin(rcam.az)*Math.cos(rcam.el)*rcam.dist,Math.sin(rcam.el)*rcam.dist+.5,Math.cos(rcam.az)*Math.cos(rcam.el)*rcam.dist);
  roomCam.position.x+=tx*Math.cos(rcam.az);roomCam.position.z-=tx*Math.sin(rcam.az);roomCam.lookAt(tx*Math.cos(rcam.az),ty,-tx*Math.sin(rcam.az)+(mob?MOBZ:0));roomCam.aspect=window.innerWidth/window.innerHeight;roomCam.updateProjectionMatrix();
}
function animateRoom(dt){
  var t=performance.now()/1000,r=bld(roomView.id);if(!r)return;
  roomAnim.forEach(function(a){if(a.e.c<=0){if(a.flame)a.m.visible=false;return}if(a.spin)a.m.rotation.x+=dt*18;if(a.flame){a.m.visible=true;a.m.scale.y=.08+Math.abs(Math.sin(t*9+a.e.x))*.06}});
  roomMeshes.forEach(function(m){var e=r.eq[m.userData.i];if(!e)return;
    if(m.userData.light&&e.c<=0)m.userData.light.visible=Math.sin(t*8)>0;else if(m.userData.light)m.userData.light.visible=true;
    if(m.userData.mark)m.userData.mark.position.y=2.25+Math.sin(t*3)*.08;
    var sel=roomView.sel===m.userData.i;m.userData.body.material.emissive=m.userData.body.material.emissive||new THREE.Color(0);
    m.userData.body.material.emissive.set(sel?"#f1e2c2":"#000000");m.userData.body.material.emissiveIntensity=sel?.25+.12*Math.sin(t*5):0;
    if(e.k==="pump"&&e.c>0)m.position.y=Math.sin(t*60)*.004;});
  for(var i=sparks.length-1;i>=0;i--){var s=sparks[i];s.userData.l+=dt;s.position.addScaledVector(s.userData.v,dt);s.userData.v.y-=dt*3;s.material.opacity=1-s.userData.l;if(s.userData.l>1){roomScene.remove(s);sparks.splice(i,1)}}
}
var rptr={},rlast=null,rstart=null,rgest=null,rdownT=0;
function roomPointer(e,kind){
  if(kind==="down"){rptr[e.pointerId]={x:e.clientX,y:e.clientY};var a=Object.keys(rptr).map(function(k){return rptr[k]});
    if(a.length===1){rstart={x:e.clientX,y:e.clientY};rlast=rstart;rdownT=performance.now()}else if(a.length===2)rgest=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);return}
  if(kind==="move"){if(!rptr[e.pointerId])return;rptr[e.pointerId]={x:e.clientX,y:e.clientY};var b=Object.keys(rptr).map(function(k){return rptr[k]});
    if(b.length===1&&rlast){rcam.taz-=(e.clientX-rlast.x)*.008;rcam.az=rcam.taz;rcam.el=clamp(rcam.el+(e.clientY-rlast.y)*.004,.25,1.25);rlast={x:e.clientX,y:e.clientY}}
    else if(b.length===2&&rgest){var dd=Math.hypot(b[0].x-b[1].x,b[0].y-b[1].y);rcam.tdist=clamp(rcam.tdist*rgest/dd,6,34);rcam.dist=rcam.tdist;rgest=dd}return}
  if(kind==="up"){var was=rptr[e.pointerId];delete rptr[e.pointerId];if(!was)return;
    var moved=rstart?Math.hypot(e.clientX-rstart.x,e.clientY-rstart.y):99;
    if(!Object.keys(rptr).length&&moved<9&&performance.now()-rdownT<450)roomTap(e.clientX,e.clientY);
    if(!Object.keys(rptr).length){rlast=null;rgest=null}}
}
function roomTap(sx,sy){
  v2.set(sx/window.innerWidth*2-1,-(sy/window.innerHeight)*2+1);ray.setFromCamera(v2,roomCam);
  var hits=ray.intersectObjects(roomMeshes,true);if(!hits.length){roomView.sel=null;drawPanel();return}
  var o=hits[0].object;while(o&&o.userData.i==null)o=o.parent;if(!o)return;
  roomView.sel=o.userData.i;holdPanel=0;drawPanel();$("pBody").scrollTop=0;
}
function eqCard(r,e,i,sel){
  var c=Math.round(e.c),cost=EQ[e.k].cost,acts=EQ[e.k].acts;
  return '<div class="eqcard'+(sel?" sel":"")+'" data-eqcard="'+i+'"><div class="eqtop"><b>'+esc(eqName(e))+'</b><span class="num" style="color:'+condCol(c)+'">'+condWord(c)+(c>0?" · "+c+"%":"")+'</span></div>'+
    '<div class="gbar"><span class="fill" style="width:'+Math.max(2,c)+'%;background:'+condCol(c)+'"></span></div>'+
    (c<=0?'<small style="color:var(--bad)">'+esc(breakNote(e))+'</small>':'')+
    '<div class="acts"><button class="btn'+(c>=85&&e.k!=="filter"?" ghost":"")+'" data-fix="'+i+':0">'+acts[0]+' <small>$'+cost[0].toLocaleString()+'</small></button><button class="btn ghost" data-fix="'+i+':1">'+acts[1]+' <small>$'+cost[1].toLocaleString()+'</small></button></div></div>';
}
function drawInside(){
  var r=bld(openId);if(!r){exitRoom();return}var p=r.serves&&bld(r.serves),iss=roomIssues(r),pl=p?plant(p):null;
  $("pTitle").innerHTML=(r.type==="boiler"?"Boiler room":"Heater room")+(p?' · <span class="sw" style="background:'+info(p).c+'"></span>'+esc(p.name):"");
  var sum=!iss.length?"Everything is running.":iss.length+" item"+(iss.length>1?"s need":" needs")+" work.";
  var eff="";
  if(pl&&r.type==="boiler")eff="Heating "+Math.round(pl.heat*100)+"% · circulation "+Math.round(pl.circ*100)+"% · filters "+Math.round(pl.filt*100)+"% · "+(pl.feeder?"chlorine feeding on its own":"chlorine by hand only");
  if(pl&&r.type==="heater")eff="Showers are "+pl.showers+".";
  var sel=roomView&&roomView.sel;
  var order=r.eq.map(function(e,i){return i});if(sel!=null){order.splice(order.indexOf(sel),1);order.unshift(sel)}
  setBody('<p style="color:var(--ink)">'+sum+'</p>'+(eff?'<p>'+eff+'</p>':'')+'<p class="tip">Drag to look around, pinch to zoom. Tap any equipment to see it here.</p>'+
    order.map(function(i){return eqCard(r,r.eq[i],i,i===sel)}).join("")+
    '<h3>Service log</h3>'+(r.log.length?r.log.slice(0,12).map(function(l){return '<div class="row"><span>'+esc(l.txt)+'</span><small class="num" style="color:var(--dim);white-space:nowrap">Day '+l.d+', '+fmtTime(l.t)+'</small></div>'}).join(""):'<p>Nothing logged yet. Repairs and failures show up here.</p>'));
}

/* ================= main loop ================= */
var panelT=0,saveT=0;
function frame(){
  var dt=Math.min(clock.getDelta(),.1);
  step(dt);
  if(rebuildT>0){rebuildT-=dt;if(rebuildT<=0)buildWorld()}
  // water colour and height follow the pool's state
  pools().forEach(function(p){var wm=waterMeshes[p.id];if(!wm)return;var q=quality(p);
    wm.material.color.setRGB(.25+.3*q,.76-.04*q,.86-.55*q);wm.position.y=.08+.05*(p.level/100)})
  // boiler smoke
  smokers.forEach(function(s){if(s.b.serves&&s.b.eq&&s.b.eq.some(function(e){return e.k==="boiler"&&e.c>0})&&Math.random()<dt*2.2){var pf=new THREE.Mesh(G.sph,mat("#eef2f4",{transparent:true,opacity:.7}));pf.scale.setScalar(.18);pf.position.set(s.g.position.x+s.x,s.y,s.g.position.z+s.z);pf.userData.l=0;scene.add(pf);puffs.push(pf)}});
  for(var i=puffs.length-1;i>=0;i--){var pf=puffs[i];pf.userData.l+=dt;pf.position.y+=dt*.5;pf.position.x+=dt*.15;pf.scale.setScalar(.18+pf.userData.l*.18);if(pf.userData.l>2.4){scene.remove(pf);puffs.splice(i,1)}}
  if(roomView&&roomScene){updateRoomCam(dt);animateRoom(dt);
    panelT-=dt;if(panelT<=0){panelT=.5;hud();if(!$("panel").classList.contains("hidden"))drawPanel()}
    saveT-=dt;if(saveT<=0){saveT=5;save()}
    renderer.render(roomScene,roomCam);requestAnimationFrame(frame);return}
  updateCamera(dt);placeLabels();updateWarnings();
  panelT-=dt;if(panelT<=0){panelT=.5;paintLabels();hud();if(openId!=null&&!$("panel").classList.contains("hidden"))(panelKind==="board"?drawBoard():drawPanel())}
  saveT-=dt;if(saveT<=0){saveT=5;save()}
  renderer.render(scene,camera);requestAnimationFrame(frame);
}

/* ================= start ================= */
if(!load())seed();
init($("scene"));buildWorld();drawTools();hud();
if(lastSaved){$("tGo").textContent="Continue: day "+S.day+", "+fmtTime(S.t)}else save();
try{if(sessionStorage.getItem("pg.back")){sessionStorage.removeItem("pg.back");begin()}}catch(e){}
requestAnimationFrame(frame);
window.addEventListener("pagehide",save);window.addEventListener("beforeunload",save);
$("rBack").onclick=exitRoom;
window.addEventListener("keydown",function(e){if(e.key==="Escape"&&roomView)exitRoom()});
document.addEventListener("visibilitychange",function(){if(document.hidden)save()});
// test hook: run the day forward without drawing
window.PG={warm:function(sec){for(var t=0;t<sec;t+=.1)step(.1);paintLabels();hud()},S:function(){return S},open:function(name){var p=pools().filter(function(x){return x.name===name})[0];if(p)openBld(p)},board:openBoard,cam:cam,setTool:setTool,setTime:function(m){S.t=m},choose:function(n){poolChoice=n;drawTools()},hover:function(x,y){hover({x:x,y:y})},begin:begin,enter:function(pool,kind){var p=pools().filter(function(x){return x.name===pool})[0];if(p&&p[kind+"Id"])enterRoom(p[kind+"Id"])},exit:exitRoom,rcam:rcam,sel:function(i){roomView.sel=i;drawPanel();$("pBody").scrollTop=0},mob:function(d,e,y,z){MOBD=d;MOBE=e;MOBY=y;MOBZ=z;rcam.tdist=rcam.dist=d;rcam.el=e}};
})();
