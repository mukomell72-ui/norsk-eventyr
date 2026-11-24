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

  document.addEventListener('DOMContentLoaded', () => {
    const notice = document.createElement('aside');
    notice.className = 'eventyr-start';
    notice.textContent = 'Тестовая версия · подготовленные уроки и локальный прогресс. Вход, облачная синхронизация и ИИ отключены.';
    document.body.prepend(notice);
  }, {once: true});
})();
