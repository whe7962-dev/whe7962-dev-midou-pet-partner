/* The 28-second film is an asset-based animation, not a rendered 3D video.
   Every frame is derived from the current time, so scrubbing and replay stay deterministic. */
(() => {
  'use strict';
  const stage = document.getElementById('cinemaStage');
  const camera = document.getElementById('stageCamera');
  const holder = document.getElementById('actors');
  const copy = document.getElementById('filmCopy');
  const title = document.getElementById('filmCopyTitle');
  const subtitle = document.getElementById('filmCopyEn');
  const intro = document.getElementById('cinemaIntro');
  const pocket = document.getElementById('pocketScene');
  const seek = document.getElementById('filmSeek');
  const playButton = document.getElementById('playPause');
  const loading = document.getElementById('filmLoading');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 28;
  const clamp = (v, a=0, b=1) => Math.min(b, Math.max(a, v));
  const mix = (a,b,p) => a+(b-a)*p;
  const smooth = p => { p=clamp(p); return p*p*(3-2*p); };
  const phase = (t,a,b) => clamp((t-a)/(b-a));
  const ease = (t,a,b) => smooth(phase(t,a,b));
  const visible = (t,a,b,r=.2) => Math.min(phase(t,a,a+r),1-phase(t,b-r,b));
  const actors = Array.from({length:7},(_,i) => {
    const el=document.createElement('div'); el.className='actor'; el.dataset.actor=String(i);
    const shadow=document.createElement('div'); shadow.className='floor-shadow'; el.append(shadow);
    const body=document.createElement('div'); body.className='actor-body'; el.append(body);
    const skins=['front','quarter','side','back','lean'].map(name=>{const skin=document.createElement('div');skin.className='cat-skin '+name;body.append(skin);return skin;});
    holder.append(el);return {el,shadow,body,skins};
  });
  let width=1,height=1,size=1,mobile=false,currentTime=0,playing=false,ready=false,raf=0,lastStamp=0,visibleOnPage=true,scrubbing=false,wasPlaying=false;
  let currentText='';
  const chapters=[0,8,12.7,18,24.3];
  const chapterButtons=[...document.querySelectorAll('[data-time]')];
  function measure(){width=stage.clientWidth;height=stage.clientHeight;size=actors[0].el.offsetWidth;mobile=width<800;render(currentTime);}
  function pose(i,state){
    const actor=actors[i];
    if(!state || state.alpha===0){actor.el.style.opacity='0';return;}
    const p={x:.5,y:.56,scale:1,angle:0,yaw:0,alpha:1,sx:1,sy:1,lift:0,shadow:1,lean:0,z:10,...state};
    const dx=(p.x-.5)*width-size/2,dy=(p.y-.5)*height-size/2-p.lift;
    actor.el.style.transform=`translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,0) rotate(${p.angle.toFixed(2)}deg) scale(${(p.scale*p.sx).toFixed(4)},${(p.scale*p.sy).toFixed(4)})`;
    actor.el.style.opacity=String(clamp(p.alpha)); actor.el.style.zIndex=String(p.z);
    // A single view is visible at a time: blending portraits would double the eyes.
    const yaw=clamp(Math.abs(p.yaw)/45,0,3),view=p.lean>.48?4:Math.round(yaw);
    const residual=view===4?0:(yaw-Math.round(yaw))*24;
    actor.body.style.transform=`perspective(900px) scaleX(${p.yaw>0?-1:1}) rotateY(${-residual}deg)`;
    actor.skins.forEach((skin,j)=>{skin.style.opacity=j===view?'1':'0';});
    actor.shadow.style.opacity=String(.16*p.shadow);
    actor.shadow.style.transform=`translateY(${p.lift/Math.max(p.scale,.1)}px) scale(${1+p.lift/200},${1-p.lift/300})`;
  }
  function focus(u,v,scale){return {x:.5+(.5-u)*size*scale/width,y:.5+(.5-v)*size*scale/height,scale,shadow:0};}
  function copyAt(text,en,position,alpha){
    if(currentText!==text){title.replaceChildren(...Array.from(text).map((char,i)=>{const span=document.createElement('span');span.textContent=char;span.style.setProperty('--char-index',String(i));span.className='film-letter';return span;}));currentText=text;}
    subtitle.textContent=en;copy.className='film-copy position-'+position;copy.style.opacity=String(clamp(alpha));
    // Reading-speed stagger is tied to film time; reverse seeking never leaves stale animations.
    [...title.children].forEach((span,i)=>{const a=media.matches?alpha:clamp(alpha*1.6-i*.065);span.style.opacity=String(a);span.style.transform=`translateY(${(1-a)*12}px)`;});
  }
  function render(t){
    actors.forEach((_,i)=>pose(i,null));
    pocket.style.opacity='0'; camera.style.transform='none'; intro.style.opacity='0';copy.style.opacity='0';
    // 0–0.5: crown macro. 0.5–1.3: ear sweep and rim light.
    if(t<.5){pose(0,focus(mix(.49,.52,phase(t,0,.5)),.105,mix(6.2,5.9,phase(t,0,.5))));}
    else if(t<1.3){pose(0,focus(mix(.265,.36,ease(t,.5,1.3)),mix(.12,.18,ease(t,.5,1.3)),5.4));}
    // 1.3–5.5: uninterrupted pullback, face then chest then feet.
    else if(t<5.5){
      const p=ease(t,1.3,5.1),scale=Math.exp(mix(Math.log(5.4),Math.log(.94),p));
      const start=focus(.36,.18,5.4),end={x:.5,y:.59};
      pose(0,{x:mix(start.x,end.x,p),y:mix(start.y,end.y,p),scale,shadow:ease(t,4,5.2)});
      copyAt('咪Dou，天生专业。','BORN SOFT. BUILT TO CARE.','top',visible(t,2.7,5.45,.45));
    }
    // 5.5–6.7: hover, paws forward, turn together as one body.
    else if(t<6.7){const p=ease(t,5.5,6.7);pose(0,{scale:.94,y:.59,yaw:mix(0,-45,p),angle:-8*Math.sin(p*Math.PI),lift:28*Math.sin(p*Math.PI),lean:Math.sin(p*Math.PI)*.8,shadow:.65});}
    // 6.7–8: side profile glides to the right edge.
    else if(t<8){const p=ease(t,6.7,8);pose(0,{x:mix(.5,1.48,p),y:.56,scale:.94,yaw:mix(-45,-90,ease(t,6.7,7.2)),lift:12,shadow:.5});}
    // 8–9: empty white field with centered title.
    else if(t<9){copyAt('可爱，也有质感。','SOFTNESS, DOWN TO EVERY DETAIL.','center',ease(t,8.05,8.5));}
    // 9–11: title travels left while the close-up enters from upper right.
    else if(t<11){
      const p=ease(t,9,10.25),f=focus(.43,.37,2.15);
      pose(0,{x:mix(1.8,mobile?.8:.79,p),y:mix(-1.15,f.y,p),scale:2.15,angle:mix(-24,-6,p),yaw:-5,shadow:0});
      copyAt('可爱，也有质感。','SOFTNESS, DOWN TO EVERY DETAIL.','left',1);
      const dx=mobile?0:(1-p)*width*.25;copy.style.transform=`translateX(${dx}px)`;
    }
    // 11–12.7: camera tracks along face, chest and feet, no full portrait.
    else if(t<12.7){const p=ease(t,11,12.7),f=focus(mix(.44,.5,p),mix(.35,.82,p),2.8);pose(0,{...f,x:mobile?.78:.77,angle:mix(-6,7,p)});copyAt('可爱，也有质感。','SOFTNESS, DOWN TO EVERY DETAIL.','left',1-ease(t,12.25,12.65));}
    // 12.7–14: a hand and pocket scene enters bottom to top.
    else if(t<14){const p=ease(t,12.7,13.65);pocket.style.opacity=String(ease(t,12.7,12.9));pocket.style.transform=`translateY(${(1-p)*90}px) rotate(${mix(1.2,-.35,p)}deg) scale(1.035)`;copyAt('把好心情，随身带。','A LITTLE JOY. EVERYWHERE.','left',ease(t,12.85,13.25));}
    // 14–15.7: centered single, a small squash resolves back to rest.
    else if(t<15.7){const p=ease(t,14,15.2),squash=Math.sin(phase(t,14.1,15.1)*Math.PI)*.025;pose(0,{x:mix(.77,.5,p),y:.6,scale:.94,sx:1+squash,sy:1-squash});copyAt('双耳传感，随时监听。','TWO LITTLE EARS. ALWAYS LISTENING.','top',ease(t,14.15,14.65));}
    // 15.7–17.5: five independent silhouettes arc around a shared lower pivot.
    else if(t<17.5){const p=ease(t,15.7,17.15),spread=mobile?.22:.3;for(let i=0;i<5;i++){const n=i-2;pose(i,{x:mix(.5,.5+n*spread/2,p),y:mix(.6,.59+Math.abs(n)*.055,p),scale:mix(.94,.64,p),angle:n*17*p,alpha:i===2?1:ease(t,15.7,16.05),z:15-Math.abs(n),shadow:.7});}copyAt('双耳传感，随时监听。','TWO LITTLE EARS. ALWAYS LISTENING.','top',1-ease(t,17.1,17.5));}
    // Transition beat; space between scenes stays intentional.
    else if(t<18){for(let i=0;i<5;i++){const n=i-2;pose(i,{x:.5+n*(mobile?.22:.3)/2,y:.59+Math.abs(n)*.055,scale:.64,angle:n*17,alpha:1-ease(t,17.5,17.9),z:15-Math.abs(n)});}}
    // 18–19.5: approach, one soft contact, one rebound.
    else if(t<19.5){const p=ease(t,18,18.85),bounce=Math.sin(phase(t,18.83,19.5)*Math.PI);const separation=mobile?.165:.12;for(let i=0;i<2;i++){const sign=i===0?-1:1;pose(i,{x:mix(i===0?-.35:1.35,.5+sign*separation,p),y:.59,scale:.72,yaw:i===0?45:-45,angle:sign*2.5*bounce,sx:1-.065*bounce,sy:1+.032*bounce,shadow:.85});}}
    // 19.5–20.7: retreat, leaving a clear center; camera rolls a little.
    else if(t<20.7){const p=ease(t,19.5,20.7),sep=mobile?.165:.12;for(let i=0;i<2;i++){const sign=i===0?-1:1;pose(i,{x:mix(.5+sign*sep,i===0?-.4:1.4,p),y:.59,scale:.72,yaw:i===0?45:-45});}camera.style.transform=`rotate(${Math.sin(p*Math.PI)*1.4}deg)`;}
    // 20.7–22.4: layered group. Explicit z-order preserves occlusion.
    else if(t<22.4){const positions=[[-.24,.49,-12],[-.08,.43,-5],[.1,.44,7],[.25,.52,11],[-.14,.68,-6],[.06,.7,4],[.25,.72,8]];for(let i=0;i<7;i++){const [dx,y,angle]=positions[i],p=ease(t,20.7+i*.055,21.8+i*.05);pose(i,{x:mix(i%2?1.4:-.4,.5+dx*(mobile?.82:1),p),y,scale:i<4?.52:.6,angle,yaw:i%2?-12:12,z:i<4?10+i:20+i});}}
    // 22.4–23: settle into one line and drop gently.
    else if(t<23){const p=ease(t,22.4,23),positions=[[-.24,.49,-12],[-.08,.43,-5],[.1,.44,7],[.25,.52,11],[-.14,.68,-6],[.06,.7,4],[.25,.72,8]];for(let i=0;i<7;i++){const [dx,y,a]=positions[i];pose(i,{x:mix(.5+dx*(mobile?.82:1),.5+(i-3)*(mobile?.125:.1),p),y:mix(y,.64,p)-Math.sin(p*Math.PI)*.04,scale:mix(i<4?.52:.6,mobile?.34:.4,p),angle:mix(a,0,p),z:10+i});}}
    // 23–24.3: one independent squash and rebound per character.
    else if(t<24.3){for(let i=0;i<7;i++){const p=phase(t,23+i*.045,23.75+i*.045),b=Math.sin(p*Math.PI)*Math.exp(-p*2);pose(i,{x:.5+(i-3)*(mobile?.125:.1),y:.64,scale:(mobile?.34:.4)*(1-ease(t,23.8,24.3)*.07),angle:(i%2?1:-1)*4*(1-p),sx:1+.09*b,sy:1-.11*b,lift:Math.sin(p*Math.PI)*9,shadow:1});}}
    // 24.3–25.8: fan with common lower center and readable faces.
    else if(t<25.8){const p=ease(t,24.3,24.95);for(let i=0;i<7;i++){const n=i-3,theta=n*.24;pose(i,{x:mix(.5+n*(mobile?.125:.1),.5+Math.sin(theta)*(mobile?.38:.29),p),y:mix(.64,.77-Math.cos(theta)*.24,p),scale:mix((mobile?.34:.4)*.93,mobile?.41:.5,p),angle:n*13*p,z:20-Math.abs(n)});}copyAt('每一款，都有偏爱。','A LITTLE DIFFERENT. EQUALLY LOVED.','bottom',visible(t,24.55,25.78,.25));}
    // 25.8–28: direct cut to a small, quiet, central character. No text.
    else {const p=ease(t,25.8,27.1);pose(0,{x:.5,y:.51,scale:height*.1/size,yaw:-24*Math.sin(p*Math.PI),shadow:.55});}
    if(t<9||t>=11)copy.style.transform='';
    const names=['THE FIRST HELLO','THE BEAUTY IN DETAILS','TAKE JOY WITH YOU','A SOFT ENCOUNTER','EVERY LITTLE FAVORITE'];
    let chapter=0;chapters.forEach((start,i)=>{if(t>=start)chapter=i;});
    document.getElementById('frameNote').textContent=`0${chapter+1} / ${names[chapter]}`;
    chapterButtons.forEach((button,i)=>{button.classList.toggle('active',i===chapter);button.setAttribute('aria-current',i===chapter?'step':'false');});
    seek.value=String(t);seek.style.setProperty('--progress',`${t/duration*100}%`);seek.setAttribute('aria-valuetext',`${t.toFixed(1)} 秒，共 28 秒`);
    document.getElementById('timecode').innerHTML=`00:${String(Math.floor(t)).padStart(2,'0')} <i>/ 00:28</i>`;
    stage.dataset.time=t.toFixed(3);stage.dataset.chapter=String(chapter+1);
  }
  function syncButton(){playButton.classList.toggle('paused',!playing);playButton.setAttribute('aria-label',playing?'暂停开场':currentTime>=duration?'重播开场':'播放开场');}
  function tick(stamp){raf=0;if(!playing||document.hidden||!visibleOnPage)return;if(lastStamp)currentTime=Math.min(duration,currentTime+(stamp-lastStamp)/1000);lastStamp=stamp;render(currentTime);if(currentTime>=duration){playing=false;syncButton();return;}raf=requestAnimationFrame(tick);}
  function schedule(){lastStamp=0;if(playing&&!raf&&!document.hidden&&visibleOnPage)raf=requestAnimationFrame(tick);}
  function stop(){playing=false;cancelAnimationFrame(raf);raf=0;lastStamp=0;syncButton();}
  function play(){if(!ready)return;if(currentTime>=duration)currentTime=0;playing=true;syncButton();schedule();}
  function goTo(time,autoplay=false){currentTime=clamp(time,0,duration);render(currentTime);lastStamp=0;if(autoplay)play();else stop();}
  playButton.addEventListener('click',()=>playing?stop():play());
  document.getElementById('replay').addEventListener('click',()=>goTo(0,!media.matches));
  seek.addEventListener('pointerdown',()=>{scrubbing=true;wasPlaying=playing;stop();});
  seek.addEventListener('input',()=>{currentTime=Number(seek.value);render(currentTime);});
  seek.addEventListener('change',()=>{if(scrubbing&&wasPlaying&&!media.matches)play();scrubbing=false;});
  seek.addEventListener('keydown',()=>stop());
  chapterButtons.forEach(button=>button.addEventListener('click',()=>goTo(Number(button.dataset.time),!media.matches)));
  document.getElementById('replayDetail').addEventListener('click',()=>{document.getElementById('home').scrollIntoView({behavior:media.matches?'instant':'smooth'});goTo(9.9,!media.matches);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;lastStamp=0;}else schedule();});
  new IntersectionObserver(entries=>{visibleOnPage=entries[0].isIntersecting;if(visibleOnPage)schedule();else{cancelAnimationFrame(raf);raf=0;lastStamp=0;}},{threshold:.15}).observe(stage);
  media.addEventListener('change',()=>{if(media.matches){stop();goTo(4.6);}});
  new ResizeObserver(measure).observe(stage);
  // Load complete assets before starting the clock; no blank first scene on slow networks.
  const files=['assets/midou-front.png','assets/midou-views.png','assets/midou-pocket.png'];
  Promise.all(files.map(src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>reject(new Error(src));image.src=src;}))).then(()=>{
    ready=true;loading.hidden=true;measure();currentTime=media.matches?4.6:0;render(currentTime);if(!media.matches)play();else syncButton();
  }).catch(()=>{loading.replaceChildren();const message=document.createElement('p');message.textContent='开场素材暂未载入，请刷新重试。';const link=document.createElement('a');link.href='#meet';link.textContent='先认识咪Dou ↓';loading.append(message,link);playButton.disabled=true;seek.disabled=true;});
})();
