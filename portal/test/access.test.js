import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../app.js';
import {hashPassword} from '../db.js';
test('accounts, contact routing, protected uploads, client isolation and session revocation',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'lf-test-'));const sent=[];const app=createApp({directory,sendContactMessage:async message=>sent.push(message)});const db=app.locals.db;
 for(const [id,role] of [['admin','admin'],['alice','client'],['bob','client']])db.prepare('INSERT INTO users(id,email,name,role,password_hash) VALUES(?,?,?,?,?)').run(id,id+'@example.com',id,role,await hashPassword('Test-password-1234'));
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});const base=`http://127.0.0.1:${server.address().port}`;app.locals.origin=base;
 const req=(path,cookie,body,method=body?'POST':'GET')=>fetch(base+'/api'+path,{method,headers:{...(cookie?{cookie}:{}),...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});
 try{
  assert.equal((await req('/projects')).status,401);
  const login=async id=>{const r=await req('/login',null,{email:id+'@example.com',password:'Test-password-1234'});assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/HttpOnly/);return r.headers.get('set-cookie').split(';')[0];};
  const admin=await login('admin'),alice=await login('alice'),bob=await login('bob');
  const formLogin = (origin, password = 'Test-password-1234') => fetch(base + '/auth/login', {
    method:'POST', redirect:'manual',
    headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded','Sec-Fetch-Site':'cross-site'},
    body:new URLSearchParams({email:'alice@example.com',password})
  });
  assert.equal((await formLogin('https://wrong.example')).status,403);
  const contact = (origin, overrides = {}) => fetch(base + '/auth/contact', {
    method:'POST', redirect:'manual', headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({name:'Jordan Lee',organization:'Example Carrier',email:'jordan@example.com',phone:'555-0100',inquiry_type:'Claims documentation',location:'Portland, OR',timing:'Within 1 week',details:'Document roof and exterior damage.',website:'',...overrides})
  });
  assert.equal((await contact('https://wrong.example')).status,403);
  assert.match((await contact('https://liteflite.io',{email:'not-an-email'})).headers.get('location'),/result=error/);
  const validContact = await contact('https://liteflite.io');
  assert.equal(validContact.status,303);
  assert.equal(validContact.headers.get('location'),'https://liteflite.io/contact.html?result=sent#contact-form');
  assert.deepEqual(sent[0].recipients,['tim@liteflite.io','jereme@liteflite.io']);
  assert.equal(sent[0].email,'jordan@example.com');
  assert.equal(sent[0].details,'Document roof and exterior damage.');
  const publicLogin = await formLogin('https://liteflite.io');
  assert.equal(publicLogin.status,200);
  assert.match(publicLogin.headers.get('set-cookie'),/HttpOnly/);
  assert.match(publicLogin.headers.get('set-cookie'),/SameSite=Strict/);
  assert.match(await publicLogin.text(),/location.replace/);
  const publicCookie = publicLogin.headers.get('set-cookie').split(';')[0];
  assert.equal((await req('/session',publicCookie)).status,200);
  const badPublicLogin = await formLogin('https://liteflite.io','wrong-password');
  assert.equal(badPublicLogin.status,303);
  assert.equal(badPublicLogin.headers.get('location'),'https://liteflite.io/login.html?error=invalid');
  assert.equal((await fetch(base+'/api/logout',{method:'POST',headers:{Origin:'https://liteflite.io',cookie:publicCookie}})).status,403);
  assert.equal((await req('/projects',alice,{name:'Forbidden',ownerId:'alice'})).status,403);
  const created=await req('/projects',admin,{name:'Private scan',ownerId:'alice'});assert.equal(created.status,201);const {project}=await created.json();
  assert.equal((await req('/projects/'+project.id,bob)).status,404);assert.equal((await req('/projects',bob).then(r=>r.json())).projects.length,0);
  const form=new FormData();const content='v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n';form.append('model',new Blob([content]),'scan.obj');form.append('units','m');
  const uploaded=await req('/projects/'+project.id+'/files',admin,form);assert.equal(uploaded.status,201);const {file}=await uploaded.json();
  assert.equal((await req('/files/'+file.id+'/content',bob)).status,404);assert.equal((await req('/files/'+file.id+'/content')).status,401);
  assert.equal(await req('/files/'+file.id+'/content?download=1',alice).then(r=>r.text()),content);
  const cross=await fetch(base+'/api/logout',{method:'POST',headers:{cookie:alice,Origin:'https://wrong.example'}});assert.equal(cross.status,403);
  assert.equal((await req('/password',alice,{currentPassword:'Test-password-1234',newPassword:'Replacement-password-1234'})).status,200);assert.equal((await req('/session',alice)).status,401);
  assert.equal((await req('/logout',bob,{},'POST')).status,200);assert.equal((await req('/session',bob)).status,401);
  assert.equal((await fetch(base+'/portal/data/portal.sqlite')).status,404);
 }finally{await new Promise(resolve=>server.close(resolve));db.close();await rm(directory,{recursive:true,force:true});}
});
