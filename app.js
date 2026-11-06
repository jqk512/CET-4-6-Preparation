import { initEmojiPhysics, destroyEmojiPhysics } from "./emoji-physics.js?v=20261104-3";
import { playUiSound, startCharge, updateCharge, stopCharge, isUiSoundMuted } from "./ui-sound.js?v=20261106-2";
const app = document.getElementById("app");
const CONTENT_VERSION = "20261106-3";
const ORIGIN = "https://couldyyy9.github.io/cet-website/library";
const STORE = "cet46-prep:v1";
const examResourceCache = new Map();
const SECTIONS = [
  { key:"listening", name:"听力理解", range:[1,25] },
  { key:"cloze", name:"选词填空", range:[26,35] },
  { key:"matching", name:"长篇匹配", range:[36,45] },
  { key:"passage1", name:"仔细阅读 · 一", range:[46,50] },
  { key:"passage2", name:"仔细阅读 · 二", range:[51,55] }
];
const state = {
  manifest:null, bank:null, extra:null, route:"/",
  level:"cet4", activeSection:"listening",
  data:readStore(), startedAt:Date.now(), loading:false,
  textScale:Math.max(.9,Math.min(1.6,Number(localStorage.getItem("cet46-text-scale"))||1)),
  textScaleCleanup:null, passageDragCleanup:null,
  mistakeIndex:0, mistakeOpen:null, mistakeItem:0, lastMistakeWheel:0, focusedQuestionNo:null
};
function readStore(){
  try {
    const x=JSON.parse(localStorage.getItem(STORE)||"{}");
    return {drafts:x.drafts||{},results:x.results||{},mastered:x.mastered||{},notes:x.notes||{}};
  } catch {return {drafts:{},results:{},mastered:{},notes:{}}}
}
function save(){localStorage.setItem(STORE,JSON.stringify(state.data))}
function esc(v=""){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
function key(e){return e.level+"_"+e.id}
function levelName(level){return level==="cet6"?"CET-6 六级":"CET-4 四级"}
function fileUrl(e,name){
  if(name==="listening.mp3"&&e.audioUrl)return ["localhost","127.0.0.1"].includes(location.hostname)?`./assets/audio/${e.level}/${e.id}/${e.audioFile||name}`:e.audioUrl;
  return ["localhost","127.0.0.1"].includes(location.hostname)?localFileUrl(e,name):ORIGIN+"/"+e.level+"/"+e.id+"/"+name;
}
function localFileUrl(e,name){return "./library/"+e.level+"/"+e.id+"/"+name}
function chineseSet(value){return ["零","一","二","三","四","五","六","七","八","九","十"][Number(value)]||String(value)}
function titleFor(e){return e.year+"年"+e.month+"月 · 第"+chineseSet(e.set)+"套"}
function localizePaperTitle(title){return String(title||"").replace(/第(\d+)套/g,(_,number)=>"第"+chineseSet(number)+"套")}
function formatDate(){return new Intl.DateTimeFormat("zh-CN",{month:"long",day:"numeric",weekday:"long"}).format(new Date())}
function currentRoute(){return decodeURIComponent(location.hash.replace(/^#/,"")||"/")}
function go(route){location.hash=route}
function sectionFor(q){return q.part==="listening"?"listening":q.passage||"passage1"}
function answered(e){return Object.keys(state.data.drafts[key(e)]?.answers||{}).length}
function result(e){return state.data.results[key(e)]}
function weight(q){if(q.part==="listening")return q.no<=15?7.1:14.2;if(q.kind==="cloze")return 3.55;if(q.kind==="matching")return 7.1;return 14.2}
function grade(bank,answers){
  let score=0,max=0,correct=0,answeredCount=0;
  const bySection={};
  for(const q of bank.questions){
    const section=sectionFor(q),w=weight(q),b=bySection[section]||(bySection[section]={correct:0,total:0,score:0,max:0});
    max+=w;b.max+=w;b.total++;
    if(answers[q.no])answeredCount++;
    if(String(answers[q.no]||"").toUpperCase()===String(q.answer).toUpperCase()){score+=w;correct++;b.correct++;b.score+=w}
  }
  return {score:Math.round(score*10)/10,max:Math.round(max*10)/10,correct,answered:answeredCount,total:bank.questions.length,bySection};
}
function completed(){return Object.keys(state.data.results).length}
function mistakeItems(){
  const all=[];
  for(const [examKey,r] of Object.entries(state.data.results)){
    for(const q of r.mistakes||[])if(!state.data.mastered[examKey+":"+q.no])all.push({...q,examKey,level:r.level,id:r.id,title:localizePaperTitle(r.title),wrongAt:q.wrongAt||r.finishedAt});
  }
  return all;
}
function showLoadFailure(message){
  app.innerHTML=`<main class="showcase-wrap"><section class="showcase-stage boot-stage">${showcaseHeader("home")}<div class="boot-message"><h1>资源加载失败</h1><p>${esc(message)}</p><button class="showcase-cta" onclick="location.reload()">重新加载 ↗</button></div></section></main>`;
}
function examFrame(content,level="cet4"){
  app.innerHTML=`<main class="exam-app level-${level}" style="--reading-scale:${state.textScale}">${showcaseHeader("papers")}<div class="exam-workspace">${content}</div><footer class="exam-footer">CET-4/6 Preparation <span>Practice at your own pace.</span></footer></main>`;
}
function showcaseHeader(active){
  return `<header class="showcase-header"><a class="showcase-brand" href="#/"><img class="showcase-logo" src="./assets/logo.png" alt="CET logo"><span>CET-4/6<br><small>PREPARATION</small></span></a><nav aria-label="Main navigation"><a class="${active==="home"?"selected":""}" href="#/">Home</a><a class="${active==="papers"?"selected":""}" href="#/practice">Exam papers</a><a class="${active==="mistakes"?"selected":""}" href="#/mistakes">Mistakes</a></nav></header>`;
}
function trafficGlyph(kind){
  const path=kind==="close"?'<path d="M4.5 4.5l7 7m0-7-7 7"/>':kind==="minimize"?'<path d="M4 8h8"/>':'<path d="M3.5 12.5l4-4m-4 4V9.5m0 3h3m6-9-4 4m4-4v3m0-3h-3"/>';
  return `<svg class="traffic-glyph" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}
function dashboard(){
  app.innerHTML=`<main class="showcase-wrap"><section class="showcase-stage landing-stage">
    ${showcaseHeader("home")}
    <div class="landing-copy"><h1>Ace the <span class="title-cet4">CET-4</span> and <span class="title-cet6">CET-6</span><br> exams with ease.</h1><p>Practice with real exam papers, review your mistakes, and keep moving forward.</p><a class="showcase-cta" href="#/practice">Explore exam papers <span>↗</span></a></div>
    <div class="emoji-arena" aria-label="Interactive falling study emojis"></div>
  </section></main>`;
  initEmojiPhysics(app.querySelector(".emoji-arena"));
}
function selectorSection(level,ordinal){
  const exams=state.manifest.exams.filter(e=>e.level===level);
  const icons=["📝","🎧","📖","✏️","📚","🎯","🧠","🎓","💡","🗓️","📕","⭐"];
  const months={6:"June",12:"December",3:"March",9:"September"};
  const label=level==="cet4"?"CET-4":"CET-6";
  return `<section class="showcase-stage selector-stage level-${level}" data-panel-level="${level}" aria-label="${label} exam papers">
    <div class="selector-intro"><div class="selector-heading"><span class="selector-number">${ordinal}</span><h1><span>${label}</span> papers</h1></div><p>Select the exam paper<br>you wish to tackle.</p></div>
    <div class="selector-level-tag">${label} <span>•</span> ${exams.length} PAPERS</div>
    <svg class="selector-arrow" viewBox="0 0 100 160" fill="none" aria-hidden="true"><path d="M17 4c55 20 85 69 49 132M66 136l-4-22m4 22 19-12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div class="selector-phone" aria-hidden="true"><div class="phone-notch"></div><div class="phone-status">9:41 <span>●●●  ▰</span></div><div class="phone-copy"><small>${label} PREPARATION</small><h2>Select the exam paper you wish to tackle.</h2><p>Swipe to browse. Tap a paper to begin.</p></div><div class="phone-bottom"><span>${label}</span><strong>${exams.length} papers</strong></div></div>
    <div class="paper-carousel-wrap"><div class="paper-carousel" aria-label="Swipe through ${label} exam papers">${exams.map((e,i)=>`<button class="paper-tile" data-open="${key(e)}" aria-label="${esc(titleFor(e))}, ${e.counts.total} questions"><span class="paper-tile-icon">${icons[i%icons.length]}</span><span class="paper-tile-date">${e.year} · ${months[e.month]||e.month}</span><span class="paper-tile-detail">第${chineseSet(e.set)}套 <span>↗</span></span></button>`).join("")}</div></div>
    <div class="selector-bottom"><div class="carousel-progress"><span class="carousel-progress-label">01</span><div class="sling-slider" role="slider" tabindex="0" aria-label="拖拽圆点选择试卷" aria-valuemin="1" aria-valuemax="${exams.length}" aria-valuenow="1"><span class="sling-track"></span><span class="sling-fill"></span><svg class="sling-overlay" aria-hidden="true"><path class="sling-bands"></path><path class="sling-flight"></path></svg><span class="sling-landing"><b>01</b></span><span class="sling-ball"></span></div><span class="carousel-progress-total">${String(exams.length).padStart(2,"0")}</span></div></div>
  </section>`;
}
function practice(){
  app.innerHTML=`<main class="showcase-wrap paper-page"><div class="selector-stack" data-active-level="${state.level}">
    ${showcaseHeader("papers")}
    ${selectorSection("cet4","01")}${selectorSection("cet6","02")}
    <div class="selector-stack-controls" role="group" aria-label="选择考试级别和分区大小">
      <button class="stack-dot stack-cet4" data-select-level="cet4" aria-label="显示四级试卷" title="CET-4"><span class="traffic-glyph">4</span></button>
      <button class="stack-dot stack-cet6" data-select-level="cet6" aria-label="显示六级试卷" title="CET-6"><span class="traffic-glyph">6</span></button>
      <button class="stack-dot stack-expand" data-expand-level="1" aria-label="放大当前分区" aria-pressed="false" title="放大分区">${trafficGlyph("expand")}</button>
    </div>
    <button class="selector-peek" data-select-level="${state.level==="cet4"?"cet6":"cet4"}" aria-label="显示${state.level==="cet4"?"六级":"四级"}试卷"></button>
  </div></main>`;
  initPaperCarousels();
  activateLevel(state.level);
  const warm=()=>state.manifest.exams.filter(e=>e.set===1).slice(0,2).forEach(e=>loadExamResources(e).catch(()=>{}));
  if("requestIdleCallback" in window)requestIdleCallback(warm,{timeout:2000});else setTimeout(warm,350);
}
function activateLevel(level){
  const stack=app.querySelector(".selector-stack");if(!stack)return;
  if(state.level!==level)playUiSound("switch");
  state.level=level;stack.dataset.activeLevel=level;
  stack.querySelectorAll(".selector-stage").forEach(stage=>{
    const front=stage.dataset.panelLevel===level;
    stage.classList.toggle("is-front",front);stage.classList.toggle("is-back",!front);
    stage.inert=!front;stage.setAttribute("aria-hidden",String(!front));
  });
  stack.querySelectorAll("[data-select-level]").forEach(button=>{
    if(button.classList.contains("stack-dot"))button.setAttribute("aria-pressed",String(button.dataset.selectLevel===level));
  });
  const peek=stack.querySelector(".selector-peek");
  if(peek){peek.dataset.selectLevel=level==="cet4"?"cet6":"cet4";peek.setAttribute("aria-label",`显示${level==="cet4"?"六级":"四级"}试卷`)}
}
function initPaperCarousels(){
  const cleanups=[];
  app.querySelectorAll(".paper-carousel").forEach(rail=>{
    const stage=rail.closest(".selector-stage");
    const cards=[...rail.children],slider=stage.querySelector(".sling-slider"),ball=slider.querySelector(".sling-ball"),fill=slider.querySelector(".sling-fill"),landing=slider.querySelector(".sling-landing"),landingText=slider.querySelector(".sling-landing b"),bands=slider.querySelector(".sling-bands"),flight=slider.querySelector(".sling-flight"),svg=slider.querySelector(".sling-overlay"),label=stage.querySelector(".carousel-progress-label");
    const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
    let step=0,centers=[],railCenter=0,frame=0,dragFrame=0,railAnimation=0,ballAnimation=0,drag=null,flying=false,lastSoundIndex=1;
    const measure=()=>{
      step=cards[0].offsetWidth+(parseFloat(getComputedStyle(rail).gap)||0);
      centers=cards.map(card=>card.offsetLeft+card.offsetWidth/2);
      railCenter=rail.clientWidth/2;
      svg.setAttribute("viewBox",`0 0 ${slider.clientWidth+240} 200`);
      requestUpdate();
    };
    const sliderWidth=()=>slider.clientWidth;
    const xFor=index=>(index-1)/(cards.length-1)*sliderWidth();
    const indexFor=x=>clamp(Math.round(x/sliderWidth()*(cards.length-1))+1,1,cards.length);
    const setRest=index=>{
      const x=xFor(index);
      slider.setAttribute("aria-valuenow",String(index));
      label.textContent=String(index).padStart(2,"0");
      ball.style.left=x+"px";ball.style.top="50%";fill.style.width=x+"px";
    };
    const update=()=>{
      frame=0;
      const scroll=rail.scrollLeft,index=clamp(Math.round(scroll/step)+1,1,cards.length);
      if(index!==lastSoundIndex){if(stage.classList.contains("is-front"))playUiSound("carousel");lastSoundIndex=index}
      if(!drag&&!flying)setRest(index);
      for(let i=0;i<cards.length;i++){
        const distance=(centers[i]-scroll-railCenter)/step,tile=cards[i];
        tile.style.setProperty("--cover-turn",`${clamp(-distance*13,-27,27)}deg`);
        tile.style.setProperty("--cover-scale",String(1-Math.min(Math.abs(distance)*.055,.17)));
        tile.style.setProperty("--cover-y",`${Math.min(Math.abs(distance)*12,32)}px`);
        tile.style.zIndex=String(100-Math.round(Math.abs(distance)*10));
      }
    };
    function requestUpdate(){if(!frame)frame=requestAnimationFrame(update)}
    const animateRail=index=>{
      cancelAnimationFrame(railAnimation);
      const start=rail.scrollLeft,target=clamp((index-1)*step,0,rail.scrollWidth-rail.clientWidth),begin=performance.now();
      const tick=now=>{
        const t=clamp((now-begin)/330,0,1),ease=1-Math.pow(1-t,3);
        rail.scrollLeft=start+(target-start)*ease;
        if(t<1)railAnimation=requestAnimationFrame(tick);else railAnimation=0;
      };
      railAnimation=requestAnimationFrame(tick);
    };
    const clearEffect=()=>{slider.classList.remove("is-dragging","is-flying");bands.setAttribute("d","");flight.setAttribute("d","");landing.style.opacity="0"};
    const resetSling=()=>{
      cancelAnimationFrame(dragFrame);dragFrame=0;
      cancelAnimationFrame(ballAnimation);ballAnimation=0;
      drag=null;flying=false;stopCharge(false);clearEffect();
      setRest(clamp(Math.round(rail.scrollLeft/step)+1,1,cards.length));
    };
    const pointerPosition=event=>{
      const rect=slider.getBoundingClientRect();
      return {x:clamp(event.clientX-rect.left,-100,rect.width+100),y:clamp(event.clientY-rect.top-rect.height/2,-95,95)};
    };
    const projectedX=point=>clamp(drag.anchorX-(point.x-drag.anchorX)*(1+Math.abs(point.y)/55),0,sliderWidth());
    const paintDrag=()=>{
      if(!drag)return;
      const point=drag.point,target=drag.mode==="sling"?projectedX(point):clamp(point.x,0,sliderWidth());
      updateCharge(Math.hypot(point.x-drag.anchorX,point.y)/Math.max(80,sliderWidth()*.6));
      ball.style.left=point.x+"px";ball.style.top=`calc(50% + ${point.y}px)`;
      landing.style.left=target+"px";landing.style.opacity="1";landingText.textContent=String(indexFor(target)).padStart(2,"0");
      if(drag.mode==="sling"){
        bands.setAttribute("d",`M ${drag.anchorX+114} 100 L ${point.x+120} ${100+point.y} M ${drag.anchorX+126} 100 L ${point.x+120} ${100+point.y}`);
        flight.setAttribute("d",`M ${point.x+120} ${100+point.y} Q ${(point.x+target)/2+120} ${Math.min(100+point.y,100)-48} ${target+120} 100`);
      }
    };
    slider.addEventListener("pointerdown",event=>{
      if(!stage.classList.contains("is-front"))return;
      resetSling();cancelAnimationFrame(railAnimation);railAnimation=0;
      const index=clamp(Math.round(rail.scrollLeft/step)+1,1,cards.length),point=pointerPosition(event),anchorX=xFor(index);
      drag={id:event.pointerId,point,anchorX,origin:point,mode:Math.abs(point.x-anchorX)<24?"sling":"seek"};
      startCharge();
      slider.classList.add("is-dragging");slider.setPointerCapture(event.pointerId);paintDrag();event.preventDefault();
    });
    slider.addEventListener("pointermove",event=>{if(!drag||event.pointerId!==drag.id)return;drag.point=pointerPosition(event);if(!dragFrame)dragFrame=requestAnimationFrame(()=>{dragFrame=0;paintDrag()})});
    const releaseSling=event=>{
      if(!drag||event.pointerId!==drag.id)return;
      cancelAnimationFrame(dragFrame);dragFrame=0;
      drag.point=pointerPosition(event);
      const {point,origin,anchorX,mode}=drag,moved=Math.hypot(point.x-origin.x,point.y-origin.y)>5;
      const targetX=mode==="seek"?point.x:moved?projectedX(point):anchorX;
      const targetIndex=indexFor(targetX),endX=xFor(targetIndex),startX=point.x,startY=point.y;
      drag=null;stopCharge(moved);slider.classList.remove("is-dragging");slider.classList.add("is-flying");flying=true;
      if(slider.hasPointerCapture(event.pointerId))slider.releasePointerCapture(event.pointerId);
      slider.setAttribute("aria-valuenow",String(targetIndex));label.textContent=String(targetIndex).padStart(2,"0");
      landing.style.left=endX+"px";landingText.textContent=String(targetIndex).padStart(2,"0");
      animateRail(targetIndex);
      const begin=performance.now(),peak=Math.min(startY,-28-Math.abs(endX-startX)*.22);
      const tick=now=>{
        const t=clamp((now-begin)/470,0,1),u=1-t,x=u*u*startX+2*u*t*(startX+endX)/2+t*t*endX,y=u*u*startY+2*u*t*peak;
        ball.style.left=x+"px";ball.style.top=`calc(50% + ${y}px)`;
        bands.setAttribute("d","");
        if(t<1)ballAnimation=requestAnimationFrame(tick);
        else {ballAnimation=0;flying=false;clearEffect();setRest(targetIndex)}
      };
      ballAnimation=requestAnimationFrame(tick);
    };
    slider.addEventListener("pointerup",releaseSling);
    const cancelSling=event=>{if(drag&&event.pointerId===drag.id)resetSling()};
    slider.addEventListener("pointercancel",cancelSling);
    slider.addEventListener("lostpointercapture",cancelSling);
    const handleBlur=()=>{if(drag)resetSling()};
    const handleVisibility=()=>{if(document.hidden&&drag)resetSling()};
    window.addEventListener("blur",handleBlur);
    document.addEventListener("visibilitychange",handleVisibility);
    slider.addEventListener("keydown",event=>{
      const current=clamp(Math.round(rail.scrollLeft/step)+1,1,cards.length);
      const next=event.key==="Home"?1:event.key==="End"?cards.length:event.key==="ArrowRight"?clamp(current+1,1,cards.length):event.key==="ArrowLeft"?clamp(current-1,1,cards.length):null;
      if(next===null)return;event.preventDefault();setRest(next);animateRail(next);
    });
    rail.addEventListener("scroll",requestUpdate,{passive:true});
    stage?.addEventListener("wheel",event=>{
      if(!stage?.classList.contains("is-front"))return;
      if(matchMedia("(max-width:760px)").matches)return;
      event.preventDefault();
      cancelAnimationFrame(railAnimation);railAnimation=0;
      rail.scrollLeft+=(Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY)*1.15;
    },{passive:false});
    let down=false,startX=0,startScroll=0,moved=false;
    rail.addEventListener("pointerdown",event=>{if(event.pointerType!=="mouse")return;down=true;moved=false;startX=event.clientX;startScroll=rail.scrollLeft});
    rail.addEventListener("pointermove",event=>{if(!down)return;const dx=event.clientX-startX;if(Math.abs(dx)>5){moved=true;rail.classList.add("dragging");rail.scrollLeft=startScroll-dx}});
    const releaseRail=()=>{down=false;rail.classList.remove("dragging")};
    rail.addEventListener("pointerup",releaseRail);rail.addEventListener("pointerleave",releaseRail);
    rail.addEventListener("click",event=>{if(moved){event.preventDefault();event.stopPropagation();moved=false}},true);
    const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(measure):null;
    if(observer)observer.observe(rail);else window.addEventListener("resize",measure,{passive:true});
    cleanups.push(()=>{stopCharge(false);observer?.disconnect();window.removeEventListener("resize",measure);window.removeEventListener("blur",handleBlur);document.removeEventListener("visibilitychange",handleVisibility);cancelAnimationFrame(frame);cancelAnimationFrame(dragFrame);cancelAnimationFrame(railAnimation);cancelAnimationFrame(ballAnimation)});
    measure();
  });
  state.carouselCleanup=()=>cleanups.forEach(cleanup=>cleanup());
}
function loadExamResources(meta){
  const examKey=key(meta);
  if(!examResourceCache.has(examKey)){
    const pending=Promise.all([
      fetch("./bank/"+meta.file+"?v="+CONTENT_VERSION).then(r=>{if(!r.ok)throw Error("题库加载失败");return r.json()}),
      fetch("./bank/extra/"+examKey+".json?v="+CONTENT_VERSION).then(r=>r.ok?r.json():null).catch(()=>null)
    ]).catch(error=>{examResourceCache.delete(examKey);throw error});
    examResourceCache.set(examKey,pending);
  }
  return examResourceCache.get(examKey);
}
async function openExam(examKey){
  const meta=state.manifest.exams.find(e=>key(e)===examKey);
  if(!meta){go("/practice");return}
  const requestId=state.examRequestId=(state.examRequestId||0)+1;
  state.loading=true;state.bank=null;state.extra=null;state.activeSection="listening";state.focusedQuestionNo=null;go("/exam/"+examKey);
  try{
    const [bank,extra]=await loadExamResources(meta);
    if(requestId!==state.examRequestId)return;
    state.bank=bank;state.extra=extra;
    if(!state.data.drafts[examKey]){state.data.drafts[examKey]={answers:{},startedAt:Date.now()};save()}
  }catch(err){if(requestId!==state.examRequestId)return;state.bank={error:err.message}}
  state.loading=false;render();window.scrollTo(0,0);
}
function availableSections(){return SECTIONS.filter(s=>s.key==="listening"&&state.bank.readingOnly||state.bank.questions.some(q=>sectionFor(q)===s.key))}
function passageHtml(s){
  const p=state.bank.passages?.[s.key];if(!p)return "";
  let body="";
  if(p.kind==="matching")body=Object.entries(p.paragraphs||{}).map(([letter,txt])=>`<div class="para"><b>${esc(letter)}</b> &nbsp; ${esc(txt)}</div>`).join("");
  else body=esc(p.text||"");
  const bank=p.wordBank? `<div class="wordbank">${Object.entries(p.wordBank).map(([l,w])=>`<span><b>${esc(l)}</b> ${esc(w)}</span>`).join("")}</div>`:"";
  return `<div class="passage" data-passage-section="${esc(s.key)}"><h3 class="passage-grip" title="拖动材料框">材料 <span aria-hidden="true">⋮⋮</span><small class="passage-restore-hint">按 Esc 复原</small></h3><div class="passage-scroll"><div class="passage-text">${body}</div>${bank}</div></div>`;
}
function questionHtml(q,answers,submitted){
  const chosen=answers[q.no]||"",letters=q.kind==="cloze"?Object.keys(state.bank.passages?.cloze?.wordBank||{}):q.kind==="matching"?(state.bank.passages?.matching?.letters||Object.keys(state.bank.passages?.matching?.paragraphs||{})):Object.keys(q.options||{});
  const labelFor=l=>q.kind==="cloze"?state.bank.passages?.cloze?.wordBank?.[l]||"":q.kind==="matching"?"段落 "+l:q.options[l]||"";
  const radial=q.kind==="cloze"||q.kind==="matching";
  const options=radial
    ?`<div class="inline-answer"><button class="inline-trigger ${chosen?"has-answer":""}" data-radial-toggle="${q.no}" aria-label="第 ${q.no} 题${chosen?`已选 ${chosen}，点击重选`:"，点击选择答案"}" aria-expanded="false" ${submitted?"disabled":""}>${esc(chosen||q.no)}</button>${submitted?"":`<div class="inline-choices" aria-label="第 ${q.no} 题选项">${letters.sort().map((l,i)=>`<button class="inline-choice" data-radial-choice="${q.no}:${esc(l)}" aria-label="${esc(l)} · ${esc(labelFor(l))}" style="--choice-order:${i}">${esc(l)}</button>`).join("")}</div>`}</div>`
    :`<div class="options">${letters.sort().map(l=>{
      const cls=[chosen===l?"selected":"",submitted&&l===q.answer?"correct":"",submitted&&chosen===l&&chosen!==q.answer?"wrong":""].join(" ");
      return `<button class="option ${cls}" data-answer="${q.no}:${esc(l)}" ${submitted?"disabled":""}><b>${esc(l)}</b><span>${esc(labelFor(l))}</span></button>`;
    }).join("")}</div>`;
  const exp=state.extra?.explain?.[q.no];
  const feedback=submitted?`<div class="feedback">正确答案：<b>${esc(q.answer)}</b>${q.answerText?` · ${esc(q.answerText)}`:""}${exp?.zh?`<br>题意：${esc(exp.zh)}`:""}${exp?.explain?`<br>解析：${esc(exp.explain)}`:""}</div>`:"";
  const raw=String(q.stem||"").trim();
  const stem=raw===String(q.no)||new RegExp(`^第\\s*${q.no}\\s*空$`).test(raw)?"":raw.replace(new RegExp(`^${q.no}[.．、:：]\\s*`),"");
  return `<article class="question ${radial?"radial-question":""}" id="q${q.no}">${radial?"":`<div class="question-top"><span class="question-index">${q.no}</span>${submitted&&chosen&&chosen!==q.answer?`<span class="pill">需复盘</span>`:""}</div>`}<p class="question-stem">${esc(stem)}</p>${options}${feedback}</article>`;
}
function subjectiveHtml(type,extra,examKey){
  const writing=type==="writing",title=writing?"写作":"翻译",source=writing?extra?.writing?.directions:extra?.translation?.text;
  if(!source)return `<div class="empty"><h3>${title}题目暂未收录</h3></div>`;
  return `<section class="subjective subjective-paper"><h2>${title}</h2><p class="subjective-prompt">${esc(source)}</p><label class="subjective-answer-label" for="subjective-${type}">我的${title}</label><textarea id="subjective-${type}" data-note="${type}" placeholder="在这里写下${writing?"作文":"译文"}…">${esc(state.data.notes[examKey]?.[type]||"")}</textarea></section>`;
}
function exam(){
  if(state.loading||!state.bank){examFrame('<div class="empty"><div class="big">◌</div><h3>正在加载题库…</h3></div>',state.route.includes("cet6")?"cet6":"cet4");return}
  if(state.bank.error){examFrame(`<div class="empty"><h3>${esc(state.bank.error)}</h3><button class="btn" data-open="${esc(state.route.split("/").pop())}">重新加载</button></div>`,state.route.includes("cet6")?"cet6":"cet4");return}
  const bank=state.bank,examKey=key(bank),draft=state.data.drafts[examKey]||{answers:{}},r=result(bank),submitted=!!r;
  const answers=submitted?r.answers:draft.answers;
  const sections=availableSections();
  const section=state.activeSection==="writing"&&state.extra?.writing?{key:"writing",name:"写作"}:state.activeSection==="translation"&&state.extra?.translation?{key:"translation",name:"翻译"}:(sections.find(s=>s.key===state.activeSection)||sections[0]);state.activeSection=section.key;
  const questions=bank.questions.filter(q=>sectionFor(q)===section.key);
  const max=bank.questions.length,count=Object.keys(answers).length;
  const audio=bank.hasAudio&&section.key==="listening"?`<audio class="audio" controls preload="none" ${isUiSoundMuted()?"muted":""} src="${fileUrl(bank,"listening.mp3")}"></audio>`:"";
  const tabs=`${sections.slice(0,1).map(s=>`<button data-section="${s.key}" class="${s.key===section.key?"active":""}">${s.name}</button>`).join("")}${state.extra?.writing?`<button data-section="writing" class="${section.key==="writing"?"active":""}">写作</button>`:""}${sections.slice(1).map(s=>`<button data-section="${s.key}" class="${s.key===section.key?"active":""}">${s.name}</button>`).join("")}${state.extra?.translation?`<button data-section="translation" class="${section.key==="translation"?"active":""}">翻译</button>`:""}`;
  examFrame(`<div class="quiz-layout"><div class="quiz-main"><div class="quiz-header"><div class="exam-window-controls" role="group" aria-label="文本工具"><button class="window-dot window-back" data-ui-control="back" aria-label="返回上一个页面" title="返回上一个页面">${trafficGlyph("close")}</button><button class="window-dot window-text" data-ui-control="window" aria-label="取下阅读材料" aria-pressed="false" title="取下阅读材料">${trafficGlyph("minimize")}</button><div class="text-scale-control" role="group" aria-label="阅读材料文字大小"><span class="text-scale-end">A−</span><div class="text-scale-slider" role="slider" tabindex="0" title="拖动气球缩放材料文字" aria-label="阅读材料文字大小" aria-valuemin="90" aria-valuemax="160" aria-valuenow="${Math.round(state.textScale*100)}" aria-valuetext="${Math.round(state.textScale*100)}%"><svg viewBox="0 0 320 140" aria-hidden="true"><rect class="balloon-track" x="16" y="116" width="288" height="8"/><rect class="balloon-fill" x="16" y="116" width="0" height="8"/><path class="balloon-string" d=""/><g class="balloon-shape"><path class="balloon-body" d="M 0 -2.4 C -0.64 -2.5 -1.04 -2.07 -1 -1.45 C -1.05 -0.8 -0.6 -0.22 -0.12 -0.04 Q 0 0.02 0.12 -0.04 C 0.6 -0.22 1.05 -0.8 1 -1.45 C 1.04 -2.07 0.64 -2.5 0 -2.4 Z"/><path class="balloon-knot" d="M -0.12 -0.06 L -0.13 0.12 Q 0 0.18 0.13 0.12 L 0.12 -0.06 Z M -0.13 0.12 L -0.22 0.30 Q 0 0.21 0.22 0.30 L 0.13 0.12 Z"/><path class="balloon-tie" d="M -0.13 0.12 Q 0 0.17 0.13 0.12"/></g></svg></div><span class="text-scale-end">A＋</span><output>${Math.round(state.textScale*100)}%</output></div></div><div class="quiz-header-top"><h1>${esc(titleFor(bank))}</h1><div class="quiz-progress-wrap"><div class="quiz-progress-ring" role="progressbar" aria-label="答题进度" aria-valuemin="0" aria-valuenow="${count}" aria-valuemax="${max}" style="--progress:${100*count/max}%"><span class="quiz-progress-count">${count}<small>/${max}</small></span></div></div></div>${audio}</div>
    ${submitted?`<div class="score-hero"><div><span>本次客观题估分</span><h2>练习结果</h2><strong>${r.score} <span>/ ${r.max}</span></strong><p style="margin:5px 0 0;font-size:12px">答对 ${r.correct} / ${r.total} 题 · 已答 ${r.answered} 题</p></div><div class="review-actions"><button class="btn white" data-reset="${examKey}">重新练习</button><button class="btn" data-route="/mistakes">错题复盘 →</button></div></div>`:""}
    <div class="section-tabs">${tabs}</div>
    ${section.key==="writing"||section.key==="translation"?subjectiveHtml(section.key,state.extra,examKey):section.key==="listening"&&bank.readingOnly?`<section class="missing-listening"><h2>听力理解</h2><p>原始第三套资料未提供独立听力题目和音频。同年同月第二套提供听力练习。</p><button class="btn dark" data-open-listening="${bank.level}_${bank.year}_${String(bank.month).padStart(2,"0")}_2">练习第二套听力 ↗</button></section>`:`<h2 class="question-section-heading">${esc(section.name)}</h2>${passageHtml(section)}${questions.map(q=>questionHtml(q,answers,submitted)).join("")}`}
    ${!submitted?`<button class="btn dark" data-submit="${examKey}">交卷并查看结果 →</button>`:""}</div>
    <aside class="quiz-side"><div class="panel"><div class="section-bar"><h3>题号</h3></div><div class="question-map">${bank.questions.map(q=>`<button data-jump="${q.no}" class="${answers[q.no]?"answered":""} ${submitted&&answers[q.no]&&answers[q.no]!==q.answer?"incorrect":""} ${state.focusedQuestionNo===q.no?"current":""}">${q.no}</button>`).join("")}</div><div class="side-footer">${submitted?`<button class="btn white" data-route="/practice">返回练习列表</button>`:`<button class="btn dark" data-submit="${examKey}">交卷查看成绩</button>`}</div></div></aside></div>`, bank.level);
  initTextScaleControl();
  initPassageDetach();
}
function mistakeFolders(){
  const groups=new Map();
  for(const q of mistakeItems()){
    if(!groups.has(q.examKey))groups.set(q.examKey,{examKey:q.examKey,title:q.title,level:q.level,items:[],latest:0});
    const group=groups.get(q.examKey);group.items.push(q);group.latest=Math.max(group.latest,Number(q.wrongAt)||0);
  }
  return [...groups.values()].sort((a,b)=>b.latest-a.latest);
}
function mistakeSnippet(q){
  const stem=String(q.stem||"").trim();
  const text=String(q.preview||((stem&&stem!==String(q.no))?stem:q.answerText)||`Question ${q.no}`).replace(/\s+/g," ").trim();
  return text.length>120?text.slice(0,117)+"…":text;
}
function questionLocation(no){
  const section=SECTIONS.find(s=>no>=s.range[0]&&no<=s.range[1]);
  return `${section?.name||"试题"} · 第 ${no} 题`;
}
function mistakeTime(value){
  if(!value)return "未记录";
  return new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(value));
}
function nowTime(){
  return new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());
}
function mistakeFolderPosition(index,total){
  let offset=index-state.mistakeIndex;
  if(offset>total/2)offset-=total;
  if(offset<-total/2)offset+=total;
  const distance=Math.abs(offset);
  return {offset,style:`--folder-shift:${offset*300}px;--folder-shift-mobile:${offset*67}vw;--folder-scale:${Math.max(.62,1-distance*.14)};--folder-tilt:${offset*-5}deg;--folder-layer:${100-distance};--folder-opacity:${Math.max(.3,1-distance*.2)}`};
}
function mistakeFolderHtml(group,index,total){
  const {offset,style:position}=mistakeFolderPosition(index,total);
  const colors=["#ee9da6","#91a9ce","#e8bd82","#9bbba9","#bea8c7","#9cb9c5"];
  const color=colors[index%colors.length];
  const style=`${position};--folder-color:${color}`;
  const previews=group.items.slice(0,3).map((q,i)=>`<span class="folder-preview-card card-${i}"><small>QUESTION ${String(q.no).padStart(2,"0")}</small><strong>${esc(mistakeSnippet(q))}</strong></span>`).join("");
  return `<button class="mistake-folder ${offset===0?"is-center":""}" data-folder-index="${index}" style="${style}" aria-label="${esc(group.title)}，${group.items.length} 道错题${offset===0?"，点击打开":"，点击移到中央"}"><span class="folder-preview-cards">${previews}</span><span class="folder-tab"></span><span class="folder-pocket"><span class="folder-pocket-line"></span><span class="folder-pocket-title">${esc(group.title)}</span><span class="folder-pocket-count">${group.level==="cet4"?"CET-4":"CET-6"} / ${group.items.length} 题</span></span></button>`;
}
function mistakeDetailHtml(group){
  state.mistakeItem=Math.min(state.mistakeItem,group.items.length-1);
  const item=group.items[state.mistakeItem];
  return `<section class="mistake-open" role="dialog" aria-modal="true" aria-label="${esc(group.title)}错题"><button class="mistake-back" data-folder-close="1">← 返回文件夹</button><div class="mistake-open-heading"><div><span class="mistake-overline">${group.level==="cet4"?"CET-4":"CET-6"} / MISTAKES</span><h1>${esc(group.title)}</h1></div><span>${group.items.length} 道待复盘</span></div><div class="mistake-open-grid"><div class="mistake-file-list" aria-label="文件夹内的错题">${group.items.map((q,i)=>`<button class="mistake-file ${i===state.mistakeItem?"selected":""}" data-folder-item="${i}"><span>NO. ${String(q.no).padStart(2,"0")}</span><strong>${esc(mistakeSnippet(q))}</strong></button>`).join("")}</div><article class="mistake-file-detail"><div class="mistake-detail-meta"><div><span>错题时间</span><strong>${esc(mistakeTime(item.wrongAt))}</strong></div><div><span>原题位置</span><strong>${esc(questionLocation(item.no))}</strong></div><div><span>原卷名称</span><strong>${esc(item.title)}</strong></div></div><div class="mistake-detail-question"><span>QUESTION ${String(item.no).padStart(2,"0")}</span><h2>${esc(mistakeSnippet(item))}</h2></div><div class="mistake-answer-row"><div>你的答案 <strong>${esc(item.chosen||"未作答")}</strong></div><div>正确答案 <strong>${esc(item.answer)}</strong>${item.answerText?` <span>${esc(item.answerText)}</span>`:""}</div></div><div class="mistake-detail-actions"><button data-open-question="${esc(item.examKey)}:${item.no}">回到原题 ↗</button><button data-master="${esc(item.examKey)}:${item.no}">标记已掌握 ✓</button></div></article></div></section>`;
}
function mistakes(){
  const folders=mistakeFolders();
  state.mistakeIndex=Math.min(state.mistakeIndex,Math.max(0,folders.length-1));
  const open=folders.find(x=>x.examKey===state.mistakeOpen);
  if(state.mistakeOpen&&!open)state.mistakeOpen=null;
  const scene=folders.length?`<section class="mistakes-scene"><div class="mistakes-heading"><h1>Every <span class="mistake-accent">mis</span>take<br>tells a story.</h1></div><div class="folder-wheel" role="region" aria-label="错题文件夹轮动">${folders.map((group,i)=>mistakeFolderHtml(group,i,folders.length)).join("")}</div><div class="mistake-wheel-footer"><button data-folder-prev="1" aria-label="上一个文件夹">←</button><span>${String(state.mistakeIndex+1).padStart(2,"0")} / ${String(folders.length).padStart(2,"0")}</span><button data-folder-next="1" aria-label="下一个文件夹">→</button></div></section>`:`<section class="mistakes-empty"><div class="empty-folder-icon"><span></span></div><h1>No mistakes yet.</h1><a href="#/practice">Explore exam papers ↗</a></section>`;
  const body=scene+(open?`<div class="mistake-overlay">${mistakeDetailHtml(open)}</div>`:"");
  app.innerHTML=`<main class="showcase-wrap mistakes-wrap"><div class="showcase-stage mistakes-window"><div class="mistakes-page"><header class="mistakes-topbar"><time class="mistake-clock" aria-label="当前时间">${esc(nowTime())}</time><nav aria-label="页面导航"><a href="#/">Home</a><a href="#/practice">Exam papers</a><a class="selected" href="#/mistakes">Mistakes</a></nav></header>${body}<div class="mistake-data-tools"><button data-export="1">导出学习记录</button><button data-import="1">导入备份</button><input type="file" id="import-file" accept="application/json" hidden></div></div></div></main>`;
  const wheel=app.querySelector(".folder-wheel");
  if(wheel){
    wheel.addEventListener("wheel",event=>{event.preventDefault();if(Math.abs(event.deltaY)+Math.abs(event.deltaX)<3||Date.now()-state.lastMistakeWheel<350)return;state.lastMistakeWheel=Date.now();rotateMistakeFolders(event.deltaY+event.deltaX>0?1:-1)},{passive:false});
    let startX=null;
    wheel.addEventListener("pointerdown",event=>{startX=event.clientX});
    wheel.addEventListener("pointerup",event=>{if(startX===null)return;const distance=event.clientX-startX;startX=null;if(Math.abs(distance)>36){wheel.dataset.dragged="1";rotateMistakeFolders(distance<0?1:-1)}});
    wheel.addEventListener("click",event=>{if(wheel.dataset.dragged){event.preventDefault();event.stopPropagation();delete wheel.dataset.dragged}},true);
  }
}
function updateMistakeWheel(){
  const folders=mistakeFolders();
  for(const folder of app.querySelectorAll(".mistake-folder")){
    const index=Number(folder.dataset.folderIndex),group=folders[index];
    if(!group)continue;
    const {offset,style}=mistakeFolderPosition(index,folders.length);
    folder.style.cssText=`${style};--folder-color:${["#ee9da6","#91a9ce","#e8bd82","#9bbba9","#bea8c7","#9cb9c5"][index%6]}`;
    folder.classList.toggle("is-center",offset===0);
    folder.setAttribute("aria-label",`${group.title}，${group.items.length} 道错题${offset===0?"，点击打开":"，点击移到中央"}`);
  }
  const count=app.querySelector(".mistake-wheel-footer span");
  if(count)count.textContent=`${String(state.mistakeIndex+1).padStart(2,"0")} / ${String(folders.length).padStart(2,"0")}`;
}
function rotateMistakeFolders(step){
  const length=mistakeFolders().length;if(length<2)return;
  playUiSound("folder");
  state.mistakeIndex=(state.mistakeIndex+step+length)%length;
  updateMistakeWheel();
}
function submit(examKey){
  const bank=state.bank;if(!bank||key(bank)!==examKey)return;
  const draft=state.data.drafts[examKey]||{answers:{}},answers=draft.answers||{};
  const unanswered=bank.questions.length-Object.keys(answers).length;
  if(unanswered&&!confirm(`还有 ${unanswered} 道题未作答，确定交卷吗？`))return;
  const g=grade(bank,answers);
  const finishedAt=Date.now();
  const mistakes=bank.questions.filter(q=>answers[q.no]&&answers[q.no]!==q.answer).map(q=>({no:q.no,stem:q.stem,answer:q.answer,answerText:q.answerText||q.options?.[q.answer]||bank.passages?.cloze?.wordBank?.[q.answer]||"",preview:q.kind==="cloze"?bank.passages?.cloze?.wordBank?.[q.answer]:q.kind==="matching"?q.stem:q.part==="listening"?q.options?.[q.answer]:q.stem,chosen:answers[q.no]||"",wrongAt:finishedAt}));
  state.data.results[examKey]={...g,level:bank.level,id:bank.id,title:titleFor(bank),answers:{...answers},mistakes,finishedAt};
  save();render();window.scrollTo({top:0,behavior:"smooth"});
}
function chooseAnswer(no,letter,control){
  if(!state.bank||!state.data.drafts[key(state.bank)])return;
  const answers=state.data.drafts[key(state.bank)].answers;
  if(letter)answers[no]=letter;else delete answers[no];
  save();
  const question=control.closest(".question");
  question?.querySelectorAll(".option").forEach(option=>option.classList.toggle("selected",option===control));
  const count=Object.keys(answers).length,max=state.bank.questions.length;
  const progress=app.querySelector(".quiz-progress-ring");
  progress?.setAttribute("aria-valuenow",String(count));
  progress?.style.setProperty("--progress",100*count/max+"%");
  const counter=app.querySelector(".quiz-progress-count");if(counter)counter.innerHTML=count+`<small>/${max}</small>`;
  app.querySelector(`.question-map button[data-jump="${no}"]`)?.classList.toggle("answered",!!letter);
}
function closeRadialMenus(){
  app.querySelectorAll(".inline-answer.is-open").forEach(box=>{
    box.classList.remove("is-open");box.querySelector(".inline-trigger")?.setAttribute("aria-expanded","false");
  });
}
function closeTextWindow(){
  state.passageDragCleanup?.();
  app.querySelector(".floating-text-window")?.remove();
  const passage=app.querySelector(".passage.is-floating");
  if(passage){
    passage.classList.remove("is-floating");
    for(const property of ["left","top","width","height"])passage.style.removeProperty(property);
  }
  app.querySelector('[data-ui-control="window"]')?.setAttribute("aria-pressed","false");
}
function enableWindowResize(element){
  if(element.dataset.resizeReady)return;
  element.dataset.resizeReady="1";
  for(const direction of ["n","e","s","w","ne","nw","se","sw"]){
    const handle=document.createElement("span");
    handle.className=`window-resize-handle resize-${direction}`;
    handle.setAttribute("aria-hidden","true");
    element.appendChild(handle);
    let drag=null;
    handle.addEventListener("pointerdown",event=>{
      if(event.button!==0)return;
      event.preventDefault();event.stopPropagation();
      const rect=element.getBoundingClientRect();
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,rect};
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener("pointermove",event=>{
      if(!drag||drag.id!==event.pointerId)return;
      const {rect}=drag,dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      const minWidth=Math.min(280,innerWidth-16),minHeight=Math.min(180,innerHeight-16);
      let left=rect.left,right=rect.right,top=rect.top,bottom=rect.bottom;
      if(direction.includes("w"))left=Math.max(8,Math.min(right-minWidth,rect.left+dx));
      if(direction.includes("e"))right=Math.min(innerWidth-8,Math.max(left+minWidth,rect.right+dx));
      if(direction.includes("n"))top=Math.max(8,Math.min(bottom-minHeight,rect.top+dy));
      if(direction.includes("s"))bottom=Math.min(innerHeight-8,Math.max(top+minHeight,rect.bottom+dy));
      element.style.left=left+"px";element.style.top=top+"px";
      element.style.width=right-left+"px";element.style.height=bottom-top+"px";
      element.style.transform="none";
    });
    for(const type of ["pointerup","pointercancel","lostpointercapture"])handle.addEventListener(type,event=>{if(drag?.id===event.pointerId)drag=null});
  }
}
function createTextWindow(point){
  closeTextWindow();
  const text=app.querySelector(".subjective-prompt");
  const stems=[...app.querySelectorAll(".question-stem")].map(x=>x.textContent.trim()).filter(Boolean);
  const content=text?text.innerHTML:stems.length?stems.map(x=>`<p>${esc(x)}</p>`).join(""):`<p>本章节没有独立的文字材料。</p>`;
  const section=app.querySelector(".question-section-heading,.subjective-paper h2")?.textContent||"文字材料";
  const floating=document.createElement("aside");
  floating.className="floating-text-window";floating.setAttribute("role","dialog");floating.setAttribute("aria-label",`${section}文字窗口`);
  floating.innerHTML=`<div class="floating-text-title"><strong>${esc(section)}</strong><button data-close-text-window="1" aria-label="关闭文字窗口">×</button></div><div class="floating-text-body">${content}</div>`;
  app.appendChild(floating);
  enableWindowResize(floating);
  app.querySelector('[data-ui-control="window"]')?.setAttribute("aria-pressed","true");
  if(point){
    const rect=floating.getBoundingClientRect();
    floating.style.left=Math.max(8,Math.min(innerWidth-rect.width-8,point.x-rect.width*.22))+"px";
    floating.style.top=Math.max(8,Math.min(innerHeight-rect.height-8,point.y-25))+"px";
    floating.style.transform="none";
  }
  const handle=floating.querySelector(".floating-text-title");
  let dragging=false,startX=0,startY=0,startLeft=0,startTop=0;
  handle.addEventListener("pointerdown",event=>{
    if(event.target.closest("button"))return;
    const rect=floating.getBoundingClientRect();
    floating.style.left=rect.left+"px";floating.style.top=rect.top+"px";floating.style.transform="none";
    dragging=true;startX=event.clientX;startY=event.clientY;startLeft=rect.left;startTop=rect.top;
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener("pointermove",event=>{
    if(!dragging)return;
    floating.style.left=Math.max(8,Math.min(innerWidth-80,startLeft+event.clientX-startX))+"px";
    floating.style.top=Math.max(8,Math.min(innerHeight-50,startTop+event.clientY-startY))+"px";
  });
  handle.addEventListener("pointerup",()=>{dragging=false});
  handle.addEventListener("pointercancel",()=>{dragging=false});
  return floating;
}
function toggleTextWindow(){
  const passage=app.querySelector(".passage[data-passage-section]");
  if(passage){
    if(passage.classList.contains("is-floating")){closeTextWindow();return}
    floatPassage(passage);
    return;
  }
  if(app.querySelector(".floating-text-window"))closeTextWindow();else createTextWindow();
}
function floatPassage(passage){
  if(passage.classList.contains("is-floating"))return passage;
  const rect=passage.getBoundingClientRect();
  const width=Math.min(rect.width,innerWidth-24,720);
  const height=Math.min(rect.height,innerHeight*.68);
  passage.style.width=width+"px";
  passage.style.height=height+"px";
  passage.style.left=Math.max(8,Math.min(innerWidth-width-8,rect.left))+"px";
  passage.style.top=Math.max(8,Math.min(innerHeight-height-8,rect.top))+"px";
  passage.classList.add("is-floating");
  enableWindowResize(passage);
  app.querySelector('[data-ui-control="window"]')?.setAttribute("aria-pressed","true");
  window.getSelection()?.removeAllRanges();
  return passage;
}
function initPassageDetach(){
  const passage=app.querySelector(".passage[data-passage-section]");
  if(!passage)return;
  let timer=0,gesture=null;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const stop=()=>{
    clearTimeout(timer);timer=0;gesture=null;
    window.removeEventListener("pointermove",pointerMove);
    window.removeEventListener("pointerup",pointerEnd);
    window.removeEventListener("pointercancel",pointerEnd);
    window.removeEventListener("touchmove",touchMove);
    window.removeEventListener("touchend",touchEnd);
    window.removeEventListener("touchcancel",touchEnd);
    window.removeEventListener("blur",stop);
  };
  const activate=()=>{
    if(!gesture)return;
    floatPassage(passage);
    const rect=passage.getBoundingClientRect();
    gesture.floating=true;gesture.left=rect.left;gesture.top=rect.top;
    gesture.startX=gesture.x;gesture.startY=gesture.y;
  };
  const begin=(id,x,y,immediate,touch=false)=>{
    if(gesture)return;
    gesture={id,startX:x,startY:y,x,y,floating:false,touch};
    if(immediate)activate();else timer=setTimeout(activate,320);
    window.addEventListener("blur",stop);
  };
  const move=(x,y)=>{
    if(!gesture)return;
    gesture.x=x;gesture.y=y;
    if(!gesture.floating){if(gesture.touch&&Math.hypot(x-gesture.startX,y-gesture.startY)>12)stop();return}
    passage.style.left=clamp(gesture.left+x-gesture.startX,8,innerWidth-80)+"px";
    passage.style.top=clamp(gesture.top+y-gesture.startY,8,innerHeight-48)+"px";
  };
  const pointerMove=event=>{if(gesture?.id!==event.pointerId)return;move(event.clientX,event.clientY);if(gesture?.floating)event.preventDefault()};
  const pointerEnd=event=>{if(gesture?.id===event.pointerId)stop()};
  const touchMove=event=>{
    const touch=[...event.changedTouches].find(item=>item.identifier===gesture?.id);
    if(!touch)return;
    move(touch.clientX,touch.clientY);
    if(gesture?.floating)event.preventDefault();
  };
  const touchEnd=event=>{if([...event.changedTouches].some(item=>item.identifier===gesture?.id))stop()};
  passage.addEventListener("pointerdown",event=>{
    if(event.target.closest(".window-resize-handle"))return;
    if(event.pointerType==="touch"||event.button!==0)return;
    const immediate=passage.classList.contains("is-floating")||!!event.target.closest(".passage-grip");
    event.preventDefault();begin(event.pointerId,event.clientX,event.clientY,immediate);
    window.addEventListener("pointermove",pointerMove,{passive:false});
    window.addEventListener("pointerup",pointerEnd);
    window.addEventListener("pointercancel",pointerEnd);
  });
  passage.addEventListener("touchstart",event=>{
    if(event.target.closest(".window-resize-handle"))return;
    if(event.touches.length!==1)return;
    const touch=event.changedTouches[0];
    const immediate=passage.classList.contains("is-floating")||!!event.target.closest(".passage-grip");
    begin(touch.identifier,touch.clientX,touch.clientY,immediate,true);
    window.addEventListener("touchmove",touchMove,{passive:false});
    window.addEventListener("touchend",touchEnd);
    window.addEventListener("touchcancel",touchEnd);
    if(immediate)event.preventDefault();
  },{passive:false});
  passage.querySelector(".passage-grip")?.addEventListener("contextmenu",event=>event.preventDefault());
  state.passageDragCleanup=stop;
}
function initTextScaleControl(){
  const slider=app.querySelector(".text-scale-slider");
  if(!slider)return;
  const fill=slider.querySelector(".balloon-fill"),string=slider.querySelector(".balloon-string"),shape=slider.querySelector(".balloon-shape"),body=slider.querySelector(".balloon-body");
  const output=app.querySelector(".text-scale-control output"),examApp=app.querySelector(".exam-app");
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const compact=matchMedia("(max-width: 760px)");
  const progress=()=>clamp((state.textScale-.9)/.7,0,1);
  const physics={air:progress(),airVelocity:0,swing:0,swingVelocity:0,pulse:0};
  let drag=null,frame=0,visible=true,lastTime=0;
  const paint=(now=0)=>{
    const target=progress(),air=clamp(physics.air,0,1),anchorX=16+target*288;
    const radius=(10+air*25)*(compact.matches?1.2:1)*(1+Math.sin(now*.0021)*(.006+air*.008));
    const width=radius*(1+physics.pulse*.11),height=radius*(1-physics.pulse*.07);
    const side=.73+air*.32,top=1.65+air*.25;
    body.setAttribute("d",`M 0 -${top} C -${side*.7} -${top+.08} -${side*1.12} -${top*.77} -${side} -1.02 C -${side*.88} -.48 -.45 -.2 -.12 -.04 Q 0 .02 .12 -.04 C .45 -.2 ${side*.88} -.48 ${side} -1.02 C ${side*1.12} -${top*.77} ${side*.7} -${top+.08} 0 -${top} Z`);
    const bodyX=anchorX+physics.swing;
    const angle=clamp(physics.swing*.42+physics.swingVelocity*.024,-16,16);
    shape.setAttribute("transform",`translate(${bodyX} 83) rotate(${angle}) scale(${width} ${height})`);
    const angleRad=angle*Math.PI/180,startX=bodyX-Math.sin(angleRad)*height*.3,startY=83+Math.cos(angleRad)*height*.3;
    const bend=clamp(physics.swing*.6+physics.swingVelocity*.05,-17,17),span=116-startY;
    string.setAttribute("d",`M ${startX} ${startY} C ${startX+7+bend} ${startY+span*.2} ${anchorX-9-bend*.7} ${startY+span*.52} ${anchorX+2+bend*.25} ${startY+span*.76} Q ${anchorX+5-bend*.35} ${startY+span*.91} ${anchorX} 116`);
    fill.setAttribute("width",String(anchorX-16));
  };
  const tick=now=>{
    frame=0;
    if(!visible||document.hidden)return;
    const dt=lastTime?clamp((now-lastTime)/1000,.001,.033):.016;
    lastTime=now;
    const target=progress();
    physics.airVelocity+=(target-physics.air)*90*dt;
    physics.airVelocity*=Math.exp(-10.5*dt);
    physics.air=clamp(physics.air+physics.airVelocity*dt,-.08,1.12);
    physics.pulse*=Math.exp(-5.3*dt);
    const wind=Math.sin(now*.00105)*.72+Math.sin(now*.00227+1.6)*.38;
    physics.swingVelocity+=(-physics.swing*12-physics.swingVelocity*3.2+wind*82)*dt;
    physics.swing=clamp(physics.swing+physics.swingVelocity*dt,-24,24);
    paint(now);
    frame=requestAnimationFrame(tick);
  };
  const start=()=>{if(!frame&&visible&&!document.hidden&&!reducedMotion){lastTime=0;frame=requestAnimationFrame(tick)}};
  const setScale=value=>{
    state.textScale=clamp(Math.round(value*100)/100,.9,1.6);
    examApp.style.setProperty("--reading-scale",String(state.textScale));
    const percent=Math.round(state.textScale*100);
    output.textContent=percent+"%";
    slider.setAttribute("aria-valuenow",String(percent));
    slider.setAttribute("aria-valuetext",percent+"%");
    if(reducedMotion){physics.air=progress();paint()}
    else start();
  };
  const scaleAt=clientX=>{
    const rect=slider.getBoundingClientRect();
    const x=clamp((clientX-rect.left)/rect.width*320,16,304);
    return .9+(x-16)/288*.7;
  };
  const applyPointer=clientX=>{
    if(!drag)return;
    const delta=clientX-drag.lastX,previous=progress();
    drag.lastX=clientX;
    setScale(scaleAt(clientX));
    const change=progress()-previous;
    physics.airVelocity=clamp(physics.airVelocity+change*5,-2.6,2.6);
    physics.pulse=clamp(physics.pulse+delta*.025,-1,1);
    physics.swingVelocity=clamp(physics.swingVelocity+delta*.7,-115,115);
    if(!reducedMotion)start();
  };
  const finish=event=>{
    if(!drag||event.pointerId!==drag.id)return;
    applyPointer(Number.isFinite(event.clientX)?event.clientX:drag.lastX);
    drag=null;slider.classList.remove("is-dragging");
    localStorage.setItem("cet46-text-scale",String(state.textScale));
    if(slider.hasPointerCapture(event.pointerId))slider.releasePointerCapture(event.pointerId);
  };
  slider.addEventListener("pointerdown",event=>{
    if(event.button!==0||drag)return;
    drag={id:event.pointerId,lastX:event.clientX};
    slider.classList.add("is-dragging");
    slider.setPointerCapture(event.pointerId);
    applyPointer(event.clientX);
    event.preventDefault();
  });
  slider.addEventListener("pointermove",event=>{if(drag?.id===event.pointerId)applyPointer(event.clientX)});
  slider.addEventListener("pointerup",finish);
  slider.addEventListener("pointercancel",finish);
  slider.addEventListener("lostpointercapture",finish);
  slider.addEventListener("keydown",event=>{
    const next=event.key==="Home"?.9:event.key==="End"?1.6:event.key==="ArrowRight"||event.key==="ArrowUp"?state.textScale+.05:event.key==="ArrowLeft"||event.key==="ArrowDown"?state.textScale-.05:null;
    if(next===null)return;
    event.preventDefault();setScale(next);
    localStorage.setItem("cet46-text-scale",String(state.textScale));
  });
  const observer=new IntersectionObserver(entries=>{
    visible=entries[0]?.isIntersecting??false;
    if(visible)start();else{cancelAnimationFrame(frame);frame=0}
  });
  observer.observe(slider);
  const onVisibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0}else start()};
  document.addEventListener("visibilitychange",onVisibility);
  state.textScaleCleanup=()=>{cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener("visibilitychange",onVisibility);drag=null};
  paint();start();
}
function render(){
  state.route=currentRoute();
  if(state.route!=="/mistakes")state.mistakeOpen=null;
  if(state.route.startsWith("/exam/"))stopCharge(false);
  if(!state.manifest)return;
  if(app.querySelector(".emoji-arena"))destroyEmojiPhysics();
  if(state.carouselCleanup){state.carouselCleanup();state.carouselCleanup=null}
  if(state.textScaleCleanup){state.textScaleCleanup();state.textScaleCleanup=null}
  if(state.passageDragCleanup){state.passageDragCleanup();state.passageDragCleanup=null}
  if(state.route==="/")dashboard();
  else if(state.route==="/practice")practice();
  else if(state.route==="/library")go("/practice");
  else if(state.route==="/mistakes")mistakes();
  else if(state.route.startsWith("/exam/")){
    const examKey=state.route.split("/")[2];
    if(!state.bank||(!state.bank.error&&key(state.bank)!==examKey)){if(!state.loading)openExam(examKey);else exam();return}
    exam();
  } else go("/");
}
document.addEventListener("click",event=>{
  const control=event.target.closest("a,button");
  if(control&&!control.closest("#support-root")&&!control.matches("[data-select-level],[data-folder-prev],[data-folder-next],[data-folder-index]"))playUiSound("click");
},true);
app.addEventListener("click",e=>{
  if(!e.target.closest(".inline-answer"))closeRadialMenus();
  const t=e.target.closest("[data-open],[data-open-listening],[data-route],[data-section],[data-answer],[data-jump],[data-submit],[data-reset],[data-master],[data-export],[data-import],[data-carousel],[data-select-level],[data-expand-level],[data-ui-control],[data-close-text-window],[data-radial-toggle],[data-radial-choice],[data-folder-index],[data-folder-item],[data-folder-prev],[data-folder-next],[data-folder-close],[data-open-question]");
  if(!t)return;
  if(t.dataset.selectLevel){activateLevel(t.dataset.selectLevel);return}
  if(t.dataset.folderIndex!==undefined){const index=Number(t.dataset.folderIndex);if(index===state.mistakeIndex){playUiSound("click");state.mistakeOpen=mistakeFolders()[index]?.examKey;state.mistakeItem=0;mistakes()}else{playUiSound("folder");state.mistakeIndex=index;updateMistakeWheel()}return}
  if(t.dataset.folderItem!==undefined){
    const index=Number(t.dataset.folderItem),group=mistakeFolders().find(x=>x.examKey===state.mistakeOpen);
    if(!group||index===state.mistakeItem)return;
    state.mistakeItem=index;
    const template=document.createElement("template");
    template.innerHTML=mistakeDetailHtml(group);
    app.querySelectorAll(".mistake-file").forEach((file,i)=>file.classList.toggle("selected",i===index));
    app.querySelector(".mistake-file-detail")?.replaceWith(template.content.querySelector(".mistake-file-detail"));
    return;
  }
  if(t.dataset.folderPrev){rotateMistakeFolders(-1);return}
  if(t.dataset.folderNext){rotateMistakeFolders(1);return}
  if(t.dataset.folderClose){state.mistakeOpen=null;mistakes();return}
  if(t.dataset.openQuestion){const [examKey,no]=t.dataset.openQuestion.split(":");openExam(examKey).then(()=>{const q=state.bank?.questions?.find(x=>x.no===Number(no));if(!q)return;state.activeSection=sectionFor(q);state.focusedQuestionNo=q.no;render();requestAnimationFrame(()=>document.getElementById("q"+no)?.scrollIntoView({behavior:"smooth",block:"center"}))});return}
  if(t.dataset.openListening){openExam(t.dataset.openListening).then(()=>{state.activeSection="listening";render()});return}
  if(t.dataset.expandLevel){const stack=app.querySelector(".selector-stack");const expanded=stack?.classList.toggle("is-expanded");t.setAttribute("aria-pressed",String(!!expanded));t.setAttribute("aria-label",expanded?"缩小当前分区":"放大当前分区");return}
  if(t.dataset.uiControl){
    if(t.dataset.uiControl==="back"){if(history.length>1)history.back();else go("/practice");return}
    if(t.dataset.uiControl==="window"){toggleTextWindow();return}
  }
  if(t.dataset.closeTextWindow){closeTextWindow();return}
  if(t.dataset.radialToggle){const box=t.closest(".inline-answer"),willOpen=!box.classList.contains("is-open");closeRadialMenus();if(willOpen){box.classList.add("is-open");t.setAttribute("aria-expanded","true")}return}
  if(t.dataset.radialChoice){const [no,letter]=t.dataset.radialChoice.split(":"),trigger=t.closest(".inline-answer")?.querySelector(".inline-trigger");chooseAnswer(no,letter,t);if(trigger){trigger.textContent=letter;trigger.classList.add("has-answer");trigger.setAttribute("aria-label",`第 ${no} 题已选 ${letter}，点击重选`)}closeRadialMenus();return}
  if(t.dataset.carousel){const rail=t.closest(".selector-stage")?.querySelector(".paper-carousel"),card=rail?.querySelector(".paper-tile");if(rail&&card)rail.scrollBy({left:(t.dataset.carousel==="next"?1:-1)*(card.getBoundingClientRect().width+(parseFloat(getComputedStyle(rail).gap)||16)),behavior:"smooth"});return}
  if(t.dataset.open){openExam(t.dataset.open);return}
  if(t.dataset.route){go(t.dataset.route);return}
  if(t.dataset.section){state.activeSection=t.dataset.section;state.focusedQuestionNo=null;render();window.scrollTo({top:0,behavior:"smooth"});return}
  if(t.dataset.answer){
    const [no,letter]=t.dataset.answer.split(":");
    chooseAnswer(no,letter,t);
    return;
  }
  if(t.dataset.jump){
    const q=state.bank.questions.find(x=>x.no===Number(t.dataset.jump));if(!q)return;
    const nextSection=sectionFor(q),changed=state.activeSection!==nextSection;
    state.activeSection=nextSection;state.focusedQuestionNo=q.no;
    if(changed)render();else{app.querySelector(".question-map button.current")?.classList.remove("current");t.classList.add("current")}
    requestAnimationFrame(()=>document.getElementById("q"+q.no)?.scrollIntoView({behavior:"smooth",block:"start"}));return;
  }
  if(t.dataset.submit){submit(t.dataset.submit);return}
  if(t.dataset.reset){if(confirm("重新练习会清除这套卷的上次成绩和答题记录，继续吗？")){delete state.data.results[t.dataset.reset];state.data.drafts[t.dataset.reset]={answers:{},startedAt:Date.now()};save();render()}return}
  if(t.dataset.master){state.data.mastered[t.dataset.master]=true;save();render();return}
  if(t.dataset.export){
    const blob=new Blob([JSON.stringify({app:"CET-4/6 Preparation",exportedAt:new Date().toISOString(),data:state.data},null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="cet46-preparation-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);return;
  }
  if(t.dataset.import){document.getElementById("import-file")?.click()}
});
app.addEventListener("input",e=>{
  if(e.target.dataset.note&&state.bank){const examKey=key(state.bank);state.data.notes[examKey] ||= {};state.data.notes[examKey][e.target.dataset.note]=e.target.value;save()}
});
app.addEventListener("change",async e=>{
  if(e.target.id==="import-file"){
    const file=e.target.files?.[0];if(!file)return;
    try{const content=JSON.parse(await file.text());if(content.app!=="CET-4/6 Preparation"||!content.data?.results)throw Error("文件格式不匹配");state.data=content.data;save();render();alert("学习记录已导入。")}catch(err){alert("导入失败："+err.message)}
  }
});
window.addEventListener("hashchange",()=>{render();window.scrollTo(0,0)});
window.addEventListener("keydown",event=>{if(event.key!=="Escape")return;if(app.querySelector(".passage.is-floating,.floating-text-window")){closeTextWindow();event.preventDefault();return}if(state.route==="/mistakes"&&state.mistakeOpen){state.mistakeOpen=null;mistakes()}});
setInterval(()=>{const clock=app.querySelector(".mistake-clock");if(clock)clock.textContent=nowTime()},30000);
fetch("./bank/manifest.json?v="+CONTENT_VERSION).then(r=>{if(!r.ok)throw Error("题库清单不可用");return r.json()}).then(manifest=>{
  state.manifest=manifest;
  render();
}).catch(err=>showLoadFailure(err.message));
render();
