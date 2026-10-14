// ==UserScript==
// @name         ワンクリスマホ対応版
// @namespace    MapTroopTool
// @description  右クリ出兵
// @include      https://*.3gokushi.jp/*
// @include      http://*.3gokushi.jp/*
// @version      v2.2
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
#wrapTroopArea .MapTroopStatus div {margin:0!important; padding:0!important; line-height:1.3!important;}
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
@media (max-width:600px), (pointer:coarse) {
#wrapTroopArea {width:calc(100vw - 16px)!important; max-width:calc(100vw - 16px)!important; box-sizing:border-box; padding:2px!important;}
#wrapTroopArea .attackGeneralListTbl td:first-child {width:90px!important;max-width:90px!important;}
#wrapTroopArea .attackGeneralListTbl col:nth-child(1) {width:90px!important;}
#wrapTroopArea .attackGeneralListTbl col:nth-child(2) {width:64px!important;}
#wrapTroopArea .MapTroopPortrait {width:64px!important;}
#wrapTroopArea .MapTroopPortrait > div {flex-direction:column;gap:0!important;}
#wrapTroopArea .MapTroopStatus > div {display:flex!important;flex-wrap:wrap;gap:0 6px;white-space:normal;}
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
const cardArea =
$('<div>');
panel.append(
cardArea
);
const source =
$(data).find(
'.attackGeneralListTbl'
);
const previewCache = new Map();
const previewPage = $('<div>').append($.parseHTML(data, document, false));
const previewRadio = previewPage.find('input[name="unit_assign_card_id"]').first();
const previewForm = previewRadio.closest('form').length ? previewRadio.closest('form') : previewPage.find('form').filter(function () { return $(this).find('input[name="unit_assign_card_id"]').length; }).first();
let activePreview = null;
let hoverToken = 0;
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
const title = doc.title || '';
const hasRateLabel = /勝\s*利\s*確\s*率/.test(visible + raw);
const hasSendButton = !!doc.querySelector('input[name="btn_send"], button[name="btn_send"]');
console.info('[右クリ出兵v2.2] 確率解析結果', {
title, hasRateLabel, hasSendButton,
htmlLength: html.length,
imageCount: doc.images.length
});
return null;
}
const skillStates = new Map();
const submittedCards = new Set();
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
Array.from(controls).forEach(control => {
if (control.type === 'radio' && control.name === target.name) control.checked = false;
});
}
target.checked = !wasChecked;
}
function attachWinRateHover(table, cardId, button, controls) {
const img = table.find('img').first();
const rateText = $('<span class="MapTroopRate">').appendTo(table.find('.MapTroopRateSlot').first());
let tip = null, token = 0;
function update(force) {
const version = ++token;
button.css({background:'',color:''});
rateText.toggle(alwaysRate.prop('checked') && moveSelect.val() === '302');
if (moveSelect.val() !== '302' || !table.closest('body').length) return;
const selected = controls.serializeArray();
const key = JSON.stringify([x,y,cardId,selected]);
function show(rate, message) {
if (version !== token || !table.closest('body').length) return;
const text = rate ? '勝率：' + rate : message;
rateText.text(text); if (tip) tip.text(text);
if (rate && threshold.val() !== 'off' && parseFloat(rate) <= Number(threshold.val()))
button.css({background:'#c62828',color:'#fff'});
}
if (!force && previewCache.has(key)) { show(previewCache.get(key)); return; }
show(null, '勝率：取得中…');
const fields = getPreviewFields(cardId);
if (!fields) { show(null, '勝率：フォーム取得不可'); return; }
const names = new Set(controls.map(function () {return this.name;}).get());
const payload = fields.filter(f => !names.has(f.name));
names.forEach(name => { if (!selected.some(f => f.name === name)) payload.push({name, value:'0'}); });
payload.push(...selected);
const request = $.ajax({url:'/facility/castle_send_troop.php',type:'POST',data:$.param(payload),dataType:'html'});
request.done(html => { const rate = extractWinRate(html); if (rate && version === token) previewCache.set(key,rate); show(rate,'勝率：解析不可'); })
.fail(() => show(null,'勝率：通信エラー'));
}
img.css('cursor','help').on('mouseenter', function () {
if (moveSelect.val() !== '302') return;
tip = $('<div class="MapTroopRateTip">').css({position:'fixed','z-index':111111115,background:'#222',color:'#fff',padding:'6px', 'pointer-events':'none'}).appendTo('body');
const r=this.getBoundingClientRect(); tip.css({left:Math.max(0,Math.min(r.right+5,innerWidth-200)),top:Math.max(0,r.top)});
update(false);
}).on('mouseleave', () => { if(tip) tip.remove(); tip=null; });
controls.off('change').on('change', () => update(true));
if(alwaysRate.prop('checked') || threshold.val() !== 'off') setTimeout(() => { if(table.closest('body').length) update(false); }, 0);
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
function drawCards() {
$('.MapTroopRateTip').remove();
skillStates.forEach(controls => controls.detach());
cardArea.empty();
const hideLv0 =
lvSelect.val() === 'hide';
const moveType = moveSelect.val();
const buttonName =
MOVE_TYPES[moveType].name;
source.each(function () {
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
if (submittedCards.has(String(id))) return;
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
submittedCards.add(String(id));
button.prop('disabled', true).text('送信済');
skills.prop('disabled', true);
table.find('.MapTroopSkills button').prop('disabled', true);
table.css('opacity', '0.55');
$('.MapTroopRateTip').remove();
}
)
.fail(
function () {
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
Array.from(control.options).forEach(option => addSkillButton(control, option.value, option.textContent.trim()));
} else addSkillButton(control, control.value, control.getAttribute('data-skill-label'));
});
refreshSkillButtons();
skillSlot.append(skillBox);
}
attachWinRateHover(table, id, troopButton, skills);
cardArea.append(
table
);
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
applyScale();
drawCards();
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
