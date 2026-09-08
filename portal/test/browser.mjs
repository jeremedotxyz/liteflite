import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,channel:'chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await mkdir('work',{recursive:true});
try{
 await page.goto('http://127.0.0.1:8787/portal/login.html');await page.screenshot({path:'work/login-desktop.png'});
 await page.locator('#email').fill(process.env.TEST_EMAIL);await page.locator('#password').fill(process.env.TEST_PASSWORD);await page.locator('#sign-in').click();
 await page.locator('#viewer-state').filter({hasText:'MODEL READY'}).waitFor({timeout:30000});await page.waitForTimeout(1000);
 const pixels=()=>page.locator('canvas').evaluate(canvas=>{const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;const context=c.getContext('2d');context.drawImage(canvas,0,0);const data=context.getImageData(0,0,c.width,c.height).data;const colors=new Set();for(let i=0;i<data.length;i+=400)colors.add(data.slice(i,i+3).join(','));return {colors:colors.size,image:canvas.toDataURL()};});
 const first=await pixels();assert.ok(first.colors>20,'3D canvas should contain varied model pixels');await page.screenshot({path:'work/portal-desktop.png'});
 await page.locator('[data-view=top]').click();await page.waitForTimeout(600);assert.notEqual((await pixels()).image,first.image,'View controls must change rendering');
 await page.locator('#clip-axis').selectOption('x');await page.locator('#clip-position').fill('50');await page.waitForTimeout(300);assert.notEqual((await pixels()).image,first.image);
 await page.locator('#clip-axis').selectOption('none');await page.locator('#measure-toggle').click();const rect=await page.locator('canvas').boundingBox();await page.mouse.click(rect.x+rect.width*.45,rect.y+rect.height*.5);await page.mouse.click(rect.x+rect.width*.55,rect.y+rect.height*.5);assert.equal(await page.locator('#measurement-count').textContent(),'1');
 const downloadPromise=page.waitForEvent('download');await page.locator('#download-model').click();assert.equal((await downloadPromise).suggestedFilename(),'sample-warehouse.glb');
 await page.setViewportSize({width:390,height:844});await page.locator('[data-view=perspective]').click();await page.waitForTimeout(700);assert.ok((await pixels()).colors>20);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'work/portal-mobile.png'});
 await page.locator('#toggle-projects').click();assert.equal(await page.locator('#project-sidebar').isVisible(),true);await page.locator('#toggle-projects').click();await page.locator('#toggle-inspector').click();assert.equal(await page.locator('#inspector').isVisible(),true);
 for(const route of ['about.html','services.html','index.html']){await page.goto('http://127.0.0.1:8787/'+route);await page.waitForTimeout(route==='index.html'?10000:300);await page.locator('.menu-toggle').click();assert.equal(await page.locator('.client-login').getAttribute('href'),'./portal/login.html');assert.equal(await page.locator('.client-login').isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 assert.deepEqual(errors,[]);console.log('PASS: desktop/mobile pixels, view changes, clipping, measurement, download, mobile panels and all header links.');
}finally{await browser.close();}
