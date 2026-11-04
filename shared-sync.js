import {same,flatten,expand,changes,merge,overlay} from './sync-core.js';
const ENDPOINT='https://nola-noel-malinda.prances-video-07.chatgpt.site/api/sync';
const KEY=LS+'-pair',CACHE=LS+'-sync-v1';
let pairing='',base={},pending=[],conflicts=[],ready=false,busy=false,lastSeen=null,status='Saved on this phone only',storageError=false;
const localPersist=persist;
let previous=flatten(state);
try{
 pairing=localStorage.getItem(KEY)||'';
 const params=new URLSearchParams(location.hash.slice(1)),incoming=params.get('pair');
 if(incoming){history.replaceState(null,'',location.pathname+location.search);if(/^[a-f0-9]{64}$/.test(incoming)){localStorage.setItem(LS+'-before-pair',JSON.stringify(state));if(pairing!==incoming)localStorage.removeItem(CACHE);pairing=incoming;localStorage.setItem(KEY,pairing);}}
 const cached=JSON.parse(localStorage.getItem(CACHE)||'null');
 if(pairing&&cached){base=cached.base||{};pending=cached.pending||[];ready=!!cached.ready;state=cleanState(expand(overlay(base,pending),state));previous=flatten(state);localPersist();}
}catch{storageError=true;}
function saveQueue(){try{localStorage.setItem(CACHE,JSON.stringify({base,pending,ready}));storageError=false;}catch{storageError=true;}}
function message(){return (storageError||!storageOK)?'Storage unavailable — keep this app open and export a backup':!pairing?'Saved on this phone only':conflicts.length?'Two edits need a decision':!navigator.onLine?'Offline · changes waiting to sync':status;}
updateSaveState=function(){document.querySelectorAll('[data-save-state],[data-sync-status]').forEach(e=>e.textContent=message());};
function refresh(){updateSaveState();const box=document.getElementById('sync-conflicts');if(box)box.innerHTML=conflicts.map(k=>`<div class="sync-conflict"><strong>${esc(label(k))}</strong><p>Your phone: ${esc(describe(pending.find(o=>o.key===k)?.value))}</p><p>Shared trip: ${esc(describe(base[k]))}</p><div class="row"><button class="btn" data-sync-mine="${esc(k)}">Keep my edit</button><button class="btn" data-sync-theirs="${esc(k)}">Use shared edit</button></div></div>`).join('');}
function describe(v){if(v===null||v===undefined)return 'Removed / default';if(typeof v==='object')return [v.day,v.t,v.duration?`${v.duration} minutes`:'',v.title,v.note].filter(Boolean).join(' · ');return String(v);}
function label(k){const [f,id]=k.split('/');const stop=DAYS.flatMap(d=>d.stops.map((s,i)=>({...s,key:`${d.id}:${i}`}))).concat(state.custom.map(s=>({...s,key:s.id}))).find(s=>s.key===id);return (stop?.title||id||'Trip')+' · '+f;}
function updateFromRemote(data){
 base=data;const result=merge(base,pending);conflicts=result.conflicts;
 pending=pending.filter(o=>!same(base[o.key],o.value));
 state=cleanState(expand(overlay(base,pending),state));const changed=!same(previous,flatten(state));previous=flatten(state);localPersist();saveQueue();
 if(changed&&!document.querySelector('dialog[open],.stop.open')&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))renderAll();refresh();
}
persist=function(){
 const next=flatten(state);
 if(pairing){for(const op of changes(previous,next)){const found=pending.find(p=>p.key===op.key);if(found)found.value=op.value;else pending.push({...op,base:base[op.key]??null});}pending=pending.filter(o=>!same(o.base,o.value));saveQueue();status=pending.length?'Saving shared changes…':status;}
 previous=next;localPersist();refresh();if(pairing)setTimeout(sync,0);
};
async function call(method,ops){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{const r=await fetch(ENDPOINT,{method,headers:{Authorization:'Bearer '+pairing,...(method==='POST'?{'Content-Type':'application/json'}:{})},body:method==='POST'?JSON.stringify({ops}):undefined,cache:'no-store',credentials:'omit',signal:controller.signal});if(r.status===401)throw Error('Pairing link not accepted — reconnect from your private link');const data=await r.json();if(!r.ok&&r.status!==409)throw Error(data.error||'Connection unavailable');return {r,data};}finally{clearTimeout(timer);}
}
async function sync(){
 if(busy||!pairing||!navigator.onLine)return;busy=true;
 try{
  let {data}=await call('GET');
  if(!ready){
   if(Object.keys(data.data).length===0){pending=changes({},flatten(state));}
   ready=true;
  }
  updateFromRemote(data.data);
  if(pending.length&&!conflicts.length){
   const sent=structuredClone(pending),result=await call('POST',sent);data=result.data;
   // Do not discard edits made while the request was in flight.
   if(result.r.ok){pending=pending.filter(o=>!sent.some(s=>s.key===o.key&&same(s.value,o.value)));for(const o of pending)if(sent.some(s=>s.key===o.key))o.base=data.data[o.key]??null;}
   updateFromRemote(data.data);
  }
  lastSeen=new Date();status=conflicts.length?'Review conflicting edits':pending.length?'Changes waiting to sync':'Synced · '+lastSeen.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
 }catch(e){status='Not synced · '+(e.message||'will retry');}finally{busy=false;refresh();}
}
const oldNow=renderNow;renderNow=function(){oldNow();const el=document.querySelector('#v-now');const anchor=el.querySelector('.home-intro,.trip-heading');const bar='<div class="row together-tools"><button class="btn" data-find-my>Find each other</button><button class="btn" data-sync-open>Shared trip</button></div><p class="note" data-sync-status role="status"></p>';if(anchor)anchor.insertAdjacentHTML('afterend',bar);else el.insertAdjacentHTML('afterbegin',bar);refresh();};
const oldInfo=renderInfo;renderInfo=function(){oldInfo();document.querySelector('#v-info').insertAdjacentHTML('afterbegin',`<div class="prep-card"><div><p class="eyebrow">NOEL & MALINDA</p><h3>One trip. Both phones.</h3><p data-sync-status role="status"></p><p class="note">Paired phones share notes, schedule edits, checkmarks, favorites and reservation labels. Changes to a label do not change a booking with the venue. Appearance and location stay on your phone.</p><div class="row"><button class="btn primary" data-sync-open>Shared trip</button><button class="btn" data-find-my>Find each other</button></div></div></div>`);refresh();};
document.body.insertAdjacentHTML('beforeend',`<dialog id="find-my-dialog" aria-labelledby="find-my-title"><p class="eyebrow">FIND EACH OTHER</p><h2 id="find-my-title">A little freedom to wander.</h2><p>Set this up once on <strong>both iPhones</strong>.</p><ol><li>Open Find My and choose <strong>People</strong>.</li><li>Tap <strong>+ → Share My Location</strong>, then select each other.</li><li>Send and choose <strong>Share Indefinitely</strong>. You can stop sharing after the trip.</li></ol><div class="row"><a class="btn primary" href="fmf1://">Open Find My on iPhone</a><button class="btn" data-close-find>Done</button></div><p class="note">If the button does not open Find My, open it from your iPhone’s Home Screen. In People, tap each other’s name for location and directions. This app cannot enable sharing or read Apple’s location data.</p><a href="https://support.apple.com/guide/iphone/share-your-location-iph01954dc44/ios" target="_blank" rel="noopener">Apple’s setup instructions ↗</a></dialog>
<dialog id="shared-trip-dialog" aria-labelledby="shared-trip-title"><p class="eyebrow">YOUR PRIVATE CONNECTION</p><h2 id="shared-trip-title">Shared trip</h2><p data-sync-status role="status"></p><p id="pairing-explanation"></p><div class="row"><button class="btn primary" id="share-pair">Share private pairing link</button><button class="btn" id="retry-sync">Sync now</button><button class="btn" data-close-sync>Done</button></div><p class="note">Anyone with the private pairing link can view and edit your shared trip. Send it only to each other. The ordinary app link does not include access.</p><div id="sync-conflicts"></div><details><summary>Connection & saved changes</summary><p class="note">If both phones edit the same item, choose which edit to keep. Different items merge automatically. Offline edits upload when this app is open and connected.</p><button class="btn" id="use-before-pair">Merge this phone’s pre-pairing changes</button><button class="btn" id="disconnect-sync">Disconnect this phone</button></details><p class="note">A disconnect removes access from this browser only. To revoke a lost pairing link, ask for it to be replaced.</p></dialog>`);
document.addEventListener('click',async e=>{
 const b=e.target.closest('button,a');if(!b)return;
 if(b.hasAttribute('data-find-my'))document.getElementById('find-my-dialog').showModal();
 if(b.hasAttribute('data-close-find'))document.getElementById('find-my-dialog').close();
 if(b.hasAttribute('data-sync-open')){document.getElementById('pairing-explanation').textContent=pairing?'This phone is paired. Open the private pairing link once on the other phone, using the same browser you use for the app.':'Open your private pairing link once to connect this phone. Your existing itinerary still works without pairing.';document.getElementById('share-pair').disabled=!pairing;document.getElementById('shared-trip-dialog').showModal();refresh();}
 if(b.hasAttribute('data-close-sync')){document.getElementById('shared-trip-dialog').close();renderAll();}
 if(b.id==='retry-sync')sync();
 if(b.id==='share-pair'&&pairing){const url=location.origin+location.pathname+'#pair='+pairing;try{if(navigator.share)await navigator.share({title:'Our private NOLA trip',url});else{await navigator.clipboard.writeText(url);toast('Private pairing link copied');}}catch(e){if(e.name!=='AbortError')toast('Could not share. Try opening in Safari.');}}
 if(b.dataset.syncMine){const p=pending.find(o=>o.key===b.dataset.syncMine);if(p)p.base=base[p.key]??null;conflicts=conflicts.filter(k=>k!==b.dataset.syncMine);saveQueue();refresh();sync();}
 if(b.dataset.syncTheirs){pending=pending.filter(o=>o.key!==b.dataset.syncTheirs);updateFromRemote(base);sync();}
 if(b.id==='use-before-pair'){try{if(!pairing||!ready)return toast('Connect and sync first');const old=JSON.parse(localStorage.getItem(LS+'-before-pair')||'null');if(!old)return toast('No pre-pairing backup on this phone');if(!confirm('Merge this phone’s saved pre-pairing edits into the shared trip? Existing shared edits to the same items will need review.'))return;const defaults=flatten(cleanState({custom:[]}));for(const op of changes(defaults,flatten(cleanState(old)))){if(!pending.some(p=>p.key===op.key))pending.push(op);}updateFromRemote(base);sync();}catch{toast('Could not restore the saved changes');}}
 if(b.id==='disconnect-sync'&&busy)return toast('Please wait for the current sync to finish');
 if(b.id==='disconnect-sync'&&confirm('Disconnect this phone? Saved itinerary stays here. Unsent edits will stay only on this phone.')){pairing='';pending=[];conflicts=[];ready=false;localStorage.removeItem(KEY);localStorage.removeItem(CACHE);status='Saved on this phone only';document.getElementById('shared-trip-dialog').close();renderAll();}
});
window.addEventListener('online',sync);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
setInterval(()=>{if(!document.hidden)sync();},10000);
renderAll();sync();
