'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');

const root = path.resolve(__dirname,'..');
const requests = [];
const server = http.createServer(async (req,res)=>{
  const url = new URL(req.url,'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    requests.push(url.pathname);
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw||'{}');
    res.setHeader('Content-Type','application/json');
    if (url.pathname==='/api/session' && body.action==='status') {
      return res.end(JSON.stringify({status:'free',access_granted:true,owner:false,
        accepted_privacy_version:'2026-10-08-v4',user_id:'11111111-1111-4111-8111-111111111111'}));
    }
    if (url.pathname==='/api/session' && !body.action) return res.end(JSON.stringify({token:'qa'}));
    res.writeHead(503).end(JSON.stringify({error:'AI_NOT_CONFIGURED'}));
    return;
  }
  const file = path.join(root,url.pathname==='/'?'index.html':url.pathname);
  try {
    const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg'};
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
    res.end(fs.readFileSync(file));
  } catch { res.writeHead(404).end(); }
});

async function run() {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser = await chromium.launch({executablePath:process.env.NE_CHROMIUM_PATH,args:[
    '--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'
  ]});
  try {
    const origin = 'http://127.0.0.1:'+server.address().port;
    const page = await browser.newPage({viewport:{width:320,height:720},serviceWorkers:'block'});
    await page.context().grantPermissions(['microphone']);
    const errors=[], external=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request', r=>{ if (!r.url().startsWith(origin+'/')&&!r.url().startsWith('blob:')) external.push(r.url()); });
    async function map() {
      await page.goto(origin);
      await page.waitForFunction(()=>window.NEAccess?.ready());
      const begin = page.getByRole('button',{name:'Начать с A1',exact:true});
      if (await begin.isVisible()) await begin.click();
      else await page.evaluate(()=>navigate('course','A1'));
      await page.locator('.eventyr-map').waitFor();
    }
    await map();
    const moduleCounts = await page.evaluate(()=>['A1','A2','B1','B2'].map(level=>NECurriculum.modules(level).length));
    assert.deepEqual(moduleCounts,[8,8,8,8]);
    await page.locator('.eventyr-node').first().click();
    const modal = page.getByRole('dialog');
    const button = (name) => modal.getByRole('button',{name,exact:true});
    const press = name => button(name).click();
    const check = () => press('Проверить');
    const next = () => press('Дальше');
    const hasText = text => modal.getByText(text,{exact:true}).waitFor();
    const choose = async (name) => {await press(name);await check();await hasText('Правильно!');await next();};
    const fill = text => modal.locator('input').fill(text);

    for (const text of ['Привет','зовусь / зовёшься','имя','прихожу / родом','приятно']) await hasText(text);
    const playback = page.waitForResponse(r=>r.url().endsWith('/audio/introductions/hei.mp3')&&r.ok());
    await press('▶ Слушать Hei');
    assert((await playback).ok());
    await page.waitForFunction(()=>document.querySelector('.ne-intro-listen').getAttribute('aria-pressed')==='false');
    await press('Начать задания');
    assert(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth+1 && el.getBoundingClientRect().right<=innerWidth));
    await press('Карта');
    await check();
    await hasText('Попробуем ещё');
    await hasText('et navn — имя');
    await next();
    await press('Hei');await press('Привет');
    await press('heter');await press('приятно');
    await hasText('Эти слова не образуют пару. Попробуй ещё раз.');
    await press('зовусь / зовёшься');
    await press('hyggelig');await press('приятно');await check();await next();
    await choose('Hei! Jeg heter Nora.');
    await press('Hva');await press('heter');await press('du');await check();await next();
    await choose('Я из Норвегии.');
    await fill('JEG heter');
    await press('Выйти к карте');
    await modal.waitFor({state:'hidden'});
    await map();
    await page.setViewportSize({width:390,height:844});
    await page.locator('.eventyr-node').filter({hasText:'Продолжить знакомство'}).click();
    assert.equal(await modal.locator('input').inputValue(),'JEG heter');
    assert(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth+1 && el.getBoundingClientRect().right<=innerWidth));
    await fill('JEG heter Nora!');await check();await next();
    await choose('Взмах рукой');
    await choose('Приятно познакомиться!');
    for (const word of ['Jeg','kommer','fra','Norge']) await press(word);
    await check();await next();
    await fill('Hva heter du?');await check();await next();
    await press('● Запись / стоп');
    await modal.getByText(/Идёт запись/).waitFor();
    await page.waitForTimeout(350);
    await press('● Запись / стоп');
    await button('▶ Моя запись').waitFor();
    await press('▶ Моя запись');
    await fill('Jeg heter Ingrid.');await check();await next();
    await hasText('A1 · Повтор ошибок');
    await choose('Именная карточка');
    await press('Hei');await press('Привет');
    await press('heter');await press('зовусь / зовёшься');
    await press('hyggelig');await press('приятно');await check();await next();
    await hasText('Знакомство завершено!');
    await hasText('Значок «Первая встреча»');
    const xp = await page.evaluate(()=>state.xp);
    assert(xp>0);
    assert.deepEqual(await page.evaluate(()=>[state.level,!!state.completed['a1-1']]),['A1',false]);
    for (const width of [320,390,1280]) {
      await page.setViewportSize({width,height:720});
      assert(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth+1 && el.getBoundingClientRect().right<=innerWidth));
      assert(await modal.evaluate(el=>el.matches(':modal')));
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await modal.locator('.ne-intro-nora').evaluate(el=>getComputedStyle(el).animationName),'none');
    await map();
    await page.locator('.eventyr-node').first().click();
    await hasText('Знакомство завершено!');
    assert.equal(await page.evaluate(()=>state.xp),xp,'Reload must not award XP twice');
    assert.deepEqual(requests.filter(route=>['/api/evaluate','/api/speech','/api/transcribe','/api/pronounce','/api/chat'].includes(route)),[]);
    assert.deepEqual(errors,[]);
    assert.deepEqual(external,[]);
    console.log('PASS Introductions: 12 stages, audio/recording, wrong answers and review, reload, XP, mock Auth, 32 modules, 320/390/1280px');
  } finally {
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
