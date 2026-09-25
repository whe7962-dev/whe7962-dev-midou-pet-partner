(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');

  // Character entrance: short Chinese phrases share a restrained 38 ms rhythm.
  document.querySelectorAll('.hero-copy h1,.meet h2,.section-heading h2,.belief blockquote,.download h2,.detail-copy h2').forEach(heading=>{
    const text=heading.textContent;heading.setAttribute('aria-label',text);
    const walker=document.createTreeWalker(heading,NodeFilter.SHOW_TEXT);const nodes=[];let node;
    while((node=walker.nextNode()))nodes.push(node);
    let count=0;
    nodes.forEach(textNode=>{const frag=document.createDocumentFragment();Array.from(textNode.textContent).forEach(char=>{const span=document.createElement('span');span.textContent=char;span.className='letter';span.setAttribute('aria-hidden','true');span.style.setProperty('--delay',`${Math.min(count++,18)*38}ms`);frag.append(span);});textNode.replaceWith(frag);});
  });
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in');observer.unobserve(entry.target);}}),{threshold:.13});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

  const menu=document.getElementById('mobileMenu'),menuButton=document.querySelector('.menu-toggle');
  const setMenu=open=>{menu.hidden=!open;menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'关闭导航':'打开导航');document.body.classList.toggle('menu-open',open);};
  menuButton.addEventListener('click',()=>setMenu(menu.hidden));
  menu.querySelectorAll('a,button').forEach(el=>el.addEventListener('click',()=>setMenu(false)));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){setMenu(false);menuButton.focus();}});
  matchMedia('(min-width:801px)').addEventListener('change',e=>{if(e.matches)setMenu(false);});
  menu.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const links=[menuButton,...menu.querySelectorAll('a,button')],first=links[0],last=links[links.length-1];if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}});
  menuButton.addEventListener('keydown',e=>{if(e.key==='Tab'&&e.shiftKey&&!menu.hidden){e.preventDefault();menu.querySelector('button').focus();}});

  const dialog=document.getElementById('downloadDialog');
  document.querySelectorAll('.download-trigger').forEach(button=>button.addEventListener('click',()=>dialog.showModal()));
  dialog.querySelectorAll('.dialog-close,.dialog-ok').forEach(button=>button.addEventListener('click',()=>dialog.close()));
  dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}});

  const details={ears:{title:'双耳传感，随时监听。',text:'咪Dou 的双耳，是品牌故事里倾听与回应的象征。把每一个日常信号，放在心上。'},heart:{title:'一宠一档，记得每个日常。',text:'围绕年龄、体重与日常记录，逐步认识你的宠物，让每次沟通多一份上下文。'}};
  const detail=document.getElementById('hotspotDetail'),hotspots=[...document.querySelectorAll('.hotspot')];
  hotspots.forEach(button=>button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')!=='true';hotspots.forEach(b=>b.setAttribute('aria-expanded','false'));detail.hidden=!open;if(open){button.setAttribute('aria-expanded','true');detail.querySelector('strong').textContent=details[button.dataset.detail].title;detail.querySelector('p').textContent=details[button.dataset.detail].text;}}));
  detail.querySelector('button').addEventListener('click',()=>{const active=hotspots.find(b=>b.getAttribute('aria-expanded')==='true');detail.hidden=true;hotspots.forEach(b=>b.setAttribute('aria-expanded','false'));active?.focus();});

  const features=[
    {word:'CARE',title:'今天，想了解它的哪里？',tags:['眼部','耳部','皮肤'],action:'拍摄照片',feature:'看见细微信号',text:'关注每一次变化，整理观察重点。',color:'#edf3f7'},
    {word:'ASK',title:'它最近，有哪些小变化？',tags:['症状记录','观察重点','就医沟通'],action:'描述你的担心',feature:'让下一步更清晰',text:'从症状与时间线，梳理需要关注的事。',color:'#eff1f6'},
    {word:'NOURISH',title:'每一口，都更适合它。',tags:['年龄','体重','生活习惯'],action:'了解营养方案',feature:'一宠一策的关心',text:'结合个体信息，规划每日营养。',color:'#edf5f5'},
    {word:'LEARN',title:'养宠小问题，随时问。',tags:['日常护理','行为习惯','新手养宠'],action:'开始探索',feature:'把专业讲得易懂',text:'让复杂知识，回到真实养宠日常。',color:'#f1f3f6'},
    {word:'READ',title:'把报告里的重点留下。',tags:['检验报告','说明文字','宠物档案'],action:'上传报告照片',feature:'重要信息，不遗漏',text:'提取文字，帮助整理每一次记录。',color:'#eaf1f5'}
  ];
  const tabs=[...document.querySelectorAll('.ability-tab')],panel=document.getElementById('abilityPanel');
  const compactTabs=matchMedia('(max-width:800px)');
  const setTabOrientation=()=>document.querySelector('.ability-list').setAttribute('aria-orientation',compactTabs.matches?'horizontal':'vertical');
  compactTabs.addEventListener('change',setTabOrientation);setTabOrientation();
  let active=0,featureTimer=0,userInteracting=false,featureVisible=false;
  const autoplayButton=document.getElementById('featureAutoplay');
  function choose(index,focus=false){active=(index+5)%5;const f=features[active];tabs.forEach((b,i)=>{b.setAttribute('aria-selected',String(i===active));b.tabIndex=i===active?0:-1;});panel.setAttribute('aria-labelledby',tabs[active].id);document.getElementById('visualWatermark').textContent=f.word;document.getElementById('demoTitle').textContent=f.title;const tags=document.getElementById('demoTags');tags.replaceChildren(...f.tags.map(t=>{const s=document.createElement('span');s.textContent=t;return s;}));document.getElementById('demoAction').textContent=f.action+' ＋';document.getElementById('featureTitle').textContent=f.feature;document.getElementById('featureText').textContent=f.text;panel.style.backgroundColor=f.color;if(focus){tabs[active].focus();tabs[active].scrollIntoView({behavior:motion.matches?'instant':'smooth',block:'nearest',inline:'nearest'});}}
  function scheduleFeatures(){clearInterval(featureTimer);autoplayButton.disabled=motion.matches;autoplayButton.textContent=motion.matches?'已减少动态效果':userInteracting?'继续自动切换':'暂停自动切换';autoplayButton.setAttribute('aria-pressed',String(userInteracting||motion.matches));if(!motion.matches&&featureVisible&&!userInteracting&&!document.hidden)featureTimer=setInterval(()=>choose(active+1),6500);}
  autoplayButton.addEventListener('click',()=>{userInteracting=!userInteracting;scheduleFeatures();});
  tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>{choose(i);userInteracting=true;scheduleFeatures();});tab.addEventListener('keydown',e=>{let next=null;if(['ArrowDown','ArrowRight'].includes(e.key))next=active+1;if(['ArrowUp','ArrowLeft'].includes(e.key))next=active-1;if(e.key==='Home')next=0;if(e.key==='End')next=4;if(next!==null){e.preventDefault();userInteracting=true;choose(next,true);scheduleFeatures();}});});
  // Real anchor links remain usable without JS; with JS they also select the matching capability.
  document.querySelectorAll('[data-feature-jump]').forEach(link=>link.addEventListener('click',()=>{
    const index=Number(link.dataset.featureJump);
    if(!Number.isInteger(index)||index<0||index>=features.length)return;
    choose(index);userInteracting=true;scheduleFeatures();
  }));
  new IntersectionObserver(entries=>{featureVisible=entries[0].isIntersecting;scheduleFeatures();},{threshold:.35}).observe(panel);
  document.addEventListener('visibilitychange',scheduleFeatures);

  // Magnetic attraction uses a damped spring, and is disabled on touch/reduced-motion.
  const magnets=[...document.querySelectorAll('.pill-button,.large-button,.control-button,.text-link,.hotspot')].map(el=>({el,x:0,y:0,tx:0,ty:0,vx:0,vy:0}));
  magnets.forEach(({el})=>el.classList.add('magnetic'));
  let magnetFrame=0;
  function spring(){magnetFrame=0;let unsettled=false;magnets.forEach(m=>{m.vx=(m.vx+(m.tx-m.x)*.16)*.67;m.vy=(m.vy+(m.ty-m.y)*.16)*.67;m.x+=m.vx;m.y+=m.vy;if(Math.abs(m.x-m.tx)+Math.abs(m.y-m.ty)+Math.abs(m.vx)+Math.abs(m.vy)>.04)unsettled=true;else{m.x=m.tx;m.y=m.ty;}m.el.style.translate=`${m.x.toFixed(2)}px ${m.y.toFixed(2)}px`;});if(unsettled)magnetFrame=requestAnimationFrame(spring);}
  const wakeSpring=()=>{if(!magnetFrame)magnetFrame=requestAnimationFrame(spring);};
  document.addEventListener('pointermove',e=>{if(!fine.matches||motion.matches)return;magnets.forEach(m=>{const r=m.el.getBoundingClientRect();if(!r.width||!r.height)return;const dx=e.clientX-(r.left+r.width/2-m.x),dy=e.clientY-(r.top+r.height/2-m.y);const near=Math.abs(dx)<r.width/2+28&&Math.abs(dy)<r.height/2+26;const strength=.12;m.tx=near?Math.max(-9,Math.min(9,dx*strength)):0;m.ty=near?Math.max(-7,Math.min(7,dy*strength)):0;});wakeSpring();},{passive:true});
  document.addEventListener('pointerleave',()=>{magnets.forEach(m=>{m.tx=0;m.ty=0;});wakeSpring();});
  document.querySelectorAll('button,.pill-button,.text-link').forEach(button=>{button.addEventListener('pointerdown',()=>button.classList.add('pressed'));['pointerup','pointercancel','pointerleave','blur'].forEach(event=>button.addEventListener(event,()=>button.classList.remove('pressed')));});

  // Spotlight follows the pointer only within each card. Touch retains a quiet center glow.
  document.querySelectorAll('.more-grid article,.ability-visual,.meet-portrait,.floating-card,.moment-card,.hero-shortcuts a').forEach(card=>{
    card.classList.add('spotlight');
    card.addEventListener('pointermove',e=>{if(!fine.matches||motion.matches)return;const box=card.getBoundingClientRect();card.style.setProperty('--spot-x',`${e.clientX-box.left}px`);card.style.setProperty('--spot-y',`${e.clientY-box.top}px`);card.classList.add('lit');});
    card.addEventListener('pointerleave',()=>card.classList.remove('lit','touched'));
    card.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')card.classList.add('touched');});
    ['pointerup','pointercancel'].forEach(event=>card.addEventListener(event,()=>card.classList.remove('touched')));
  });
  // Scroll-driven depth is independent from the film clock and never hijacks scrolling.
  const portrait=document.querySelector('.meet-portrait>img'),macro=document.querySelector('.detail-cat'),lastCat=document.querySelector('.download-cat');
  let scrollFrame=0;
  function scrollDepth(){scrollFrame=0;if(motion.matches)return;const viewport=innerHeight;[[portrait,17],[macro,25],[lastCat,22]].forEach(([el,range])=>{const r=el.parentElement.getBoundingClientRect();if(r.bottom<0||r.top>viewport)return;const p=Math.max(-1,Math.min(1,(r.top+r.height/2-viewport/2)/viewport));el.style.setProperty('--depth-y',`${p*range}px`);});}
  addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(scrollDepth);},{passive:true});
  motion.addEventListener('change',()=>{scheduleFeatures();if(motion.matches){magnets.forEach(m=>{m.x=m.y=m.tx=m.ty=m.vx=m.vy=0;m.el.style.translate='0px 0px';});[portrait,macro,lastCat].forEach(el=>el.style.setProperty('--depth-y','0px'));document.querySelectorAll('.spotlight').forEach(el=>el.classList.remove('lit'));}});
})();
