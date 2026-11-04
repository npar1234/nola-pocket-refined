// Pure merge helpers shared by the app, server and tests. Null means deletion.
export const same=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);
export function flatten(s){
 const out={};
 for(const f of ['bookings','schedule','included','queueDone','dayModes'])for(const [k,v] of Object.entries(s[f]||{}))out[f+'/'+k]=v;
 for(const k of new Set([...Object.keys(s.done||{}),...Object.keys(s.skipped||{})]))if(s.done?.[k]||s.skipped?.[k])out['progress/'+k]=s.done?.[k]?'done':'skipped';
 for(const c of s.custom||[])out['custom/'+c.id]=c;
 for(const p of s.favorites||[])out['favorite/'+p]=true;
 out.buffer=s.buffer??15;
 return out;
}
export function expand(flat,base){
 const s={...base,done:{},skipped:{},bookings:{},schedule:{},included:{},queueDone:{},dayModes:{},custom:[],favorites:[],buffer:15};
 for(const [path,v] of Object.entries(flat)){
  const [f,k]=path.split('/');
  if(f==='progress')s[v==='done'?'done':'skipped'][k]=true;
  else if(f==='custom')s.custom.push(v);
  else if(f==='favorite')s.favorites.push(k);
  else if(f==='buffer')s.buffer=v;
  else if(Object.hasOwn(s,f)&&k)s[f][k]=v;
 }
 return s;
}
export function changes(before,after){return [...new Set([...Object.keys(before),...Object.keys(after)])].filter(k=>!same(before[k],after[k])).map(k=>({key:k,base:before[k]??null,value:after[k]??null}));}
export function merge(remote,ops){
 const data={...remote},conflicts=[];
 for(const op of ops){if(!same(remote[op.key],op.base)&&!same(remote[op.key],op.value))conflicts.push(op.key);else if(op.value===null)delete data[op.key];else data[op.key]=op.value;}
 return {data,conflicts};
}
export function overlay(remote,ops){const result={...remote};for(const {key,value} of ops){if(value===null)delete result[key];else result[key]=value;}return result;}
