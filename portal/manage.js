import {randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {openDatabase,identifier,hashPassword} from './db.js';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
process.umask(0o077);
const {db,dir}=openDatabase();
async function account(email,name,role){
  const existing=db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if(existing){console.log(`${email}: account already exists; password unchanged.`);return existing.id;}
  const id=identifier(),password=randomBytes(18).toString('base64url');
  db.prepare('INSERT INTO users(id,email,name,role,password_hash) VALUES(?,?,?,?,?)').run(id,email,name,role,await hashPassword(password));
  console.log(`${role}: ${email}\nPassword: ${password}\n`);return id;
}
if(process.argv[2]==='demo'){
  const owner=await account('client@liteflite.local','Demo client','client');await account('studio@liteflite.local','Lite Flite studio','admin');
  if(!db.prepare('SELECT id FROM projects WHERE sample=1').get()){
    globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(v=>{this.result=`data:${blob.type};base64,${Buffer.from(v).toString('base64')}`;this.onloadend?.();});}};
    const scene=new T.Scene();
    const box=(x,y,z,w,h,d,color)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.85}));m.position.set(x,y,z);scene.add(m);return m;};
    box(0,-.3,0,90,.6,70,0xadb6a6);box(0,.02,20,90,.08,14,0x687276);box(0,5,0,44,10,26,0xcbd0ce);box(0,10.2,0,46,.4,28,0xf0f0e8);
    for(let row=0;row<3;row++)for(let col=0;col<8;col++){const panel=box(-18+col*5,10.7,-8+row*6,4,.25,4,0x315466);panel.rotation.x=.15;}
    for(let i=0;i<5;i++){box(-15+i*7,2,13.1,4,4,.2,0x667f89);box(-15+i*7,.05,25,3,.1,5,0xe4e0c4);}
    box(30,3,-10,10,6,14,0x8a9c9f);box(30,6.2,-10,11,.4,15,0xd6dcd9);box(-31,1,0,7,2,15,0x6c8975);
    const bytes=Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true}));const pid=identifier(),fid=identifier(),key=fid+'.glb';await writeFile(join(dir,'models',key),bytes);
    db.prepare('INSERT INTO projects(id,owner_id,name,description,sample) VALUES(?,?,?,?,1)').run(pid,owner,'Sample site / Building 01','Illustrative warehouse model for testing. Not a surveyed property.');
    db.prepare('INSERT INTO files(id,project_id,name,storage_key,size,units) VALUES(?,?,?,?,?,?)').run(fid,pid,'sample-warehouse.glb',key,bytes.length,'m');
    console.log('Sample project created.');
  }
}else if(process.argv[2]==='client'){
  const email=process.argv[3],name=process.argv[4];if(!email||!name||!email.includes('@'))throw new Error('Usage: npm run client -- email "Name" [--admin]');await account(email.toLowerCase(),name,process.argv.includes('--admin')?'admin':'client');
}else throw new Error('Choose demo or client.');
db.close();
