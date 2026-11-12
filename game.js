/* NEON CLASH: STREET LEGENDS — Motor de combate en Canvas 2D (sin dependencias). */
(() => {
  'use strict';
  const W = 1280, H = 720, FLOOR = 590, CELL_W = 1402 / 5, CELL_H = 1122 / 4;
  const $ = (id) => document.getElementById(id);
  const CHARS = [
    {id:'Kevin',name:'KEVIN',power:'ENERGÍA OSCURA',role:'RUSHDOWN · ATAQUE RÁPIDO',element:'shadow',color:'#b660ff', glow:'#a432ec73',special:'CORTE DEL ABISMO',ultimate:'ECLIPSE TOTAL',speed:1.16,power:.94,range:1.05},
    {id:'Emy',name:'EMY',power:'CYBER TÁCTICA',role:'ZONER · CONTROL A DISTANCIA',element:'tech',color:'#29eeff',glow:'#0ff0ee63',special:'PROYECTOR TÁCTICO',ultimate:'DOMINIO DIGITAL',speed:1.02,power:.93,range:1.08},
    {id:'Alejandro',name:'ALEJANDRO',power:'FÉNIX DE FUEGO',role:'SHOTO · EQUILIBRADO',element:'fire',color:'#ff922f',glow:'#ff7e2866',special:'PUÑO DEL FÉNIX',ultimate:'RENACER ÍGNEO',speed:1.04,power:1.04,range:1.00},
    {id:'Anderson',name:'ANDERSON',power:'MAESTRO DEL VIENTO',role:'HIT & RUN · EVASIÓN',element:'wind',color:'#79e7db',glow:'#48ffd254',special:'CORTE DE VIENTO',ultimate:'OJO DEL CICLÓN',speed:1.21,power:.88,range:1.00},
    {id:'Irving',name:'IRVING',power:'ELECTRICIDAD AZUL',role:'PUNISHER · CONTRAATAQUES',element:'lightning',color:'#388dff',glow:'#008aff7d',special:'PULSO VOLTAICO',ultimate:'SOBRECARGA AZUL',speed:1.12,power:1.00,range:1.08},
    {id:'Mibzar',name:'MIBZAR',power:'FUERZA DE LA TIERRA',role:'GRAPPLER · ALTO IMPACTO',element:'earth',color:'#ffcd72',glow:'#dda15565',special:'GOLPE SÍSMICO',ultimate:'CATACLISMO',speed:.83,power:1.28,range:.90},
  ];
  const STAGES = {alley:{name:'NEON ALLEY'},rooftop:{name:'SKYLINE'},subway:{name:'SUBWAY 07'}};
  const MOVE_LIST = [
    ['left','Izquierda'],['right','Derecha'],['up','Saltar / arriba'],['down','Agacharse / abajo'],
    ['light','Puñetazo débil'],['heavy','Puñetazo fuerte'],['lightKick','Patada débil'],['heavyKick','Patada fuerte'],
    ['throw','Agarre'],['special','Especial (RB / R1)'],['ultimate','Ultimate (RT / R2)'],['break','Rompeguardia (LT / L2)'],
  ];
  const DEFAULT_KEYS = [
    {left:'KeyA',right:'KeyD',up:'KeyW',down:'KeyS',light:'KeyJ',heavy:'KeyK',lightKick:'KeyU',heavyKick:'KeyI',throw:'KeyQ',special:'KeyL',ultimate:'KeyO',break:'KeyE'},
    {left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown',light:'KeyZ',heavy:'KeyX',lightKick:'KeyC',heavyKick:'KeyV',throw:'KeyB',special:'KeyN',ultimate:'KeyM',break:'Comma'},
  ];
  const DEFAULT_PADS = {light:2,heavy:3,lightKick:0,heavyKick:1,throw:4,special:5,ultimate:7,break:6};
  const ATTACKS = {
    light:{start:.075,active:.095,end:.165,dmg:5,range:115,level:'high',push:23,stun:.19},
    heavy:{start:.175,active:.115,end:.32,dmg:11,range:129,level:'mid',push:52,stun:.30},
    lightKick:{start:.11,active:.11,end:.22,dmg:7,range:142,level:'mid',push:31,stun:.22},
    heavyKick:{start:.23,active:.15,end:.34,dmg:14,range:163,level:'mid',push:74,stun:.38},
    low:{start:.13,active:.13,end:.25,dmg:8,range:135,level:'low',push:34,stun:.27},
    throw:{start:.08,active:.10,end:.40,dmg:17,range:93,level:'grab',push:120,stun:.62,knockdown:.65},
    special:{start:.17,active:.20,end:.33,dmg:18,range:200,level:'mid',push:95,stun:.43},
    break:{start:.12,active:.15,end:.42,dmg:12,range:160,level:'guardbreak',push:100,stun:.55},
  };
  const clone = (val) => JSON.parse(JSON.stringify(val));
  const safeSettings = () => {
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem('neonClashSettings') || '{}') || {}; } catch (_) {}
    const controls = [0,1].map(p => ({...DEFAULT_KEYS[p],...((stored.keys||[])[p]||{})}));
    const gamepad = [0,1].map(p => ({...DEFAULT_PADS,...((stored.pads||[])[p]||{})}));
    return {keys:controls,pads:gamepad,sound:stored.sound!==false,shake:stored.shake!==false,difficulty:['easy','normal','hard'].includes(stored.difficulty)?stored.difficulty:'normal'};
  };
  const settings = safeSettings();
  const saveSettings = () => {try{localStorage.setItem('neonClashSettings',JSON.stringify(settings))}catch(_){}};
  const images = {};
  CHARS.forEach(c=>{const img=new Image();img.src=`assets/sprites/${c.id}.png`;images[c.id]=img;});
  const portrait = c => `assets/portraits/${c.id}.png`;
  const screens = {home:$('homeScreen'),select:$('selectScreen'),versus:$('versusScreen'),fight:$('fightScreen'),result:$('resultScreen'),options:$('optionsScreen')};
  const canvas=$('gameCanvas'),ctx=canvas.getContext('2d',{alpha:false});
  ctx.imageSmoothingEnabled=false;
  let screen='home', mode='arcade',stage='alley',selected=[null,null],selectionStep=0;
  let arcadeOrder=[],arcadeIndex=0,previousScreen='home',fight=null,paused=false,waitingBind=null,bindPlayer=0;
  const heldKeys=new Set(),gpNow=[null,null],gamepadPrev=[],pulse=[{},{}];
  let soundCtx=null,toastTimer=0,navPadTime=0,frameStamp=performance.now(),sceneCache={};
  const nowSeconds=()=>performance.now()/1000;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const random=(a,b)=>a+Math.random()*(b-a);
  const pick=(a)=>a[Math.floor(Math.random()*a.length)];
  function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3200)}
  function tone(freq=200,decay=.09,type='square',volume=.055){
    if(!settings.sound)return;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      if(!soundCtx)soundCtx=new AC();if(soundCtx.state==='suspended')soundCtx.resume();
      const t=soundCtx.currentTime,o=soundCtx.createOscillator(),g=soundCtx.createGain();o.type=type;
      o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(45,freq*.47),t+decay);
      g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+decay);o.connect(g);g.connect(soundCtx.destination);o.start(t);o.stop(t+decay+.01);
    }catch(_){/* El juego funciona aunque el navegador bloquee audio. */}
  }
  const showScreen=(name)=>{screen=name;Object.entries(screens).forEach(([k,v])=>v.classList.toggle('active',k===name));$('siteFooter').style.display=name==='fight'?'none':'';if(name!=='fight')paused=false;};
  function showHome(){fight=null;waitingBind=null;showScreen('home')}
  function showOptions(){previousScreen=screen;showScreen('options');bindPlayer=0;populateOptions()}
  function shuffle(arr){for(let i=arr.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr}
  function startMode(nextMode){mode=nextMode;selected=[null,null];selectionStep=0;arcadeIndex=0;arcadeOrder=[];stage='alley';document.querySelectorAll('.stage-btn').forEach(b=>b.classList.toggle('selected',b.dataset.stage===stage));showScreen('select');drawSelection();tone(390,.09,'triangle')}
  function renderGrid(){
    $('fighterGrid').innerHTML='';
    CHARS.forEach((c,i)=>{
      const b=document.createElement('button');b.type='button';b.className='fighter-option';b.dataset.index=i;b.style.setProperty('--fighter-color',c.color);b.style.setProperty('--fighter-glow',c.glow);
      b.innerHTML=`<img src="${portrait(c)}" alt=""><span class="fighter-name">${c.name}</span><span class="fighter-choice">P1</span>`;
      b.setAttribute('aria-label',`Elegir a ${c.id} — ${c.power}`);b.addEventListener('click',()=>chooseFighter(i));$('fighterGrid').append(b);
    });
  }
  function chooseFighter(i){
    if(mode==='versus'){
      if(selectionStep===0){selected[0]=i;selectionStep=1;}
      else {selected[1]=i;selectionStep=0;}
    }else {selected[0]=i;if(mode==='arcade'){if(!arcadeOrder.length||arcadeOrder.includes(i)){arcadeOrder=shuffle(CHARS.map((_,n)=>n).filter(n=>n!==i));arcadeIndex=0;}selected[1]=arcadeOrder[0];}
      else selected[1]=CHARS.findIndex(c=>c.id==='Mibzar')===i?0:CHARS.findIndex(c=>c.id==='Mibzar');
    }
    tone(510,.095,'triangle');drawSelection();
  }
  function drawSelection(){
    $('selectInstructions').textContent=mode==='versus'?(selectionStep===1?'Ahora elige al luchador del Jugador 2':'Elige al luchador del Jugador 1'):(mode==='arcade'?'Elige a tu luchador para superar cinco combates':'Elige a tu luchador; el rival será un muñeco de práctica');
    const a=selected[0]!==null?CHARS[selected[0]]:null,b=selected[1]!==null?CHARS[selected[1]]:null;
    for(const [idx,c] of [[1,a],[2,b]]){
      const im=$('previewImg'+idx);im.style.visibility=c?'visible':'hidden';if(c)im.src=portrait(c);
      $('previewName'+idx).textContent=c?c.name:(idx===1?'—':'???');
      $('previewRole'+idx).textContent=c?c.role:(idx===1?'SELECCIONA PERSONAJE':'ESPERANDO CONTRINCANTE');
      $('previewPower'+idx).textContent=c?c.power:'PODER ELEMENTAL';
    }
    $('previewRightKicker').textContent=mode==='versus'?'JUGADOR 2':mode==='training'?'MUÑECO DE PRÁCTICA':'RIVAL';
    document.querySelectorAll('.fighter-option').forEach((btn,i)=>{
      btn.classList.toggle('selected-p1',selected[0]===i);
      btn.classList.toggle('selected-p2',selected[1]===i&&selected[0]!==i);
      const badge=btn.querySelector('.fighter-choice');badge.textContent=(selected[0]===i&&selected[1]===i)?'P1 + P2':selected[0]===i?'P1':'P2';
    });
    const ok=a&&b;$('fightStart').disabled=!ok;$('fightStart').textContent=ok?'INICIAR COMBATE ↗':mode==='versus'&&a?'SELECCIONA EL JUGADOR 2':'SELECCIONA UN PERSONAJE';
    $('selectTip').textContent=mode==='versus'?'Puedes elegir el mismo personaje dos veces.':'Usa las flechas de escenario para cambiar de arena.';
  }
  function versusMessage(c1,c2){
    const verses={Kevin:'No hay luz capaz de escapar de mi sombra.',Emy:'He calculado todos tus movimientos.',Alejandro:'Las cenizas solo alimentan mi fuego.',Anderson:'Ni siquiera vas a ver de dónde viene el golpe.',Irving:'Un error tuyo. Una descarga mía.',Mibzar:'La tierra va a temblar bajo tus pies.'};
    return `“${verses[c1.id]}” — ${c1.name}`;
  }
  function startVersusIntro(){
    if(selected[0]===null||selected[1]===null)return;
    const c1=CHARS[selected[0]],c2=CHARS[selected[1]];
    $('vsImg1').src=portrait(c1);$('vsImg2').src=portrait(c2);
    $('vsName1').textContent=c1.name;$('vsName2').textContent=c2.name;
    $('vsPower1').textContent=c1.power;$('vsPower2').textContent=c2.power;
    $('versusQuote').textContent=versusMessage(c1,c2);$('vsStage').textContent=STAGES[stage].name;
    $('matchCount').textContent=mode==='arcade'?`${arcadeIndex+1} / 5`:(mode==='training'?'ENTRENAMIENTO':'VERSUS LOCAL');
    showScreen('versus');tone(240,.22,'sawtooth');
  }
  function controlName(code){if(!code)return '—';return code.replace(/^Key/,'').replace(/^Digit/,'').replace(/^Numpad/,'NUM ').replace(/^Arrow/,'').replace('Comma',',').replace('Period','.').replace('Space','ESPACIO').replace('ShiftLeft','SHIFT IZQ').replace('ShiftRight','SHIFT DER').replace('Escape','ESC').toUpperCase()}
  const padButtonName=(index,playstation=false)=>({0:playstation?'✕':'A',1:playstation?'◯':'B',2:playstation?'□':'X',3:playstation?'△':'Y',4:playstation?'L1':'LB',5:playstation?'R1':'RB',6:playstation?'L2':'LT',7:playstation?'R2':'RT',8:'SELECT',9:'START'}[index]||`BTN ${index}`);
  function connectedPads(){try{return Array.from(navigator.getGamepads?.()||[]).filter(Boolean)}catch(_){return []}}
  function isPS(gp){return /dualsense|dualshock|playstation|wireless controller|ps4|ps5|sony/i.test(gp?.id||'')}
  function populateOptions(){
    $('soundToggle').checked=settings.sound;$('shakeToggle').checked=settings.shake;$('difficultySelect').value=settings.difficulty;
    document.querySelectorAll('[data-bind-player]').forEach(b=>b.classList.toggle('active',Number(b.dataset.bindPlayer)===bindPlayer));
    const ps=isPS(connectedPads()[bindPlayer]);const host=$('bindingRows');host.innerHTML='';
    MOVE_LIST.forEach(([action,label])=>{
      const row=document.createElement('div');row.className='binding-row';
      const key=document.createElement('button');key.type='button';key.className='bind-btn';key.textContent=controlName(settings.keys[bindPlayer][action]);
      key.addEventListener('click',()=>startRebind('key',bindPlayer,action,key));
      const pad=document.createElement('button');pad.type='button';pad.className='bind-btn';pad.textContent=['left','right','up','down'].includes(action)?'D-PAD / STICK':padButtonName(settings.pads[bindPlayer][action],ps);
      if(['left','right','up','down'].includes(action)){pad.disabled=true;pad.title='Las direcciones del mando se controlan con la cruceta y el joystick.';}
      else pad.addEventListener('click',()=>startRebind('pad',bindPlayer,action,pad));
      const title=document.createElement('span');title.className='action-label';title.textContent=label;row.append(title,key,pad);host.append(row);
    });
    const pads=connectedPads();$('optionsPadInfo').textContent=pads.length?pads.map((p,i)=>`Mando ${i+1}: ${isPS(p)?'PlayStation':'Xbox / compatible'} (${p.id.slice(0,48)})`).join(' · '):'No se detectó ningún mando. Conéctalo y pulsa un botón para activarlo.';
  }
  function startRebind(kind,player,action,el){if(waitingBind)waitingBind.el?.classList.remove('waiting');waitingBind={kind,player,action,el,at:performance.now(),pressed:new Set()};el.classList.add('waiting');el.textContent=kind==='key'?'PULSA UNA TECLA':'PULSA UN BOTÓN';$('bindingMessage').textContent='ESC para cancelar · Pulsa el nuevo control.';tone(590,.05,'sine')}
  function finishRebind(code){const w=waitingBind;if(!w)return;
    if(w.kind==='key'){for(const [a,k] of Object.entries(settings.keys[w.player]))if(a!==w.action&&k===code){settings.keys[w.player][a]=settings.keys[w.player][w.action];break;}settings.keys[w.player][w.action]=code;}
    else{for(const [a,k] of Object.entries(settings.pads[w.player]))if(a!==w.action&&k===code){settings.pads[w.player][a]=settings.pads[w.player][w.action];break;}settings.pads[w.player][w.action]=code;}
    waitingBind=null;saveSettings();$('bindingMessage').textContent='Control actualizado y guardado.';populateOptions();tone(660,.07,'sine');
  }
  function cancelRebind(){waitingBind=null;$('bindingMessage').textContent='Cambio cancelado.';populateOptions()}
  function updatePadStatus(){const pads=connectedPads();const st=$('controllerStatus');st.innerHTML=pads.length?`<i class="status-dot"></i> ${pads.length} MANDO${pads.length>1?'S':''} ${isPS(pads[0])?'PLAYSTATION':'XBOX'} · ${isPS(pads[0])?'✕':'A'} SELECCIONAR`:'<i class="status-dot"></i> TECLADO LISTO';}
  let padsCount=-1,padName='';
  function pollGamepads(){
    const pads=connectedPads();
    if(pads.length!==padsCount||(pads[0]?.id||'')!==padName){padsCount=pads.length;padName=pads[0]?.id||'';updatePadStatus();if(screen==='options')populateOptions();}
    for(let p=0;p<2;p++){
      const gp=pads[p];if(!gp){gpNow[p]=null;continue;}
      const buttons=gp.buttons.map(b=>b.pressed||b.value>.55),ax=gp.axes||[],left=(ax[0]||0)<-.2||buttons[14],right=(ax[0]||0)>.2||buttons[15],up=(ax[1]||0)<-.2||buttons[12],down=(ax[1]||0)>.2||buttons[13];
      gpNow[p]={buttons,left,right,up,down};
      if(waitingBind&&waitingBind.kind==='pad'&&waitingBind.player===p&&performance.now()-waitingBind.at>170){
        const prev=gamepadPrev[p]?.buttons||[];const pressed=buttons.findIndex((b,i)=>b&&!prev[i]);if(pressed>=0&&pressed<gp.buttons.length)finishRebind(pressed);
      }
      if(screen==='fight'&&!waitingBind&&buttons[9]&&!gamepadPrev[p]?.buttons?.[9])togglePause();
      if(screen!=='fight'&&!waitingBind&&p===0){
        const tm=performance.now();const dir=down?1:up?-1:left?-1:right?1:0;
        if(dir&&tm-navPadTime>190){const targets=Array.from(screens[screen].querySelectorAll('button:not(:disabled)')).filter(b=>b.offsetParent!==null);if(targets.length){const active=document.activeElement;let index=targets.indexOf(active);index=(index+dir+targets.length)%targets.length;targets[index].focus();}navPadTime=tm;}
        if(buttons[0]&&!gamepadPrev[p]?.buttons?.[0]&&screen!=='fight'){
          let b=document.activeElement;if(b?.tagName!=='BUTTON'||b.disabled||!screens[screen].contains(b))b=screens[screen].querySelector('button:not(:disabled)');b?.click();
        }
        if(buttons[1]&&!gamepadPrev[p]?.buttons?.[1]){if(screen==='select')showHome();else if(screen==='options')showScreen(previousScreen);}
      }
    }
    for(let p=0;p<2;p++)gamepadPrev[p]=gpNow[p]?{buttons:gpNow[p].buttons.slice()}:null;
  }
  function getInput(index){
    const key=settings.keys[index],p=gpNow[index],buttons=p?.buttons||[];
    const out={};
    for(const [action] of MOVE_LIST){let active=heldKeys.has(key[action]);if(p){
      if(['left','right','up','down'].includes(action))active||=!!p[action];
      else active||=!!buttons[settings.pads[index][action]];
    }out[action]=!!active;}
    // El atajo light + lightKick se interpreta como agarre cerca del rival.
    return out;
  }
  function getInputPulses(p,input){const previous=p.prevInput||{};const pressed={};for(const key of Object.keys(input))pressed[key]=!!input[key]&&!previous[key];p.prevInput={...input};return pressed;}
  function makeFighter(charIndex,side,x,meter=0){
    return {character:CHARS[charIndex],side,x,y:0,vx:0,vy:0,facing:side===0?1:-1,hp:100,meter:mode==='training'&&side===0?300:meter,anim:0,state:'idle',attack:null,hurt:0,knockdown:0,dash:0,dashCooldown:0,dashDirection:0,lastTapLeft:-10,lastTapRight:-10,blocking:false,prevInput:{},input:{},pressed:{},combo:0,lastHit:-10,fxCooldown:0,trail:[],hitFlash:0,aiClock:0,aiPlan:{},grounded:true};
  }
  function beginMatch(){
    fight={fighters:[],scores:[0,0],round:1,phase:'intro',phaseTimer:1.5,timer:99,
      mode,stage,particles:[],projectiles:[],hits:[],shake:0,cinematic:null,hitPause:0,winningSide:-1,
      lastFx:0,elapsed:0,arcadeIndex:arcadeIndex};
    setupRound(false);showScreen('fight');updateHud(true);tone(120,.35,'sawtooth');
  }
  function setupRound(carryMeter=true){
    const meters=carryMeter&&fight.fighters.length?fight.fighters.map(f=>f.meter):[0,0];
    fight.fighters=[makeFighter(selected[0],0,325,meters[0]),makeFighter(selected[1],1,955,meters[1])];
    fight.timer=99;fight.phase='intro';fight.phaseTimer=1.45;fight.cinematic=null;fight.projectiles=[];fight.particles=[];fight.hits=[];fight.winningSide=-1;
    $('ultimateOverlay').classList.remove('active');$('pauseOverlay').classList.remove('show');paused=false;
    showAnnouncement(`ROUND ${String(fight.round).padStart(2,'0')}`,'PREPÁRATE');
    $('hudName1').textContent=fight.fighters[0].character.name;$('hudName2').textContent=fight.fighters[1].character.name;
    $('hudPortrait1').src=portrait(fight.fighters[0].character);$('hudPortrait2').src=portrait(fight.fighters[1].character);
    $('hudPlayer1').textContent='P1 · LISTO';$('hudPlayer2').textContent=(mode==='versus'?'P2':mode==='training'?'DUMMY':'CPU')+' · LISTO';
    $('fightStatus').textContent=mode==='training'?'ENTRENAMIENTO · ENERGÍA INFINITA':'ESC / START · PAUSA';
    $('combo1').style.opacity='0';$('combo2').style.opacity='0';
    refreshPips();
  }
  function refreshPips(){for(let i=0;i<2;i++){$('pips'+(i+1)).innerHTML=[0,1].map(n=>`<div class="round-pip ${n<fight.scores[i]?'win':''}"></div>`).join('');}}
  function showAnnouncement(title,sub=''){$('announcementTitle').textContent=title;$('announcementSub').textContent=sub;$('roundAnnouncement').classList.add('show')}
  function hideAnnouncement(){$('roundAnnouncement').classList.remove('show')}
  function togglePause(){if(screen!=='fight'||!fight||fight.phase==='ko'||fight.cinematic)return;paused=!paused;$('pauseOverlay').classList.toggle('show',paused);tone(paused?240:550,.09,'sine')}
  const resetControls = () => {settings.keys=clone(DEFAULT_KEYS);settings.pads=[clone(DEFAULT_PADS),clone(DEFAULT_PADS)];saveSettings();populateOptions();toast('Controles predeterminados restaurados.')};
  function baseAttack(name,f){
    const a={...ATTACKS[name],name,elapsed:0,connected:false,spawned:false,ex:false,allHit:false};
    if(name==='special'){
      if(f.character.element==='tech'||f.character.element==='wind'){a.range=105;a.projectile=true;}
      if(f.character.element==='earth'){a.range=230;a.level='low';a.start=.25;a.end=.44;a.dmg=21;}
      if(f.character.element==='lightning'){a.start=.12;a.range=225;a.stun=.55;}
      if(f.character.element==='shadow'){a.range=233;a.start=.13;}
      if(f.character.element==='fire'){a.range=232;a.start=.17;}
    }
    a.dmg*=f.character.power;
    a.range*=f.character.range;
    return a;
  }
  function canAttack(f,name){const airOK=['light','heavy','lightKick','heavyKick'].includes(name);return (f.grounded||airOK)&&!f.hurt&&!f.knockdown&&!fight.cinematic&&fight.phase==='active'&&(!f.attack||f.attack.elapsed>f.attack.start+f.attack.active*.75&&f.attack.name!=='special'&&f.attack.name!=='break'&&f.attack.name!=='throw');}
  function startAttack(f,name,ex=false){
    if(!canAttack(f,name))return false;
    if(name==='break'){
      if(f.meter<200){if(f.side===0)toast('Rompeguardia: necesitas 2 cargas.');return false;}f.meter-=200;
    }
    if(name==='special'&&ex){if(f.meter<100)ex=false;else f.meter-=100;}
    f.attack=baseAttack(name,f);f.attack.ex=ex;
    if(ex){f.attack.dmg*=1.36;f.attack.active+=.06;f.attack.range+=45;f.attack.push+=30;}
    f.state='attack';f.anim=0;f.vx=0;
    if(['light','heavy','lightKick','heavyKick','low','throw'].includes(name))tone(name==='light'?245:110,.075,'triangle',.033);
    if(['special','break'].includes(name)){tone(ex?690:440,.20,'sawtooth',.045);burst(f.x+f.facing*25,FLOOR+f.y-135,f.character.color,11,1.5);}
    return true;
  }
  function beginUltimate(f){
    if(fight.phase!=='active'||!f.grounded||f.hurt||f.knockdown||f.attack||fight.cinematic||f.meter<300)return false;
    f.meter-=300;f.attack=null;f.state='ultimate';
    fight.cinematic={attacker:f.side,elapsed:0,length:1.95,hit:false};
    const o=$('ultimateOverlay');o.style.background=`radial-gradient(circle at 50% 52%,${f.character.glow},#080a18ee 53%,#01020cef)`;
    $('ultimateName').textContent=f.character.ultimate;$('ultimateOwner').textContent=f.character.name;
    $('ultimatePlayer').textContent=f.side===0?'JUGADOR 1 · ULTIMATE TECHNIQUE':(mode==='versus'?'JUGADOR 2':'CPU')+' · ULTIMATE TECHNIQUE';
    o.classList.add('active');fight.shake=.9;tone(85,.5,'sawtooth',.075);return true;
  }
  function aiInput(f,enemy,dt){
    const out=Object.fromEntries(MOVE_LIST.map(([name])=>[name,false]));
    if(mode==='training')return out;
    const difficulty=settings.difficulty,speed=difficulty==='easy'?.35:difficulty==='hard'?.10:.20;
    f.aiClock-=dt;
    if(f.aiClock<=0){
      f.aiClock=random(speed,speed+.16);
      const dist=Math.abs(enemy.x-f.x),enemyAttacking=!!enemy.attack;
      const thinking={};
      if(enemyAttacking&&dist<200&&Math.random()<(difficulty==='hard'?.67:.40)){
        thinking[f.facing===1?'right':'left']=false;
        thinking[f.facing===1?'left':'right']=true;
        if(Math.random()<.38)thinking.down=true;
      }else if(dist>148){thinking[f.facing===1?'right':'left']=true;}
      else if(dist<90&&Math.random()<.22){thinking[f.facing===1?'left':'right']=true;}
      if(dist<220&&Math.random()<(difficulty==='hard'?.60:difficulty==='easy'?.30:.45)){
        thinking[pick(['light','heavy','lightKick','heavyKick'])]=true;
      }else if(dist<345&&Math.random()<.22){thinking.special=true;}
      if(f.meter>=300&&dist<390&&Math.random()<(difficulty==='hard'?.35:.11))thinking.ultimate=true;
      if(dist<175&&Math.random()<.1)thinking.up=true;
      f.aiPlan=thinking;
    }
    for(const [k,v] of Object.entries(f.aiPlan))out[k]=!!v;
    return out;
  }
  function takeInput(f,enemy,dt){
    const input=(f.side===1&&mode!=='versus')?aiInput(f,enemy,dt):getInput(f.side);
    f.input=input;f.pressed=getInputPulses(f,input);
    const grounded=f.y>=-.00001&&f.vy>=0;
    f.grounded=grounded;
    f.facing=f.x<=enemy.x?1:-1;
    f.blocking=!!(input[f.facing===1?'left':'right']&&grounded&&!f.attack&&!f.hurt&&!f.knockdown);
    f.hitFlash=Math.max(0,f.hitFlash-dt);
    f.dashCooldown=Math.max(0,f.dashCooldown-dt);
    if(f.hurt>0){f.hurt=Math.max(0,f.hurt-dt);f.state='hurt';f.x+=f.vx*dt;f.vx*=.88;}
    else if(f.knockdown>0){f.knockdown=Math.max(0,f.knockdown-dt);f.state='knockdown';}
    else if(f.attack){
      f.state='attack';
      const chain=['light','heavy','lightKick','heavyKick'].find(k=>f.pressed[k]);
      if(chain&&canAttack(f,chain))startAttack(f,chain);
    }
    else if(!grounded){
      const aerial=['light','heavy','lightKick','heavyKick'].find(k=>f.pressed[k]);
      if(aerial)startAttack(f,aerial);
      else f.state='jump';
      const dir=Number(input.right)-Number(input.left);
      f.vx=dir*190*f.character.speed;f.x+=f.vx*dt;
    }
    else{
      if(f.pressed.ultimate&&beginUltimate(f))return;
      if(f.pressed.break&&startAttack(f,'break'))return;
      if(f.pressed.throw||f.pressed.light&&f.pressed.lightKick){if(startAttack(f,'throw'))return;}
      if(f.pressed.special){const ex=input.heavy; if(startAttack(f,'special',ex))return;}
      const attackKeys=['heavyKick','heavy','lightKick','light'];
      const pressedAttack=attackKeys.find(name=>f.pressed[name]);
      if(pressedAttack){let name=pressedAttack;if(input.down&&name==='lightKick')name='low';if(startAttack(f,name))return;}
      if(f.pressed.up){f.vy=-820;f.y=-1;f.vx=0;f.grounded=false;f.state='jump';tone(260,.11,'sine',.02);return;}
      const left=input.left,right=input.right,dir=Number(right)-Number(left);
      if(f.pressed.left){if(nowSeconds()-f.lastTapLeft<.28&&f.dashCooldown<=0){f.dash=.165;f.dashDirection=-1;f.dashCooldown=.4;tone(250,.06,'triangle');}f.lastTapLeft=nowSeconds();}
      if(f.pressed.right){if(nowSeconds()-f.lastTapRight<.28&&f.dashCooldown<=0){f.dash=.165;f.dashDirection=1;f.dashCooldown=.4;tone(250,.06,'triangle');}f.lastTapRight=nowSeconds();}
      if(input.down){f.state='crouch';f.vx=0;}
      else if(f.dash>0){f.dash=Math.max(0,f.dash-dt);f.vx=f.dashDirection*780*f.character.speed;f.x+=f.vx*dt;f.state='dash';}
      else if(dir){f.vx=dir*235*f.character.speed;f.x+=f.vx*dt;f.state=f.blocking?'block':'walk';}
      else{f.state='idle';f.vx=0;}
      if(f.blocking&&!input.down&&dir===0)f.state='block';
    }
    if(!grounded||f.vy!==0){f.vy+=2150*dt;f.y+=f.vy*dt;if(f.y>=0){f.y=0;f.vy=0;f.grounded=true;if(f.state==='jump')f.state='idle';}}
    f.x=clamp(f.x,83,W-83);f.anim+=dt;
  }
  function updateAttacks(f,enemy,dt){
    const a=f.attack;if(!a)return;
    a.elapsed+=dt;
    const isActive=a.elapsed>=a.start&&a.elapsed<=a.start+a.active;
    if(isActive&&!a.spawned){
      a.spawned=true;
      if(a.projectile){spawnProjectile(f,a);a.connected=true;}
      else if(a.name==='special'&&f.character.element==='earth'){
        burst(f.x+f.facing*105,FLOOR-24,'#eac497',26,2.6);
        if(enemy.grounded&&Math.abs(enemy.x-f.x)<a.range)resolveStrike(f,enemy,a);
        a.connected=true;
      }else if(a.name==='special'){
        f.x=clamp(f.x+f.facing*45,80,W-80);
        burst(f.x+f.facing*55,FLOOR+f.y-134,f.character.color,17,1.7);
      }
    }
    if(isActive&&!a.connected){
      const dx=enemy.x-f.x;
      const inFront=Math.sign(dx)===f.facing||Math.abs(dx)<35;
      const vertical=Math.abs(enemy.y-f.y)<155;
      if(inFront&&vertical&&Math.abs(dx)<a.range){resolveStrike(f,enemy,a);a.connected=true;}
    }
    if(a.elapsed>=a.start+a.active+a.end){f.attack=null;f.state='idle';}
  }
  function spawnProjectile(f,a){
    const speed=f.character.element==='wind'?670:550;
    fight.projectiles.push({owner:f.side,x:f.x+f.facing*93,y:FLOOR+f.y-148,vx:speed*f.facing,life:1.65,ex:a.ex,color:f.character.color,element:f.character.element,damage:a.dmg,stun:a.stun,level:'mid',push:a.push,hit:false,radius:a.ex?62:46});
    burst(f.x+f.facing*75,FLOOR+f.y-144,f.character.color,12,1.0);
  }
  function isGuarded(victim,level){
    if(level==='grab'||level==='guardbreak'||!victim.grounded||victim.hurt||victim.knockdown)return false;
    const rear=victim.facing===1?'left':'right';
    if(!victim.input[rear]||victim.attack)return false;
    if(level==='low')return !!victim.input.down;
    if(level==='high')return !victim.input.down;
    return true;
  }
  function resolveStrike(attacker,victim,attack){
    if(fight.phase!=='active'||victim.hp<=0)return;
    if(attack.level==='low'&&!victim.grounded)return;
    // Los golpes altos pasan por encima de un enemigo agachado sin guardia.
    if(attack.level==='high'&&victim.grounded&&victim.input.down&&!victim.attack){burst(victim.x,FLOOR-130,'#cceef7',5,.6);return;}
    const guard=isGuarded(victim,attack.level);
    let damage=attack.dmg;
    if(guard)damage=Math.max(1,Math.round(damage*.12));
    victim.hp=clamp(victim.hp-damage,0,100);
    victim.hitFlash=.15;
    if(guard){victim.state='block';victim.vx=attacker.facing*(attack.push||40)*.28;}
    else{
      victim.attack=null;victim.hurt=attack.stun||.30;victim.vx=attacker.facing*(attack.push||50)*3.6;
      victim.state='hurt';victim.blocking=false;
      if(attack.knockdown){victim.hurt=.36;victim.knockdown=attack.knockdown;}
      if(attack.level==='guardbreak')victim.hurt=.9;
    }
    if(mode!=='training'){
      attacker.meter=clamp(attacker.meter+(guard?7:16),0,300);
      victim.meter=clamp(victim.meter+(guard?12:20),0,300);
    }else attacker.meter=300;
    const t=nowSeconds();attacker.combo=t-attacker.lastHit<1.0?attacker.combo+1:1;attacker.lastHit=t;
    if(!guard){fight.hitPause=clamp(damage/450,0,.060);fight.shake=settings.shake?clamp(damage/22,.17,1):0;}
    const sparkY=FLOOR+victim.y-random(100,172);
    burst(victim.x-attacker.facing*27,sparkY,guard?'#99f9ff':attacker.character.color,guard?8:Math.round(11+damage),guard?1:1.8);
    fight.hits.push({x:victim.x,y:sparkY,text:guard?'GUARD':damage>30?'DEVASTADOR':attacker.combo>2?`${attacker.combo} HITS`:'',time:.62,color:attacker.character.color});
    tone(guard?480:Math.max(65,340-damage*7),guard?.055:.12,guard?'sine':'sawtooth',guard?.029:.07);
    if(victim.hp<=0&&mode!=='training')endRound(attacker.side);
  }
  function updateProjectiles(dt){
    for(const p of fight.projectiles){p.x+=p.vx*dt;p.life-=dt;const defender=fight.fighters[1-p.owner],attacker=fight.fighters[p.owner];
      if(!p.hit&&Math.abs(p.x-defender.x)<p.radius+25&&Math.abs(p.y-(FLOOR+defender.y-135))<110){
        const attack={dmg:p.damage,level:p.level,push:p.push,stun:p.stun,knockdown:0};resolveStrike(attacker,defender,attack);p.hit=true;
        burst(p.x,p.y,p.color,22,1.8);
      }
      if(Math.random()<.44&&fight.particles.length<240)fight.particles.push({x:p.x,y:p.y,vx:random(-55,55),vy:random(-48,48),life:.15,max:.15,size:random(3,8),color:p.color,kind:'spark'});
    }
    fight.projectiles=fight.projectiles.filter(p=>p.life>0&&!p.hit&&p.x>-140&&p.x<W+140);
  }
  function burst(x,y,color,n=12,power=1){
    if(!fight)return;
    for(let i=0;i<n;i++){
      const angle=random(0,Math.PI*2),speed=random(70,270)*power,life=random(.14,.50)*Math.min(power,2);
      fight.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life,max:life,size:random(2,6)*Math.min(power,2),color,kind:Math.random()<.26?'dust':'spark'});
    }
    if(fight.particles.length>310)fight.particles.splice(0,fight.particles.length-310);
  }
  function updateParticles(dt){
    for(const p of fight.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.kind==='dust')p.vy+=190*dt;p.life-=dt;}
    fight.particles=fight.particles.filter(p=>p.life>0);
    for(const h of fight.hits)h.time-=dt;fight.hits=fight.hits.filter(h=>h.time>0);
  }
  function endRound(winningSide){
    if(fight.phase!=='active')return;
    fight.phase='ko';fight.phaseTimer=2.05;fight.winningSide=winningSide;
    if(winningSide>=0)fight.scores[winningSide]++;
    showAnnouncement(winningSide<0?'TIME UP': 'K.O.',winningSide<0?'EMPATE':`${fight.fighters[winningSide].character.name} GANA LA RONDA`);
    refreshPips();tone(65,.46,'sawtooth',.10);
  }
  function finishMatch(){
    const winner=fight.scores[0]>fight.scores[1]?0:1;
    const character=fight.fighters[winner].character;
    const arcadeWin=mode==='arcade'&&winner===0;
    const arcadeComplete=arcadeWin&&arcadeIndex>=arcadeOrder.length-1;
    $('resultImg').src=portrait(character);$('resultWinner').textContent=character.name;
    $('resultTitle').textContent=arcadeComplete?'¡LEYENDA!':winner===0?'¡VICTORIA!':mode==='versus'?'¡VICTORIA P2!':'DERROTA';
    $('resultTag').textContent=arcadeComplete?'CAMPEÓN DE STREET LEGENDS':'RESULTADO DEL COMBATE';
    $('resultDetail').textContent=arcadeComplete?'¡Derrotaste a los cinco rivales y dominaste la arena!':mode==='arcade'?`${arcadeWin?'¡Bien jugado!':'Sigue entrenando.'} Combate ${arcadeIndex+1} de 5. Marcador: ${fight.scores[0]}–${fight.scores[1]}.`:mode==='training'?'Práctica finalizada.':`${character.name} se lleva el combate por ${Math.max(...fight.scores)} a ${Math.min(...fight.scores)}.`;
    $('rematchBtn').textContent=arcadeWin&&!arcadeComplete?'SIGUIENTE RIVAL ↗':'REVANCHA';
    showScreen('result');tone(arcadeWin||winner===0?640:125,.35,'triangle');
  }
  function nextFightOrRematch(){
    if(mode==='arcade'&&fight&&fight.scores[0]>fight.scores[1]&&arcadeIndex<arcadeOrder.length-1){
      arcadeIndex++;selected[1]=arcadeOrder[arcadeIndex];startVersusIntro();
    }else startVersusIntro();
  }
  function updateBattle(dt){
    if(!fight||paused)return;
    fight.elapsed+=dt;
    if(fight.phase==='intro'){
      fight.phaseTimer-=dt;
      if(fight.phaseTimer<.56){showAnnouncement('FIGHT!','');}
      if(fight.phaseTimer<=0){fight.phase='active';hideAnnouncement();}
      updateParticles(dt);return;
    }
    if(fight.phase==='ko'){
      fight.phaseTimer-=dt;
      updateParticles(dt);
      if(fight.phaseTimer<=0){if(Math.max(...fight.scores)>=2)finishMatch();else{fight.round++;setupRound(true);}}
      updateHud();return;
    }
    if(fight.cinematic){
      const c=fight.cinematic,a=fight.fighters[c.attacker],b=fight.fighters[1-c.attacker];
      c.elapsed+=dt;
      if(c.elapsed>.55)$('ultimateOverlay').classList.remove('active');
      if(c.elapsed>.75&&!c.hit){c.hit=true;
        const radius=a.character.element==='earth'?490:a.character.element==='wind'?520:600;
        const attack={dmg:42*a.character.power,level:'mid',push:195,stun:.90,knockdown:.65};
        const hit=Math.abs(a.x-b.x)<radius;
        if(hit){resolveStrike(a,b,attack);b.knockdown=.75;}
        else burst(a.x+a.facing*250,FLOOR-155,a.character.color,30,3);
        for(let j=0;j<5;j++)burst(a.x+a.facing*(40+j*42),FLOOR-80-j*18,a.character.color,24,2.2);
      }
      if(c.elapsed>=c.length){fight.cinematic=null;a.state='idle';a.attack=null;}
      updateParticles(dt);updateHud();return;
    }
    if(fight.hitPause>0){fight.hitPause-=dt;updateParticles(dt*.45);updateHud();return;}
    if(mode!=='training'){
      fight.timer-=dt;if(fight.timer<=0){fight.timer=0;const [a,b]=fight.fighters;endRound(a.hp===b.hp?-1:a.hp>b.hp?0:1);return;}
    }else fight.timer=99;
    const [a,b]=fight.fighters;
    takeInput(a,b,dt);takeInput(b,a,dt);
    // Los personajes no se atraviesan al caminar; permite golpes cuerpo a cuerpo.
    if(Math.abs(a.x-b.x)<76){const mid=(a.x+b.x)/2;a.x=clamp(mid-(a.x<=b.x?38:-38),76,W-76);b.x=clamp(mid+(a.x<=b.x?38:-38),76,W-76);}
    updateAttacks(a,b,dt);updateAttacks(b,a,dt);updateProjectiles(dt);updateParticles(dt);
    if(mode==='training'){
      a.meter=300;
      if(b.hp<100)b.hp=clamp(b.hp+12*dt,0,100);
      if(a.hp<100)a.hp=clamp(a.hp+8*dt,0,100);
    }
    if(fight.shake>0)fight.shake=Math.max(0,fight.shake-dt*3);
    updateHud();
  }
  function updateHud(force=false){
    if(!fight)return;
    for(let i=0;i<2;i++){
      const f=fight.fighters[i];$('hpFill'+(i+1)).style.width=clamp(f.hp,0,100)+'%';
      const element=$('meter'+(i+1));element.classList.toggle('ready',f.meter>=300);
      if(force||element.children.length!==3)element.innerHTML=[0,1,2].map(n=>'<div class="meter-segment"><div class="meter-fill"></div></div>').join('');
      [...element.querySelectorAll('.meter-fill')].forEach((el,n)=>el.style.width=clamp((f.meter/100-n)*100,0,100)+'%');
      $('meterText'+(i+1)).textContent=f.meter>=300?'ULTIMATE READY':`${Math.floor(f.meter/100)} CARGA${f.meter>=200||f.meter<100?'S':''}`;
      const combo=$('combo'+(i+1));const comboValid=f.combo>=2&&nowSeconds()-f.lastHit<.9;
      combo.style.opacity=comboValid?'1':'0';if(comboValid)combo.textContent=`${f.combo} HITS\n¡${f.combo>=5?'EXCELENTE':'COMBO'}!`;
    }
    $('timerValue').textContent=mode==='training'?'∞':String(Math.ceil(fight.timer)).padStart(2,'0');
    $('timerLabel').textContent=mode==='training'?'TRAINING':`ROUND ${String(fight.round).padStart(2,'0')}`;
  }
  // ============================================================================
  // ESCENARIOS: fondos dibujados por código para no depender de assets externos.
  // ============================================================================
  function makeBackdrop(stageId){
    const off=document.createElement('canvas');off.width=W;off.height=H;const c=off.getContext('2d');
    let seed=stageId==='alley'?7301:stageId==='rooftop'?8820:4120;
    const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
    const rect=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h)};
    const line=(x,y,x2,y2,col='#ffffff36',width=1)=>{c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=col;c.lineWidth=width;c.stroke()};
    const neon=(str,x,y,size,color,align='center')=>{c.save();c.textAlign=align;c.font=`900 ${size}px Impact, Arial Black, sans-serif`;c.shadowBlur=24;c.shadowColor=color;c.fillStyle=color;c.fillText(str,x,y);c.shadowBlur=0;c.fillText(str,x,y);c.restore()};
    let sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#040d1c');sky.addColorStop(.55,'#152841');sky.addColorStop(1,'#141728');c.fillStyle=sky;c.fillRect(0,0,W,H);
    if(stageId==='alley'){
      rect(0,0,270,580,'#0b1528');rect(1010,0,270,580,'#0b1427');
      rect(270,60,210,480,'#0e1b30');rect(820,40,190,530,'#0e1a30');
      rect(472,255,345,315,'#152036');rect(520,275,260,260,'#09182a');
      for(let i=0;i<15;i++){const y=24+i*42;line(0,y,270,y,'#3b526553',3);line(1010,y,1280,y,'#3b52654c',3);}
      for(let side=0;side<2;side++){const x=side===0?32:1050;for(let i=0;i<5;i++)for(let j=0;j<3;j++){const bx=x+j*66,by=42+i*98;rect(bx,by,43,70,'#07101d');rect(bx+4,by+4,35,62,rand()>.5?'#175071':'#22415b');rect(bx+16,by+6,3,60,'#0b1826');}}
      rect(478,220,330,45,'#061524');neon('SECTOR   07',642,251,30,'#36c9ef');
      rect(9,285,245,102,'#090f19');c.strokeStyle='#bd38aa';c.lineWidth=3;c.strokeRect(15,290,234,91);neon('N E O N',132,346,43,'#fd4a9d');
      rect(1030,215,238,110,'#080d16');c.strokeStyle='#21dfff';c.lineWidth=3;c.strokeRect(1036,221,227,98);neon('CLASH',1152,287,44,'#32ecff');
      rect(460,450,367,106,'#1d2a3b');for(let i=0;i<8;i++)line(460+i*46,450,460+i*46,555,'#354b61',3);
      for(let i=0;i<9;i++){line(270+i*22,0,270+i*22,470,'#22334933',2);line(820+i*19,0,820+i*19,460,'#233a5133',2);}
      rect(0,540,1280,50,'#141a25');
    }else if(stageId==='rooftop'){
      c.fillStyle='#122540';c.fillRect(0,0,W,540);
      c.beginPath();c.arc(1003,140,64,0,Math.PI*2);c.fillStyle='#c4d6f2';c.shadowColor='#b7d5fb';c.shadowBlur=40;c.fill();c.shadowBlur=0;
      for(let i=0;i<32;i++){const x=i*44-12,bh=120+Math.floor(rand()*235);rect(x,550-bh,37,bh,'#0b1c30');if(rand()>.4){for(let j=0;j<Math.floor(bh/28);j++)rect(x+11,560-bh+j*29,4,10,rand()>.35?'#3da6d799':'#d6a05c4b');}}
      rect(0,446,1280,100,'#162b3c');for(let x=0;x<1280;x+=80){rect(x+8,458,38,5,'#57738b33');}
      rect(0,505,1280,60,'#111c2d');line(0,514,1280,514,'#33d9e8',4);
      for(let i=0;i<8;i++){rect(i*175,464,10,100,'#283d4b');line(i*175,464,i*175+175,464,'#46657b',3);}
      neon('SKYLINE // 2145',120,405,24,'#41dafa','left');
      for(let i=0;i<15;i++){const x=rand()*W,y=rand()*180;rect(x,y,rand()*2+1,rand()*2+1,'#cddbf1a1');}
    }else{
      rect(0,0,1280,520,'#0e1a2b');
      for(let i=0;i<10;i++){rect(i*146-10,60,80,420,'#15293b');rect(i*146+62,80,9,405,'#344b5a');}
      rect(0,60,1280,18,'#2c4b5c');rect(0,100,1280,12,'#19344b');
      for(let i=0;i<12;i++){rect(i*115+12,149,81,200,'#0b1422');rect(i*115+19,156,67,186,'#113650');}
      rect(0,397,1280,130,'#26364a');line(0,404,1280,404,'#4aa8d0',5);line(0,513,1280,513,'#72cfec',2);
      rect(304,105,670,76,'#101f31');c.strokeStyle='#4bc2e8';c.lineWidth=2;c.strokeRect(304,105,670,76);neon('SUBWAY // LINE 07',640,156,43,'#55d4ee');
      rect(50,265,190,96,'#0a1220');neon('EXIT  >',145,320,32,'#f86b96');
      rect(1009,268,190,90,'#091323');neon('PLATFORM 2',1104,322,24,'#f8c66a');
      for(let i=0;i<7;i++){const x=90+i*185;rect(x,48,8,430,'#6ba2bc33');}
    }
    const floor=c.createLinearGradient(0,545,0,H);floor.addColorStop(0,'#26364b');floor.addColorStop(.30,'#101a2b');floor.addColorStop(1,'#070d17');c.fillStyle=floor;c.fillRect(0,556,W,H-556);
    line(0,582,1280,582,'#63d6f97e',3);line(0,586,1280,586,'#091c2a',3);
    for(let i=0;i<=10;i++){const y=588+Math.pow(i/10,1.6)*140;line(0,y,1280,y,i%2?'#5f9bbf14':'#6ec3fa1a',1)}
    for(let i=0;i<=26;i++){const x=i*58-100;line(640,578,x,720,'#7bc6ed1e',1)}
    for(let i=0;i<22;i++){const x=rand()*W,y=595+rand()*110;rect(x,y,15+rand()*60,1+rand()*2,'#56c6f41f');}
    const vignette=c.createRadialGradient(640,285,95,640,350,840);vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#02030bc4');c.fillStyle=vignette;c.fillRect(0,0,W,H);
    return off;
  }
  function frameFor(f,t){
    if(f.state==='ultimate')return 19;
    if(f.hurt>0)return 13;
    if(f.knockdown>0||f.hp<=0)return 14;
    if(f.attack){const a=f.attack;if(a.name==='special'||a.name==='break')return a.elapsed<a.start?17:18;
      if(a.name==='heavyKick'||a.name==='lightKick'||a.name==='low')return 16;
      return 15;}
    if(!f.grounded||f.state==='jump')return f.vy<0?9:10;
    if(f.state==='crouch')return 8;
    if(f.state==='block')return 12;
    if(f.state==='dash')return Math.floor(t*13)%2?6:7;
    if(f.state==='walk')return [3,4,5][Math.floor(t*8)%3];
    return [0,1,2,1][Math.floor(t*2.9+f.side)%4];
  }
  function drawFighter(f,t){
    const img=images[f.character.id];
    ctx.save();
    // Sombra estática en el suelo y eco del dash.
    const shadowAlpha=.28*(1-Math.min(1,Math.abs(f.y)/480));
    ctx.beginPath();ctx.ellipse(f.x,FLOOR+3,66+Math.max(0,f.y/12),12,0,0,Math.PI*2);ctx.fillStyle=`rgba(0,0,0,${shadowAlpha})`;ctx.fill();
    if(f.state==='dash'){ctx.save();ctx.globalAlpha=.20;ctx.translate(f.x-f.dashDirection*34,FLOOR+f.y-280);ctx.scale(f.facing,1);if(img.complete&&img.naturalWidth)ctx.drawImage(img,1*CELL_W,1*CELL_H,CELL_W,CELL_H,-147,0,294,294);ctx.restore();}
    const frame=frameFor(f,t),row=Math.floor(frame/5),col=frame%5,drawWidth=300,drawHeight=300;
    const imageY=FLOOR+f.y-drawHeight+14;
    ctx.translate(Math.round(f.x),Math.round(imageY));ctx.scale(f.facing,1);
    if(f.hitFlash>0){ctx.shadowBlur=20;ctx.shadowColor='#fff';}
    ctx.imageSmoothingEnabled=false;
    if(img.complete&&img.naturalWidth)ctx.drawImage(img,col*CELL_W,row*CELL_H,CELL_W,CELL_H,-drawWidth/2,0,drawWidth,drawHeight);
    else{ctx.fillStyle=f.character.color;ctx.fillRect(-40,80,80,200);}
    ctx.restore();
    if(f.attack&&f.attack.name==='special'&&f.attack.elapsed>f.attack.start){
      const active=f.attack.elapsed<f.attack.start+f.attack.active+.10;
      if(active){ctx.save();ctx.globalAlpha=.15+Math.sin(t*22)*.06;ctx.strokeStyle=f.character.color;ctx.lineWidth=6;
        ctx.beginPath();ctx.arc(f.x+f.facing*55,FLOOR+f.y-153,60+Math.sin(t*13)*15,-Math.PI*.7,Math.PI*.85);ctx.stroke();ctx.restore();}
    }
  }
  function drawProjectile(p,t){
    ctx.save();ctx.translate(p.x,p.y);ctx.shadowBlur=24;ctx.shadowColor=p.color;
    if(p.element==='wind'){
      ctx.rotate(t*8);for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.ellipse(20,0,p.radius*.75,12,.3,0,Math.PI*2);ctx.fillStyle=i%2?'#baffefbb':'#7bd9edaa';ctx.fill();}
    }else{
      for(let i=0;i<4;i++){ctx.strokeStyle=i%2?'#c5ffff':p.color;ctx.lineWidth=5-i;ctx.beginPath();ctx.arc(0,0,18+i*9,t*(5+i),t*(5+i)+Math.PI*(.9+i*.03));ctx.stroke();}
      ctx.fillStyle='#dfffff';ctx.beginPath();ctx.arc(0,0,p.ex?23:13,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  function drawParticles(){
    for(const p of fight.particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;
      if(p.kind==='spark'){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(p.vy,p.vx));ctx.fillRect(-p.size*1.6,-p.size*.3,p.size*3.1,p.size*.7);ctx.restore();}
      else{ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}}
    ctx.globalAlpha=1;
    for(const h of fight.hits){if(!h.text)continue;ctx.save();ctx.globalAlpha=clamp(h.time/.25,0,1);ctx.fillStyle=h.color;ctx.textAlign='center';ctx.font='900 24px Impact, Arial Black';ctx.shadowBlur=9;ctx.shadowColor='#000';ctx.fillText(h.text,h.x,h.y-25-(.62-h.time)*50);ctx.restore();}
  }
  function drawAmbient(t){
    ctx.save();ctx.globalAlpha=.3;
    if(fight.stage==='alley'||fight.stage==='rooftop'){
      ctx.strokeStyle='#83ddf8';ctx.lineWidth=1;
      for(let i=0;i<40;i++){const x=(i*167.17+t*(110+(i%5)*15))%1360-40;const y=(i*89.4+t*165)%640;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-7,y+18);ctx.stroke();}
    }
    ctx.restore();
  }
  function drawBattle(t){
    if(!fight)return;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,W,H);
    if(!sceneCache[fight.stage])sceneCache[fight.stage]=makeBackdrop(fight.stage);
    ctx.drawImage(sceneCache[fight.stage],0,0);drawAmbient(t);
    const shake=settings.shake&&fight.shake>0?fight.shake*14:0;
    ctx.translate(random(-shake,shake),random(-shake,shake));
    const first=fight.fighters[0],second=fight.fighters[1];
    if(first.y<second.y){drawFighter(second,t);drawFighter(first,t);}else{drawFighter(first,t);drawFighter(second,t);}
    for(const p of fight.projectiles)drawProjectile(p,t);drawParticles();
    if(fight.cinematic){const a=fight.fighters[fight.cinematic.attacker];
      if(fight.cinematic.elapsed>.50){ctx.save();ctx.globalAlpha=.15;ctx.fillStyle=a.character.color;ctx.fillRect(0,0,W,H);ctx.restore();}
    }
    ctx.restore();
  }
  // ============================================================================
  // EVENTOS, NAVEGACIÓN Y BUCLE PRINCIPAL
  // ============================================================================
  function wireUI(){
    renderGrid();drawSelection();
    document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>startMode(btn.dataset.mode)));
    $('logoHome').addEventListener('click',showHome);
    $('onlineSoon').addEventListener('click',()=>toast('El modo online necesita un servidor y sincronización de red. El versus local ya funciona.'));
    $('openOptions').addEventListener('click',showOptions);
    $('optionsBack').addEventListener('click',()=>{waitingBind=null;showScreen(previousScreen);});
    $('selectBack').addEventListener('click',showHome);
    $('fightStart').addEventListener('click',startVersusIntro);
    $('enterFight').addEventListener('click',beginMatch);
    document.querySelectorAll('.stage-btn').forEach(btn=>btn.addEventListener('click',()=>{stage=btn.dataset.stage;document.querySelectorAll('.stage-btn').forEach(b=>b.classList.toggle('selected',b===btn));tone(510,.055,'sine');}));
    $('pauseButton').addEventListener('click',togglePause);$('resumeGame').addEventListener('click',togglePause);
    $('restartMatch').addEventListener('click',beginMatch);$('quitToMenu').addEventListener('click',showHome);
    $('rematchBtn').addEventListener('click',nextFightOrRematch);
    $('resultCharacters').addEventListener('click',()=>{selected=[null,null];selectionStep=0;arcadeOrder=[];arcadeIndex=0;showScreen('select');drawSelection();});
    $('resultHome').addEventListener('click',showHome);
    const updateSound=on=>{settings.sound=on;saveSettings();$('soundToggle').checked=on;$('soundQuick').classList.toggle('muted',!on);$('soundQuick').setAttribute('aria-label',on?'Silenciar sonido':'Activar sonido');};
    $('soundToggle').addEventListener('change',e=>updateSound(e.target.checked));
    $('soundQuick').addEventListener('click',()=>updateSound(!settings.sound));updateSound(settings.sound);
    $('shakeToggle').addEventListener('change',e=>{settings.shake=e.target.checked;saveSettings()});
    $('difficultySelect').addEventListener('change',e=>{settings.difficulty=e.target.value;saveSettings();toast('Dificultad actualizada.');});
    document.querySelectorAll('[data-bind-player]').forEach(btn=>btn.addEventListener('click',()=>{bindPlayer=Number(btn.dataset.bindPlayer);waitingBind=null;populateOptions();}));
    $('resetBindings').addEventListener('click',resetControls);
    document.addEventListener('keydown',e=>{
      if(waitingBind){e.preventDefault();e.stopPropagation();if(e.code==='Escape')cancelRebind();else if(waitingBind.kind==='key')finishRebind(e.code);return;}
      if(e.code==='Escape'){
        e.preventDefault();if(screen==='fight')togglePause();else if(screen==='options')showScreen(previousScreen);else if(screen==='select'||screen==='versus'||screen==='result')showHome();return;
      }
      if(screen==='fight'&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
      heldKeys.add(e.code);
    });
    document.addEventListener('keyup',e=>heldKeys.delete(e.code));
    window.addEventListener('blur',()=>{heldKeys.clear();if(screen==='fight'&&fight&&!paused&&fight.phase==='active')togglePause();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='fight'&&!paused)togglePause();});
    window.addEventListener('gamepadconnected',()=>{updatePadStatus();if(screen==='options')populateOptions();toast('Mando conectado correctamente.');});
    window.addEventListener('gamepaddisconnected',()=>{updatePadStatus();if(screen==='options')populateOptions();toast('Mando desconectado.');});
  }
  function loop(ts){
    const dt=clamp((ts-frameStamp)/1000,0,.04);frameStamp=ts;
    pollGamepads();
    if(screen==='fight'&&fight){if(!paused)updateBattle(dt);drawBattle(ts/1000);}
    requestAnimationFrame(loop);
  }
  wireUI();updatePadStatus();showHome();requestAnimationFrame(loop);
  // Utilidad opcional para pruebas desde las herramientas del navegador.
  window.NEON_CLASH={characters:CHARS.map(c=>c.id),startMode,getState:()=>({screen,mode,stage,selected:[...selected],phase:fight?.phase,hp:fight?.fighters.map(f=>f.hp),meter:fight?.fighters.map(f=>f.meter),score:fight?.scores})};
})();
