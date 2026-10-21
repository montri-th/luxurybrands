import {hasPoint,isClosed} from './model.js';
import {brandLogoMarkup} from './brand-logos.js';

/** Screen-space collision avoidance only. Never returns geographic coordinates.
 * Every visible source anchor gets an individual pickable pin, with no hiding,
 * aggregation, cluster thresholds, or coordinate jitter written to the data.
 */
export function separatePins(points,bounds,spacing=19,{minSpacing=10}={}){
 const used=new Map(),result=[],cell=spacing;
 const cellKey=(x,y)=>`${Math.floor(x/cell)},${Math.floor(y/cell)}`;
 const occupied=(x,y)=>{
  if((bounds.exclusions||[]).some(b=>x>b.left-cell/2&&x<b.right+cell/2&&y>b.top-cell/2&&y<b.bottom+cell/2))return true;
  const cx=Math.floor(x/cell),cy=Math.floor(y/cell);
  for(let a=cx-1;a<=cx+1;a++)for(let b=cy-1;b<=cy+1;b++)for(const p of used.get(`${a},${b}`)||[])if(Math.abs(x-p.x)<cell&&Math.abs(y-p.y)<cell)return true;
  return false;
 };
 const inside=(x,y)=>x>=bounds.left&&x<=bounds.right&&y>=bounds.top&&y<=bounds.bottom;
 for(const p of [...points].sort((a,b)=>a.id.localeCompare(b.id))){
  const ox=Math.max(bounds.left,Math.min(bounds.right,p.x)),oy=Math.max(bounds.top,Math.min(bounds.bottom,p.y));
  let best=null;
  // Search concentric screen-space rings, preserving each source anchor.
  const maxRing=Math.ceil(Math.max(bounds.right-bounds.left,bounds.bottom-bounds.top)/cell)+2;
  for(let ring=0;ring<=maxRing&&!best;ring++){
   const candidates=[];
   for(let dx=-ring;dx<=ring;dx++)for(let dy=-ring;dy<=ring;dy++){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==ring)continue;
    const x=ox+dx*cell,y=oy+dy*cell;
    if(inside(x,y)&&!occupied(x,y))candidates.push({x,y,cost:(x-p.x)**2+(y-p.y)**2});
   }
   candidates.sort((a,b)=>a.cost-b.cost||a.y-b.y||a.x-b.x);best=candidates[0];
  }
  // A very small viewport may have insufficient space. Repack with a smaller
  // glyph pitch instead of dropping a store or replacing it with a count.
  if(!best&&spacing>minSpacing)return separatePins(points,bounds,spacing-1,{minSpacing});
  if(!best)throw new Error('Map viewport is too small for individual pins');
  const placed={...p,x:best.x,y:best.y,anchorX:p.x,anchorY:p.y,spacing};
  const key=cellKey(best.x,best.y);if(!used.has(key))used.set(key,[]);used.get(key).push(placed);result.push(placed);
 }
 return result;
}

