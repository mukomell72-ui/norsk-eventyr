// Native screens inspired by the approved concept; all controls use real app flows.
(() => {
  const baseShell=window.shell,baseNavigate=window.navigate;
  const safe=value=>esc(String(value??''));
  let route='home',grammarPractice=null,ownerBadgeValue=null,ownerBadgeLastCheck=0,ownerBadgePending=null;
  function paintOwnerBadge(){
    if(!window.NEAccess?.isOwner?.())return;
    const brand=document.querySelector('.brand-v7');if(!brand)return;
    let badge=brand.querySelector('.owner-notification-badge'),count=Math.max(0,Number(ownerBadgeValue)||0);
    if(!count){badge?.remove();brand.setAttribute('aria-label','Открыть панель владельца');brand.title='Панель владельца';return}
    if(!badge){badge=document.createElement('span');badge.className='owner-notification-badge';badge.setAttribute('aria-live','polite');brand.append(badge)}
    badge.textContent=count>99?'99+':String(count);
    badge.setAttribute('aria-label',count+' новых уведомлений');
    brand.setAttribute('aria-label','Открыть панель владельца. Новых уведомлений: '+count+'.');
    brand.title='Панель владельца · новых уведомлений: '+count;
  }
  async function refreshOwnerBadge(force=false){
    if(!window.NEAccess?.isOwner?.()){document.querySelectorAll('.owner-notification-badge').forEach(badge=>badge.remove());return 0}
    if(ownerBadgePending)return ownerBadgePending;
    const now=Date.now();if(!force&&now-ownerBadgeLastCheck<25000){paintOwnerBadge();return ownerBadgeValue||0}
    ownerBadgeLastCheck=now;
    ownerBadgePending=(async()=>{try{const count=await window.NEAccess.notificationCount();ownerBadgeValue=Math.max(0,Number(count)||0);paintOwnerBadge();return ownerBadgeValue}catch{return ownerBadgeValue||0}finally{ownerBadgePending=null}})();
    return ownerBadgePending;
  }
  window.NEOwnerBadge={refresh:()=>refreshOwnerBadge(true)};
  window.addEventListener('focus',()=>refreshOwnerBadge(true));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshOwnerBadge(true)});
  setInterval(()=>{if(!document.hidden)refreshOwnerBadge()},30000);
  setTimeout(()=>refreshOwnerBadge(true),0);
  shell=window.shell=function(content,active){
    if(content.includes('fsi-audio-list-v63'))content='<div class="listening-scene-v8"><h2>Слушай настоящий норвежский</h2><p>Выбери запись, послушай и перескажи смысл своими словами.</p></div>'+content;
    if(content.includes('lesson-head-v6'))content='<div class="lesson-scene-v8"><span>Nora · учимся в ситуации</span></div>'+content;
    baseShell(content,active);
    const topbar=document.querySelector('.topbar-v7'),status=document.querySelector('.status-v7');
    if(topbar&&status&&!topbar.querySelector('.share-top-v8')){
      const share=document.createElement('button');
      share.className='share-top-v8';
      share.type='button';
      share.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M22 2 11 13"></path><path d="m22 2-7 20-4-9-9-4Z"></path></svg>';
      share.title='Поделиться Norsk Eventyr';
      share.setAttribute('aria-label','Поделиться Norsk Eventyr');
      share.onclick=event=>{event.stopPropagation();v8ShareApp()};
      topbar.insertBefore(share,status);
    }
    if(topbar&&status&&!window.NEAccess?.isInstalled?.()&&!topbar.querySelector('.install-top-v8')){
      const install=document.createElement('button');
      install.className='install-top-v8';
      install.type='button';
      install.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>';
      install.title='Установить Norsk Eventyr';
      install.setAttribute('aria-label','Установить Norsk Eventyr на телефон');
      install.onclick=event=>{event.stopPropagation();window.NEAccess.install()};
      topbar.insertBefore(install,status);
    }
    const ownerBrand=document.querySelector('.brand-v7');
    if(ownerBrand&&window.NEAccess?.isOwner?.()){
      ownerBrand.onclick=()=>window.NEAccess.panel();
      ownerBrand.setAttribute('role','button');
      ownerBrand.tabIndex=0;
      ownerBrand.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();ownerBrand.click()}};
      ownerBrand.setAttribute('aria-label','Открыть панель владельца');
      ownerBrand.title='Панель владельца';
      paintOwnerBadge();
      refreshOwnerBadge();
    }
    document.querySelector('.shell-v7')?.setAttribute('data-screen',route);
    document.querySelectorAll('.dock-v7 button').forEach(button=>button.classList.toggle('active',button.getAttribute('onclick')==="navigate('"+(['welcome','grammarlab','exam','settings','dictionary','learnedwords','progress','listeninglab'].includes(route)?'hub':route)+"')"));
    const version=document.querySelector('.brand-v7 b');if(version)version.textContent='7.4.0';
  };
  function heading(title,subtitle=''){
    return '<div class="screen-head"><button class="back" onclick="navigate(\'hub\')" aria-label="Назад">←</button><div><h2>'+safe(title)+'</h2><p class="muted">'+safe(subtitle)+'</p></div></div>';
  }
  async function v8ShareApp(){
    let url='https://norsk-eventyr-mvp.vercel.app/';
    try{
      const info=await window.NEAccess.shareInfo();
      if(info?.referral_code)url+='?ref='+encodeURIComponent(info.referral_code);
    }catch{}
    const shareData={title:'Norsk Eventyr',text:'Открой Norsk Eventyr по этой ссылке. Укажи свою почту, подтверди её письмом и получи 5 дней бесплатного доступа.',url};
    try{
      if(navigator.share){await navigator.share(shareData);return}
      await navigator.clipboard.writeText(url);alert('Ссылка на Norsk Eventyr скопирована.');
    }catch(error){
      if(error?.name==='AbortError')return;
      try{await navigator.clipboard.writeText(url);alert('Ссылка на Norsk Eventyr скопирована.')}
      catch{prompt('Скопируй ссылку на Norsk Eventyr:',url)}
    }
  }
  function welcome(){
    shell('<section class="welcome-v8"><div class="welcome-copy-v8"><span class="welcome-flag-v8">🇳🇴</span><h1>Norsk Eventyr</h1><p>Учи норвежский с Норой<br>в жизни Fjordvik</p></div><div class="welcome-actions-v8"><button class="btn" onclick="navigate(\'home\')">Продолжить →</button>'+(!window.NEAccess?.isInstalled?.()?'<button class="btn secondary" onclick="NEAccess.install()">📲 Установить на телефон</button>':'<p>✓ Norsk Eventyr уже установлено на этом устройстве.</p>')+'<button class="btn secondary" onclick="navigate(\'cloud\')">Подключить сохранение прогресса</button><p>Можно учиться сразу. Прогресс сохраняется на этом устройстве.</p></div></section><section class="card"><div class="public-rating-head"><div><h3>Рейтинг Norsk Eventyr</h3><p class="muted">Оценки и комментарии пользователей</p></div><button class="btn secondary" onclick="NEFeedback.openPublic()">Все комментарии</button></div><div id="publicRatingV8">Загрузка…</div></section>','hub');
    window.NEFeedback?.mountPublic('publicRatingV8',3);
  }
  const grammarGuides={
    A1:{title:'Настоящее время · Presens',rule:'Чтобы говорить о том, что происходит сейчас или регулярно, обычно добавляем -r к начальной форме глагола. После модальных глаголов используем начальную форму без -r.',examples:[['Jeg bor i Norge.','Я живу в Норвегии.'],['Hun jobber i en butikk.','Она работает в магазине.'],['Vi lærer norsk.','Мы учим норвежский.'],['Jeg kan snakke norsk.','Я могу говорить по-норвежски.']]},
    A2:{title:'Прошедшее время и планы',rule:'Preteritum описывает завершённое событие в прошлом. Har + причастие связывает прошлый опыт с настоящим. Skal + начальная форма выражает план.',examples:[['I går gikk jeg på jobb.','Вчера я ходил на работу.'],['Jeg har bodd her i to år.','Я живу здесь уже два года.'],['I morgen skal jeg til Oslo.','Завтра я собираюсь в Осло.']]},
    B1:{title:'Связная речь и аргументы',rule:'Начинай с главной мысли и поясняй её причину. Fordi вводит причину, derfor — следствие. Если предложение начинается с обстоятельства, глагол остаётся на втором месте.',examples:[['Det regner, derfor tar jeg bussen.','Идёт дождь, поэтому я еду на автобусе.'],['Jeg tar bussen fordi det regner.','Я еду на автобусе, потому что идёт дождь.'],['Etter min mening er dette en god løsning.','По моему мнению, это хорошее решение.']]},
    B2:{title:'Нюансы и оговорки',rule:'Уточняй степень уверенности и учитывай противоположный аргумент. Kan tyde på выражает осторожный вывод. Selv om вводит уступку, а likevel показывает, что результат сохраняется.',examples:[['Tallene kan tyde på en forbedring.','Данные могут указывать на улучшение.'],['Selv om det er dyrt, kan det være nyttig.','Хотя это дорого, это может быть полезно.'],['Vi må likevel vurdere konsekvensene.','Тем не менее мы должны оценить последствия.']]}
  };
  function grammarGuide(){
    const guide=grammarGuides[state.level]||grammarGuides.A1;
    shell(heading('Грамматика','Понятное объяснение · '+state.level)+'<section class="grammar-guide-v8"><div class="grammar-landscape-v8"></div><div class="grammar-copy-v8"><h1>'+safe(guide.title)+'</h1><p>'+safe(guide.rule)+'</p>'+guide.examples.map(([no,ru])=>'<article><button class="mini-audio" onclick="speakText(\''+escJs(no)+'\')" aria-label="Слушать пример">🔊</button><div><b class="prompt">'+safe(no)+'</b><p>'+safe(ru)+'</p></div></article>').join('')+'<button class="btn" onclick="v8StartGrammar()">Потренироваться →</button><button class="btn secondary" onclick="startGrammarLab()">Дополнительные задания</button></div></section>','hub');
  }
  function v8StartGrammar(){grammarPractice={level:state.level,i:0,correct:0,locked:false};renderGrammarPractice()}
  function renderGrammarPractice(){
    const session=grammarPractice,item=GRAMMAR[session.level]?.[session.i];
    if(!item){
      state.elite.activity[neLocalDate()]=state.elite.activity[neLocalDate()]||{};state.elite.activity[neLocalDate()].grammar=true;saveState();
      shell(heading('Грамматика')+'<section class="card"><h2>Тренировка завершена ✓</h2><p>Все задания выполнены. Продолжай использовать конструкции в разговоре.</p><button class="btn" onclick="navigate(\'chat\')">Поговорить с Норой</button><button class="btn secondary" onclick="navigate(\'grammarlab\')">К объяснению</button></section>','hub');return;
    }
    shell(heading('Грамматика',session.level+' · '+(session.i+1)+'/'+GRAMMAR[session.level].length)+'<section class="card"><div class="prompt">'+safe(item[0])+'</div><div class="choice-list">'+item.slice(1,5).map((option,i)=>'<button class="choice" onclick="v8GrammarAnswer('+i+')">'+safe(option)+'</button>').join('')+'</div><div id="grammarGuideFeedback"></div></section>','hub');
  }
  function v8GrammarAnswer(index){
    const session=grammarPractice;if(!session||session.locked)return;const item=GRAMMAR[session.level][session.i],correct=index===item[5];
    const box=document.getElementById('grammarGuideFeedback');box.innerHTML='<div class="feedback '+(correct?'good':'bad')+'">'+(correct?'✓ Верно':'Попробуй ещё раз')+'<br>'+safe(item[6])+'</div>';
    neUpdateSkill('grammar',correct?100:20);
    if(correct){session.locked=true;document.querySelectorAll('.choice').forEach(button=>button.disabled=true);neAdvance(()=>{session.i++;session.locked=false;renderGrammarPractice()},650)}
    else{const button=document.querySelectorAll('.choice')[index];button.classList.add('bad');button.disabled=true;}
  }
  function examMenu(){
    const band=state.level==='B2'?'B1-B2':state.level==='B1'?'A2-B1':'A1-A2';
    const parts=[['reading','📖','Чтение','Понимание текста'],['listening','🎧','Аудирование','Понимание речи'],['writing','✍️','Письмо','Самостоятельный текст'],['speaking','🎤','Говорение','Ответы голосом']];
    shell(heading('Подготовка к Norskprøven','Учебные задания, не официальный экзамен')+'<div class="level-tabs-v7">'+LEVELS.map(level=>'<button class="'+(level===state.level?'active':'')+'" onclick="v8ExamLevel(\''+level+'\')">'+level+'</button>').join('')+'</div><section class="exam-menu-v8">'+parts.map(([part,icon,title,description])=>'<button class="exam-part-v8" onclick="navigate(\'exampart\',{part:\''+part+'\',band:\''+band+'\'})"><span>'+icon+'</span><div><b>'+title+'</b><small>'+description+'</small></div><em>›</em></button>').join('')+'<button class="exam-part-v8" onclick="navigate(\'examrun\',\''+band+'\')"><span>📝</span><div><b>Пробный тест</b><small>Все четыре части · '+band+'</small></div><em>›</em></button></section><p class="muted">Чтение и аудирование подбирают сложность по ответам. Для письма и речи выбран диапазон '+band+'.</p>','hub');
  }
  function v8ExamLevel(level){state.level=level;saveState();examMenu()}
  function profile(){
    const goal=state.elite?.goal||'life',minutes=state.elite?.dailyMinutes||20,accessInfo=window.NEAccess?.info?.();
    const accessNote=accessInfo?.status==='trial'&&accessInfo?.trial_ends_at?' · пробный доступ до '+new Date(accessInfo.trial_ends_at).toLocaleDateString('ru-RU'):accessInfo?.owner?' · владелец':accessInfo?.status==='approved'?' · доступ одобрен':'';
    shell(heading('Профиль и настройки','Твой норвежский маршрут')+'<section class="profile-hero-v8"><span class="nora-avatar-v7"></span><h2>Учимся с Норой</h2><p>'+safe(state.level)+' · '+minutes+' минут в день'+safe(accessNote)+'</p></section><section class="settings-list-v8 profile-shortcuts-v8"><button onclick="NEAccess.panel()">🔐 Доступ и учётная запись <b>›</b></button><button onclick="NEFeedback.openPublic()">⭐ Рейтинг и комментарии <b>›</b></button><button onclick="NEFeedback.open()">☆ Оценить приложение и предложить идею <b>›</b></button></section><section class="card"><h3>Учебная цель</h3><div class="goal-options">'+Object.entries({life:['Жизнь в Норвегии','Повседневный язык'],work:['Работа','Общение и рабочие ситуации'],norskprove:['Norskprøven','Подготовка к экзамену'],b2:['B2','Точная и свободная речь']}).map(([key,[title,description]])=>'<button class="goal-option '+(goal===key?'active':'')+'" onclick="v8SetGoal(\''+key+'\')"><b>'+title+'</b><small>'+description+'</small></button>').join('')+'<h3>Время в день</h3><div class="row">'+[10,20,30,45].map(value=>'<button class="btn '+(minutes===value?'':'secondary')+'" onclick="v8SetMinutes('+value+')">'+value+' мин</button>').join('')+'</div></section><section class="settings-list-v8"><button onclick="NEAccess.install()">📲 Установить на телефон <b>›</b></button><button onclick="v8ShareApp()">📤 Поделиться приложением <b>›</b></button><button onclick="v8ToggleVoice()">🔊 Голос Норы <b>'+(state.chatPrefs.autoSpeak?'Включён':'Выключен')+'</b></button><button onclick="navigate(\'pronunciation\')">🎤 Речь и произношение <b>›</b></button><button onclick="navigate(\'cloud\')">☁ Синхронизация прогресса <b>›</b></button><button onclick="exportProgress()">↓ Сохранить копию прогресса <b>›</b></button><button onclick="navigate(\'welcome\')">🇳🇴 Заставка приложения <b>›</b></button></section><p class="muted">Язык интерфейса: русский. Разрешение микрофона хранится в настройках браузера.</p>','hub');
  }
  function v8SetGoal(goal){state.elite.goal=goal;saveState();profile()}
  function v8SetMinutes(minutes){state.elite.dailyMinutes=minutes;saveState();profile()}
  function v8ToggleVoice(){state.chatPrefs.autoSpeak=!state.chatPrefs.autoSpeak;saveState();profile()}
  navigate=window.navigate=function(view,data){
    route=view||'home';
    stopTimer();
    if(view==='welcome')return welcome();
    if(view==='grammarlab')return grammarGuide();
    if(view==='exam')return examMenu();
    if(view==='settings')return profile();
    if(view==='dictionary')return window.renderLearnedWords();
    return baseNavigate(view,data);
  };
  Object.assign(window,{v8StartGrammar,v8GrammarAnswer,v8ExamLevel,v8SetGoal,v8SetMinutes,v8ToggleVoice,v8ShareApp});
})();