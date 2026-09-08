import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {PLYLoader} from 'three/addons/loaders/PLYLoader.js';
import {STLLoader} from 'three/addons/loaders/STLLoader.js';

export class ModelViewer {
  constructor(host,onMeasure){
    this.host=host;this.onMeasure=onMeasure;this.scene=new T.Scene();this.scene.background=new T.Color('#e7ecec');
    this.camera=new T.PerspectiveCamera(42,1,.01,10000);
    this.renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.append(this.renderer.domElement);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;
    this.scene.add(new T.HemisphereLight(0xffffff,0x667c80,3));const light=new T.DirectionalLight(0xffffff,3);light.position.set(50,100,30);this.scene.add(light);
    this.markers=new T.Group();this.scene.add(this.markers);this.ray=new T.Raycaster();this.measuring=false;
    new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();if(this.root)this.fit(this.view);}).observe(host);
    this.renderer.setAnimationLoop(()=>{this.controls.update();this.renderer.render(this.scene,this.camera);});
    host.addEventListener('pointerdown',e=>this.down=[e.clientX,e.clientY]);
    host.addEventListener('pointerup',e=>{if(!this.measuring||!this.root||!this.down||Math.hypot(e.clientX-this.down[0],e.clientY-this.down[1])>5)return;
      const r=host.getBoundingClientRect();this.ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);this.ray.params.Points.threshold=this.radius*.006;
      const hit=this.ray.intersectObject(this.root,true).find(h=>this.renderer.clippingPlanes.every(p=>p.distanceToPoint(h.point)>=0));if(!hit)return;
      const p=hit.point.clone(),dot=new T.Mesh(new T.SphereGeometry(this.radius*.005,12,8),new T.MeshBasicMaterial({color:0xff6a20,depthTest:false}));dot.position.copy(p);dot.renderOrder=10;this.markers.add(dot);
      if(!this.start){this.start=p;return;}const geometry=new T.BufferGeometry().setFromPoints([this.start,p]);const line=new T.Line(geometry,new T.LineBasicMaterial({color:0xff6a20,depthTest:false}));line.renderOrder=10;this.markers.add(line);this.onMeasure(this.start.distanceTo(p));this.start=null;
    });
  }
  disposeObject(object){object.traverse(n=>{n.geometry?.dispose();for(const m of (Array.isArray(n.material)?n.material:[n.material]))if(m){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}});}
  clearMeasurements(){this.start=null;this.disposeObject(this.markers);this.markers.clear();}
  clear(){this.generation=(this.generation||0)+1;if(this.root){this.scene.remove(this.root);this.disposeObject(this.root);this.root=null;}if(this.grid){this.scene.remove(this.grid);this.disposeObject(this.grid);this.grid=null;}this.clearMeasurements();this.renderer.clippingPlanes=[];}
  async load(buffer,name){
    this.clear();const generation=this.generation;const extension=name.split('.').pop().toLowerCase();const manager=new T.LoadingManager();manager.setURLModifier(url=>{if(url.startsWith('blob:')||url.startsWith('data:'))return url;throw new Error('External model assets are not supported. Use a self-contained GLB.');});let root;
    if(extension==='glb')root=(await new GLTFLoader(manager).parseAsync(buffer,'')).scene;
    else if(extension==='obj')root=new OBJLoader(manager).parse(new TextDecoder().decode(buffer));
    else {const geometry=extension==='ply'?new PLYLoader(manager).parse(buffer):new STLLoader(manager).parse(buffer);const colors=!!geometry.attributes.color;
      root=extension==='ply'&&!geometry.index?new T.Points(geometry,new T.PointsMaterial({color:colors?0xffffff:0x527d89,vertexColors:colors,size:2,sizeAttenuation:false})):new T.Mesh(geometry,new T.MeshStandardMaterial({color:colors?0xffffff:0x7e9ba3,vertexColors:colors,roughness:.8,side:T.DoubleSide}));}
    if(generation!==this.generation){this.disposeObject(root);throw new Error('Model selection changed.');}
    const bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());if(bounds.isEmpty()||!Number.isFinite(size.length())||size.length()===0){this.disposeObject(root);throw new Error('The model has no usable geometry.');}
    root.position.sub(center);this.root=root;this.scene.add(root);this.bounds=new T.Box3().setFromObject(root);this.radius=size.length()/2;
    this.grid=new T.GridHelper(this.radius*3,24,0xa1b4b8,0xc6d2d3);this.grid.position.y=this.bounds.min.y-this.radius*.002;this.scene.add(this.grid);
    let vertices=0,triangles=0;root.traverse(n=>{if(n.geometry){vertices+=n.geometry.attributes.position?.count||0;if(n.isMesh)triangles+=(n.geometry.index?.count||n.geometry.attributes.position?.count||0)/3;}});this.fit('perspective');return {size,vertices,triangles:Math.round(triangles)};
  }
  fit(view=this.view||'perspective'){if(!this.root)return;this.view=view;const direction=view==='top'?new T.Vector3(.001,1,0):view==='front'?new T.Vector3(0,.1,1):new T.Vector3(1,.8,1);this.camera.position.copy(direction.normalize().multiplyScalar(this.radius*3.5/Math.min(1,this.camera.aspect)));this.camera.near=this.radius/10000;this.camera.far=this.radius*100;this.camera.updateProjectionMatrix();this.controls.target.set(0,0,0);this.controls.update();}
  display(grid,wire,size){if(this.grid)this.grid.visible=grid;this.root?.traverse(n=>{for(const m of(Array.isArray(n.material)?n.material:[n.material]))if(m){if(n.isPoints)m.size=size;else m.wireframe=wire;}});}
  clip(axis,value){if(!this.root||axis==='none'){this.renderer.clippingPlanes=[];return;}const n=new T.Vector3();n[axis]=-1;const position=T.MathUtils.lerp(this.bounds.min[axis],this.bounds.max[axis],value/100);this.renderer.clippingPlanes=[new T.Plane(n,position)];}
}
