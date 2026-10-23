// ==UserScript==
// @name         ワンクリスマホ対応版2.2.13 軽量版
// @namespace    MapTroopTool
// @description  右クリ・タップ出兵／勝率・速度順・行軍帰還カウントダウン（診断機能なし）
// @include      https://*.3gokushi.jp/*
// @include      http://*.3gokushi.jp/*
// @version      2.2.13
// @require      https://code.jquery.com/jquery-3.1.1.js
// @require      https://ajax.microsoft.com/ajax/jquery.templates/beta1/jquery.tmpl.js
// @exclude      https://*.3gokushi.jp/world/select_server_mixi_new.php*
// @exclude      http://*.3gokushi.jp/world/select_server_mixi_new.php*
// @exclude      https://*.3gokushi.jp/maintenance*
// @exclude      http://*.3gokushi.jp/maintenance*
// @exclude      https://info.3gokushi.jp/*
// @exclude      http://info.3gokushi.jp/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// ==/UserScript==
(function () {
'use strict';
function mapTroopList(value){
const result=[];if(value==null)return result;
if(typeof value[Symbol.iterator]==='function'){for(const item of value)result.push(item);}
else if(Number.isSafeInteger(value.length) && value.length>=0){for(let i=0;i<value.length;i++)result.push(value[i]);}
return result;
}
function mapTroopStringify(value){
const seen=new WeakMap();
function clone(input){
if(input===null || typeof input!=='object')return input;
if(seen.has(input))return seen.get(input);
if(Array.isArray(input)){
const copy=[];Object.defineProperty(copy,'toJSON',{value:undefined});seen.set(input,copy);
for(let i=0;i<input.length;i++)copy.push(clone(input[i]));return copy;
}
const copy=Object.create(null);seen.set(input,copy);
for(const key of Object.keys(input))if(key!=='toJSON')copy[key]=clone(input[key]);
return copy;
}
return JSON.stringify(clone(value));
}
function mapTroopReadArray(value){
let parsed=value;
for(let i=0;i<3 && typeof parsed==='string';i++){try{parsed=JSON.parse(parsed);}catch(_){return [];}}
return Array.isArray(parsed)?parsed:[];
}
const SERVER_NAME =
location.hostname.match(/^(.*)\.3gokushi/)?.[1] || 'server';
const KEY = {
left: SERVER_NAME + '_MapTroop_left',
top: SERVER_NAME + '_MapTroop_top',
scale: SERVER_NAME + '_MapTroop_scale',
lv0: SERVER_NAME + '_MapTroop_lv0',
autoPos: SERVER_NAME + '_MapTroop_auto_position',
moveType: SERVER_NAME + '_MapTroop_move_type',
alwaysRate: SERVER_NAME + '_MapTroop_always_rate',
threshold: SERVER_NAME + '_MapTroop_threshold'
};
const load = (key, def = null) =>
localStorage.getItem(key) ?? def;
const save = (key, value) =>
localStorage.setItem(key, String(value));
if (location.pathname === '/card/deck.php') {
const t$ = jQuery.noConflict(true);
(function ($) {
$('.deck-operation-checkbox').on(
'contextmenu',
function (e) {
const id = $(e.currentTarget).val();
const key = SERVER_NAME + '-' + id;
if (localStorage.getItem(key) !== 'hide') {
if (
window.confirm(
'出兵画面で非表示にしますか？'
)
) {
localStorage.setItem(key, 'hide');
}
} else {
if (
window.confirm(
'出兵画面での非表示を解除しますか？'
)
) {
localStorage.setItem(key, '');
}
}
e.preventDefault();
return false;
}
);
})(t$);
return;
}
if (location.pathname !== '/elevation_map.php') {
return;
}
const t$ = jQuery.noConflict(true);
(function ($) {
const MOVE_TYPES = {
307: { name: '鹵獲', confirm: '鹵獲' },
302: {
name: '殲滅戦',
confirm: '出兵'
},
303: {
name: '強襲',
confirm: '強襲'
},
301: {
name: '援軍',
confirm: '援軍'
}
};
function getMoveType() {
let type =
parseInt(
load(KEY.moveType, '302'),
10
);
if (!MOVE_TYPES[type]) {
type = 302;
}
return load(KEY.moveType) === 'loot' ? 307 : type;
}
function troop(x, y, id, moveType, skillFields = []) {
const fields = [
{name:'village_x_value',value:String(x)},
{name:'village_y_value',value:String(y)},
{name:'unit_assign_card_id',value:String(id)},
{name:'radio_move_type',value:String(moveType)},
{name:'radio_reserve_type',value:'0'},
{name:'card_id',value:'204'},
{name:'btn_send',value:'出兵'}
];
if (moveType === 302 || moveType === 303) {
skillFields.forEach(field => {
if (/^use_skill_id\[/.test(field.name) && field.value && field.value !== '0')
fields.push({name:field.name,value:String(field.value)});
});
}
return $.ajax({type:'POST',url:'/facility/castle_send_troop.php',
data:$.param(fields),dataType:'html'});
}
function settingRow(name) {
const row = $('<div>').css({
'line-height': '20px',
display: 'inline-flex',
'align-items': 'center',
gap: '3px',
'white-space': 'nowrap'
});
const label = $('<span>')
.text(name)
.css({
display: 'inline-block',
width: 'auto',
'font-weight': 'bold'
});
row.append(label);
return row;
}
function enableDrag(panel, handle) {
let dragging = false;
let dx = 0;
let dy = 0;
handle.css({
cursor: 'move',
'user-select': 'none',
'touch-action': 'none'
});
handle.on('pointerdown', function (e) {
if (e.button !== 0) return;
const rect =
panel[0].getBoundingClientRect();
dragging = true;
dx = e.clientX - rect.left;
dy = e.clientY - rect.top;
panel.css({
transform: 'none',
left: rect.left + 'px',
top: rect.top + 'px'
});
e.preventDefault();
});
$(document).on(
'pointermove.MapTroopDrag',
function (e) {
if (!dragging) return;
let left = e.clientX - dx;
let top = e.clientY - dy;
left = Math.max(
0,
Math.min(
left,
window.innerWidth -
panel[0].offsetWidth
)
);
top = Math.max(
0,
Math.min(
top,
window.innerHeight - 40
)
);
panel.css({
left: left + 'px',
top: top + 'px'
});
}
);
$(document).on(
'pointerup.MapTroopDrag pointercancel.MapTroopDrag',
function () {
if (!dragging) return;
dragging = false;
if (
load(KEY.autoPos, '0') === '1'
) {
const rect =
panel[0]
.getBoundingClientRect();
save(
KEY.left,
Math.round(rect.left)
);
save(
KEY.top,
Math.round(rect.top)
);
}
}
);
}
function readReturnTiming(text) {
const arrival=text.match(/([0-9]{4}-[0-9]{2}-[0-9]{2})\s+([0-9]{2}:[0-5][0-9]:[0-5][0-9])/);
const remaining=text.match(/あと\s*([0-9]+):([0-5][0-9]):([0-5][0-9])/);
if(!arrival || !remaining)return null;
return {arrival:arrival[1]+' '+arrival[2],seconds:Number(remaining[1])*3600+Number(remaining[2])*60+Number(remaining[3])};
}
function formatRemaining(seconds) {
const n=Math.max(0,Math.floor(seconds));
return [Math.floor(n/3600),Math.floor(n/60)%60,n%60].map(x=>String(x).padStart(2,'0')).join(':');
}
function returnRowLabel(row,label) {
return mapTroopList(row.cells||[]).findIndex(cell=>cell.textContent.replace(/[\s\u00a0：:]/g,'')===label);
}
function extractReturningUnits(doc) {
const result=[];
for(const table of doc.querySelectorAll('table')) {
const rows=mapTroopList(table.rows||[]).filter(row=>row.closest('table')===table);
for(let i=0;i<rows.length;i++) {
if(returnRowLabel(rows[i],'到着時刻')<0)continue;
const timing=readReturnTiming(mapTroopList(rows[i].cells).map(cell=>cell.textContent).join(' '));
if(!timing)continue;
let start=i,end=rows.length;
for(let j=i-1;j>=0;j--){
if(returnRowLabel(rows[j],'到着時刻')>=0)break;
if(returnRowLabel(rows[j],'出兵先')>=0){start=j;break;}
}
for(let j=i+1;j<rows.length;j++)if(returnRowLabel(rows[j],'到着時刻')>=0 || returnRowLabel(rows[j],'出兵先')>=0){end=j;break;}
const block=rows.slice(start,end);
let name='',destination='';
for(const row of block){
for(const label of ['武将','出兵先']){
const cells=mapTroopList(row.cells),index=returnRowLabel(row,label);
if(index<0)continue;
const value=cells.slice(index+1).map(cell=>cell.textContent).join(' ').replace(/\s+/g,' ').trim();
if(label==='武将')name=value;else destination=value;
}
}
if(!name)continue;
const cardIds=[];
for(const row of block){
for(const input of row.querySelectorAll('input[name]'))if(/^(?:card_id|unit_assign_card_id)(?:\[\])?$/.test(input.name) && /^\d+$/.test(input.value))cardIds.push(input.value);
for(const node of row.querySelectorAll('[data-card-id]')){const value=node.getAttribute('data-card-id');if(/^\d+$/.test(value||''))cardIds.push(value);}
for(const anchor of row.querySelectorAll('a[href]')){
const raw=anchor.getAttribute('href')||'',windowId=raw.match(/cardWindow_(\d+)/);
if(windowId)cardIds.push(windowId[1]);
try{const params=new URL(raw,location.href).searchParams;for(const key of ['card_id','unit_assign_card_id']){const id=params.get(key);if(id && /^\d+$/.test(id))cardIds.push(id);}}catch(_){}
}
}
const mainName=normalizedCommanderName(name);
result.push({...timing,name,destination,mainName,cardIds:mapTroopList(new Set(cardIds))});
}
}
return result;
}
const commanderNames=new Map();
let commanderNameRead=null,commanderNameLookupAttempted=false;
function referencedCommanderIds(original){
let anchors=original.find('.illust a[href], th a[href]');
if(!anchors.length)anchors=original.find('a[href]');
const ids=new Set();
anchors.each(function(){const match=(this.getAttribute('href')||'').match(/(?:inlineId=|#)?cardWindow_(\d+)/);if(match)ids.add(match[1]);});
return mapTroopList(ids);
}
function bindCommanderNameToCard(original,id){
const references=referencedCommanderIds(original);
if(references.length!==1)return;
const popupId=references[0],name=commanderNames.get(popupId);
if(name){commanderNames.set(String(id),name);}
}
function collectCommanderNames(root){
root.find('[id]').filter(function(){return /^cardWindow_\d+$/.test(this.id);}).each(function(){
const popup=$(this),id=this.id.slice('cardWindow_'.length);
let label=popup.find('.name').first();
if(!label.length)label=popup.find('.card_name,.cardName,.busho_name,.bushoName,[data-card-name]').first();
const name=normalizedCommanderName(label.attr('data-card-name')||label.text());
if(name && !/^(?:武将|カード|画像|[0-9]+)$/.test(name)){commanderNames.set(id,name);}
});
root.find('.illustMini__div--name').each(function(){
const label=$(this),ids=new Set();
label.closest('.left').find('a[href]').each(function(){const m=(this.getAttribute('href')||'').match(/cardWindow_(\d+)/);if(m)ids.add(m[1]);});
const name=normalizedCommanderName(label.text());
if(ids.size===1 && name){const id=mapTroopList(ids)[0];commanderNames.set(id,name);}
});
root.find('input[name="unit_assign_card_id"]').each(function(){const table=$(this).closest('.attackGeneralListTbl');if(table.length)bindCommanderNameToCard(table,this.value);});
}
function applyCommanderNames(){
cardTemplates.forEach((original,id)=>bindCommanderNameToCard(original,id));
tripEngine.jobs.forEach(job=>{const name=commanderNames.get(job.id);if(name)job.nameHints=mapTroopList(new Set([...job.nameHints,name]));});
}
function safeDeckPageHref(raw,baseHref){
try{
const url=new URL(raw,baseHref),base=new URL(baseHref);
if(url.origin!==base.origin || url.pathname!=='/card/deck.php')return null;
const keys=mapTroopList(url.searchParams.keys());
const allowed=['p','page','deck_page','label'];
if(!keys.some(key=>['p','page','deck_page'].includes(key)))return null;
if(keys.some(key=>!allowed.includes(key) || !/^\d+$/.test(url.searchParams.get(key))))return null;
url.hash='';url.searchParams.sort();return url.pathname+url.search;
}catch(_){return null;}
}
async function enrichCommanderNames(units){
applyCommanderNames();
function needsName(){return mapTroopList(tripEngine.jobs.values()).some(job=>job.state==='awaitReturn' && !units.some(unit=>(unit.cardIds||[]).includes(job.id) || job.nameHints.includes(normalizedCommanderName(unit.mainName))));}
if(!needsName())return;
if(commanderNameRead)return commanderNameRead;
if(commanderNameLookupAttempted)return;
commanderNameLookupAttempted=true;
commanderNameRead=(async()=>{
const queue=['/card/deck.php'],visited=new Set();
while(queue.length && visited.size<4 && needsName()){
const path=queue.shift();if(visited.has(path))continue;visited.add(path);
const html=await $.ajax({url:path,type:'GET',cache:false,dataType:'html',timeout:15000});
const root=$('<div>').append($.parseHTML(html,document,false));collectCommanderNames(root);applyCommanderNames();
root.find('a[href]').each(function(){
const raw=this.getAttribute('href')||'',next=safeDeckPageHref(raw,location.origin+path);
if(next && !visited.has(next) && !queue.includes(next))queue.push(next);
});
}
})().catch(()=>{}).finally(()=>{commanderNameRead=null;});
return commanderNameRead;
}
function normalizedCommanderName(text) {
return String(text||'').split(/[（(]\s*副将/)[0].replace(/^\s*武将名\s*[:：]\s*/,'').replace(/\s+Lv\s*\d+\s*$/i,'').replace(/[\s\u3000]+/g,'').trim();
}
function readCommanderHints(original,id,officialPage) {
const names=[];
function add(value){const name=normalizedCommanderName(value);if(name && !/^(?:武将|カード|画像|Lv\d+|[0-9]+)$/.test(name))names.push(name);}
bindCommanderNameToCard(original,id);
add(commanderNames.get(String(id)));
original.find('th a, .illust a, .illust img, img[alt], img[title], [data-card-name]').each(function(){
add(this.getAttribute('alt'));add(this.getAttribute('title'));add(this.getAttribute('data-card-name'));
if(this.tagName==='A')add(this.textContent);
});
original.find('input[name="unit_assign_card_id"]').filter(function(){return String(this.value)===String(id);}).each(function(){
const nativeId=this.id;
if(nativeId)original.find('label').filter(function(){return this.htmlFor===nativeId;}).each(function(){add(this.textContent);});
});
if(officialPage){
const popup=officialPage.find('[id]').filter(function(){return this.id==='cardWindow_'+id;});
popup.find('.name,.card_name,.cardName,.busho_name,.bushoName,[data-card-name]').each(function(){add(this.getAttribute('data-card-name')||this.textContent);});
}
return mapTroopList(new Set(names));
}
function createTripEngine(adapter) {
const jobs=new Map(); let returnBusy=false,readyBusy=false;
const retryDelays=[2000,5000,10000,30000];
function persist(){adapter.save(mapTroopList(jobs.values()));}
function changed(){persist();adapter.change();}
function due(job){return Number.isFinite(job.nextCheck) && job.nextCheck<=adapter.now();}
function postpone(job){
job.attempts=(job.attempts||0)+1;
const delay=job.attempts<=retryDelays.length ? retryDelays[job.attempts-1] : job.state==='awaitReady' ? 30000 : 60000;
job.nextCheck=adapter.now()+delay;
}
function add(info){
const seconds=Number.isFinite(info.seconds) ? Math.max(0,info.seconds) : null;
const job={id:String(info.id),nameHints:info.nameHints||[],state:seconds===null?'awaitReturn':'marching',deadline:seconds===null?null:info.sentAt+seconds*1000,nextCheck:seconds===null?null:0,attempts:0};
jobs.set(job.id,job);changed();return job;
}
function restore(items){for(const job of items||[])if(job && /^\d+$/.test(String(job.id)) && ['marching','awaitReturn','returning','awaitReady'].includes(job.state)){
job.id=String(job.id);delete job.issue;job.nameHints=mapTroopList(new Set(mapTroopReadArray(job.nameHints).filter(x=>typeof x==='string').map(normalizedCommanderName)));
if(['marching','returning'].includes(job.state) && !Number.isFinite(job.deadline))continue;
if(job.nextCheck===null && (job.state==='awaitReady' || (job.state==='awaitReturn' && Number.isFinite(job.deadline)))){job.nextCheck=adapter.now();job.attempts=0;}
jobs.set(job.id,job);
}}
function chooseReturn(job,units){
const exact=units.filter(unit=>(unit.cardIds||[]).includes(job.id));
if(exact.length===1)return exact[0];
if(exact.length>1)return null;
const byName=units.filter(unit=>job.nameHints.map(normalizedCommanderName).includes(normalizedCommanderName(unit.mainName)));
if(byName.length!==1)return null;
const other=mapTroopList(jobs.values()).filter(other=>other.id!==job.id && other.nameHints.map(normalizedCommanderName).includes(normalizedCommanderName(byName[0].mainName)));
return other.length ? null : byName[0];
}
async function tick(){
const now=adapter.now();let advanced=false;
for(const job of jobs.values()){
if(job.state==='marching' && job.deadline<=now){job.state='awaitReturn';job.nextCheck=now;job.attempts=0;advanced=true;}
if(job.state==='returning' && job.deadline<=now){job.state='awaitReady';job.nextCheck=now;job.attempts=0;advanced=true;}
}
if(advanced)changed();else adapter.change();
const work=[];
const returning=mapTroopList(jobs.values()).filter(job=>job.state==='awaitReturn' && due(job));
if(returning.length && !returnBusy){returnBusy=true;work.push((async()=>{
try {
const units=await adapter.fetchReturns();const claimed=new Set();
for(const job of returning){
if(jobs.get(job.id)!==job || job.state!=='awaitReturn')continue;
const match=chooseReturn(job,units);
if(match && !claimed.has(match) && Number.isFinite(match.seconds) && match.seconds>=0){
claimed.add(match);job.state='returning';job.deadline=adapter.now()+match.seconds*1000;job.nextCheck=null;job.attempts=0;
}else {postpone(job);}
}
const unresolved=returning.filter(job=>jobs.get(job.id)===job && job.state==='awaitReturn');
if(unresolved.length){
try{const snapshot=await adapter.fetchRoster();const completed=[];for(const job of unresolved)if(snapshot.availableIds.has(job.id)){jobs.delete(job.id);completed.push(job.id);}if(completed.length)adapter.ready(snapshot,completed);}catch(_){}
}
}catch(_){returning.forEach(job=>{if(jobs.get(job.id)===job && job.state==='awaitReturn')postpone(job);});}
finally{returnBusy=false;changed();}
})());}
const ready=mapTroopList(jobs.values()).filter(job=>job.state==='awaitReady' && due(job));
if(ready.length && !readyBusy){readyBusy=true;work.push((async()=>{
try{
const snapshot=await adapter.fetchRoster();const completed=[];
for(const job of ready){if(jobs.get(job.id)!==job || job.state!=='awaitReady')continue;
if(snapshot.availableIds.has(job.id)){jobs.delete(job.id);completed.push(job.id);}else postpone(job);
}
if(completed.length)adapter.ready(snapshot,completed);
}catch(_){ready.forEach(job=>{if(jobs.get(job.id)===job && job.state==='awaitReady')postpone(job);});}
finally{readyBusy=false;changed();}
})());}
await Promise.all(work);
}
function refresh(){for(const job of jobs.values())if(job.state==='awaitReturn' || job.state==='awaitReady'){job.nextCheck=adapter.now();job.attempts=0;}return tick();}
return {jobs,add,restore,tick,refresh};
}
const tripKey=SERVER_NAME+'_MapTroop_trips_v1';
const cardTemplates=new Map(),pendingSends=new Set();
let trackerContext=null,rosterRead=null,returnRead=null;
function durationSeconds(text){const m=String(text||'').match(/^([0-9]+):([0-5][0-9]):([0-5][0-9])$/);return m?Number(m[1])*3600+Number(m[2])*60+Number(m[3]):null;}
function documentFrom(html){return new DOMParser().parseFromString(html,'text/html');}
function officialUnitSelectable(input){
const table=input.closest('.attackGeneralListTbl');
if(!table || input.type!=='radio' || !/^\d+$/.test(input.value) || input.matches(':disabled'))return false;
// Ignore sentences in card/skill descriptions. Only an isolated status cell blocks a selectable radio.
for(const row of mapTroopList(table.rows||[])){
if(row.closest('table')!==table)continue;
for(const cell of mapTroopList(row.cells||[])){
const label=cell.textContent.replace(/\s+/g,'').replace(/[：:]$/,'');
if(/^(?:出兵中|出撃中|帰還中|行軍中|移動中)$/.test(label))return false;
}
}
return true;
}
function readReadyRoster(html){
const doc=documentFrom(html),availableIds=new Set();
for(const input of doc.querySelectorAll('input[name="unit_assign_card_id"]')){
if(!officialUnitSelectable(input))continue;
availableIds.add(input.value);
}
return {html,availableIds};
}
function getRosterSnapshot(){
if(rosterRead)return rosterRead;
rosterRead=Promise.resolve($.ajax({url:'/facility/castle_send_troop.php',type:'GET',cache:false,dataType:'html',timeout:15000})).then(readReadyRoster).finally(()=>{rosterRead=null;});
return rosterRead;
}
function getReturnSnapshot(){
if(returnRead)return returnRead;
returnRead=Promise.resolve($.ajax({url:'/facility/unit_status.php?type=return',type:'GET',cache:false,dataType:'html',timeout:15000})).then(async html=>{
const units=extractReturningUnits(documentFrom(html));
const nameLookupStarted=performance.now();
await enrichCommanderNames(units);
const lookupSeconds=Math.floor((performance.now()-nameLookupStarted)/1000);
units.forEach(unit=>{unit.seconds=Math.max(0,unit.seconds-lookupSeconds);});
if(trackerContext && trackerContext.panel[0].isConnected)trackerContext.returns(units);
return units;
}).finally(()=>{returnRead=null;});
return returnRead;
}
const tripEngine=createTripEngine({
now:()=>Date.now(),
save:items=>{try{save(tripKey,mapTroopStringify(items));}catch(_){}},
change:()=>{if(trackerContext && trackerContext.panel[0].isConnected)trackerContext.render();},
fetchReturns:getReturnSnapshot,fetchRoster:getRosterSnapshot,
ready:(snapshot,ids)=>{if(trackerContext && trackerContext.panel[0].isConnected)trackerContext.ready(snapshot,ids);}
});
try{tripEngine.restore(mapTroopReadArray(load(tripKey,'[]')));}catch(_){}
setInterval(()=>{tripEngine.tick().catch(()=>{});},1000);
function createPanel(data, x, y, tile) {
$('#wrapTroopArea').remove();
$(document).off('.MapTroopDrag');
const touchPanel = window.matchMedia('(pointer:coarse)').matches;
const panelScaleKey = touchPanel ? KEY.scale + '_touch' : KEY.scale;
let scale =
parseInt(
load(panelScaleKey, '100'),
10
);
if (
!Number.isFinite(scale) ||
scale < 70 ||
scale > 130
) {
scale = 100;
}
if (touchPanel) scale = Math.max(100, scale);
const savedLeft = load(KEY.left);
const savedTop = load(KEY.top);
const panel =
$("<div id='wrapTroopArea'>").css({
position: 'fixed',
left:
savedLeft !== null
? savedLeft + 'px'
: '50%',
top:
savedTop !== null
? savedTop + 'px'
: '100pt',
transform:
savedLeft !== null
? 'none'
: 'translateX(-50%)',
'z-index': 111111111,
zoom: scale / 100,
background: '#fff',
color: '#000',
border: '2px solid #555',
padding: '5px',
width: '520px',
'max-width': 'calc(100vw - 20px)',
'max-height': '90vh',
'overflow-y': 'auto',
'font-size': '12px',
'box-shadow':
'2px 2px 10px rgba(0,0,0,.45)'
});
const title =
$('<div>')
.text(
'出兵先：(' +
x + ', ' + y +
')　←ここをドラッグ'
)
.css({
'font-weight': 'bold',
'font-size': '12px',
padding: '3px',
background: '#ddd',
'border-bottom':
'1px solid #888'
});
panel.append($('<style>').text(`
#wrapTroopArea button, #wrapTroopArea select {font-size:11px; padding:0 3px; min-height:18px; height:auto;}
#wrapTroopArea input[type=checkbox], #wrapTroopArea input[type=radio] {margin:0 2px; vertical-align:middle;}
#wrapTroopArea .attackGeneralListTbl {width:100%!important; margin:0!important; border-spacing:0; table-layout:fixed; font-size:11px;}
#wrapTroopArea .attackGeneralListTbl tr {height:auto!important;}
#wrapTroopArea .attackGeneralListTbl td {padding:2px 3px!important; height:auto!important; line-height:1.15!important;}
#wrapTroopArea .attackGeneralListTbl td:first-child {width:140px!important; max-width:140px; text-align:center!important;}
#wrapTroopArea .attackGeneralListTbl td img {width:36px!important; height:auto!important; max-width:36px!important; vertical-align:middle;}
#wrapTroopArea .attackGeneralListTbl td p {margin:0!important;}
#wrapTroopArea .attackGeneralListTbl td br {line-height:1;}
#wrapTroopArea .MapTroopStatus {text-align:left!important; white-space:nowrap; font-size:11px; font-variant-numeric:tabular-nums;}
#wrapTroopArea .MapTroopStatus div:not(.MapTroopMarchTime) {margin:0!important; padding:0!important; line-height:1.3!important;}
#wrapTroopArea .MapTroopPortrait {width:90px!important; white-space:nowrap; font-size:10px; text-align:left!important;}
#wrapTroopArea .MapTroopSkills {text-align:left; font-size:11px; line-height:1.2; margin-top:2px;}
#wrapTroopArea .MapTroopSkills label {display:inline-block; margin-right:3px;}
#wrapTroopArea .attackGeneralListTbl td {vertical-align:top!important;}
#wrapTroopArea .MapTroopActionHead {display:grid;grid-template-columns:48px 1fr;align-items:center;gap:3px;min-height:20px;text-align:left;}
#wrapTroopArea .MapTroopActionHead > button {width:48px;box-sizing:border-box;margin:0!important;}
#wrapTroopArea .MapTroopRate {font-size:10px;white-space:nowrap;line-height:1.2;text-align:left;}
#wrapTroopArea .MapTroopSkillSlot {min-height:20px;margin-top:2px;}
#wrapTroopArea .MapTroopSkillSlot .MapTroopSkills {display:flex;flex-wrap:wrap;gap:2px;justify-content:flex-start;margin:0;}
#wrapTroopArea .MapTroopSkillSlot button {margin:0!important;}
#wrapTroopArea .MapTroopPortrait > div {min-height:40px;}
#wrapTroopArea td.MapTroopActionCell {vertical-align:top!important;text-align:left!important;}
#wrapTroopArea .MapTroopActionHead {display:flex!important;justify-content:center;min-height:20px;}
#wrapTroopArea .MapTroopRateSlot {display:block!important;min-height:14px;line-height:14px;text-align:center!important;margin:2px 0;overflow:hidden;}
#wrapTroopArea .MapTroopRateSlot .MapTroopRate {font-size:11px;line-height:14px;white-space:nowrap;}
#wrapTroopArea .MapTroopSkillSlot {display:block!important;margin:2px 0 0!important;}
                #wrapTroopArea .MapTroopMarchTime {display:block;font-size:11px;line-height:1.1!important;margin:1px 0 0!important;padding:0!important;white-space:nowrap;color:#444;font-variant-numeric:tabular-nums;}
@media (max-width:600px), (pointer:coarse) {
#wrapTroopArea {width:calc(100vw - 16px)!important; max-width:calc(100vw - 16px)!important; box-sizing:border-box; padding:2px!important;}
#wrapTroopArea .attackGeneralListTbl td:first-child {width:90px!important;max-width:90px!important;}
#wrapTroopArea .attackGeneralListTbl col:nth-child(1) {width:90px!important;}
#wrapTroopArea .attackGeneralListTbl col:nth-child(2) {width:64px!important;}
#wrapTroopArea .MapTroopPortrait {width:64px!important;}
#wrapTroopArea .MapTroopPortrait > div {flex-direction:column;gap:0!important;}
#wrapTroopArea .MapTroopStatus > div:not(.MapTroopMarchTime) {display:flex!important;flex-wrap:wrap;gap:0 6px;white-space:normal;}
#wrapTroopArea .MapTroopActionHead {grid-template-columns:1fr;gap:4px;text-align:center;}
#wrapTroopArea .MapTroopActionHead > button {width:100%;}
#wrapTroopArea .MapTroopRateSlot {min-height:20px;line-height:20px;}
#wrapTroopArea .MapTroopRateSlot .MapTroopRate {font-size:13px;line-height:20px;text-align:center;}
#wrapTroopArea .MapTroopSkillSlot {min-height:0;margin-top:6px;}
#wrapTroopArea .MapTroopSkillSlot .MapTroopSkills {flex-direction:column;gap:6px;}
#wrapTroopArea {font-size:14px!important;}
#wrapTroopArea button, #wrapTroopArea select {font-size:16px!important;min-height:44px!important;min-width:44px;padding:6px 8px!important;touch-action:manipulation;}
#wrapTroopArea .attackGeneralListTbl td {padding:5px 4px!important;}
#wrapTroopArea .attackGeneralListTbl td:first-child {width:110px!important;max-width:110px!important;}
#wrapTroopArea .attackGeneralListTbl col:nth-child(1) {width:110px!important;}
#wrapTroopArea .MapTroopSkills {display:flex;flex-direction:column;gap:6px;margin-top:6px;font-size:14px;}
#wrapTroopArea .MapTroopSkills button {width:100%;margin:0!important;white-space:normal;line-height:1.3;}
#wrapTroopArea .MapTroopStatus {font-size:14px!important;}
#wrapTroopArea .MapTroopPortrait {font-size:12px!important;}
#wrapTroopArea input[type=checkbox] {width:22px;height:22px;margin:0 4px!important;}
#wrapTroopArea .attackGeneralListTbl td:first-child > button {width:100%;}
#wrapTroopArea .attackGeneralListTbl td:first-child > span {display:block;margin:4px 0!important;font-size:14px;}
}
`));
panel.append(title);
enableDrag(panel, title);
const settings =
$('<div>').css({
padding: '2px',
display: 'flex',
'flex-wrap': 'wrap',
gap: '2px 10px',
background: '#f5f5f5',
'border-bottom':
'1px solid #aaa'
});
const positionRow =
settingRow('位置');
const positionMode =
$('<select>')
.append(
$('<option>')
.val('0')
.text('手動保存')
)
.append(
$('<option>')
.val('1')
.text('自動保存')
);
positionMode.val(
load(KEY.autoPos, '0')
);
positionMode.on(
'change',
function () {
save(
KEY.autoPos,
positionMode.val()
);
}
);
const savePosition =
$('<button type="button">')
.text('位置保存')
.css('margin-left', '5px')
.on('click', function () {
const rect =
panel[0]
.getBoundingClientRect();
save(
KEY.left,
Math.round(rect.left)
);
save(
KEY.top,
Math.round(rect.top)
);
const button = $(this);
button.text('保存済');
setTimeout(
() =>
button.text(
'位置保存'
),
700
);
});
const resetPosition =
$('<button type="button">')
.text('リセット')
.css('margin-left', '5px')
.on('click', function () {
localStorage.removeItem(
KEY.left
);
localStorage.removeItem(
KEY.top
);
panel.css({
left: '50%',
top: '100pt',
transform:
'translateX(-50%)'
});
});
positionRow.append(
positionMode,
savePosition,
resetPosition
);
settings.append(positionRow);
const sizeRow =
settingRow('倍率');
const minus =
$('<button type="button">').text('－');
const plus =
$('<button type="button">').text('＋');
const scaleText =
$('<span>').css({
display: 'inline-block',
width: '55px',
'text-align': 'center',
'font-weight': 'bold'
});
const resetScale =
$('<button type="button">')
.text('リセット')
.css('margin-left', '5px');
function applyScale() {
scaleText.text(
scale + '%'
);
panel.css(
'zoom',
scale / 100
);
save(
panelScaleKey,
scale
);
}
minus.on(
'click',
function () {
scale =
Math.max(
touchPanel ? 100 : 70,
scale - 10
);
applyScale();
}
);
plus.on(
'click',
function () {
scale =
Math.min(
130,
scale + 10
);
applyScale();
}
);
resetScale.on(
'click',
function () {
scale = 100;
applyScale();
}
);
sizeRow.append(
minus,
scaleText,
plus,
resetScale
);
settings.append(sizeRow);
const lvRow =
settingRow('Lv0表示');
const lvSelect =
$('<select>')
.append(
$('<option>')
.val('show')
.text('表示')
)
.append(
$('<option>')
.val('hide')
.text('非表示')
);
lvSelect.val(
load(KEY.lv0, 'hide')
);
lvRow.append(lvSelect);
const moveLabel =
$('<span>')
.text('出兵種別')
.css({
display: 'inline-block',
'font-weight': 'bold',
'margin-left': '20px',
'margin-right': '10px'
});
const moveSelect =
$('<select>')
.append(
$('<option>')
.val('302')
.text('出兵')
)
.append(
$('<option>')
.val('303')
.text('強襲')
)
.append(
$('<option>')
.val('301')
.text('援軍')
);
moveSelect.append($('<option>').val('307').text('鹵獲'));
moveSelect.val(
String(getMoveType())
);
lvRow.append(
moveLabel,
moveSelect
);
settings.append(
lvRow
);
panel.append(
settings
);
const returnBox=$('<details class="MapTroopReturns">').css({'font-size':'11px',margin:'1px 0',padding:'0 3px'});
const returnSummary=$('<summary>').text('帰還 取得中…').css({cursor:'pointer','line-height':'20px'}).appendTo(returnBox);
const returnBody=$('<div>').css({'max-height':'100px',overflow:'auto'}).appendTo(returnBox);
const returnRefresh=$('<button type="button">').text('更新').css({'margin':'2px 0'}).appendTo(returnBody);
const returnList=$('<div>').appendTo(returnBody);
let returnUnits=[],returnSnapshot=0,returnRequest=null;
function paintReturns() {
const elapsed=Math.floor((performance.now()-returnSnapshot)/1000);
if(!returnUnits.length)return;
const minimum=Math.min(...returnUnits.map(unit=>Math.max(0,unit.seconds-elapsed)));
returnSummary.text('帰還 '+returnUnits.length+'部隊 · 最短 '+formatRemaining(minimum));
returnList.empty();
returnUnits.forEach(unit=>{
$('<div>').css({'line-height':'1.3',padding:'2px 0'}).text(unit.name+' · 残り '+formatRemaining(unit.seconds-elapsed))
.attr('title',unit.destination+'／帰還時刻 '+unit.arrival).appendTo(returnList);
$('<div>').css({color:'#555','font-size':'10px'}).text('帰還 '+unit.arrival).appendTo(returnList);
});
}
function refreshReturns() {
if(returnRequest)return;
returnRefresh.prop('disabled',true);
returnRequest=$.ajax({url:'/facility/unit_status.php?type=return',type:'GET',cache:false,dataType:'html'})
.done(html=>{
if(!panel[0].isConnected)return;
const doc=new DOMParser().parseFromString(html,'text/html');
returnUnits=extractReturningUnits(doc);returnSnapshot=performance.now();
returnList.empty();
if(returnUnits.length)paintReturns();
else {
const text=doc.body.textContent;
const empty=/帰還(?:中)?(?:の)?(?:部隊|武将)(?:は|が)?(?:いません|ありません|存在しません)/.test(text);
returnSummary.text(empty ? '帰還 0部隊' : '帰還 情報を確認');
$('<a>').attr({href:'/facility/unit_status.php?type=return',target:'_blank',rel:'noopener'}).text('公式の帰還一覧を開く').appendTo(returnList);
}
}).fail(()=>{if(panel[0].isConnected)returnSummary.text('帰還 取得エラー');})
.always(()=>{returnRequest=null;returnRefresh.prop('disabled',false);});
}
returnRefresh.on('click',function(event){event.preventDefault();commanderNameLookupAttempted=false;refreshReturns();tripEngine.refresh().catch(()=>{});});
panel.append(returnBox);
const returnClock=setInterval(()=>{
if(!panel[0].isConnected){clearInterval(returnClock);if(returnRequest)returnRequest.abort();return;}
if(returnUnits.length)paintReturns();
},1000);
setTimeout(()=>{if(panel[0].isConnected)refreshReturns();},0);
const cardArea =
$('<div>');
panel.append(
cardArea
);
let source =
$(data).find(
'.attackGeneralListTbl'
);
source.each(function(){const id=$(this).find('input[name="unit_assign_card_id"]').first().val();if(id)cardTemplates.set(String(id),$(this).clone());});
function mergeTrackedTemplates(){
const present=new Set(source.find('input[name="unit_assign_card_id"]').map(function(){return String(this.value);}).get());
tripEngine.jobs.forEach((_job,id)=>{if(!present.has(id) && cardTemplates.has(id))source=source.add(cardTemplates.get(id).clone());});
}
mergeTrackedTemplates();
const previewCache = new Map();
const previewPage = $('<div>').append($.parseHTML(data, document, false));
collectCommanderNames(previewPage);applyCommanderNames();
const previewRadio = previewPage.find('input[name="unit_assign_card_id"]').first();
const previewForm = previewRadio.closest('form').length ? previewRadio.closest('form') : previewPage.find('form').filter(function () { return $(this).find('input[name="unit_assign_card_id"]').length; }).first();
function getPreviewFields(cardId) {
if (!previewForm.length) return null;
const fields = previewForm.find(':input[name]').filter(function () {
const el = $(this);
const type = (el.attr('type') || '').toLowerCase();
if (['submit', 'button', 'image', 'file', 'reset'].includes(type)) return false;
if ((type === 'checkbox' || type === 'radio') && !el.prop('checked')) return false;
return !el.prop('disabled');
}).map(function () {
return {name: this.name, value: $(this).val() || ''};
}).get();
function put(name, value) {
for (let i = fields.length - 1; i >= 0; i--) {
if (fields[i].name === name) fields.splice(i, 1);
}
fields.push({name, value: String(value)});
}
put('unit_assign_card_id', cardId);
put('village_x_value', x);
put('village_y_value', y);
put('radio_reserve_type', 0);
put('btn_preview', 302);
fields.forEach(f => {
if (/^use_skill_id\[/.test(f.name)) f.value = '0';
if (/^friendly_army_.*_count$/.test(f.name)) f.value = '0';
});
return fields.filter(f => !/^(btn_send|radio_move_type)$/.test(f.name));
}
function extractWinRate(html) {
const doc = new DOMParser().parseFromString(html, 'text/html');
const visible = (doc.body?.textContent || '').replace(/\s+/g, ' ');
const raw = String(html).replace(/&nbsp;|&#160;/gi, ' ');
const sources = [visible, raw];
const patterns = [
/勝\s*利\s*確\s*率[\s\S]{0,180}?([0-9]{1,3}(?:\.[0-9]+)?)\s*[%％]/i,
/(?:win[_-]?rate|victory[_-]?rate|winning[_-]?rate|probability)[^0-9]{0,90}([0-9]{1,3}(?:\.[0-9]+)?)\s*[%％]?/i
];
for (const str of sources) {
for (const pattern of patterns) {
const m = str.match(pattern);
if (m && Number(m[1]) <= 100) return m[1] + '%';
}
}
for (const el of doc.querySelectorAll('img, [style], [data-rate]')) {
const attrs = ['alt', 'title', 'src', 'style', 'data-rate']
.map(k => el.getAttribute(k) || '').join(' ');
for (const pattern of patterns) {
const m = attrs.match(pattern);
if (m && Number(m[1]) <= 100) return m[1] + '%';
}
}
return null;
}
const skillStates = new Map();
const submittedCards = {has:id=>tripEngine.jobs.has(String(id)) || pendingSends.has(String(id))};
tripEngine.jobs.forEach(job=>{
const original=cardTemplates.get(job.id);
if(original)job.nameHints=mapTroopList(new Set([...job.nameHints,...readCommanderHints(original,job.id,previewPage)]));
});
const rateRow = settingRow('勝率');
const alwaysRate = $('<input type="checkbox">').prop('checked', load(KEY.alwaysRate, '1') === '1');
const threshold = $('<select>').append($('<option>').val('off').text('赤色化なし'));
[50,60,70,80,90,100].forEach(n => threshold.append($('<option>').val(n).text(n + '%以下で赤')));
threshold.val(load(KEY.threshold, '80'));
rateRow.append($('<label>').append(alwaysRate, ' 常時表示'), threshold);
settings.append(rateRow);
alwaysRate.on('change', () => { save(KEY.alwaysRate, alwaysRate.prop('checked') ? '1' : '0'); drawCards(); });
threshold.on('change', () => { save(KEY.threshold, threshold.val()); drawCards(); });
function nativeSkills(original, id) {
if (skillStates.has(id)) return skillStates.get(id);
const controls = original.find(':input[name]').filter(function () {
if (!/^use_skill_id\[/.test(this.name) || !['select-one','checkbox','radio'].includes(this.type) || this.disabled) return false;
const cell = $(this).closest('td');
if (!/使用可能/.test(cell.text()) || /使用不可|使用不能/.test(cell.text())) return false;
if (this.tagName !== 'SELECT' && (!this.value || this.value === '0')) return false;
return true;
}).map(function () {
const control = $(this).clone();
if (this.tagName === 'SELECT') {
control.find('option').filter(function () { return !this.value || this.value === '0' || this.disabled || /スキルなし|スキル無し|使用不可|使用不能/.test(this.textContent); }).remove();
if (!control.find('option').length) return null;
}
const cell = $(this).closest('td');
const text = cell.find('a').first().text().trim();
control.attr('data-skill-label', text || this.getAttribute('aria-label') || this.title || (this.value === '0' ? 'スキルなし' : this.value));
control.removeAttr('id');
return control[0];
});
controls.each(function () { $(this).prop('checked', false); if (this.tagName === 'SELECT') $(this).val('0'); });
skillStates.set(id, controls);
return controls;
}
function toggleNativeSkill(controls, target, value) {
if (target.tagName === 'SELECT') {
if (target.value === value) target.selectedIndex = -1;
else target.value = value;
return;
}
const wasChecked = target.checked;
if (target.type === 'radio') {
mapTroopList(controls).forEach(control => {
if (control.type === 'radio' && control.name === target.name) control.checked = false;
});
}
target.checked = !wasChecked;
}
function readMarchTime(text) {
const duration=text.match(/到着まで\s*[:：]\s*([0-9]+):([0-5][0-9]):([0-5][0-9])/);
return duration ? duration.slice(1).join(':') : null;
}
function extractMarchTime(html) {
const doc=new DOMParser().parseFromString(html,'text/html');
doc.querySelectorAll('script,style').forEach(node=>node.remove());
return readMarchTime(doc.body.textContent.replace(/\s+/g,' '));
}
function attachWinRateHover(table, cardId, button, controls) {
const img = table.find('img').first();
const marchText=$('<div class="MapTroopMarchTime">').css({'font-size':'11px','white-space':'nowrap','margin-top':'1px','line-height':'1.1'}).text('行軍 …').toggle(moveSelect.val()==='302').appendTo(table.find('.MapTroopStatus').first());
const rateText = $('<span class="MapTroopRate">').appendTo(table.find('.MapTroopRateSlot').first());
let tip = null, token = 0;
function update(force) {
const version = ++token;
button.css({background:'',color:''});
rateText.toggle(alwaysRate.prop('checked') && moveSelect.val() === '302');
if (moveSelect.val() !== '302' || !table.closest('body').length || tripEngine.jobs.has(String(cardId))) return;
const selected = controls.serializeArray();
const key = mapTroopStringify([x,y,cardId,selected]);
function show(rate, message) {
if (version !== token || !table.closest('body').length) return;
const text = rate ? '勝率：' + rate : message;
rateText.text(text); if (tip) tip.text(text);
if (rate && threshold.val() !== 'off' && parseFloat(rate) <= Number(threshold.val()))
button.css({background:'#c62828',color:'#fff'});
}
if (!force && previewCache.has(key)) { const cached=previewCache.get(key); show(cached.rate); marchText.text(cached.march ? '行軍 '+cached.march : '行軍 —'); return; }
show(null, '勝率：取得中…');
marchText.text('行軍 …');
const fields = getPreviewFields(cardId);
if (!fields) { show(null, '勝率：フォーム取得不可'); marchText.text('行軍 —'); return; }
const names = new Set(controls.map(function () {return this.name;}).get());
const payload = fields.filter(f => !names.has(f.name));
names.forEach(name => { if (!selected.some(f => f.name === name)) payload.push({name, value:'0'}); });
payload.push(...selected);
const request = $.ajax({url:'/facility/castle_send_troop.php',type:'POST',data:$.param(payload),dataType:'html'});
request.done(html => {
const rate=extractWinRate(html),march=extractMarchTime(html);
if(version!==token || !table.closest('body').length || tripEngine.jobs.has(String(cardId)))return;
if(rate || march)previewCache.set(key,{rate,march});
show(rate,'勝率：解析不可');
marchText.text(march ? '行軍 '+march : '行軍 —');
}).fail(() => {show(null,'勝率：通信エラー');if(version===token && !tripEngine.jobs.has(String(cardId)))marchText.text('行軍 —');});
}
img.css('cursor','help').on('mouseenter', function () {
if (moveSelect.val() !== '302') return;
tip = $('<div class="MapTroopRateTip">').css({position:'fixed','z-index':111111115,background:'#222',color:'#fff',padding:'6px', 'pointer-events':'none'}).appendTo('body');
const r=this.getBoundingClientRect(); tip.css({left:Math.max(0,Math.min(r.right+5,innerWidth-200)),top:Math.max(0,r.top)});
update(false);
}).on('mouseleave', () => { if(tip) tip.remove(); tip=null; });
controls.off('change').on('change', () => update(true));
if(moveSelect.val() === '302') setTimeout(() => { if(table.closest('body').length) update(false); }, 0);
}
function compactStatusLines(text) {
const normalized = text.replace(/\s+/g, ' ').trim();
function value(label) {
const match = normalized.match(new RegExp(label + '\\s*([0-9][0-9,]*(?:\\.[0-9]+)?)'));
return match ? match[1] : null;
}
const attack = value('攻撃'), speed = value('速度');
if (attack === null || speed === null) return null;
const troop = normalized.match(/兵科\s*(.*?)(?=\s*(?:HP|討|計|攻撃)|$)/);
const hp = value('HP'), total = value('(?:討伐(?:ゲージ)?|討|計)');
return [
[troop ? '兵科 ' + troop[1] : '', hp !== null ? 'HP ' + hp : '', total !== null ? '討伐 ' + total : ''].filter(Boolean).join('　'),
'攻撃 ' + attack + '　速度 ' + speed
];
}
function compactStatusCells(table) {
table.find('td').each(function () {
const cell = $(this);
if (cell.find('img, :input').length) return;
const walker = document.createTreeWalker(cell[0], NodeFilter.SHOW_TEXT);
const parts = [];
while (walker.nextNode()) parts.push(walker.currentNode.textContent);
const lines = compactStatusLines(parts.join(' '));
if (!lines) return;
cell.empty().addClass('MapTroopStatus');
lines.forEach(line => {
const row = $('<div>').css({display:'grid', 'grid-template-columns':line.startsWith('攻撃') ? '125px 1fr' : '70px 60px 1fr'});
line.split('　').forEach(part => row.append($('<span>').text(part)));
cell.append(row);
});
});
table.find('img').each(function () {
const cell = $(this).closest('td');
const img = $(this).detach();
const level = cell.text().match(/Lv\s*(\d+)/);
cell.empty().addClass('MapTroopPortrait')
.append($('<div>').css({display:'flex','align-items':'center',gap:'4px'})
.append(img, $('<span>').text(level ? 'Lv' + level[1] : '').css({color:'#298fb9'})));
});
}
function readOfficialSpeed(text) {
const matches=mapTroopList(text.replace(/[,，]/g,'').matchAll(/(?:移動)?速度\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)/g));
return matches.length===1 ? Number(matches[0][1]) : null;
}
function compareOfficialSpeed(a,b) {
if(a.speed===null && b.speed===null)return a.index-b.index;
if(a.speed===null)return 1;
if(b.speed===null)return -1;
return b.speed-a.speed || a.index-b.index;
}
function sortedOfficialCards() {
return source.toArray().map((element,index)=>{
const row=$(element).find('tr').eq(1)[0],parts=[];
if(row){const walker=document.createTreeWalker(row,NodeFilter.SHOW_TEXT);while(walker.nextNode())parts.push(walker.currentNode.textContent);}
return {element,index,speed:readOfficialSpeed(parts.join(' '))};
}).sort(compareOfficialSpeed).map(item=>item.element);
}
function drawCards() {
$('.MapTroopRateTip').remove();
skillStates.forEach(controls => controls.detach());
cardArea.empty();
const hideLv0 =
lvSelect.val() === 'hide';
const moveType = moveSelect.val();
const buttonName =
MOVE_TYPES[moveType].name;
$(sortedOfficialCards()).each(function () {
const table =
$(this).clone();
const mainRadio = table.find('input[name="unit_assign_card_id"]').first();
const mainRow = mainRadio.closest('tr');
const firstLv = mainRow.find('strong').filter(function () { return $(this).text().trim() === 'Lv'; }).first();
const lvMatch = firstLv.length ? (firstLv[0].nextSibling?.textContent || '').match(/^\s*(\d+)/) : null;
if (hideLv0 && lvMatch && Number(lvMatch[1]) === 0) return;
table.css({
margin: 0
});
table
.find('th')
.remove();
table
.find('.left')
.remove();
const radio =
table.find(
'input[name="unit_assign_card_id"]'
).eq(0);
if (!radio.length) {
return;
}
const id =
radio.val();
table.attr('data-map-troop-id',String(id));
const skills = nativeSkills($(this), id);
const canSkill = moveType === '302' || moveType === '303';
skills.prop('disabled', !canSkill);
if (
localStorage.getItem(
SERVER_NAME + '-' + id
) === 'hide'
) {
return;
}
const targetTr =
table
.find('tr')
.eq(1)
.clone();
table
.find('tbody')
.empty()
.append(
targetTr
);
table
.find('input')
.remove();
compactStatusCells(table);
table.find('td').removeAttr('rowspan colspan width align');
table.find('td').first().css('width','140px');
table.children('colgroup').remove();
if (table.find('td.MapTroopStatus').length && table.find('td.MapTroopPortrait').length) {
table.prepend($('<colgroup>').append($('<col>').css('width','140px'), $('<col>').css('width','90px'), $('<col>')));
}
const troopButton =
$('<button type="button">')
.text(
buttonName
)
.css({
'font-weight':
'bold'
})
.on(
'click',
function (e) {
e.preventDefault();
e.stopPropagation();
if (submittedCards.has(String(id)) || $(this).prop('disabled')) return;
const selectedSkillFields = canSkill ? skills.serializeArray() : [];
const sentAt=Date.now();
const cacheKey=mapTroopStringify([x,y,id,selectedSkillFields]);
const marchEntry=previewCache.get(cacheKey);
const seconds=durationSeconds(marchEntry && marchEntry.march);
const nativeCard=cardTemplates.get(String(id));
const nameHints=readCommanderHints(nativeCard || $(this).closest('table'),id,previewPage);
pendingSends.add(String(id));
const currentType =
parseInt(
moveSelect.val(),
10
);
const currentName =
MOVE_TYPES[
currentType
].name;
const button =
$(this);
button
.prop(
'disabled',
true
)
.text(
currentName +
'中...'
);
troop(
x,
y,
id,
currentType,
selectedSkillFields
)
.done(
function () {
tile
.find(
'.tile-inner-rect'
)
.addClass(
'trooped'
)
.removeClass(
'clicked'
)
.css(
'fill',
'#00FF00'
);
pendingSends.delete(String(id));
tripEngine.add({id,seconds,sentAt,nameHints:mapTroopList(new Set(nameHints))});
button.prop('disabled', true).text('行軍中');
skills.prop('disabled', true);
table.find('.MapTroopSkills button').prop('disabled', true);
table.css('opacity', '0.55');
$('.MapTroopRateTip').remove();
}
)
.fail(
function () {
pendingSends.delete(String(id));
button
.prop(
'disabled',
false
)
.text(
currentName
);
alert(
currentName +
'に失敗しました'
);
}
);
}
);
const actionCell = table.find('td').first().addClass('MapTroopActionCell');
const actionHead = $('<div class="MapTroopActionHead">').append(troopButton);
actionCell.append(actionHead, $('<div class="MapTroopRateSlot">'));
const skillSlot = $('<div class="MapTroopSkillSlot">').appendTo(actionCell);
if (canSkill && skills.length) {
const skillBox = $('<div class="MapTroopSkills">')
.attr('title', 'クリックで選択、再クリックで解除。選択したスキルを出兵時に使用');
const skillButtons = [];
skills.prop('disabled', false).hide().appendTo(skillBox);
function refreshSkillButtons() {
skillButtons.forEach(({button, control, value}) => {
const selected = control.tagName === 'SELECT' ? control.value === value : control.checked;
button.attr('aria-pressed', selected ? 'true' : 'false')
.css({background:selected ? '#d9ecff' : '', color:selected ? '#06477c' : '',
'border-color':selected ? '#2879bb' : '', 'font-weight':selected ? 'bold' : 'normal'});
});
}
function addSkillButton(control, value, label) {
const button = $('<button type="button">').text(label)
.attr('title', 'クリックで選択／解除').css({'margin-right':'3px'})
.on('click', function () {
toggleNativeSkill(skills, control, value);
refreshSkillButtons();
$(control).trigger('change');
});
skillButtons.push({button, control, value});
skillBox.append(button);
}
skills.each(function () {
const control = this;
if (control.tagName === 'SELECT') {
mapTroopList(control.options).forEach(option => addSkillButton(control, option.value, option.textContent.trim()));
} else addSkillButton(control, control.value, control.getAttribute('data-skill-label'));
});
refreshSkillButtons();
skillSlot.append(skillBox);
}
attachWinRateHover(table, id, troopButton, skills);
cardArea.append(
table
);
renderTripRows();
});
if (
!cardArea
.children()
.length
) {
cardArea.append(
$('<div>')
.text(
'表示できる武将がありません'
)
.css(
'padding',
'10px'
)
);
}
}
lvSelect.on(
'change',
function () {
save(
KEY.lv0,
lvSelect.val()
);
drawCards();
}
);
moveSelect.on(
'change',
function () {
save(
KEY.moveType,
moveSelect.val()
);
drawCards();
}
);
const closeWrap =
$("<table class='general attackGeneralListTbl'>");
const closeButton =
$('<button type="button">')
.text('閉じる')
.on(
'click',
function () {
$('.MapTroopRateTip').remove();
$('#wrapTroopArea').remove();
$(document)
.off(
'.MapTroopDrag'
);
}
);
closeWrap.append(
$('<tbody>').append(
$('<tr>').append(
$('<td>').append(
closeButton
)
)
)
);
panel.append(
closeWrap
);
$(document.body)
.append(
panel
);
function renderTripRows(){
cardArea.children('table[data-map-troop-id]').each(function(){
const table=$(this),id=String(table.attr('data-map-troop-id')),job=tripEngine.jobs.get(id);
if(!job)return;
const remaining=Number.isFinite(job.deadline)?Math.max(0,Math.ceil((job.deadline-Date.now())/1000)):0;
const label=job.state==='marching'?'行軍 '+formatRemaining(remaining):job.state==='returning'?'帰還 '+formatRemaining(remaining):job.state==='awaitReady'?'帰還確認中':'帰還情報確認中';
let status=table.find('.MapTroopMarchTime').first();
if(!status.length)status=$('<div class="MapTroopMarchTime">').appendTo(table.find('.MapTroopStatus').first());
status.show().text(label);
table.find('.MapTroopActionHead button').prop('disabled',true).text(job.state==='marching'?'行軍中':job.state==='returning'?'帰還中':'確認中');
table.find('.MapTroopSkills button, .MapTroopSkills :input').prop('disabled',true);
table.css('opacity','0.6');
});
}
trackerContext={panel,render:renderTripRows,
returns:units=>{returnUnits=units;returnSnapshot=performance.now();if(units.length)paintReturns();},
ready:(snapshot,ids)=>{
const fresh=$('<div>').append($.parseHTML(snapshot.html,document,false));
const freshSource=fresh.find('.attackGeneralListTbl');
const freshIds=new Set();
freshSource.each(function(){const id=$(this).find('input[name="unit_assign_card_id"]').first().val();if(id){freshIds.add(String(id));cardTemplates.set(String(id),$(this).clone());}});
source=freshSource;
ids.forEach(id=>{skillStates.delete(id);});
previewForm.find(':input[type="hidden"]').each(function(){
const name=this.name;if(!name)return;
const replacement=fresh.find('form :input[type="hidden"]').filter(function(){return this.name===name;}).first();
if(replacement.length)$(this).val(replacement.val());
});
previewCache.clear();mergeTrackedTemplates();drawCards();renderTripRows();refreshReturns();
}
};
applyScale();
drawCards();renderTripRows();tripEngine.refresh().catch(()=>{});
}
function contextFunction(e) {
if (e.which !== 3) {
return;
}
const x =
e.currentTarget.dataset.x;
const y =
e.currentTarget.dataset.y;
const tile =
$(e.currentTarget);
$('.clicked')
.css(
'fill',
''
)
.removeClass(
'clicked'
);
tile
.find(
'.tile-inner-rect'
)
.addClass(
'clicked'
)
.css(
'fill',
'#FF00FF'
);
$('#wrapTroopArea')
.remove();
$(document)
.off(
'.MapTroopDrag'
);
$.ajax({
type: 'get',
cache: false,
dataType: 'html',
url:
'/facility/castle_send_troop.php'
}).done(
function (data) {
createPanel(
data,
x,
y,
tile
);
}
);
e.preventDefault();
return false;
}
$('.tile').on(
'click contextmenu',
contextFunction
);
const tapKey = SERVER_NAME + '_MapTroop_tap_mode';
const touchDevice = navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
let tapMode = load(tapKey, touchDevice ? '1' : '0') === '1';
const tapToggle = $('<button type="button" id="MapTroopTapToggle">').css({
position:'fixed',right:'8px',bottom:'8px','z-index':111111110,
padding:'8px 12px','font-size':'13px','min-height':'40px',
border:'1px solid #555','border-radius':'5px','touch-action':'manipulation'
}).appendTo('body');
function showTapMode() {
tapToggle.text('タップ出兵 ' + (tapMode ? 'ON' : 'OFF'))
.attr('aria-pressed', tapMode ? 'true' : 'false')
.css({background:tapMode ? '#d9ecff' : '#fff',color:'#111'});
}
tapToggle.on('click', function (event) {
event.preventDefault(); event.stopPropagation();
tapMode = !tapMode; save(tapKey, tapMode ? '1' : '0'); showTapMode();
});
showTapMode();
$('<style>').text('.tile, .tile * {touch-action:manipulation;}').appendTo('head');
document.addEventListener('click', function (event) {
if (!tapMode || event.target.closest('#wrapTroopArea, #MapTroopTapToggle')) return;
const tile = event.target.closest('.tile');
if (!tile || tile.dataset.x === undefined || tile.dataset.y === undefined) return;
event.preventDefault(); event.stopImmediatePropagation();
contextFunction({which:3,currentTarget:tile,preventDefault:function(){}});
}, true);
$('.btn_map_size').on(
'click',
function () {
setTimeout(
function () {
$('.tile')
.off(
'click contextmenu',
contextFunction
)
.on(
'click contextmenu',
contextFunction
);
},
1000
);
}
);
$('.btn_reload').on(
'click',
function () {
$('.trooped')
.css(
'fill',
''
)
.removeClass(
'trooped'
);
}
);
})(t$);
})();
