'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');
const config = require('../vercel.json');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eventyr-preview-'));
const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.webp':'image/webp'};
const apiCalls = [];

async function run() {
  execFileSync(process.execPath, [path.resolve(__dirname, '../tools/build-isolated-preview.cjs'), tmp]);
  const output = path.join(tmp, '.vercel/output');
  const root = path.join(output, 'static');
  assert.equal(config.git.deploymentEnabled['test/norsk-eventyr-9-1'], false);
  assert.equal(config.buildCommand, undefined);
  assert(config.routes.some(route => route.src === '/api(?:/.*)?' && route.status === 404));
  assert(!fs.existsSync(path.join(output, 'functions')));
  assert(!fs.existsSync(path.join(root, 'api')));
  const server = http.createServer((req,res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) apiCalls.push(url.pathname);
    const file = path.join(root, url.pathname === '/' ? 'index.html' : url.pathname);
    for (const [key,value] of Object.entries(config.routes[0].headers)) res.setHeader(key,value);
    try {
      const content = fs.readFileSync(file);
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
      res.end(content);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser = await chromium.launch({executablePath:process.env.NE_CHROMIUM_PATH, args:['--no-sandbox']});
    const origin = 'http://127.0.0.1:'+server.address().port;
    const external = [];
    for (const [width,level] of [[320,'A1'],[390,'A2'],[768,'B1'],[390,'B2']]) {
      const page = await browser.newPage({viewport:{width,height:844},serviceWorkers:'block'});
      page.on('request',request=>{if(!request.url().startsWith(origin+'/'))external.push(request.url())});
      await page.goto(origin);
      await page.locator('#eventyr-first-title').waitFor();
      assert.equal(await page.locator('#accessLogin').count(),0);
      assert(await page.locator('#demoLevels .ne-course-tutor-figure').isVisible());
      assert.equal(await page.locator('#demoLevels .ne-course-tutor-figure').evaluate(el=>getComputedStyle(el).animationName),'ne-tutor-idle');
      if (level === 'A1') {
        await page.getByRole('button',{name:'Проверить стартовый уровень'}).click();
        await page.getByRole('button',{name:'Начать скрининг'}).click();
        await page.locator('#placementUnknown').waitFor();
        await page.evaluate(()=>navigate('course','A1'));
      } else {
        await page.getByRole('button',{name:'Начать с A1'}).click();
      }
      await page.locator('.level-tabs-v7').getByRole('button',{name:level,exact:true}).click();
      assert.equal(await page.locator('.eventyr-trail > li').count(),8);
      await page.emulateMedia({reducedMotion:'reduce'});
      assert.equal(await page.locator('.eventyr-map').evaluate(el=>getComputedStyle(el).animationName),'none');
      await page.getByRole('button',{name:'Демо '+level,exact:true}).click();
      const lesson = page.locator('#demoLesson');
      await lesson.getByRole('heading',{name:new RegExp('^Демо '+level)}).waitFor();
      const answers = await page.evaluate(level=>{
        const l=NECurated.get(NECurriculum.modules(level)[0].id);
        return [l.correct,...(l.grammarOpts?.[l.grammarCorrect]!==undefined?[l.grammarCorrect]:[])];
      },level);
      for (const answer of answers) {
        await lesson.locator('[data-demo-answer="'+answer+'"]').click();
        await lesson.getByRole('button',{name:'Далее',exact:true}).click();
      }
      await lesson.getByText(/Демо-урок завершён/).waitFor();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
      await page.reload();
      await page.getByRole('button',{name:'Демо '+level,exact:true}).click();
      await lesson.getByText(/Демо-урок завершён/).waitFor();
      assert.equal(await page.evaluate(async()=>(await fetch('/api/cloud',{method:'POST',body:'{}'})).status),503);
      await page.close();
    }
    assert.deepEqual(external,[]);
    assert.deepEqual(apiCalls,[]);
    assert.equal((await fetch(origin+'/api/cloud',{method:'POST'})).status,404);
    console.log('PASS isolated A1–B2 demos, mobile, Nora, initial diagnostic, progress reload and no API traffic');
  } finally {
    await browser?.close();
    server.close();
  }
}
run().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>fs.rmSync(tmp,{recursive:true,force:true}));
