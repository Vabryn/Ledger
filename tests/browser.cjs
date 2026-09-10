const puppeteer = require('puppeteer');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const KEY = 'ledger_v2_planner_state';
const src = fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const sampleFactory = src.slice(src.indexOf('function getDefaultSampleState()'), src.indexOf('function getCleanEmptyState('));
const sample = Function(`${sampleFactory}; return getDefaultSampleState();`)();
const server = http.createServer((req,res) => {
  const file = new URL(req.url,'http://localhost').pathname.replace(/^\//,'') || 'index.html';
  if (!['index.html','js/app.js','js/tax_data.js','css/style.css'].includes(file)) {res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');
  res.end(fs.readFileSync(path.join(root,file)));
});
const tests=[];
function test(name, fn, fresh=false) { tests.push([name,fn,fresh]); }
const state = page => page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function fill(page, selector, value) {
  await page.$eval(selector,e=>{e.focus();e.select();});
  await page.keyboard.type(String(value),{delay:10});
}
async function tab(page,name) {
  if (page.viewport().width <= 640) await page.select('#phoneSection',name);
  else await page.click(`#sectionTabs [data-tab="${name}"]`);
}
const visible = (page,selector) => page.$eval(selector,e=>e.getClientRects().length>0 && getComputedStyle(e).display!=='none');

test('A first visit loads a usable blank plan', async p=>{
  const viewport=await p.$eval('meta[name="viewport"]',e=>e.content);
  assert.ok(!/maximum-scale=1|user-scalable=no/.test(viewport),'Phone zoom must remain available');
  assert.equal(await visible(p,'#setupGuide'),true);
  assert.equal(await p.$eval('#hudGrossVal',e=>e.textContent),'$0');
  await p.click('[data-action="setup-step"][data-tab="income"]');
  assert.equal(await visible(p,'#workersTable'),true);
},true);
test('Forecast length is actually hidden in one-year mode', async p=>{
  assert.equal(await p.$eval('#horizonStepperWrapper',e=>getComputedStyle(e).display),'none');
});
test('Older saved plans missing newer fields still load', async p=>{
  const old={...sample}; delete old.employerMatchRate;delete old.customSavings;delete old.collapsedExpenseCats;
  await p.evaluate((key,s)=>localStorage.setItem(key,JSON.stringify(s)),KEY,old);
  await p.reload();await tab(p,'retire');assert.equal(await visible(p,'#retireInputsTable'),true);
});
test('Typing then clicking the next field does not swallow the click', async p=>{
  await tab(p,'income');await fill(p,'[data-action="worker-wage"]','85.50');
  await p.click('[data-action="worker-name"]');
  assert.equal(await p.evaluate(()=>document.activeElement.dataset.action),'worker-name');
  await fill(p,'[data-action="worker-name"]','My job');await p.reload();
  const s=await state(p);assert.equal(s.workers[0].wage[0],85.5);assert.equal(s.workers[0].name,'My job');
});
test('Editing hours preserves later years and permits zero hours', async p=>{
  await p.evaluate(()=>setPlannerMode('multi'));await tab(p,'income');const prior=await state(p);
  await fill(p,'[data-action="worker-default-hours"]','0');await p.evaluate(()=>setPlannerMode('single'));
  await p.reload();await p.evaluate(()=>setPlannerMode('multi'));
  const s=await state(p);assert.equal(s.workers[0].hours[0],0);assert.deepEqual(s.workers[0].hours.slice(1),prior.workers[0].hours.slice(1));
});
test('Each forecast year has independently editable hours',async p=>{
  await p.evaluate(()=>setPlannerMode('multi'));await tab(p,'income');
  await fill(p,'[data-action="worker-default-hours"][data-year="2"]','30');
  const s=await state(p);assert.equal(s.workers[0].hours[2],30);assert.equal(s.workers[0].hours[0],40);
});
test('Expense edits preserve future years and typing focus',async p=>{
  await tab(p,'expenses');const prior=await state(p);
  await fill(p,'[data-action="col-monthly"]','2500');
  assert.equal(await p.evaluate(()=>document.activeElement.dataset.action),'col-monthly');
  await p.reload();const s=await state(p);
  assert.equal(s.col[0].monthly[0],2500);assert.deepEqual(s.col[0].monthly.slice(1),prior.col[0].monthly.slice(1));
});
test('Negative deductions stay clamped after blur',async p=>{
  await tab(p,'taxes');await fill(p,'[data-action="tax-deps"]','-3');await p.keyboard.press('Tab');
  await fill(p,'[data-action="tax-ded"]','-500');await p.keyboard.press('Tab');
  const s=await state(p);assert.equal(s.deps[0],0);assert.equal(s.additionalDeductions[0],0);
});
test('Retirement rates entered before income are retained',async p=>{
  await p.evaluate(()=>resetData());await tab(p,'retire');await fill(p,'[data-action="k401-rate"]','10.5');
  await tab(p,'income');await fill(p,'[data-action="worker-wage"]','50');
  const s=await state(p);assert.equal(s.k401Rate[0],10.5);
  const c=await p.evaluate(s=>computePlanner(s),s);assert.equal(c.k401Arr[0],10920);
});
test('Adding an earner, income source or goal adds no money',async p=>{
  const before=await p.evaluate(s=>computePlanner(s),await state(p));
  await p.evaluate(()=>{addWorker();addOtherIncome();addSavingsFund();});
  const after=await p.evaluate(s=>computePlanner(s),await state(p));
  assert.deepEqual(after.g,before.g);assert.deepEqual(after.unallocatedBalance,before.unallocatedBalance);
});
test('Forecast URL recalculates all years before rendering',async(p,url)=>{
  await p.goto(url+'?mode=multi');
  const rows=await p.$$eval('#summaryMatrixTable tbody tr',rs=>rs.map(r=>[...r.querySelectorAll('td')].map(c=>c.textContent)));
  assert.equal(rows[0].length,7);assert.equal(rows[0][1],rows[0][2]);assert.notEqual(rows[0][2],'$0');
});
test('Forecast panel returns to Overview when switching to one year',async p=>{
  await p.evaluate(()=>setPlannerMode('multi'));await tab(p,'visualizer');await p.evaluate(()=>setPlannerMode('single'));
  assert.equal(await visible(p,'#panelOverview'),true);assert.equal(await visible(p,'#panelVisualizer'),false);
});
test('Reset cancellation preserves plan; undo survives reload and restores tab',async p=>{
  await tab(p,'income');const before=await state(p);
  p.once('dialog',d=>d.dismiss());await p.click('#btnClearState');assert.deepEqual(await state(p),before);
  p.once('dialog',d=>d.accept());await p.click('#btnClearState');assert.equal(await visible(p,'#panelOverview'),true);
  // After a reload the recovery affordance is the toolbar chip, not the banner:
  // the banner auto-dismisses so it cannot cost a block of screen on every visit.
  await p.reload();assert.equal(await visible(p,'#planChangeToast'),false,'no banner on a return visit');
  assert.equal(await visible(p,'#btnRestorePlanInline'),true,'recovery stays reachable as a chip');
  await p.click('#btnRestorePlanInline');assert.deepEqual((await state(p)).workers,before.workers);assert.equal(await visible(p,'#panelIncome'),true);
});
test('The plan-change banner auto-dismisses and hands recovery to the toolbar chip',async p=>{
  const before=await state(p);
  p.once('dialog',d=>d.accept());          // Sample confirms before replacing the plan
  await p.click('#btnSampleState');
  assert.equal(await visible(p,'#planChangeToast'),true,'banner appears on the change');
  assert.equal(await visible(p,'#btnRestorePlanInline'),false,'chip stays out of the way while the banner is up');
  await new Promise(r=>setTimeout(r,10600));
  assert.equal(await visible(p,'#planChangeToast'),false,'banner clears itself');
  assert.equal(await visible(p,'#btnRestorePlanInline'),true,'chip takes over so undo is never lost');
  await p.click('#btnRestorePlanInline');
  assert.deepEqual((await state(p)).workers,before.workers,'the chip restores the same plan the banner would have');
  assert.equal(await visible(p,'#btnRestorePlanInline'),false,'chip clears once the backup is used');
});
test('Storage failure is visible and undo works in memory',async p=>{
  await p.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('Storage blocked for test')};resetData();});
  assert.equal(await visible(p,'#storageNotice'),true);await p.click('#btnUndoPlanChange');
  assert.equal(await p.$eval('#hudGrossVal',e=>e.textContent),'$137,000');
});
test('Category headers work with keyboard and report expanded state',async p=>{
  await tab(p,'expenses');await p.focus('[data-action="toggle-cat-card"]');
  const before=await p.$eval('[data-action="toggle-cat-card"]',e=>e.getAttribute('aria-expanded'));await p.keyboard.press('Enter');
  assert.equal(await p.$eval('[data-action="toggle-cat-card"]',e=>e.getAttribute('aria-expanded')),before==='true'?'false':'true');
});
test('Chart legend preferences survive reload',async p=>{
  await p.click('[data-action="toggle-series"][data-series="gross"]');await p.reload();assert.equal((await state(p)).chartSeries.gross,false);
});
test('Cash flow and asset totals conserve money without double counting goals',async p=>{
  const s=await state(p);s.years=1;s.startingCash=12000;s.startingRetirement=10000;s.retirementReturnRate=10;
  const c=await p.evaluate(s=>computePlanner(s),s);
  const cash=12000+c.g[0]-c.totalTax[0]-c.employeeRetireContrib[0]-c.colOnly[0];
  assert.ok(Math.abs(cash-c.savingsOT[0])<0.00001);
  const assets=12000+11000+c.g[0]-c.totalTax[0]-c.colOnly[0]+c.employerMatchAmount[0];
  assert.ok(Math.abs(assets-c.savingsOT[0]-c.retireOT[0])<0.00001);assert.equal(c.unallocatedBalance[0],c.savings[0]-c.customSavingsTotal[0]);
});
test('Expense distribution updates immediately with the edited amount',async p=>{
  await tab(p,'expenses');await fill(p,'[data-action="col-monthly"]','0');
  assert.equal(await p.$('#spendDistributionBar [data-cat="Housing"]'),null);
  assert.equal(await p.$eval('.category-card[data-cat="Housing"] .category-meta-badge',e=>e.textContent.includes('0%')),true);
});
test('Phone users can add an expense and edit the last forecast year',async p=>{
  await p.setViewport({width:320,height:850,isMobile:true,hasTouch:true});
  await tab(p,'expenses');await p.click('[data-action="show-inline-add"][data-cat="Housing"]');
  await fill(p,'#newExpName_Housing','Repairs');await fill(p,'#newExpCost_Housing','123');
  await p.click('[data-action="submit-inline-add"][data-cat="Housing"]');
  assert.equal((await state(p)).col.at(-1).monthly[0],123);
  await p.evaluate(()=>{setPlannerMode('multi');while(document.querySelectorAll('#workersTable .year-col-hdr').length<10)stepYears(1);});
  await tab(p,'income');
  const selector='[data-action="worker-wage"][data-year="9"]';
  await p.select('#phoneYear','9');
  await p.$eval(selector,e=>e.scrollIntoView({block:'center',inline:'center'}));
  await p.click(selector);await fill(p,selector,'125');await p.reload();
  assert.equal((await state(p)).workers[0].wage[9],125);
});
test('A negative monthly balance is marked as a shortfall',async p=>{
  await tab(p,'expenses');await fill(p,'[data-action="col-monthly"]','99999');
  assert.equal(await p.$eval('#hudSavingsVal',e=>e.classList.contains('is-shortfall')),true);
});
test('Valid exponent notation is saved as the entered amount',async p=>{
  await tab(p,'income');await fill(p,'[data-action="other-amount"]','1e3');await p.keyboard.press('Tab');
  assert.equal((await state(p)).other[0].amount[0],1000);
});
test('One-year phone editing controls fit without horizontal clipping',async p=>{
  await p.setViewport({width:320,height:850,isMobile:true,hasTouch:true});
  assert.equal(await visible(p,'#btnSampleState span'),true);
  assert.equal(await visible(p,'#btnClearState span'),true);
  for (const name of ['income','taxes','retire']) {
    await tab(p,name);
    const clipped=await p.$$eval('.tab-panel.active input, .tab-panel.active select',els=>els.filter(e=>{
      if (!e.getClientRects().length) return false;
      const box=e.getBoundingClientRect();const container=e.closest('.table-scroll-container')?.getBoundingClientRect();
      return box.left<0 || box.right>innerWidth || (container && (box.left<container.left || box.right>container.right));
    }).map(e=>e.dataset.action||e.id));
    assert.deepEqual(clipped,[],name);
  }
});
test('All panels fit desktop and phone widths, both themes and modes',async p=>{
  for (const width of [320,390,768,1024,1440]) {
    await p.setViewport({width,height:900,isMobile:width<500,hasTouch:width<500});
    for (const mode of ['single','multi']) for (const theme of ['light','dark']) {
      await p.evaluate((mode,theme)=>{setPlannerMode(mode);if(document.documentElement.dataset.theme!==theme)toggleDarkMode();},mode,theme);
      for (const name of ['overview','income','expenses','taxes','retire',...(mode==='multi'?['visualizer']:[])]) {
        await tab(p,name);
        const layout=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,panels:document.querySelectorAll('.tab-panel.active').length}));
        assert.ok(layout.scroll<=layout.width+1,JSON.stringify({width,mode,theme,name,layout}));assert.equal(layout.panels,1);
      }
    }
  }
});

