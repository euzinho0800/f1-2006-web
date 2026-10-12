import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

const canvas=document.querySelector('#game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.1;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x9ac9ec);
scene.fog=new THREE.Fog(0x9ac9ec,100,470);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,900);
camera.position.set(0,5,12);
scene.add(new THREE.HemisphereLight(0xd8ecff,0x44502b,2.0));
const sun=new THREE.DirectionalLight(0xfff1d1,3.2);sun.position.set(-40,75,30);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);

const mat=(color,roughness=.75,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const grass=mat(0x427b3c), asphalt=mat(0x343940), white=mat(0xf4f1e8), red=mat(0xe21d2b,.4), black=mat(0x11151b,.5), rubber=mat(0x090b0d), glass=mat(0x162b3d,.25,.25), yellow=mat(0xffd447), kerbRed=mat(0xe12a32), kerbWhite=mat(0xf5f3e9);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(1200,1200),grass);ground.rotation.x=-Math.PI/2;ground.position.y=-.13;ground.receiveShadow=true;scene.add(ground);

// A closed, smooth circuit centreline in X/Z. A single lap is ~1 km in game units.
const points=[
 [0,0],[0,-22],[0,-45],[8,-67],[27,-82],[52,-88],[80,-82],[103,-64],
 [115,-38],[112,-12],[99,8],[78,18],[65,38],[64,61],[76,80],[98,91],
 [111,110],[105,132],[87,147],[60,151],[36,142],[20,124],[8,104],[-8,94],
 [-30,94],[-51,106],[-74,111],[-94,99],[-101,78],[-94,57],[-78,41],[-67,19],
 [-69,-2],[-86,-21],[-105,-41],[-108,-62],[-92,-78],[-65,-82],[-42,-70],[-27,-48],[-21,-25],[-20,0]
].map(([x,z])=>new THREE.Vector3(x,0,z));
const curve=new THREE.CatmullRomCurve3(points,true,'catmullrom',.18);
const trackLength=curve.getLength();
function ribbon(width,y,material,offset=0){
 const verts=[],idx=[];const n=900;
 for(let i=0;i<=n;i++){const t=i/n,p=curve.getPointAt(t),tan=curve.getTangentAt(t);const side=new THREE.Vector3(-tan.z,0,tan.x);
  const a=p.clone().addScaledVector(side,-width/2+offset);const b=p.clone().addScaledVector(side,width/2+offset);a.y=y;b.y=y;verts.push(a.x,a.y,a.z,b.x,b.y,b.z);
  if(i<n){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2)}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=true;scene.add(mesh);return mesh;
}
ribbon(15,.0,asphalt);ribbon(18,-.015,mat(0x777b7e));ribbon(1.15,.012,white,-7.5);ribbon(1.15,.012,white,7.5);
// Red/white kerbs as short alternating pieces along both edges.
for(let i=0;i<180;i++){const t=i/180,p=curve.getPointAt(t),tan=curve.getTangentAt(t),side=new THREE.Vector3(-tan.z,0,tan.x);
 for(const s of [-1,1]){const m=(i%2===0)?kerbRed:kerbWhite;const box=new THREE.Mesh(new THREE.BoxGeometry(1.25,.08,.48),m);box.position.copy(p).addScaledVector(side,s*7.9);box.position.y=.03;box.rotation.y=Math.atan2(tan.x,tan.z);box.receiveShadow=true;scene.add(box)}
}
// Start/finish stripe
const startP=curve.getPointAt(0),startT=curve.getTangentAt(0);
const stripe=new THREE.Mesh(new THREE.BoxGeometry(14,.025,1.3),white);stripe.position.copy(startP);stripe.position.y=.035;stripe.rotation.y=Math.atan2(startT.x,startT.z);scene.add(stripe);
// Low-poly hills and trees for a sense of place.
for(let i=0;i<115;i++){
 const t=(i*.61803398875)%1,p=curve.getPointAt(t),tan=curve.getTangentAt(t),side=new THREE.Vector3(-tan.z,0,tan.x);
 const dist=19+(i%7)*5;const pos=p.clone().addScaledVector(side,(i%2?1:-1)*dist);
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.18,.28,1.5,5),mat(0x58422d));trunk.position.set(pos.x,.65,pos.z);scene.add(trunk);
 const crown=new THREE.Mesh(new THREE.ConeGeometry(1.4+(i%3)*.4,3.2,6),mat(i%3===0?0x2e633b:0x387746));crown.position.set(pos.x,2.7,pos.z);crown.castShadow=true;scene.add(crown);
}
for(let i=0;i<16;i++){
 const t=i/16,p=curve.getPointAt(t),tan=curve.getTangentAt(t),side=new THREE.Vector3(-tan.z,0,tan.x);
 const post=new THREE.Mesh(new THREE.BoxGeometry(3,.65,.2),mat(i%2?0xf3f3f3:0xd51e2a));post.position.copy(p).addScaledVector(side,10.8);post.y=.6;post.rotation.y=Math.atan2(tan.x,tan.z);scene.add(post);
}

