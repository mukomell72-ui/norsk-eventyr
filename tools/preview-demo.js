(() => {
  const browserFetch = window.fetch.bind(window);
  const demoUser = '90000000-0000-4000-8000-000000000009';
  const json = (body, status = 200) => Promise.resolve(new Response(JSON.stringify(body), {
    status, headers: {'Content-Type': 'application/json'}
  }));

  window.fetch = async (input, options) => {
    const request = new Request(input instanceof Request ? input : new URL(input, location.href), options);
    const url = new URL(request.url);
    if (url.origin !== location.origin) return json({error: 'PREVIEW_OFFLINE'}, 503);
    if (!url.pathname.startsWith('/api/')) return browserFetch(request);

    if (url.pathname === '/api/session' && request.method === 'POST') {
      const {action} = await request.json().catch(() => ({}));
      if (action === 'status') return json({
        access_granted: true, status: 'approved', user_id: demoUser,
        accepted_privacy_version: '2026-10-08-v4'
      });
      if (action === 'feedback_public') return json({feedback: {items: [], count: 0, average: 0}});
      if (!action) return json({token: 'local-demo'});
      if (['growth_first_visit', 'growth_activity', 'install_seen', 'lifecycle_touch'].includes(action)) {
        return json({ok: true});
      }
    }
    return json({error: 'PREVIEW_OFFLINE'}, 503);
  };

  const levels = ['A1', 'A2', 'B1', 'B2'];
  const storageKey = 'ne-eventyr9-demo-v1';
  let progress = {};
  try { progress = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch {}
  const saveProgress = () => {
    try { localStorage.setItem(storageKey, JSON.stringify(progress)); } catch {}
  };

  const nora = () => '<aside class="ne-course-tutor"><div class="ne-course-tutor-figure">'+
    '<img src="/assets/nora-v8.webp" alt="Нора"></div><p>Hei! Я Нора. Выбери уровень и попробуй урок.</p></aside>';

  function openDemo(level) {
    if (!levels.includes(level)) return;
    const module = window.NECurriculum.modules(level)[0];
    const lesson = window.NECurated.get(module.id);
    if (!lesson) return;
    const questions = [
      {context: lesson.read, prompt: lesson.q, options: lesson.opts, correct: lesson.correct},
      {prompt: lesson.grammarQ, options: lesson.grammarOpts, correct: lesson.grammarCorrect}
    ].filter(item => item.prompt && item.options?.length && item.options[item.correct] !== undefined);
    const step = Math.min(Number(progress[level]) || 0, questions.length);
    const title = window.esc(module.title);
    const card = step === questions.length
      ? '<p role="status">Демо-урок завершён. Прогресс сохранён в этом браузере.</p><button class="eventyr-action" id="demoRestart">Пройти ещё раз</button>'
      : '<p>Задание '+ (step + 1) +' из '+ questions.length +'</p>'+
        (questions[step].context ? '<p lang="nb">'+window.esc(questions[step].context)+'</p>' : '')+
        '<h2 lang="nb">'+window.esc(questions[step].prompt)+'</h2><div class="choice-list">'+
        questions[step].options.map((option,index)=>'<button class="choice" data-demo-answer="'+index+'" lang="nb">'+window.esc(option)+'</button>').join('')+
        '</div><p id="demoFeedback" role="status"></p><button class="eventyr-action" id="demoNext" hidden>Далее</button>';

    window.shell('<section class="eventyr-start" id="demoLesson"><h1>Демо '+level+' · '+title+'</h1>'+
      nora()+card+'<button class="btn secondary" id="demoBack">К карте</button></section>', 'course');
    const screen = document.getElementById('demoLesson');
    const heading = screen.querySelector('h1');
    heading.tabIndex = -1;
    heading.focus();
    screen.querySelector('#demoBack').onclick = () => window.navigate('course', level);
    const restart = screen.querySelector('#demoRestart');
    if (restart) {
      restart.onclick = () => { delete progress[level]; saveProgress(); openDemo(level); };
      return;
    }
    const next = screen.querySelector('#demoNext');
    const feedback = screen.querySelector('#demoFeedback');
    for (const button of screen.querySelectorAll('[data-demo-answer]')) {
      button.onclick = () => {
        const correct = Number(button.dataset.demoAnswer) === Number(questions[step].correct);
        feedback.textContent = correct ? 'Верно!' : 'Попробуй ещё раз.';
        if (correct) {
          next.hidden = false;
          for (const choice of screen.querySelectorAll('[data-demo-answer]')) choice.disabled = true;
          next.focus({preventScroll:true});
          next.scrollIntoView({block:'center'});
        }
      };
    }
    next.onclick = () => { progress[level] = step + 1; saveProgress(); openDemo(level); };
  }

  function mountDemoLinks() {
    const screen = document.querySelector('.home-v7, .course-v7');
    if (!screen || screen.querySelector('#demoLevels')) return;
    const panel = document.createElement('section');
    panel.id = 'demoLevels';
    panel.className = 'eventyr-start';
    panel.innerHTML = '<h2>Демо-уроки A1–B2</h2>'+nora()+'<div class="eventyr-start-actions"></div>';
    for (const level of levels) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'eventyr-action';
      button.textContent = 'Демо '+level;
      button.onclick = () => openDemo(level);
      panel.lastElementChild.append(button);
    }
    const anchor = screen.querySelector('#eventyr-first-title, #eventyr-map-title')?.closest('section');
    if (anchor) anchor.after(panel);
    else screen.prepend(panel);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const notice = document.createElement('aside');
    notice.className = 'eventyr-start';
    notice.textContent = 'Тестовая версия · подготовленные уроки и локальный прогресс. Вход, облачная синхронизация и ИИ отключены.';
    document.body.prepend(notice);
    new MutationObserver(mountDemoLinks).observe(document.getElementById('app'), {childList:true, subtree:true});
    mountDemoLinks();
  }, {once: true});
})();
