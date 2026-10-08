const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),ownerId='11111111-1111-4111-8111-111111111111',studentId='22222222-2222-4222-8222-222222222222';
let decision='unrequested',name='',feedback=[],resetEmail='',updatedPassword='',ready=false,readyBonusAt=null,freeUntil=null,paidUntil=null,manualPayments=0,promos=[];

function future(value){return value&&new Date(value).getTime()>Date.now()}
function studentStatus(){
 if(['denied','revoked'].includes(decision))return {status:decision,granted:false};
 if(decision==='approved'&&future(paidUntil))return {status:'paid',granted:true};
 if(decision==='approved'&&future(freeUntil))return {status:'free',granted:true};
 if(decision==='pending')return {status:'pending',granted:false};
 return {status:'expired',granted:false};
}
function extend(base,days){return new Date(Math.max(Date.now(),base?new Date(base).getTime():0)+days*86400000).toISOString()}

const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/api/session'){
  let raw='';for await(const chunk of req)raw+=chunk;
  const b=JSON.parse(raw||'{}'),user=/user=(owner|student)/.exec(req.headers.cookie||'')?.[1];
  res.setHeader('Content-Type','application/json');let out={ok:true};

  if(b.action==='login'){res.setHeader('Set-Cookie','user='+(b.email.startsWith('owner')?'owner':'student')+'; Path=/')}
  else if(b.action==='register')out={confirmEmail:true};
  else if(b.action==='logout')res.setHeader('Set-Cookie','user=; Path=/; Max-Age=0');
  else if(b.action==='password_reset_request'){resetEmail=b.email;out={ok:true}}
  else if(b.action==='confirm'){res.setHeader('Set-Cookie','user=student; Path=/');out={ok:true,recovery:b.type==='recovery'}}
  else if(b.action==='recovery_session'){res.setHeader('Set-Cookie','user=student; Path=/');out={ok:true}}
  else if(b.action==='growth_first_visit'||b.action==='feedback_public')out=b.action==='feedback_public'?{feedback:{items:[],count:0,average:0}}:{ok:true};
  else if(!user){res.statusCode=401;out={error:'LOGIN_REQUIRED'}}
  else if(b.action==='update_password'){updatedPassword=b.password;out={ok:true}}
  else if(b.action==='status'){
   const owner=user==='owner';
   if(owner)out={status:'owner',request_status:'approved',access_granted:true,owner:true,user_id:ownerId,email:'owner@example.com',privacy_version:'2026-10-08-v4',accepted_privacy_version:'2026-10-08-v4'};
   else{const st=studentStatus();out={status:st.status,request_status:decision,access_granted:st.granted,owner:false,user_id:studentId,email:'student@example.com',privacy_version:'2026-10-08-v4',accepted_privacy_version:'2026-10-08-v4',free_access_until:freeUntil,ready_bonus_granted_at:readyBonusAt,paid_until:paidUntil}}
  }
  else if(b.action==='request'){decision='pending';name=b.name}
  else if(b.action==='purchase_interest'){
   ready=true;
   if(decision==='approved'&&!readyBonusAt){freeUntil=extend(freeUntil,30);readyBonusAt=new Date().toISOString();out={ok:true,bonus_granted:true,bonus_pending:false,free_access_until:freeUntil}}
   else out={ok:true,bonus_granted:false,bonus_pending:decision!=='approved'&&!readyBonusAt,bonus_already_used:!!readyBonusAt,free_access_until:freeUntil};
  }
  else if(b.action==='promo_redeem'){freeUntil=extend(freeUntil,30);out={ok:true,code:b.code,days:30,free_access_until:freeUntil}}
  else if(b.action==='growth_activity'||b.action==='install_seen'||b.action==='lifecycle_touch')out={ok:true};
  else if(b.action==='feedback_submit'){feedback.push({id:String(feedback.length+1).padStart(36,'1'),email:user+'@example.com',rating:b.rating,comment:b.comment,suggestion:b.suggestion,is_public:true,created_at:new Date().toISOString()})}
  else if(b.action==='feedback_list')out={feedback:{items:feedback,count:feedback.length,average:feedback.length?feedback.reduce((sum,x)=>sum+x.rating,0)/feedback.length:0}}
  else if(b.action==='feedback_moderate')out={ok:true};
  else if(b.action==='list')out={requests:[{user_id:studentId,display_name:name,email:'student@example.com',status:decision,trial_started_at:'2026-09-25T00:00:00Z',trial_ends_at:'2026-09-30T00:00:00Z',free_access_until:freeUntil,ready_bonus_granted_at:readyBonusAt,activity_days_count:3,purchase_interest_at:ready?'2026-10-08T18:00:00Z':null,purchase_interest_price_nok:ready?99:null,acquisition_source:'direct',subscription_status:future(paidUntil)?'active':'inactive',paid_until:paidUntil,current_period_start:future(paidUntil)?'2026-10-08T18:00:00Z':null,device_count:1}]};
  else if(b.action==='decide'){
   decision=b.status;
   if(decision==='approved'&&ready&&!readyBonusAt){freeUntil=extend(freeUntil,30);readyBonusAt=new Date().toISOString()}
   out={ok:true,status:decision,bonus_granted:!!readyBonusAt,free_access_until:freeUntil};
  }
  else if(b.action==='owner_admin_overview')out={overview:{users:1,confirmed:1,active_trials:0,expired_trials:1,active_free:future(freeUntil)&&decision==='approved'?1:0,purchase_interest:ready?1:0,active_paid:future(paidUntil)?1:0,past_due:0,revenue_30d:manualPayments?99:0,fees_30d:0,failed_payments_7d:0,renewals_7d:0,errors_24h:0}};
  else if(b.action==='owner_growth')out={growth:{stages:{first_visits:1,registered:1,confirmed:1,trial_started:1,installed:0,active_3_days:1,trial_finished:1,purchase_interest:ready?1:0,paid:manualPayments?1:0},sources:[{source:'direct',registered:1,trial_started:1,active_3_days:1,purchase_interest:ready?1:0,paid:manualPayments?1:0}]}};
  else if(b.action==='owner_events')out={events:[]};
  else if(b.action==='owner_payments')out={payments:manualPayments?[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',user_id:studentId,email:'student@example.com',provider:'manual',status:'paid',amount_nok:99,fee_nok:0,refunded_nok:0,period_start:new Date().toISOString(),period_end:paidUntil,paid_at:new Date().toISOString(),created_at:new Date().toISOString()}]:[]};
  else if(b.action==='owner_user_detail')out={detail:{profile:{user_id:studentId,email:'student@example.com',display_name:name,access_status:decision,trial_started_at:'2026-09-25T00:00:00Z',trial_ends_at:'2026-09-30T00:00:00Z',free_access_until:freeUntil,ready_bonus_granted_at:readyBonusAt,activity_days_count:3,acquisition_source:'direct',purchase_interest_at:ready?'2026-10-08T18:00:00Z':null,purchase_interest_price_nok:ready?99:null,subscription_status:future(paidUntil)?'active':'inactive',paid_until:paidUntil,current_period_start:future(paidUntil)?'2026-10-08T18:00:00Z':null,cancel_at_period_end:true,device_count:1},timeline:[],payments:manualPayments?[{provider:'manual',status:'paid',amount_nok:99,fee_nok:0,refunded_nok:0,period_start:new Date().toISOString(),period_end:paidUntil,paid_at:new Date().toISOString(),created_at:new Date().toISOString()}]:[],devices:[{device_id:'d_qa_device_1234567890',device_name:'QA Browser',last_seen_at:new Date().toISOString()}]}};
  else if(b.action==='owner_errors')out={errors:[]};
  else if(b.action==='owner_promo_list')out={promos};
  else if(b.action==='owner_promo_create'){promos.unshift({id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',code:b.code,duration_days:b.days,max_redemptions:b.max_redemptions,redemption_count:0,valid_until:b.valid_until,active:true,note:b.note,created_at:new Date().toISOString()});out={ok:true}}
  else if(b.action==='owner_promo_toggle'){const p=promos.find(x=>x.id===b.promo_id);if(p)p.active=b.active;out={ok:true}}
  else if(b.action==='owner_grant_free'){decision='approved';freeUntil=extend(freeUntil,Number(b.days||0));out={ok:true,free_access_until:freeUntil}}
  else if(b.action==='owner_confirm_payment'){decision='approved';manualPayments++;paidUntil=extend(Math.max(freeUntil?new Date(freeUntil).getTime():0,paidUntil?new Date(paidUntil).getTime():0),Number(b.days||30));out={ok:true,period_end:paidUntil}}
  else if(b.action==='owner_devices_reset')out={ok:true,revoked_devices:1};
  else if(b.action==='owner_backup')out={backup:{format:'norsk-eventyr-backup-v4'}};
  return res.end(JSON.stringify(out));
 }
 if(pathname.startsWith('/api/')){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({token:'qa'}))}
 try{
  const file=path.join(root,pathname==='/'?'index.html':pathname);
  res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
  res.end(fs.readFileSync(file))
 }catch{res.statusCode=404;res.end('missing')}
});

(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.NE_CHROMIUM_PATH,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 const origin='http://127.0.0.1:'+server.address().port,context=await browser.newContext({serviceWorkers:'block',viewport:{width:360,height:800}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.waitForSelector('#accessLogin');assert.equal(await page.evaluate(()=>typeof state),'undefined');assert.equal(await page.locator('#app').isVisible(),false);

 await page.getByRole('button',{name:'Забыли пароль?',exact:true}).click();await page.waitForSelector('#passwordResetRequest');await page.locator('#passwordResetEmail').fill('student@example.com');await page.locator('#passwordResetRequest button').click();await page.waitForFunction(()=>document.querySelector('#accessGate h1')?.textContent.includes('Проверь почту'));assert.equal(resetEmail,'student@example.com');await page.getByRole('button',{name:'Назад ко входу',exact:true}).click();await page.waitForSelector('#accessLogin');
 const recovery=await context.newPage();recovery.on('pageerror',e=>errors.push('recovery:'+e.message));await recovery.goto(origin+'/?token_hash='+('a'.repeat(32))+'&type=recovery');await recovery.waitForSelector('#passwordResetForm');await recovery.locator('#newPassword').fill('new-secure-password-123');await recovery.locator('#newPasswordConfirm').fill('new-secure-password-123');await recovery.locator('#passwordResetForm button').click();await recovery.waitForFunction(()=>!document.querySelector('#passwordResetForm'));assert.equal(updatedPassword,'new-secure-password-123');await recovery.close();console.log('PASS forgot-password request and recovery password update');

 async function login(target,email){await target.locator('#accessEmail').fill(email);await target.locator('#accessPassword').fill('qa-password-123');await target.locator('#accessLogin button').click()}
 await login(page,'student@example.com');await page.waitForSelector('#accessRequest');
 await page.getByRole('button',{name:/Готов оформить подписку/}).click();await page.waitForSelector('#accessRequest');assert.equal(ready,true);assert.equal(readyBonusAt,null);assert.equal(await page.locator('#app').isVisible(),false);
 await page.locator('#accessName').fill('<img src=x onerror=alert(1)>');await page.locator('#accessRequest button').click();await page.waitForFunction(()=>document.querySelector('#accessGate h1').textContent.includes('ожидает'));assert.equal(await page.evaluate(()=>typeof state),'undefined');
 await page.evaluate(async()=>{window.qaPrompts=0;const event=new Event('beforeinstallprompt',{cancelable:true});event.prompt=async()=>{window.qaPrompts++};event.userChoice=Promise.resolve({outcome:'accepted'});dispatchEvent(event);await NEAccess.install()});assert.equal(await page.evaluate(()=>qaPrompts),0);

 const adminContext=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}}),admin=await adminContext.newPage();
 admin.on('pageerror',e=>{errors.push('admin:'+e.message);console.error('ADMIN_PAGEERROR',e.message)});admin.on('console',m=>{if(m.type()==='error')console.error('ADMIN_CONSOLE',m.text())});
 await admin.goto(origin);await admin.waitForSelector('#accessLogin');await admin.evaluate(()=>localStorage.setItem('ne2_state',JSON.stringify({level:'A1',xp:123})));await login(admin,'owner@example.com');
 try{await admin.waitForFunction(()=>window.NEAccess?.ready(),{timeout:30000})}catch(e){console.error('ADMIN_READY_DEBUG',JSON.stringify(await admin.evaluate(()=>({gate:document.querySelector('#accessGate')?.innerText||'',app:document.querySelector('#app')?.innerText?.slice(0,800)||'',scripts:[...document.scripts].map(s=>s.src||'inline'),stateType:typeof state,access:window.NEAccess?{ready:NEAccess.ready?.(),keys:Object.keys(NEAccess)}:null}))));throw e}
 assert.equal(await admin.evaluate(()=>state.xp),123);await admin.waitForFunction(()=>document.querySelector('.owner-notification-badge')?.textContent==='1');assert.equal(await admin.getByRole('button',{name:/панель владельца/i}).count(),1);

 await admin.locator('.brand-v7').click();await admin.waitForSelector('.admin-shell');await admin.getByRole('button',{name:'Пользователи',exact:true}).click();await admin.waitForSelector('.admin-user-row');assert.equal(await admin.locator('.admin-user-row img').count(),0);await admin.getByRole('button',{name:'Открыть',exact:true}).click();await admin.waitForSelector('.admin-user-detail-head');
 await admin.getByRole('button',{name:'Одобрить аккаунт',exact:true}).click();await admin.waitForFunction(()=>document.querySelector('.admin-user-detail-head')&&document.body.textContent.includes('Одобрен'));assert(readyBonusAt);assert(future(freeUntil));

 await page.locator('#accessCheck').click();await page.waitForFunction(()=>window.NEAccess?.ready());assert.equal(await page.evaluate(()=>state.xp),0);assert.equal(await page.locator('.owner-notification-badge').count(),0);await page.evaluate(()=>NEAccess.install());assert.equal(await page.evaluate(()=>qaPrompts),1);
 await page.evaluate(()=>{state.xp=77;saveState();navigate('settings')});assert.equal(await page.getByRole('button',{name:/Доступ и учётная запись/}).count(),1);
 await page.getByRole('button',{name:/Оценить приложение и предложить идею/}).click();await page.waitForSelector('#feedbackForm');await page.getByRole('radio',{name:'5 из 5'}).click();await page.locator('#feedbackComment').fill('<img src=x onerror=alert(1)> Отлично');await page.locator('#feedbackSuggestion').fill('Добавить больше историй');await page.locator('#feedbackForm button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#feedbackMessage').textContent.includes('сохранена'));assert.equal(await page.locator('#feedbackComment').inputValue(),'');

 await admin.evaluate(()=>NEOwnerBadge.refresh());await admin.waitForFunction(()=>document.querySelector('.owner-notification-badge')?.textContent==='1');await admin.getByRole('button',{name:'Ещё',exact:true}).click();await admin.waitForSelector('#feedbackList');
 await admin.waitForFunction(()=>document.querySelector('#feedbackList').textContent.includes('Добавить больше историй'));await admin.waitForFunction(()=>!document.querySelector('.owner-notification-badge'));assert.equal(await admin.locator('#feedbackList img').count(),0);assert(await admin.locator('#feedbackList').textContent().then(t=>t.includes('<img src=x onerror=alert(1)> Отлично')));
 await admin.locator('.admin-promo-form input').nth(0).fill('TEST30');await admin.locator('.admin-promo-form input').nth(1).fill('30');await admin.locator('.admin-promo-form input').nth(2).fill('2');await admin.getByRole('button',{name:'Создать промокод',exact:true}).click();await admin.waitForFunction(()=>document.body.textContent.includes('TEST30'));assert.equal(promos.length,1);

 await admin.getByRole('button',{name:'Пользователи',exact:true}).click();await admin.waitForSelector('.admin-user-row');await admin.getByRole('button',{name:'Открыть',exact:true}).click();
 const beforeFree=new Date(freeUntil).getTime();await admin.getByRole('button',{name:'+7 дней бесплатно',exact:true}).click();await admin.waitForFunction(()=>document.body.textContent.includes('Бесплатный доступ до'));assert(new Date(freeUntil).getTime()>beforeFree);

 await admin.getByRole('button',{name:'Отозвать доступ',exact:true}).click();await admin.waitForFunction(()=>document.body.textContent.includes('Отозван'));
 await page.evaluate(()=>NEAccess.status());await page.waitForFunction(()=>document.querySelector('#accessGate h1').textContent.includes('отозван'));assert.equal(await page.locator('#app').isVisible(),false);

 await page.locator('#accessLogout').click();await page.waitForSelector('#accessLogin');await login(page,'owner@example.com');await page.waitForFunction(()=>window.NEAccess?.ready());assert.equal(await page.evaluate(()=>state.xp),0);await page.evaluate(()=>NEAccess.panel());await page.waitForSelector('.admin-shell');await page.getByRole('button',{name:'Выйти',exact:true}).click();await page.waitForSelector('#accessLogin');await login(page,'student@example.com');await page.waitForFunction(()=>document.querySelector('#accessGate h1').textContent.includes('отозван'));

 await admin.getByRole('button',{name:'Пользователи',exact:true}).click();await admin.waitForSelector('.admin-user-row');await admin.getByRole('button',{name:'Открыть',exact:true}).click();await admin.getByRole('button',{name:'Одобрить аккаунт',exact:true}).click();await admin.waitForFunction(()=>document.body.textContent.includes('Одобрен'));await page.locator('#accessCheck').click();await page.waitForFunction(()=>window.NEAccess?.ready());assert.equal(await page.evaluate(()=>state.xp),77);

 for(const target of [page,admin])assert(!await target.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2));
 assert.deepEqual(errors,[]);
 await browser.close();server.close();
 console.log('PASS browser access: ready-to-pay bonus after owner approval, repeatable owner free access, promo admin, revocation, recovery, feedback and separated progress');
})().catch(e=>{console.error(e);server.close();process.exit(1)});