// Create stylized F1 cars from primitive geometry. Original assets are intentionally not used.
function makeCar(bodyColor=0xe51d2a,number='06'){
 const root=new THREE.Group();const bodyMat=mat(bodyColor,.32,.22),dark=mat(0x11151a,.48),tire=mat(0x090a0c),wingMat=mat(bodyColor,.4);
 function box(w,h,d,m,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;root.add(o);return o}
 box(1.05,.24,2.7,bodyMat,0,.48,-.05);
 box(.76,.22,1.25,bodyMat,0,.59,-.52);
 const nose=new THREE.Mesh(new THREE.ConeGeometry(.42,1.65,4),bodyMat);nose.rotation.x=Math.PI/2;nose.position.set(0,.47,1.45);nose.scale.set(1,.6,1);nose.castShadow=true;root.add(nose);
 box(1.25,.09,.24,wingMat,0,.37,2.08);box(1.25,.1,.22,dark,0,.7,-1.38);box(1.05,.08,.18,wingMat,0,.82,-1.32);
 const cockpit=new THREE.Mesh(new THREE.SphereGeometry(.34,10,7),glass);cockpit.scale.set(.75,.55,1.0);cockpit.position.set(0,.72,.1);root.add(cockpit);
 // wheel positions: front +Z, rear -Z
 for(const x of [-.68,.68])for(const z of [-.92,1.0]){
  const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.19,12),tire);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.3,z);wheel.castShadow=true;root.add(wheel);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.195,10),mat(0x747b83,.35,.65));hub.rotation.z=Math.PI/2;hub.position.set(x,.3,z);root.add(hub);
 }
 const halo=new THREE.Mesh(new THREE.TorusGeometry(.25,.035,6,12,Math.PI),mat(0xb8c0c9,.4,.7));halo.rotation.z=Math.PI;halo.position.set(0,.88,.08);root.add(halo);
 return root;
}
const player=makeCar(0xe51d2a);scene.add(player);
const aiColors=[0x2768d9,0xf2f0e7,0xf0b51c,0x148b5c,0x8a49c9,0xe36c25,0x38a8b5,0x22252b,0xd5d5d5];
const rivals=aiColors.map((c,i)=>{const car=makeCar(c,String(i+1));scene.add(car);return {mesh:car,t:(.985-i*.0045+1)%1,speed:.19+Math.random()*.045,lane:(i%3-1)*2.1,lap:0,offset:i};});
const playerState={t:0,speed:0,lane:0,steer:0,lap:1,elapsed:0,condition:100,started:false,finished:false,offtrack:false};
let paused=true, last=performance.now(), raceTime=0, countdown=0;
const held={left:false,right:false,throttle:false,brake:false};
function placeOnTrack(mesh,t,lane=0,height=0){const p=curve.getPointAt((t%1+1)%1),tan=curve.getTangentAt((t%1+1)%1),side=new THREE.Vector3(-tan.z,0,tan.x);mesh.position.copy(p).addScaledVector(side,lane);mesh.position.y=height;mesh.rotation.y=Math.atan2(tan.x,tan.z);return {p,tan,side}}
function updateCar(mesh,t,lane,height=0){return placeOnTrack(mesh,t,lane,height)}
function formatTime(s){const m=Math.floor(s/60),sec=s%60;return `${String(m).padStart(2,'0')}:${sec.toFixed(1).padStart(4,'0')}`}
function updateHUD(){
 document.querySelector('#speed').textContent=String(Math.round(playerState.speed*520)).padStart(3,'0');
 document.querySelector('#gear').textContent=playerState.speed<.025?'1':String(Math.min(7,Math.max(1,Math.floor(playerState.speed*16)+1)));
 document.querySelector('#rpm').textContent=String(Math.round(playerState.speed*12500));
 document.querySelector('#rpmbar').style.width=`${Math.min(100,playerState.speed*360)}%`;
 document.querySelector('#condition').textContent=`${Math.max(0,Math.round(playerState.condition))}%`;
 document.querySelector('#lap').textContent=`${playerState.lap}/3`;
 document.querySelector('#time').textContent=formatTime(raceTime);
 const sorted=[{t:playerState.t,player:true},...rivals.map(r=>({t:r.t,player:false}))].sort((a,b)=>b.t-a.t);
 document.querySelector('#pos').textContent=String(sorted.findIndex(x=>x.player)+1).padStart(2,'0');
}
function showOverlay(mode){
 const overlay=document.querySelector('#overlay');overlay.classList.add('visible');
 document.querySelector('#start').hidden=mode==='pause';
 document.querySelector('#resume').hidden=mode!=='pause';
 document.querySelector('.panel h1').innerHTML=mode==='finish'?'CORRIDA<br><em>CONCLUÍDA</em>':'FORMULA <em>ONE</em><br><span>06</span> WEB';
 document.querySelector('.panel p').textContent=mode==='finish'?`Você completou a demonstração em ${formatTime(raceTime)}. Recarregue para reiniciar a corrida.`:'Protótipo 3D de corrida inspirado nos jogos de Fórmula 1 da era PS2. Física e arte são reconstruídas do zero.';
}
function startRace(){document.querySelector('#overlay').classList.remove('visible');paused=false;playerState.started=true;document.querySelector('#message').textContent='VAMOS!';setTimeout(()=>{if(!paused)document.querySelector('#message').textContent='';},1500)}
document.querySelector('#start').addEventListener('click',()=>{if(playerState.finished){location.reload();return}startRace()});
document.querySelector('#resume').addEventListener('click',startRace);
document.querySelector('#pause').addEventListener('click',()=>{if(!playerState.started)return;paused=true;showOverlay('pause')});
document.querySelectorAll('[data-control]').forEach(btn=>{
 const key=btn.dataset.control;
 const down=e=>{e.preventDefault();held[key]=true;btn.classList.add('active');try{btn.setPointerCapture(e.pointerId)}catch{}};
 const up=e=>{e.preventDefault();held[key]=false;btn.classList.remove('active')};
 btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('lostpointercapture',up);
});
addEventListener('keydown',e=>{const map={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'throttle',' ':'throttle',ArrowDown:'brake',s:'brake'};if(map[e.key]){held[map[e.key]]=true;e.preventDefault()}if(e.key==='Escape'&&playerState.started){paused=!paused;if(paused)showOverlay('pause');else document.querySelector('#overlay').classList.remove('visible')}});
addEventListener('keyup',e=>{const map={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'throttle',' ':'throttle',ArrowDown:'brake',s:'brake'};if(map[e.key])held[map[e.key]]=false});
function loop(now){
 requestAnimationFrame(loop);const dt=Math.min(.04,(now-last)/1000);last=now;
 if(!paused&&playerState.started&&!playerState.finished){
  raceTime+=dt;
  const accel=held.throttle?0.22:0,braking=held.brake?0.38:0;
  playerState.speed=THREE.MathUtils.clamp(playerState.speed+(accel-braking-.035)*dt,0,.62);
  const turn=(held.left?-1:0)+(held.right?1:0);
  playerState.steer=THREE.MathUtils.lerp(playerState.steer,turn,.12);
  playerState.lane+=playerState.steer*dt*(1.6+playerState.speed*3.4);
  playerState.lane*=Math.pow(.985,dt*60);
  const forward=playerState.speed/trackLength*95;
  const previousT=playerState.t;
  playerState.t=(playerState.t+forward*dt)%1;
  if(playerState.t<previousT && raceTime>4){playerState.lap++;if(playerState.lap>3){playerState.finished=true;paused=true;showOverlay('finish')}}
  const off=Math.abs(playerState.lane)>6.3;
  if(off&&!playerState.offtrack){playerState.condition=Math.max(0,playerState.condition-3);document.querySelector('#message').textContent='FORA DA PISTA!';}
  playerState.offtrack=off;
  if(!off)document.querySelector('#message').textContent='';
  playerState.lane=THREE.MathUtils.clamp(playerState.lane,-9,9);
  for(const r of rivals){
   const old=r.t;r.t=(r.t+r.speed*dt/trackLength*100)%1;
   if(r.t<old)r.lap++;
   const p=curve.getPointAt(r.t),tan=curve.getTangentAt(r.t),side=new THREE.Vector3(-tan.z,0,tan.x);
   r.mesh.position.copy(p).addScaledVector(side,r.lane);r.mesh.position.y=.02;r.mesh.rotation.y=Math.atan2(tan.x,tan.z);
  }
 }
 const info=placeOnTrack(player,playerState.t,playerState.lane,.02);
 const speedBlend=playerState.speed/.62;
 const camPos=player.position.clone().add(new THREE.Vector3(0,3.1+speedBlend*1.3,-7.4-speedBlend*1.3));
 camera.position.lerp(camPos,1-Math.pow(.001,dt));
 const look=player.position.clone().add(new THREE.Vector3(0,.6,3.4));camera.lookAt(look);
 camera.fov=THREE.MathUtils.lerp(camera.fov,62+speedBlend*5,.04);camera.updateProjectionMatrix();
 updateHUD();renderer.render(scene,camera);
}
placeOnTrack(player,0,0,.02);
for(const r of rivals){const p=curve.getPointAt(r.t);updateCar(r.mesh,r.t,r.lane,.02)}
requestAnimationFrame(loop);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.setSize(innerWidth,innerHeight)});
document.querySelector('#loading').style.opacity='0';setTimeout(()=>document.querySelector('#loading')?.remove(),500);