export function installStorePins(map,container,{onSelect,reservedBottom=()=>90}={}){
 const overlay=document.createElement('div');overlay.className='store-pin-overlay';overlay.setAttribute('aria-label','หมุดจุดขายรายร้าน ใช้ปุ่มลูกศรเลื่อนไปหมุดถัดไป');
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('pin-leaders');svg.setAttribute('aria-hidden','true');overlay.append(svg);container.append(overlay);
 let entries=[],frame=0,activeId='',selectedId='';
 const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(layout);};
 function layout(){
  const width=container.clientWidth,height=container.clientHeight;
  const panel=container.closest('.map-panel');panel.classList.toggle('is-tight',height<480);
  const rect=container.getBoundingClientRect();
  const exclusions=[...panel.querySelectorAll('.map-toolbar button,.map-key,.map-note,.maplibregl-ctrl-top-right,.maplibregl-ctrl-bottom-right,.maplibregl-ctrl-bottom-left,.neighborhood-label')].filter(e=>e.offsetWidth&&e.offsetHeight).map(e=>{const b=e.getBoundingClientRect();return {left:b.left-rect.left,right:b.right-rect.left,top:b.top-rect.top,bottom:b.bottom-rect.top};});
  const bounds={left:24,right:Math.max(25,width-24),top:24,bottom:Math.max(25,height-reservedBottom()-14),exclusions};
  const projected=[];
  for(const e of entries){const p=map.project([e.row.longitude,e.row.latitude]);e.button.hidden=!(p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height);e.line.hidden=e.button.hidden;e.line.style.display=e.button.hidden?'none':'';if(!e.button.hidden)projected.push({id:e.row.id,x:p.x,y:p.y,entry:e});}
  // Individual marks get smaller in regional/national views. Keeping a street-
  // sized icon at country scale would spread Bangkok stores across countries.
  const zoom=map.getZoom(),pitch=zoom>=13.5?46:zoom>=12.5?32:zoom>=11.5?22:zoom>=10.5?7:zoom>=9?5:3;
  overlay.classList.toggle('is-overview',zoom<11.5);
  let placed;try{placed=separatePins(projected,bounds,pitch,{minSpacing:Math.min(7,pitch)});}catch{
   // Reclaim the optional graph before resorting to very small overview pins.
   const insights=document.getElementById('insights');if(!insights.classList.contains('is-collapsed')){document.getElementById('toggle-insights').click();schedule();return;}
   placed=separatePins(projected,bounds,7,{minSpacing:2});
  }
  const visible=placed.map(p=>p.id);if(!visible.includes(activeId))activeId=visible[0]||'';
  for(const p of placed){const {button,line}=p.entry;button.style.left=`${p.x}px`;button.style.top=`${p.y}px`;button.style.setProperty('--pin-size',`${Math.min(45,p.spacing-1)}px`);button.dataset.compact=String(p.spacing<18);button.tabIndex=p.id===activeId?0:-1;button.dataset.displaced=String(Math.hypot(p.x-p.anchorX,p.y-p.anchorY)>3);for(const [k,v] of Object.entries({x1:p.anchorX,y1:p.anchorY,x2:p.x,y2:p.y}))line.setAttribute(k,v);line.style.display=button.dataset.displaced==='true'?'':'none';}
  overlay.dataset.visiblePins=String(placed.length);
 }
 function update(rows){
  for(const e of entries){e.button.remove();e.line.remove();}entries=[];
  for(const row of rows.filter(hasPoint)){
   const button=document.createElement('button');button.type='button';button.className=`store-pin${isClosed(row)?' is-closed':''}`;button.dataset.storeId=row.id;button.setAttribute('aria-label',`${row.brand} · ${row.name||row.venue} · ${row.venue}${isClosed(row)?' · Permanently closed':''}`);button.title=button.getAttribute('aria-label');button.innerHTML=brandLogoMarkup(row.brand);if(!button.firstChild)button.classList.add('no-logo');
   const line=document.createElementNS('http://www.w3.org/2000/svg','line');svg.append(line);overlay.append(button);button.classList.toggle('is-selected',selectedId===row.id);
   button.onclick=()=>{select(row.id);onSelect?.(row);};
   button.onfocus=()=>{activeId=row.id;for(const e of entries)e.button.tabIndex=e.row.id===activeId?0:-1;};
   button.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const visible=entries.filter(e=>!e.button.hidden);const i=visible.findIndex(e=>e.row.id===row.id);const j=e.key==='Home'?0:e.key==='End'?visible.length-1:(i+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)+visible.length)%visible.length;visible[j]?.button.focus();};
   entries.push({row,button,line});
  }
  schedule();
 }
 function select(id){selectedId=id;for(const e of entries)e.button.classList.toggle('is-selected',e.row.id===id);}
 map.on('move',schedule);map.on('resize',schedule);const resize=new ResizeObserver(schedule);resize.observe(container);
 return {update,select,layout:schedule,dispose(){cancelAnimationFrame(frame);map.off('move',schedule);map.off('resize',schedule);resize.disconnect();overlay.remove();}};
}