test('Plan settings stay out of the workspace and remain keyboard accessible',async p=>{
  for(const width of [320,1440]) {
    await p.setViewport({width,height:900,isMobile:width<500,hasTouch:width<500});
    assert.equal(await p.$eval('#planningPeriod',e=>e.open),false,'Settings start closed');
    await p.click('#planningPeriod summary');
    await p.click('#btnModeMultiYear');
    await p.click('#btnAddYear');
    const years=(await state(p)).years;
    await p.click('#btnFinishPeriod');
    assert.equal(await p.evaluate(()=>document.activeElement.parentElement.id),'planningPeriod');
    await p.keyboard.press('Enter');await p.keyboard.press('Escape');
    assert.equal(await p.$eval('#planningPeriod',e=>e.open),false,'Escape closes settings');
    await p.click('#modelDetails summary');
    assert.equal(await visible(p,'.model-description'),true);
    await p.click('.masthead-brand');
    assert.equal(await p.$eval('#modelDetails',e=>e.open),false,'An outside click closes assumptions');
    await p.reload();assert.equal((await state(p)).years,years);
  }
});
test('The overview workspace is visible without scrolling past settings and notices',async p=>{
  for(const width of [320,390,768,1024,1440]) {
    await p.setViewport({width,height:900,isMobile:width<500,hasTouch:width<500});
    await p.evaluate(()=>{setPlannerMode('multi');scrollTo(0,0);});
    const top=await p.$eval('#panelOverview',e=>e.getBoundingClientRect().top);
    assert.ok(top<(width<=640?550:400),`${width}px viewport: workspace starts at ${top}px`);
  }
});

