import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../app.js';
import {hashPassword} from '../db.js';
test('accounts, protected uploads, client isolation and session revocation',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'lf-test-'));const app=createApp({directory});const db=app.locals.db;
 for(const [id,role] of [['admin','admin'],['alice','client'],['bob','client']])db.prepare('INSERT INTO users(id,email,name,role,password_hash) VALUES(?,?,?,?,?)').run(id,id+'@example.com',id,role,await hashPassword('Test-password-1234'));
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});const base=`http://127.0.0.1:${server.address().port}`;app.locals.origin=base;
 const req=(path,cookie,body,method=body?'POST':'GET')=>fetch(base+'/api'+path,{method,headers:{...(cookie?{cookie}:{}),...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});
 try{
  assert.equal((await req('/projects')).status,401);
  const login=async id=>{const r=await req('/login',null,{email:id+'@example.com',password:'Test-password-1234'});assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/HttpOnly/);return r.headers.get('set-cookie').split(';')[0];};
  const admin=await login('admin'),alice=await login('alice'),bob=await login('bob');
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
