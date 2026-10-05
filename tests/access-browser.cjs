const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),ownerId='11111111-1111-4111-8111-111111111111',studentId='22222222-2222-4222-8222-222222222222';let status='expired',name='',feedback=[];
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/api/session'){
  let raw='';for await(const chunk of req)raw+=chunk;const b=JSON.parse(raw||'{}'),user=/user=(owner|student)/.exec(req.headers.cookie||'')?.[1];res.setHeader('Content-Type','application/json');let out={ok:true};
  if(b.action==='login'){res.setHeader('Set-Cookie','user='+(b.email.startsWith('owner')?'owner':'student')+'; Path=/');}
  else if(b.action==='register')out={confirmEmail:true};
  else if(b.action==='logout')res.setHeader('Set-Cookie','user=; Path=/; Max-Age=0');
  else if(b.action==='growth_first_visit')out={ok:true};
  else if(!user){res.statusCode=401;out={error:'LOGIN_REQUIRED'}}
  else if(b.action==='status'){
   const owner=user==='owner',approved=owner||status==='approved';
   out={status:owner?'approved':status,request_status:owner?'approved':(status==='expired'?'unrequested':status),access_granted:approved,owner,user_id:owner?ownerId:studentId,email:user+'@example.com',privacy_version:'2026-10-05-v3',accepted_privacy_version:'2026-10-05-v3'};
  }
  else if(b.action==='request'){status='pending';name=b.name}
  else if(b.action==='growth_activity'||b.action==='install_seen'||b.action==='lifecycle_touch')out={ok:true};
  else if(b.action==='feedback_submit'){feedback.push({id:String(feedback.length+1).padStart(36,'1'),email:user+'@example.com',rating:b.rating,comment:b.comment,suggestion:b.suggestion,is_public:true,created_at:new Date().toISOString()})}
  else if(b.action==='feedback_list')out={feedback:{items:feedback,count:feedback.length,average:feedback.length?feedback.reduce((sum,x)=>sum+x.rating,0)/feedback.length:0}}
  else if(b.action==='feedback_moderate')out={ok:true};
  else if(b.action==='list')out={requests:[{user_id:studentId,display_name:name,email:'student@example.com',status,trial_started_at:'2026-09-25T00:00:00Z',trial_ends_at:'2026-09-30T00:00:00Z',activity_days_count:3,acquisition_source:'direct',subscription_status:'inactive'}]};
  else if(b.action==='decide'){status=b.status}
  else if(b.action==='owner_admin_overview')out={overview:{users:1,confirmed:1,active_trials:0,expired_trials:1,purchase_interest:0,active_paid:0,past_due:0,revenue_30d:0,fees_30d:0,failed_payments_7d:0,renewals_7d:0,errors_24h:0}};
  else if(b.action==='owner_growth')out={growth:{stages:{first_visits:1,registered:1,confirmed:1,trial_started:1,installed:0,active_3_days:1,trial_finished:1,purchase_interest:0,paid:0},sources:[{source:'direct',registered:1,trial_started:1,active_3_days:1,purchase_interest:0,paid:0}]}};
  else if(b.action==='owner_events')out={events:[]};
  else if(b.action==='owner_payments')out={payments:[]};
  else if(b.action==='owner_user_detail')out={detail:{profile:{user_id:studentId,email:'student@example.com',display_name:name,access_status:status,trial_started_at:'2026-09-25T00:00:00Z',trial_ends_at:'2026-09-30T00:00:00Z',activity_days_count:3,acquisition_source:'direct',subscription_status:'inactive',cancel_at_period_end:false},timeline:[],payments:[]}};
  else if(b.action==='owner_errors')out={errors:[]};
  else if(b.action==='owner_backup')out={backup:{format:'norsk-eventyr-backup-v3'}};
  return res.end(JSON.stringify(out));
 }
 if(pathname.startsWith('/api/')){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({token:'qa'}))}
 try{const file=path.join(root,pathname==='/'?'index.html':pathname);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end('missing')}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.NE_CHROMIUM_PATH,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});const origin='http://127.0.0.1:'+server.address().port,context=await browser.newContext({serviceWorkers:'block',viewport:{width:360,height:800}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.waitForSelector('#accessLogin');assert.equal(await page.evaluate(()=>typeof state),'undefined');assert.equal(await page.locator('#app').isVisible(),false);
 async function login(target,email){await target.locator('#accessEmail').fill(email);await target.locator('#accessPassword').fill('qa-password-123');await target.locator('#accessLogin button').click()}
 await login(page,'student@example.com');await page.waitForSelector('#accessRequest');await page.locator('#accessName').fill('<img src=x onerror=alert(1)>');await page.locator('#accessRequest button').click();await page.waitForFunction(()=>document.querySelector('#accessGate h1').textContent.includes('ожидает'));assert.equal(await page.evaluate(()=>typeof state),'undefined');await page.evaluate(async()=>{window.qaPrompts=0;const event=new Event('beforeinstallprompt',{cancelable:true});event.prompt=async()=>{window.qaPrompts++};event.userChoice=Promise.resolve({outcome:'accepted'});dispatchEvent(event);await NEAccess.install()});assert.equal(await page.evaluate(()=>qaPrompts),0);

 const adminContext=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}}),admin=await adminContext.newPage();admin.on('pageerror',e=>errors.push('admin:'+e.message));await admin.goto(origin);await admin.waitForSelector('#accessLogin');await admin.evaluate(()=>localStorage.setItem('ne2_state',JSON.stringify({level:'A1',xp:123})));await login(admin,'owner@example.com');await admin.waitForFunction(()=>window.NEAccess?.ready());assert.equal(await admin.evaluate(()=>state.xp),123);await admin.waitForFunction(()=>document.querySelector('.owner-notification-badge')?.textContent==='1');assert.equal(await admin.getByRole('button',{name:/Панель владельца/}).count(),1);
 await admin.locator('.brand-v7').click();await admin.waitForSelector('.admin-shell');await admin.getByRole('button',{name:'Пользователи',exact:true}).click();await admin.waitForSelector('.admin-user-row');assert.equal(await admin.locator('.admin-user-row img').count(),0);await admin.getByRole('button',{name:'Открыть',exact:true}).click();await admin.waitForSelector('.admin-user-detail-head');await admin.getByRole('button',{name:'Одобрить',exact:true}).click();await admin.waitForFunction(()=>document.querySelector('.admin-user-detail-head')&&document.body.textContent.includes('Одобрен'));

 await page.locator('#accessCheck').click();await page.waitForFunction(()=>window.NEAccess?.ready());assert.equal(await page.evaluate(()=>state.xp),0);assert.equal(await page.locator('.owner-notification-badge').count(),0);await page.evaluate(()=>NEAccess.install());assert.equal(await page.evaluate(()=>qaPrompts),1);await page.evaluate(()=>{state.xp=77;saveState();navigate('settings')});assert.equal(await page.getByRole('button',{name:/Доступ и учётная запись/}).count(),1);
 await page.getByRole('button',{name:/Оценить приложение и предложить идею/}).click();await page.waitForSelector('#feedbackForm');await page.getByRole('radio',{name:'5 из 5'}).click();await page.locator('#feedbackComment').fill('<img src=x onerror=alert(1)> Отлично');await page.locator('#feedbackSuggestion').fill('Добавить больше историй');await page.locator('#feedbackForm button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#feedbackMessage').textContent.includes('сохранена'));assert.equal(await page.locator('#feedbackComment').inputValue(),'');
 await admin.evaluate(()=>NEOwnerBadge.refresh());await admin.waitForFunction(()=>document.querySelector('.owner-notification-badge')?.textContent==='1');await admin.getByRole('button',{name:'Ещё',exact:true}).click();await admin.waitForSelector('#feedbackList');await admin.waitForFunction(()=>document.querySelector('#feedbackList').textContent.includes('Добавить больше историй'));await admin.waitForFunction(()=>!document.querySelector('.owner-notification-badge'));assert.equal(await admin.locator('#feedbackList img').count(),0);assert(await admin.locator('#feedbackList').textContent().then(t=>t.includes('<img src=x onerror=alert(1)> Отлично')));

 await admin.getByRole('button',{name:'Пользователи',exact:true}).click();await admin.waitForSelector('.admin-user-row');await admin.getByRole('button',{name:'Открыть',exact:true}).click();await admin.getByRole('button',{name:'Отозвать доступ',exact:true}).click();await admin.waitForFunction(()=>document.body.textContent.includes('Отозван'));
 await page.evaluate(()=>NEAccess.status());await page.waitForFunction(()=>document.querySelector('#accessGate h1').textContent.includes('отозван'));assert.equal(await page.locator('#app').isVisible(),false);

 await page.locator('#accessLogout').click();await page.waitForSelector('#accessLogin');await login(page,'owner@example.com');await page.waitForFunction(()=>window.NEAccess?.ready());assert.equal(await page.evaluate(()=>state.xp),0);await page.evaluate(()=>NEAccess.panel());await page.waitForSelector('.admin-shell');await page.getByRole('button',{name:'Выйти',exact:true}).click();await page.waitForSelector('#accessLogin');await login(page,'student@example.com');await page.waitForFunction(()=>document.querySelector('#accessGate h1').textContent.includes('отозван'));

 await admin.getByRole('button',{name:'Пользователи',exact:true}).click();await admin.waitForSelector('.admin-user-row');await admin.getByRole('button',{name:'Открыть',exact:true}).click();await admin.getByRole('button',{name:'Одобрить',exact:true}).click();await admin.waitForFunction(()=>document.body.textContent.includes('Одобрен'));await page.locator('#accessCheck').click();await page.waitForFunction(()=>window.NEAccess?.ready());assert.equal(await page.evaluate(()=>state.xp),77);
 for(const target of [page,admin])assert(!await target.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2));
 assert.deepEqual(errors,[]);await browser.close();server.close();console.log('PASS browser access: request, 7.4 admin decisions, feedback, revocation, owner migration, separated progress and responsive dashboard');
})().catch(e=>{console.error(e);server.close();process.exit(1)});
