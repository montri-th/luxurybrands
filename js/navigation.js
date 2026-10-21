/** Approved LDS nav-7 glyphs only. Codepoints verified from this exact font's
 * cmap + GSUB tables; clear/launch aliases are intentionally not used because
 * the registry approves only the seven names below. Unsupported actions retain
 * visible text and explanatory titles instead of borrowing misleading symbols.
 */
export const NAV_GLYPHS=Object.freeze({
 open_in_new:'\uE89E',menu:'\uE5D2',close:'\uE5CD',
 light_mode:'\uE518',dark_mode:'\uE51C',contrast:'\uEB37',groups:'\uF233',
});
export const NAV_ICON_CONTRACT=Object.freeze({
 assetId:'icon.material-symbols-rounded.nav-7.300.01',
 file:'assets/icons/material-nav-300.woff2',bytes:2500,
 sha256:'d7e283106ed2898726b24504c4e0f5ad524292984a90a4d29553c7dcf53b9657',
 axes:Object.freeze({FILL:0,wght:300,GRAD:0,opsz:24}),
 fallback:'Visible labels remain usable; hide icon glyphs if the font cannot load.',
});

function makeIcon(name){
 if(!Object.hasOwn(NAV_GLYPHS,name))throw new Error(`Unapproved navigation glyph: ${name}`);
 const icon=document.createElement('span');icon.className='nav-icon';
 icon.dataset.navIcon=name;icon.setAttribute('aria-hidden','true');icon.textContent=NAV_GLYPHS[name];
 return icon;
}
function decorate(element,name){
 if(!element)return;
 const current=[...element.children].find(child=>child.classList.contains('nav-icon'));
 if(current?.dataset.navIcon===name)return;
 if(current)current.replaceWith(makeIcon(name));else element.prepend(makeIcon(name));
 element.classList.add('nav-decorated');
}
function removeDecoration(element){
 if(!element)return;
 for(const child of [...element.children])if(child.classList.contains('nav-icon'))child.remove();
 element.classList.remove('nav-decorated');
}
function decorateNavigation(){
 const byId=(id,name)=>decorate(document.getElementById(id),name);
 byId('close-help','close');byId('mobile-panel','menu');
 byId('close-mobile-panel','close');byId('toggle-table','close');
 byId('clear-selection','close');
 for(const id of ['open-help','open-table','toggle-insights'])removeDecoration(document.getElementById(id));
 const mode=document.getElementById('theme');
 if(mode)decorate(mode.closest('label'),mode.value==='dark'?'dark_mode':mode.value==='light'?'light_mode':'contrast');
 removeDecoration(document.querySelector('.method summary'));
 for(const anchor of document.querySelectorAll('.source-link[target="_blank"],.method a[target="_blank"],.usage-dialog a[target="_blank"],.top-actions a[target="_blank"]')){
  // This glyph only marks destinations that really open a new browsing context.
  decorate(anchor,'open_in_new');
  for(const node of [...anchor.childNodes])if(node.nodeType===Node.TEXT_NODE&&node.textContent.includes('↗'))node.textContent=node.textContent.replace(/\s*↗/g,'');
 }
 const titles={
  'fit-map':'ปรับแผนที่ให้เห็นจุดขายตามตัวกรองทั้งหมด',
  'bangkok-map':'กลับไปดูพื้นที่กรุงเทพฯ',
  'toggle-centers':'แสดงหรือซ่อนอาคาร 3D',
  'toggle-neighborhoods':'แสดงหรือซ่อนขอบเขตย่าน',
  'mobile-panel':'เปิดข้อมูลและตัวกรอง',
  'open-help':'เปิดวิธีใช้',
  'toggle-insights':'เปิดหรือย่อกราฟเปรียบเทียบตามตัวกรองปัจจุบัน',
  'open-table':'เปิดรายการจุดขายตามตัวกรองปัจจุบัน',
  'toggle-table':'ปิดตารางและกลับไปแผนที่',
  'search':'ค้นหาจากชื่อแบรนด์ จุดขาย ทำเล ย่าน หรือจังหวัด',
  'cohort':'เลือกรายการปัจจุบัน ประวัติเดิม หรือร้านปิดถาวร',
  'segment':'เลือกกลุ่มแบรนด์',
  'province':'กรองจุดขายตามจังหวัด',
  'channel':'แยกร้านในศูนย์การค้า ร้าน standalone เคาน์เตอร์ และรูปแบบอื่น',
  'venue':'กรองศูนย์การค้าหรือทำเลตามชื่อที่ระบุ',
  'neighborhood':'เลือกย่าน',
  'prev-page':'ดูหน้าก่อนหน้าของตาราง',
  'next-page':'ดูหน้าถัดไปของตาราง',
  'tab-centers':'เปรียบเทียบแบรนด์ในแต่ละย่าน',
  'tab-mix':'ดูบุคลิกของย่านผ่านกลุ่มแบรนด์',
  'tab-compare':'เปรียบเทียบแบรนด์เฉพาะย่านและแบรนด์ที่พบร่วมกัน',
  'tab-neighborhoods':'ดูจุดขายในแต่ละย่าน',
 };
 for(const [id,title]of Object.entries(titles)){const element=document.getElementById(id);if(element&&element.title!==title)element.title=title;}
 const reset=document.querySelector('#filters button[type="reset"]');
 if(reset)reset.title='ล้างตัวกรอง';
}

function installHelp(){
 const dialog=document.getElementById('usage-help'),opener=document.getElementById('open-help'),close=document.getElementById('close-help');
 if(!dialog||!opener||!close)return;
 let returnFocus=opener;
 opener.addEventListener('click',()=>{
  returnFocus=document.activeElement instanceof HTMLElement?document.activeElement:opener;
  if(!dialog.open)dialog.showModal();
  close.focus({preventScroll:true});
 });
 close.addEventListener('click',()=>dialog.close());
 // Native dialog supplies modal focus containment and Escape/cancel behavior.
 dialog.addEventListener('close',()=>{
  const target=returnFocus?.isConnected?returnFocus:opener;
  target.focus({preventScroll:true});
 });
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const bounds=dialog.getBoundingClientRect();
  if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();
 });
}

export function installNavigation(){
 decorateNavigation();installHelp();
 document.getElementById('theme')?.addEventListener('change',decorateNavigation);
 let queued=false;
 const observer=new MutationObserver(()=>{
  if(queued)return;queued=true;
  queueMicrotask(()=>{queued=false;decorateNavigation();});
 });
 // App refreshes labels and detail/table DOM. Idempotent decoration never
 // changes store pins, chart values, source coordinates, filters, or handlers.
 observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-expanded']});
 if(document.fonts?.load){
  document.fonts.load('300 24px "LDS Material Symbols Rounded Nav"','\uE5D2').then(faces=>{
   document.documentElement.classList.add(faces.length?'nav-icons-ready':'nav-icons-unavailable');
  }).catch(()=>document.documentElement.classList.add('nav-icons-unavailable'));
 }else document.documentElement.classList.add('nav-icons-unavailable');
 return ()=>observer.disconnect();
}
if(typeof document!=='undefined')installNavigation();
