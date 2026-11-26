/* One exercise at a time. The course owns the account-scoped state and XP ledger. */
(() => {
  const words = [
    ['hei', 'Hei', 'Привет'], ['heter', 'heter', 'зовусь / зовёшься'],
    ['navn', 'et navn', 'имя'], ['kommer', 'kommer', 'прихожу / родом'],
    ['hyggelig', 'hyggelig', 'приятно']
  ];
  const stages = [
    {type:'words', title:'Познакомимся?', hint:'Нажми на слово, чтобы услышать его. Перевод всегда под словом.'},
    {type:'picture', title:'Выбери картинку для «et navn».', options:['name','wave','map'], answer:'name', audio:'navn', translation:'et navn — имя'},
    {type:'match', title:'Подбери перевод к каждому слову.', pairs:['hei','heter','hyggelig'], translation:'Hei — привет. Heter — зовусь. Hyggelig — приятно.'},
    {type:'listen', title:'Какую фразу ты слышишь?', audio:'hei-nora', options:['Jeg kommer fra Norge.','Hei! Jeg heter Nora.','Hva heter du?'], answer:'Hei! Jeg heter Nora.', translation:'Привет! Меня зовут Нора.'},
    {type:'build', title:'Собери фразу «Как тебя зовут?»', options:['du','heter','Hva','jeg'], answer:'Hva heter du', audio:'hva', translation:'Hva heter du? — Как тебя зовут?'},
    {type:'choice', title:'Что значит «Jeg kommer fra Norge»?', options:['Я живу в Норвегии.','Я из Норвегии.','Мне нравится Норвегия.'], answer:'Я из Норвегии.', audio:'norge', translation:'kommer fra — родом из'},
    {type:'type', title:'Напиши «Меня зовут Нора» по-норвежски.', answer:'Jeg heter Nora', audio:'jeg-nora', translation:'Jeg heter Nora. — Меня зовут Нора.'},
    {type:'picture', title:'Какая картинка подходит к «Hei»?', options:['map','name','wave'], answer:'wave', audio:'hei', translation:'Hei! — Привет!'},
    {type:'listen', title:'Выбери перевод услышанной фразы.', audio:'hyggelig', options:['Приятно познакомиться!','Как тебя зовут?','До завтра!'], answer:'Приятно познакомиться!', translation:'Hyggelig! — Приятно познакомиться!'},
    {type:'build', title:'Собери фразу «Я из Норвегии».', options:['Norge','fra','heter','Jeg','kommer'], answer:'Jeg kommer fra Norge', audio:'norge', translation:'Jeg kommer fra Norge. — Я из Норвегии.'},
    {type:'type', title:'Напиши «Как тебя зовут?» по-норвежски.', answer:'Hva heter du', audio:'hva', translation:'Hva heter du? — Как тебя зовут?'},
    {type:'speak', title:'Представься вслух.', hint:'Послушай пример. Запиши свою фразу или произнеси её вслух и введи текст. Запись остаётся во вкладке. Проверяется текст фразы.', audio:'jeg-nora', answer:'Jeg heter Nora', translation:'Jeg heter Nora. — Меня зовут Нора.'}
  ];
  const pictures = {
    name:'Именная карточка', wave:'Взмах рукой', map:'Карта'
  };
  const vocab = Object.fromEntries(words.map(([id,no,ru]) => [id,{no,ru}]));
  const normalize = value => String(value ?? '').normalize('NFC').toLocaleLowerCase('nb')
    .replace(/[.!?,]/g,'').trim().replace(/\s+/g,' ');
  const validStage = index => Number.isInteger(index) && index >= 0 && index < stages.length;
  let dialog, media, recorder, microphone, recording, recordingPending = false, micAttempt = 0, audioContext;

  function saved() {
    const data = state.introductionsA1;
    if (!data || data.version !== 1 || !Array.isArray(data.queue) || !data.queue.length ||
        data.queue.length > stages.length || !data.queue.every(validStage) ||
        !Number.isInteger(data.cursor) || data.cursor < 0 || data.cursor > data.queue.length ||
        (data.cursor === data.queue.length && data.finished !== true) ||
        !Array.isArray(data.misses) || !data.misses.every(validStage) ||
        !Array.isArray(data.selected) || !data.scores || !data.pairs) {
      return fresh();
    }
    return data;
  }
  function fresh() {
    return {version:1,queue:stages.map((_,i)=>i),cursor:0,review:false,misses:[],
      scores:{},selected:[],pairs:{},draft:'',feedback:null};
  }
  function persist() {
    state.introductionsA1.updatedAt = new Date().toISOString();
    saveState();
  }
  function clearMedia() {
    micAttempt++;
    media?.pause();
    media = null;
    if (recorder?.state === 'recording') recorder.stop();
    recorder = null;
    microphone?.getTracks().forEach(track=>track.stop());
    microphone = null;
    recordingPending = false;
    if (recording) URL.revokeObjectURL(recording);
    recording = null;
  }
  function dispose() {
    clearMedia();
    dialog?.remove();
    dialog = null;
  }
  function open() {
    if (dialog?.open) return;
    state.introductionsA1 = saved();
    dialog = document.createElement('dialog');
    dialog.className = 'ne-intro';
    dialog.setAttribute('aria-labelledby','ne-intro-title');
    document.body.append(dialog);
    dialog.addEventListener('close', dispose, {once:true});
    dialog.addEventListener('click', e => {
      const button = e.target.closest('button');
      if (button?.dataset.action) act(button.dataset.action, button.dataset.value, button);
    });
    dialog.addEventListener('input', e => {
      if (!e.target.matches('#ne-intro-answer')) return;
      state.introductionsA1.draft = e.target.value.slice(0,120);
      persist();
    });
    dialog.addEventListener('submit', e => {
      e.preventDefault();
      check();
    });
    render();
    dialog.showModal();
  }
  function button(action,label, value, attrs='') {
    return '<button type="button" data-action="'+action+'"'+
      (value === undefined?'':' data-value="'+esc(value)+'"')+' '+attrs+'>'+label+'</button>';
  }
  function listen(id, label='▶ Слушать пример') {
    return button('audio',label,id,'class="ne-intro-listen" aria-pressed="false"');
  }
  function effect(ok) {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      audioContext ||= new Audio();
      const oscillator = audioContext.createOscillator(), volume = audioContext.createGain();
      const time = audioContext.currentTime;
      oscillator.frequency.setValueAtTime(ok?520:240,time);
      oscillator.frequency.setValueAtTime(ok?730:180,time+.08);
      void audioContext.resume?.().catch(()=>{});
      volume.gain.setValueAtTime(.055,time);
      volume.gain.exponentialRampToValueAtTime(.001,time+.19);
      oscillator.connect(volume).connect(audioContext.destination);
      oscillator.start(time);
      oscillator.stop(time+.2);
    } catch { /* Feedback also has text and a visual state. */ }
  }
  function play(url, control) {
    media?.pause();
    if (control.getAttribute('aria-pressed') === 'true') {
      control.setAttribute('aria-pressed','false');
      return;
    }
    dialog.querySelectorAll('[aria-pressed="true"].ne-intro-listen').forEach(el=>el.setAttribute('aria-pressed','false'));
    const audio = new Audio(url);
    media = audio;
    control.setAttribute('aria-pressed','true');
    const stopped = () => control.setAttribute('aria-pressed','false');
    audio.onended = stopped;
    audio.play().catch(()=>{
      stopped();
      if (dialog?.contains(control)) dialog.querySelector('.ne-intro-media-message').textContent = 'Аудио не запустилось. Попробуй ещё раз.';
    });
  }
  async function record() {
    if (recorder?.state === 'recording') { recorder.stop(); return; }
    if (recordingPending) return;
    const host = dialog, currentAttempt = ++micAttempt;
    const message = host.querySelector('.ne-intro-media-message');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      message.textContent = 'Запись недоступна. Произнеси фразу и введи её текст.';
      return;
    }
    recordingPending = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      if (dialog !== host || currentAttempt !== micAttempt) {
        stream.getTracks().forEach(track=>track.stop());
        return;
      }
      microphone = stream;
      const chunks = [], capture = new MediaRecorder(stream);
      recorder = capture;
      capture.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      const timer = setTimeout(()=>{if(capture.state === 'recording') capture.stop();},12000);
      capture.onstop = () => {
        clearTimeout(timer);
        stream.getTracks().forEach(track=>track.stop());
        if (dialog !== host || currentAttempt !== micAttempt) return;
        if (recording) URL.revokeObjectURL(recording);
        recording = chunks.length ? URL.createObjectURL(new Blob(chunks,{type:capture.mimeType})) : null;
        recorder = null;
        render();
      };
      capture.start();
      message.textContent = 'Идёт запись, до 12 секунд. Нажми «Запись» ещё раз, чтобы остановить.';
    } catch {
      microphone?.getTracks().forEach(track=>track.stop());
      if (dialog === host && currentAttempt === micAttempt) message.textContent = 'Микрофон недоступен. Произнеси фразу и введи её текст.';
    } finally {
      if (currentAttempt === micAttempt) recordingPending = false;
    }
  }
  function render() {
    const run = state.introductionsA1, index = run.queue[run.cursor], item = stages[index];
    const done = run.finished === true;
    const phase = done?'Награда':run.review?'Повтор ошибок':'Знакомство';
    const progress = done?stages.length:run.cursor;
    const max = run.review&&!done?run.queue.length:stages.length;
    const disabled = run.feedback?'disabled':'';
    let body = '';
    if (done) {
      body = '<div class="ne-intro-medal" aria-hidden="true">✦</div><p>Ты умеешь поздороваться, спросить имя и сказать, откуда ты.</p>'+
        '<strong>+'+Number(run.earned||0)+' XP</strong><p>Значок «Первая встреча»</p>'+
        button('close','К карте курса',undefined,'class="ne-intro-primary"')+button('restart','Пройти ещё раз');
    } else if (item.type === 'words') {
      body = '<ul class="ne-intro-words">'+words.map(([id,no,ru])=>'<li><div><b>'+no+'</b><small>'+ru+'</small></div>'+listen(id,'▶ <span class="ne-intro-sr">Слушать '+no+'</span>')+'</li>').join('')+'</ul>'+
        button('next','Начать задания',undefined,'class="ne-intro-primary"');
    } else {
      const mode = item.type;
      let fields = item.audio && !run.feedback ? listen(item.audio,mode==='listen'?'▶ Слушать задание':'▶ Слушать пример') : '';
      if (mode === 'choice' || mode === 'picture' || mode === 'listen') {
        fields += '<div class="ne-intro-options '+(mode==='picture'?'ne-intro-pictures':'')+'">'+item.options.map(option=>
          button('select',mode==='picture'?'<span class="ne-intro-drawing ne-intro-'+option+'" aria-hidden="true"><i></i></span>'+pictures[option]:esc(option),
            option,'aria-pressed="'+(run.choice===option)+'" '+disabled)).join('')+'</div>';
      }
      if (mode === 'match') {
        fields = '<div class="ne-intro-matching">'+
          ['no','ru'].map(side=>'<div>'+ (side==='no'?item.pairs:[...item.pairs].reverse()).map(id=>
            button(side,esc(vocab[id][side]),id,'aria-pressed="'+(run.matchWord===id&&side==='no')+
              '" '+(run.pairs[id]||Object.values(run.pairs).includes(id)&&side==='ru'?'disabled':disabled))).join('')+'</div>').join('')+
          '</div><small>Соединено: '+Object.keys(run.pairs).length+' из '+item.pairs.length+'</small>';
      }
      if (mode === 'build') {
        fields += '<div class="ne-intro-built" aria-label="Собранная фраза">'+(run.selected.length?
          run.selected.map(word=>button('remove',esc(word),word,disabled)).join(''):'<small>Выбери слова по порядку</small>')+'</div>'+
          '<div class="ne-intro-bank">'+item.options.map(word=>button('add',esc(word),word,run.selected.includes(word)?'disabled':disabled)).join('')+'</div>';
      }
      if (mode === 'type'||mode === 'speak') {
        if (mode==='speak'&&!run.feedback) fields += button('record','● Запись / стоп')+
          (recording?listen('recording','▶ Моя запись'):'');
        fields += '<label for="ne-intro-answer">Твой текст по-норвежски</label>'+
          '<input id="ne-intro-answer" lang="nb" maxlength="120" autocomplete="off" value="'+esc(run.draft)+'" '+disabled+'>';
      }
      const feedback = run.feedback;
      body = '<form>'+fields+'<div class="ne-intro-media-message" role="status"></div>'+
        (feedback?'<div class="ne-intro-feedback '+(feedback==='ok'?'ok':'error')+'" role="status"><strong>'+
          (feedback==='ok'?'Правильно!':'Попробуем ещё')+'</strong><p>'+esc(item.translation)+'</p>'+
          (feedback==='ok'?'': '<p>Этот вопрос повторится в конце.</p>')+'</div>'+
          (item.audio?listen(item.audio):'')+button('next','Дальше',undefined,'class="ne-intro-primary"'):
          '<button class="ne-intro-primary" type="submit">Проверить</button>')+'</form>';
    }
    dialog.innerHTML = '<header>'+button('close','×',undefined,'aria-label="Выйти к карте"')+
      '<div><span>A1 · '+phase+'</span><progress aria-label="Прогресс занятия" max="'+max+'" value="'+progress+'"></progress></div>'+
      '<span>'+progress+'/'+max+'</span></header><main><div class="ne-intro-nora '+(run.feedback==='ok'||done?'happy':'')+
      '"><img src="/assets/nora-v8.webp" alt="Нора"></div><h1 id="ne-intro-title" tabindex="-1">'+
      (done?'Знакомство завершено!':esc(item.title))+'</h1>'+
      (item?.hint&&!done?'<p>'+esc(item.hint)+'</p>':'')+body+'</main>';
  }
  function feedback(ok) {
    const run = state.introductionsA1, index = run.queue[run.cursor];
    if (!run.review && !Object.hasOwn(run.scores,index) && stages[index].type !== 'speak') run.scores[index] = ok?100:0;
    if (!ok && !run.misses.includes(index)) run.misses.push(index);
    media?.pause();
    run.feedback = ok?'ok':'error';
    effect(ok);
    persist();
    render();
    dialog.querySelector('[data-action=next]')?.focus();
  }
  function check() {
    const run = state.introductionsA1, item = stages[run.queue[run.cursor]];
    if (run.feedback || !item || item.type === 'words') return;
    let answer;
    if (item.type === 'build') answer = run.selected.join(' ');
    else if (item.type==='type'||item.type==='speak') answer = run.draft;
    else if (item.type === 'match') {
      if (Object.keys(run.pairs).length === item.pairs.length) feedback(true);
      else dialog.querySelector('.ne-intro-media-message').textContent = 'Соедини все пары.';
      return;
    } else answer = run.choice;
    if (!String(answer||'').trim()) {
      dialog.querySelector('.ne-intro-media-message').textContent = 'Сначала введи или выбери ответ.';
      return;
    }
    const entered = normalize(answer);
    const correct = item.type==='speak' ?
      /^jeg heter [\p{L}][\p{L}'’ -]{0,60}$/u.test(entered) && !/ (heter|jeg|du)$/.test(entered) :
      entered === normalize(item.answer);
    feedback(correct);
  }
  function next() {
    const run = state.introductionsA1;
    if (!run.feedback && stages[run.queue[run.cursor]]?.type !== 'words') return;
    clearMedia();
    run.cursor++;
    run.feedback = null;
    run.choice = null;
    run.selected = [];
    run.draft = '';
    run.pairs = {};
    run.matchWord = null;
    if (run.cursor >= run.queue.length && run.misses.length) {
      run.queue = run.misses;
      run.misses = [];
      run.cursor = 0;
      run.review = true;
    }
    if (run.cursor >= run.queue.length) {
      run.finished = true;
      const previousSession = lessonSession;
      try {
        lessonSession = {xpScores:Object.values(run.scores)};
        run.earned = awardLessonXp({id:'a1-introductions-interactive'}).earned;
        touchStudy();
      } finally { lessonSession = previousSession; }
    }
    persist();
    render();
    dialog.querySelector('h1').focus();
    dialog.scrollTop = 0;
  }
  function act(action,value,control) {
    const run = state.introductionsA1;
    if (action==='close') { dialog.close(); return; }
    if (action==='audio') { play(value==='recording'?recording:'/audio/introductions/'+value+'.mp3',control); return; }
    if (action==='record') { void record(); return; }
    if (action==='restart') { clearMedia();state.introductionsA1=fresh();persist();render();return; }
    if (action==='next') { next();return; }
    if (run.feedback) return;
    if (action==='select') run.choice = value;
    if (action==='add') run.selected.push(value);
    if (action==='remove') run.selected = run.selected.filter(word=>word!==value);
    if (action==='no') run.matchWord = value;
    if (action==='ru') {
      if (!run.matchWord) {
        dialog.querySelector('.ne-intro-media-message').textContent = 'Сначала выбери слово слева.';
        return;
      }
      if (run.matchWord!==value) {
        if (!run.misses.includes(run.queue[run.cursor])) run.misses.push(run.queue[run.cursor]);
        if (!run.review) run.scores[run.queue[run.cursor]] = 0;
        persist();
        effect(false);
        dialog.querySelector('.ne-intro-media-message').textContent = 'Эти слова не образуют пару. Попробуй ещё раз.';
        return;
      }
      run.pairs[run.matchWord] = value;
      run.matchWord = null;
    }
    persist();
    render();
    const replacement = [...dialog.querySelectorAll('[data-action]')].find(el=>el.dataset.action===action&&el.dataset.value===value&&!el.disabled);
    (replacement||dialog.querySelector('form button[type=submit]'))?.focus();
  }

  window.NEIntroductions = {open, started:()=>!!state.introductionsA1&&!state.introductionsA1.finished};
})();