test('Phone tax and expense edits affect only the explicitly selected year',async p=>{
  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  await p.evaluate(()=>setPlannerMode('multi'));await tab(p,'taxes');await p.select('#phoneYear','1');
  assert.equal(await visible(p,'[data-action="tax-st"][data-year="0"]'),false);
  assert.equal(await visible(p,'[data-action="tax-st"][data-year="1"]'),true);
  await p.select('[data-action="tax-st"][data-year="1"]','NY');
  await fill(p,'[data-action="tax-deps"][data-year="1"]','2');
  await tab(p,'expenses');const before=await state(p);
  await fill(p,'[data-action="col-monthly"][data-year="1"]','2345');
  await p.reload();const after=await state(p);
  assert.equal(after.st[1],'NY');assert.equal(after.deps[1],2);
  assert.equal(after.col[0].monthly[1],2345);assert.equal(after.col[0].monthly[0],before.col[0].monthly[0]);
  assert.equal(await p.$eval('#phoneYear',e=>e.value),'1');
  await tab(p,'taxes');
  assert.ok(await p.$eval('#selTaxStatus',e=>e.getBoundingClientRect().top)<400,'First tax input is in the initial phone viewport');
  assert.equal(await visible(p,'#taxInputsTable thead'),false);
  await p.click('#phonePrevYear');assert.equal(await p.$eval('#phoneYear',e=>e.value),'0');
  assert.equal(await p.$eval('#phonePrevYear',e=>e.disabled),true);
  await p.setViewport({width:1440,height:900});await new Promise(r=>setTimeout(r,150));
  assert.equal(await visible(p,'[data-action="tax-st"][data-year="0"]'),true);
  assert.equal(await visible(p,'[data-action="tax-st"][data-year="1"]'),true);
});
test('Federal 2025 standard deductions and child credit match IRS examples',async p=>{
  const base={...await state(p),years:1,other:[],k401Rate:[0],rothRate:[0],employerMatchRate:[0],deps:[0],additionalDeductions:[0],st:['NONE'],fica:false};
  for(const [status,deduction] of [['Single',15750],['Married',31500],['HeadOfHousehold',23625],['MarriedSeparate',15750]]) {
    const s={...base,taxStatus:status,workers:[{frequency:'Annually',wage:[deduction+1000]}]};
    const c=await p.evaluate(s=>computePlanner(s),s);assert.equal(c.fed[0],100,status);
  }
  const c=await p.evaluate(s=>computePlanner(s),{...base,taxStatus:'Single',deps:[1],workers:[{frequency:'Annually',wage:[50000]}]});
  assert.equal(c.fed[0],1671.5);
});
test('California 2025 schedule example and Roth adjusted-income eligibility',async p=>{
  const base={...await state(p),years:1,other:[],k401Rate:[0],rothRate:[0],employerMatchRate:[0],deps:[0],additionalDeductions:[0],st:['CA'],fica:false};
  const ca=await p.evaluate(s=>computePlanner(s),{...base,taxStatus:'Married',workers:[{frequency:'Annually',wage:[136412]}]});
  assert.ok(Math.abs(ca.stTax[0]-4462.1)<.02,'FTB $125,000 taxable joint example, less $306 personal credits');
  const roth=await p.evaluate(s=>computePlanner(s),{...base,taxStatus:'Single',k401Rate:[10],rothRate:[10],workers:[{frequency:'Annually',wage:[160000]}]});
  assert.equal(roth.rothArr[0],7000,'Traditional 401(k) reduces modeled modified AGI');
});

(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=process.env.LEDGER_URL || `http://127.0.0.1:${server.address().port}/`;
 const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});let failed=0;
 try {
 for (const [name,fn,fresh] of tests) {
   const context=await browser.createBrowserContext();const p=await context.newPage();const errors=[];
   p.on('pageerror',e=>errors.push(e.message));await p.setViewport({width:1440,height:950});
   await p.setRequestInterception(true);
   p.on('request',r=>r.url().startsWith(url)||r.url().startsWith('data:')?r.continue():r.abort());
   try {
     if (!fresh) await p.evaluateOnNewDocument((key,s)=>{if(!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify(s));},KEY,sample);
     await p.goto(url,{waitUntil:'domcontentloaded'});await fn(p,url);assert.deepEqual(errors,[],'Uncaught browser errors');console.log('PASS',name);
   } catch(e) {failed++;console.log('FAIL',name,'\n ',e.message);}
   await context.close();
 }
 }finally{await browser.close();server.close();}
 console.log(`${tests.length-failed}/${tests.length} passed`);process.exitCode=failed?1:0;
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
