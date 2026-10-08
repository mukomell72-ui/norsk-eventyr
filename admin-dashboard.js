// Norsk Eventyr 8.0.1 owner dashboard.
(() => {
 const labels={
  email_confirmed:'Подтвердил email',
  trial_started:'Начался пробный период',
  trial_ends:'Окончание пробного периода',
  terms_accepted:'Принял условия и уведомление о данных',
  installed:'Установил приложение',
  active_3_days:'Активен 3+ дней',
  purchase_interest:'Готов платить 99 NOK',
  access_requested:'Отправил заявку на доступ',
  access_approved:'Доступ одобрен',
  access_denied:'В доступе отказано',
  access_revoked:'Доступ отозван',
  first_paid:'Первый успешный платёж',
  payment_pending:'Платёж создан',
  payment_paid:'Оплата успешна',
  payment_failed:'Ошибка оплаты',
  payment_refunded:'Возврат оплаты',
  payment_partially_refunded:'Частичный возврат',
  payment_canceled:'Платёж отменён',
  subscription_active:'Подписка активирована',
  subscription_trialing:'Платная подписка на trial',
  subscription_past_due:'Проблема с оплатой подписки',
  subscription_unpaid:'Подписка не оплачена',
  subscription_canceled:'Подписка отменена',
  subscription_paused:'Подписка приостановлена',
  subscription_inactive:'Подписка неактивна',
  subscription_updated:'Подписка обновлена',
  ready_to_pay_bonus:'Готов платить · +30 дней бесплатно',
  owner_free_grant:'Бесплатный доступ выдан владельцем',
  promo_redeemed:'Промокод активирован',
  manual_payment_confirmed:'Оплата подтверждена владельцем',
  devices_reset:'Список устройств сброшен'
 };
 const statusText={
  pending:'Ожидает решения',approved:'Одобрен',denied:'Отказано',revoked:'Отозван',unrequested:'Без заявки',free:'Бесплатный',trial:'Trial',owner:'Владелец',
  active:'Платный',trialing:'Платный trial',past_due:'Просрочена оплата',unpaid:'Не оплачено',
  canceled:'Отменена',paused:'Приостановлена',inactive:'Нет подписки',
  paid:'Оплачено',failed:'Ошибка',refunded:'Возврат',partially_refunded:'Частичный возврат',
  canceled_payment:'Отменено'
 };
 let root=null,opts={},usersCache=[],activeTab='overview',loading=false;

 async function call(action,params={}){
  const response=await fetch('/api/session',{
   method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'Content-Type':'application/json',...(window.NEAccess?.headers?.()||{})},body:JSON.stringify({action,...params})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const e=new Error(data.error||'Не удалось загрузить данные.');e.code=data.error;throw e}
  return data
 }
 const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=String(text);return node};
 function dateText(value,withTime=true){
  if(!value)return '—';const d=new Date(value);if(Number.isNaN(d.getTime()))return '—';
  try{return d.toLocaleString('ru-RU',withTime?{dateStyle:'medium',timeStyle:'short'}:{dateStyle:'medium'})}catch{return d.toLocaleString('ru-RU')}
 }
 function money(value){const n=Number(value);return Number.isFinite(n)?n.toLocaleString('ru-RU',{minimumFractionDigits:0,maximumFractionDigits:2})+' NOK':'—'}
 function setMessage(text,type=''){const m=root?.querySelector('#adminMessage');if(!m)return;m.textContent=text||'';m.className='admin-message '+type}
 function body(){return root?.querySelector('#adminView')}
 function metric(label,value,detail=''){const card=el('article','admin-metric');card.append(el('strong','',value??0),el('span','',label));if(detail)card.append(el('small','',detail));return card}
 function sectionTitle(title,sub=''){const wrap=el('div','admin-section-head');const h=el('div');h.append(el('h2','',title));if(sub)h.append(el('p','',sub));wrap.append(h);return wrap}
 function button(text,cls='secondary'){const b=el('button','btn '+cls,text);b.type='button';return b}
 function empty(title,text){const box=el('div','admin-empty');box.append(el('strong','',title),el('p','',text));return box}
 function eventTitle(item){return labels[item.event_type]||String(item.event_type||'Событие').replaceAll('_',' ')}
 function eventDetail(item){
  const m=item?.metadata||{},parts=[];
  if(m.price_nok)parts.push(money(m.price_nok));
  if(m.amount_nok)parts.push('Сумма '+money(m.amount_nok));
  if(m.fee_nok)parts.push('Комиссия '+money(m.fee_nok));
  if(m.period_end)parts.push('до '+dateText(m.period_end,false));
  if(m.platform)parts.push(String(m.platform));
  if(m.status)parts.push(statusText[m.status]||String(m.status));
  if(m.failure_code)parts.push('Ошибка: '+String(m.failure_code));
  return parts.join(' · ')
 }
 function renderEvent(item,showUser=false){
  const row=el('article','admin-event');
  const dot=el('span','admin-event-dot');
  const content=el('div','admin-event-content');
  const title=el('strong','',eventTitle(item));content.append(title);
  if(showUser&&item.email)content.append(el('span','admin-event-user',item.email));
  const detail=eventDetail(item);if(detail)content.append(el('small','',detail));
  const future=new Date(item.occurred_at).getTime()>Date.now();
  content.append(el('time','',future?'Запланировано: '+dateText(item.occurred_at):dateText(item.occurred_at)));
  row.classList.toggle('future',future);row.append(dot,content);return row
 }
 function statusBadge(item){
  const now=Date.now(),decision=item.status||item.access_status||'unrequested',paidEnd=new Date(item.paid_until||0).getTime(),paidStart=new Date(item.current_period_start||0).getTime();
  let key='',text='';
  if(['denied','revoked'].includes(decision)){key=decision;text=statusText[key]||key}
  else if(['active','trialing'].includes(item.subscription_status)&&paidEnd>now&&(!paidStart||paidStart<=now)){key='active';text='Платный'}
  else if(new Date(item.free_access_until||0).getTime()>now){key='free';text='Бесплатный'}
  else if(new Date(item.trial_ends_at||0).getTime()>now){key='trial';text='Trial'}
  else{key=decision;text=statusText[key]||key}
  return el('span','admin-badge status-'+String(key||'unknown'),text)
 }
 function funnelNode(stages){
  const defs=[
   ['Первичные открытия','first_visits'],['Регистрации','registered'],['Подтвердили email','confirmed'],
   ['Начали trial','trial_started'],['Установили','installed'],['Активны 3+ дней','active_3_days'],
   ['Trial закончился','trial_finished'],['Готовы платить','purchase_interest'],['Оплатили','paid']
  ];
  const max=Math.max(1,...defs.map(([,key])=>Number(stages?.[key])||0));
  const box=el('div','admin-funnel');
  let prev=null;
  for(const [name,key] of defs){
   const value=Math.max(0,Number(stages?.[key])||0),row=el('div','admin-funnel-row');
   const top=el('div','admin-funnel-top');top.append(el('span','',name),el('strong','',value));
   if(prev!==null){const conv=prev?Math.round(value/prev*100):0;top.append(el('small','',conv+'%'))}
   const track=el('div','admin-funnel-track'),fill=el('div','admin-funnel-fill');fill.style.width=Math.max(value?3:0,Math.round(value/max*100))+'%';track.append(fill);
   row.append(top,track);box.append(row);prev=value
  }
  return box
 }
 async function overview(){
  const out=body();out.replaceChildren();out.append(sectionTitle('Главная','Состояние приложения, денег и пользователей в одном месте.'));
  const loadingNode=el('p','admin-muted','Загрузка…');out.append(loadingNode);
  try{
   const [overviewOut,growthOut,eventsOut]=await Promise.all([
    call('owner_admin_overview'),call('owner_growth'),call('owner_events',{limit:8})
   ]);
   const d=overviewOut.overview||{},g=growthOut.growth||{},events=Array.isArray(eventsOut.events)?eventsOut.events:[];
   out.replaceChildren();out.append(sectionTitle('Главная','Состояние приложения, денег и пользователей в одном месте.'));
   const grid=el('div','admin-metric-grid');
   grid.append(
    metric('Пользователи',d.users),metric('Активный trial',d.active_trials),metric('Бесплатный доступ',d.active_free),
    metric('Готовы платить',d.purchase_interest),metric('Платные',d.active_paid),
    metric('Выручка 30 дней',money(d.revenue_30d)),metric('Комиссии 30 дней',money(d.fees_30d)),
    metric('Ошибки оплаты 7 дней',d.failed_payments_7d),metric('Продления 7 дней',d.renewals_7d),
    metric('Ошибки приложения 24 ч',d.errors_24h)
   );
   out.append(grid);
   const funnelHead=sectionTitle('Воронка','Конверсия между ключевыми этапами.');out.append(funnelHead,funnelNode(g.stages||{}));
   const recent=sectionTitle('Последние события','Значимые действия пользователей.');out.append(recent);
   if(events.length){const list=el('div','admin-event-list');for(const item of events)list.append(renderEvent(item,true));out.append(list)}
   else out.append(empty('Событий пока нет','Они появятся после действий пользователей.'));
  }catch(e){loadingNode.textContent=e.message}
 }
 async function users(){
  const out=body();out.replaceChildren();out.append(sectionTitle('Пользователи','Поиск, статус trial, подписка и история каждого человека.'));
  const controls=el('div','admin-controls');
  const search=el('input','admin-search');search.type='search';search.placeholder='Поиск по email или имени';
  const filter=el('select','admin-filter');
  for(const [value,text] of [['all','Все'],['trial','Trial'],['free','Бесплатные'],['paid','Платные'],['interest','Хотят купить'],['pending','Ожидают'],['problem','Проблемы оплаты']]){const o=el('option','',text);o.value=value;filter.append(o)}
  controls.append(search,filter);out.append(controls);
  const list=el('div','admin-user-list');list.append(el('p','admin-muted','Загрузка…'));out.append(list);
  try{
   const response=await call('list');usersCache=Array.isArray(response.requests)?response.requests:[];
   const render=()=>{
    const q=search.value.trim().toLowerCase(),f=filter.value;list.replaceChildren();
    const now=Date.now();
    const items=usersCache.filter(item=>{
     const match=!q||String(item.email||'').toLowerCase().includes(q)||String(item.display_name||'').toLowerCase().includes(q);
     if(!match)return false;
     if(f==='all')return true;
     if(f==='trial')return new Date(item.trial_ends_at||0).getTime()>now&&(!item.subscription_status||item.subscription_status==='inactive');
     if(f==='free')return new Date(item.free_access_until||0).getTime()>now;
     if(f==='paid')return ['active','trialing'].includes(item.subscription_status)&&new Date(item.paid_until||0).getTime()>now;
     if(f==='interest')return Boolean(item.purchase_interest_at);
     if(f==='pending')return item.status==='pending';
     if(f==='problem')return ['past_due','unpaid'].includes(item.subscription_status)||item.last_payment_status==='failed';
     return true
    });
    if(!items.length){list.append(empty('Ничего не найдено','Измени фильтр или строку поиска.'));return}
    for(const item of items){
     const card=el('article','admin-user-row');
     const main=el('div','admin-user-main');const top=el('div','admin-user-title');
     top.append(el('strong','',item.display_name||item.email||'Пользователь'),statusBadge(item));main.append(top);
     if(item.display_name)main.append(el('span','admin-user-email',item.email||''));
     const facts=el('div','admin-user-facts');
     const trialEnd=item.trial_ends_at?'Trial до '+dateText(item.trial_ends_at,false):'Trial —';
     const free=item.free_access_until?'Бесплатно до '+dateText(item.free_access_until,false):'Бесплатно —';
     const paid=item.paid_until?'Оплачено до '+dateText(item.paid_until,false):'Оплата —';
     facts.append(el('span','',trialEnd),el('span','',free),el('span','',paid),el('span','','Устройств '+String(Number(item.device_count)||0)+'/2'),el('span','','Источник '+String(item.acquisition_source||'direct')));
     main.append(facts);
     const open=button('Открыть');open.onclick=()=>userDetail(item.user_id);
     card.append(main,open);list.append(card)
    }
   };
   search.addEventListener('input',render);filter.addEventListener('change',render);render()
  }catch(e){list.replaceChildren(empty('Ошибка загрузки',e.message))}
 }
 async function userDetail(userId){
  const out=body();out.replaceChildren();const back=button('← К пользователям','ghost');back.onclick=users;out.append(back,el('p','admin-muted','Загрузка карточки…'));
  try{
   const response=await call('owner_user_detail',{user_id:userId}),d=response.detail||{},p=d.profile||{},timeline=Array.isArray(d.timeline)?d.timeline:[],payments=Array.isArray(d.payments)?d.payments:[],devices=Array.isArray(d.devices)?d.devices:[];
   out.replaceChildren();out.append(back);
   const head=el('div','admin-user-detail-head');const title=el('div');title.append(el('h2','',p.display_name||p.email||'Пользователь'),el('p','admin-muted',p.email||''));head.append(title,statusBadge({subscription_status:p.subscription_status,status:p.access_status,trial_ends_at:p.trial_ends_at,free_access_until:p.free_access_until,paid_until:p.paid_until,current_period_start:p.current_period_start}));out.append(head);
   const grid=el('div','admin-detail-grid');
   const facts=[
    ['Аккаунт',statusText[p.access_status]||p.access_status||'Без заявки'],['Подтверждение email',dateText(p.email_confirmed_at)],['Trial',dateText(p.trial_started_at)+' → '+dateText(p.trial_ends_at)],
    ['Бесплатный доступ до',dateText(p.free_access_until)],['Бонус «готов платить»',p.ready_bonus_granted_at?dateText(p.ready_bonus_granted_at):'Не использован'],
    ['Устройств',String(p.device_count||0)+' / 2'],['Установка',p.first_installed_at?dateText(p.first_installed_at):'—'],
    ['Источник',p.acquisition_source||'direct'],['Готов платить',p.purchase_interest_at?dateText(p.purchase_interest_at)+' · '+money(p.purchase_interest_price_nok):'—'],
    ['Подписка',statusText[p.subscription_status]||p.subscription_status||'Нет'],['Оплачено до',dateText(p.paid_until)],
    ['Следующая оплата',dateText(p.next_payment_at)],['Автопродление',['active','trialing'].includes(p.subscription_status)?(p.cancel_at_period_end?'Будет отключено':'Включено'):'—']
   ];
   for(const [name,value] of facts){const f=el('article','admin-detail-fact');f.append(el('span','',name),el('strong','',value));grid.append(f)}out.append(grid);
   const actions=el('div','admin-action-row');
   for(const [status,text] of [['approved','Одобрить аккаунт'],['denied','Отказать'],['revoked','Отозвать доступ']]){
    if(status===p.access_status)continue;const b=button(text,status==='approved'?'':'secondary');
    b.onclick=async()=>{if(loading)return;loading=true;b.disabled=true;try{await call('decide',{user_id:userId,status});await userDetail(userId)}catch(e){setMessage(e.message,'error')}finally{loading=false;b.disabled=false}};actions.append(b)
   }
   if(actions.children.length)out.append(actions);
   out.append(sectionTitle('Управление доступом','Бесплатные периоды и ручное подтверждение оплаты хранятся отдельно.'));
   const accessTools=el('div','admin-access-tools');
   const freeRow=el('div','admin-action-row');
   for(const days of [7,30,90]){const b=button('+'+days+' дней бесплатно');b.onclick=async()=>{if(loading)return;loading=true;b.disabled=true;try{await call('owner_grant_free',{user_id:userId,days,note:'Выдано владельцем'});await userDetail(userId)}catch(e){setMessage(e.message,'error')}finally{loading=false;b.disabled=false}};freeRow.append(b)}
   const custom=button('Свой срок','ghost');custom.onclick=async()=>{const raw=prompt('Сколько дней бесплатного доступа добавить?','30'),days=Number(raw);if(!Number.isInteger(days)||days<1||days>3650)return;const note=prompt('Комментарий (необязательно)','')||'';try{await call('owner_grant_free',{user_id:userId,days,note});await userDetail(userId)}catch(e){setMessage(e.message,'error')}};freeRow.append(custom);accessTools.append(freeRow);
   const paid=button('Подтвердить оплату','');paid.onclick=async()=>{const amount=Number(prompt('Полученная сумма, NOK','99'));if(!Number.isFinite(amount)||amount<1)return;const days=Number(prompt('На сколько дней открыть платный период?','30'));if(!Number.isInteger(days)||days<1||days>3650)return;const note=prompt('Комментарий к оплате (необязательно)','')||'';try{await call('owner_confirm_payment',{user_id:userId,amount_nok:amount,days,note});await userDetail(userId)}catch(e){setMessage(e.message,'error')}};accessTools.append(paid);
   const reset=button('Сбросить доверенные устройства','ghost');reset.onclick=async()=>{if(!confirm('Сбросить все доверенные устройства этого пользователя? Ему потребуется войти снова на нужных устройствах.'))return;try{await call('owner_devices_reset',{user_id:userId});await userDetail(userId)}catch(e){setMessage(e.message,'error')}};accessTools.append(reset);
   if(devices.length){const dl=el('div','admin-device-list');for(const dvc of devices){const row=el('article','admin-device');row.append(el('strong','',dvc.device_name||'Устройство'),el('small','',(dvc.revoked_at?'Отозвано · ':'Последний вход · ')+dateText(dvc.revoked_at||dvc.last_seen_at)));dl.append(row)}accessTools.append(dl)}
   out.append(accessTools);
   out.append(sectionTitle('История','Полная хронология значимых событий, включая будущую дату окончания периода.'));
   if(timeline.length){const tl=el('div','admin-timeline');for(const item of timeline)tl.append(renderEvent(item,false));out.append(tl)}
   else out.append(empty('История пока пустая','События появятся после действий пользователя.'));
   out.append(sectionTitle('Платежи пользователя','Подтверждённые владельцем или платёжным провайдером периоды.'));
   if(payments.length){const pl=el('div','admin-payment-list');for(const item of payments)pl.append(paymentCard(item));out.append(pl)}
   else out.append(empty('Платежей пока нет','После подключения Stripe здесь появятся подтверждённые платежи.'));
  }catch(e){out.replaceChildren(back,empty('Не удалось открыть пользователя',e.message))}
 }
 function paymentCard(item){
  const card=el('article','admin-payment');
  const top=el('div','admin-payment-top');top.append(el('strong','',money(item.amount_nok)),el('span','admin-badge payment-'+String(item.status),statusText[item.status]||item.status));
  card.append(top);
  const lines=[
   ...(item.email?['Пользователь: '+String(item.email)]:[]),
   'Дата: '+dateText(item.paid_at||item.created_at),
   'Период: '+dateText(item.period_start,false)+' → '+dateText(item.period_end,false),
   'Источник: '+(item.provider==='manual'?'подтверждено владельцем':String(item.provider||'провайдер')),
   'Комиссия: '+money(item.fee_nok)+(Number(item.refunded_nok)>0?' · Возврат: '+money(item.refunded_nok):'')
  ];
  if(item.failure_message)lines.push('Причина: '+String(item.failure_message));
  for(const line of lines)card.append(el('p','',line));return card
 }
 async function payments(){
  const out=body();out.replaceChildren();out.append(sectionTitle('Платежи','Платные периоды подтверждаются только владельцем или доверенным платёжным провайдером. Пользователь не может назначить себе оплату.'));
  const list=el('div','admin-payment-list');list.append(el('p','admin-muted','Загрузка…'));out.append(list);
  try{
   const response=await call('owner_payments',{limit:300}),items=Array.isArray(response.payments)?response.payments:[];
   list.replaceChildren();
   if(!items.length){list.append(empty('Платежей пока нет','После ручного подтверждения оплаты или подключения платёжного провайдера операции появятся здесь.'));return}
   for(const item of items)list.append(paymentCard(item))
  }catch(e){list.replaceChildren(empty('Ошибка загрузки',e.message))}
 }
 async function events(){
  const out=body();out.replaceChildren();out.append(sectionTitle('События','Общий журнал значимых действий всех пользователей.'));
  const controls=el('div','admin-controls'),search=el('input','admin-search');search.type='search';search.placeholder='Поиск по email или событию';controls.append(search);out.append(controls);
  const list=el('div','admin-event-list');list.append(el('p','admin-muted','Загрузка…'));out.append(list);
  try{
   const response=await call('owner_events',{limit:300}),items=Array.isArray(response.events)?response.events:[];
   const render=()=>{const q=search.value.trim().toLowerCase();list.replaceChildren();const filtered=items.filter(item=>!q||String(item.email||'').toLowerCase().includes(q)||eventTitle(item).toLowerCase().includes(q));if(!filtered.length){list.append(empty('События не найдены','Измени строку поиска.'));return}for(const item of filtered)list.append(renderEvent(item,true))};
   search.addEventListener('input',render);render()
  }catch(e){list.replaceChildren(empty('Ошибка загрузки',e.message))}
 }
 async function service(){
  const out=body();out.replaceChildren();out.append(sectionTitle('Ещё','Отзывы, ошибки приложения и резервная копия.'));
  const backup=button('Скачать резервную копию');backup.onclick=async()=>{backup.disabled=true;try{const response=await call('owner_backup'),body=JSON.stringify(response.backup||{},null,2),blob=new Blob([body],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='norsk-eventyr-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){setMessage(e.message,'error')}finally{backup.disabled=false}};out.append(backup);
   out.append(sectionTitle('Промокоды','Создавай коды для бесплатного продления. Один пользователь может использовать конкретный код только один раз.'));
   const promoForm=el('form','admin-promo-form'),promoCode=el('input','admin-search'),promoDays=el('input','admin-search'),promoMax=el('input','admin-search'),promoUntil=el('input','admin-search'),promoNote=el('input','admin-search'),promoSubmit=button('Создать промокод','');
   promoCode.placeholder='Код, например FRIEND30';promoCode.maxLength=32;promoDays.type='number';promoDays.min='1';promoDays.max='3650';promoDays.value='30';promoDays.placeholder='Дней';promoMax.type='number';promoMax.min='1';promoMax.max='100000';promoMax.value='1';promoMax.placeholder='Активаций';promoUntil.type='date';promoNote.placeholder='Комментарий';promoSubmit.type='submit';
   promoForm.append(promoCode,promoDays,promoMax,promoUntil,promoNote,promoSubmit);out.append(promoForm);
   const promoList=el('div','admin-promo-list');promoList.textContent='Загрузка…';out.append(promoList);
   const loadPromos=async()=>{const response=await call('owner_promo_list'),items=Array.isArray(response.promos)?response.promos:[];promoList.replaceChildren();if(!items.length){promoList.append(empty('Промокодов нет','Создай первый код выше.'));return}for(const p of items){const card=el('article','admin-promo');const top=el('div','admin-payment-top');top.append(el('strong','',p.code),el('span','admin-badge',p.active?'Активен':'Выключен'));card.append(top,el('p','',p.duration_days+' дней · '+p.redemption_count+'/'+p.max_redemptions+' активаций'),el('p','',p.valid_until?'Действует до '+dateText(p.valid_until,false):'Без даты окончания'));if(p.note)card.append(el('p','',p.note));const toggle=button(p.active?'Отключить':'Включить','ghost');toggle.onclick=async()=>{await call('owner_promo_toggle',{promo_id:p.id,active:!p.active});await loadPromos()};card.append(toggle);promoList.append(card)}};
   promoForm.onsubmit=async e=>{e.preventDefault();const code=promoCode.value.trim().toUpperCase(),days=Number(promoDays.value),max=Number(promoMax.value),valid_until=promoUntil.value?new Date(promoUntil.value+'T23:59:59').toISOString():null;try{await call('owner_promo_create',{code,days,max_redemptions:max,valid_until,note:promoNote.value.trim()});promoCode.value='';promoNote.value='';await loadPromos()}catch(e){setMessage(e.message,'error')}};try{await loadPromos()}catch(e){promoList.replaceChildren(empty('Не удалось загрузить промокоды',e.message))}
   out.append(sectionTitle('Отзывы и идеи','Публичные комментарии можно скрывать и возвращать.'));
   const refreshFeedback=button('Обновить отзывы','secondary'),feedbackBox=el('div');feedbackBox.id='feedbackList';feedbackBox.textContent='Загрузка…';out.append(refreshFeedback,feedbackBox);
   const loadFeedback=async()=>{if(!window.NEFeedback?.ownerList){feedbackBox.textContent='Модуль отзывов пока недоступен.';return}const total=await window.NEFeedback.ownerList();if(typeof total==='number')window.NEAccess?.ownerMarkFeedbackSeen?.(total);await window.NEOwnerBadge?.refresh?.()};refreshFeedback.onclick=loadFeedback;await loadFeedback();
   out.append(sectionTitle('Ошибки приложения','Последние технические ошибки после входа.'));
   const errorsBox=el('div','admin-error-list');errorsBox.textContent='Загрузка…';out.append(errorsBox);
   try{
    const response=await call('owner_errors'),items=Array.isArray(response.errors)?response.errors:[];errorsBox.replaceChildren();
    if(!items.length)errorsBox.append(empty('Ошибок нет','Зафиксированных клиентских ошибок пока нет.'));
    else for(const item of items.slice(0,100)){const card=el('article','admin-error-card');card.append(el('strong','',item.code||'CLIENT_ERROR'),el('p','',item.email||''),el('p','',item.message||''),el('small','',dateText(item.created_at)+' · '+String(item.app_version||'')));errorsBox.append(card)}
   }catch(e){errorsBox.replaceChildren(empty('Не удалось загрузить ошибки',e.message))}
 }
 async function show(tab){
  activeTab=tab;for(const b of root.querySelectorAll('[data-admin-tab]')){const active=b.dataset.adminTab===tab;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'page':'false')}
  setMessage('');
  if(tab==='overview')return overview();
  if(tab==='users')return users();
  if(tab==='payments')return payments();
  if(tab==='events')return events();
  return service()
 }
 function mount(container,options={}){
  root=container;opts=options;root.replaceChildren();
  const shell=el('div','admin-shell');
  const top=el('header','admin-topbar');
  const title=el('div','admin-brand');title.append(el('span','admin-kicker','Norsk Eventyr'),el('h1','','Admin Dashboard'),el('small','','Версия 8.0.1'));
  const topActions=el('div','admin-top-actions'),back=button('К обучению','secondary'),logout=button('Выйти','ghost');
  back.onclick=()=>opts.onBack?.();logout.onclick=()=>opts.onLogout?.();topActions.append(back,logout);top.append(title,topActions);
  const main=el('main','admin-main'),view=el('section','admin-view');view.id='adminView';main.append(view);
  const message=el('p','admin-message');message.id='adminMessage';
  const nav=el('nav','admin-nav');nav.setAttribute('aria-label','Разделы админ-панели');
  const tabs=[['overview','Главная'],['users','Пользователи'],['payments','Платежи'],['events','События'],['service','Ещё']];
  for(const [key,text] of tabs){const b=el('button','admin-nav-item',text);b.type='button';b.dataset.adminTab=key;b.onclick=()=>show(key);nav.append(b)}
  shell.append(top,nav,main,message);root.append(shell);show(activeTab||'overview')
 }
 window.NEAdminDashboard={mount,show};
})();