export const SEGMENTS={luxury_designer:'Luxury designers',fine_jewelry:'Fine jewellery',watches:'Watches',upscale_streetwear:'Upscale streetwear',thai_designer:'Thai designers',curated_retailer:'Curated retailers',beauty_fragrance:'Beauty & fragrance',premium_extension:'Accessible premium'};
export const CHANNELS={mall:'Boutique ในศูนย์การค้า',street_standalone:'Street / standalone',department_store:'Department store',curated_multibrand:'Multibrand retailer',hotel_or_appointment:'Hotel / appointment',downtown_travel_retail:'Downtown duty-free',airport_travel_retail:'Airport duty-free',outlet:'Outlet',popup:'Pop-up',legacy:'ประวัติเดิม'};
export const hasPoint=r=>Number.isFinite(r.latitude)&&Number.isFinite(r.longitude)&&r.latitude>=5&&r.latitude<=21&&r.longitude>=97&&r.longitude<=106;
export const isClosed=r=>r.status==='permanently closed';
export function filterRows(rows,f={}){
 const q=(f.search||'').trim().toLocaleLowerCase();
 return rows.filter(r=>{
  if(f.cohort==='closed'&&!isClosed(r))return false;
  if(f.cohort==='legacy'&&!r.origin.startsWith('legacy_'))return false;
  if((!f.cohort||f.cohort==='refresh')&&(r.origin!=='market_refresh'||isClosed(r)||r.status==='closure_conflict_review'))return false;
  if(f.segment&&r.segment!==f.segment)return false;
  if(f.province&&r.province!==f.province)return false;
  if(f.channel&&r.channel!==f.channel)return false;
  if(f.venue&&r.venue!==f.venue)return false;
  if(f.mallId&&r.mallId!==f.mallId)return false;
  if(f.mallIds&&!f.mallIds.has(r.mallId))return false;
  if(f.neighborhoodIds&&!f.neighborhoodIds.has(r.id))return false;
  return !q||[r.brand,r.name,r.venue,r.neighborhood,r.province].some(v=>(v||'').toLocaleLowerCase().includes(q));
 });
}
export function summarize(rows,shoppingCenters){
 const grouped=new Map();
 for(const r of rows){if(!r.mallId)continue;if(!grouped.has(r.mallId))grouped.set(r.mallId,[]);grouped.get(r.mallId).push(r);}
 const centers=shoppingCenters.filter(c=>grouped.has(c.id)).map(c=>{const rs=grouped.get(c.id);return {...c,brands:new Set(rs.map(r=>r.brand)).size,pos:rs.length,venue:rs[0].venue,segments:[...new Set(rs.map(r=>r.segment))]};}).sort((a,b)=>b.brands-a.brands||a.name.localeCompare(b.name));
 const segments=Object.entries(SEGMENTS).map(([id,name])=>({id,name,count:rows.filter(r=>r.segment===id).length})).filter(r=>r.count);
 return {brands:new Set(rows.map(r=>r.brand)).size,pos:rows.length,mapped:rows.filter(hasPoint).length,centers,segments};
}
export function summarizeFirstInsight(rows=[],shoppingCenters=[]){
 const selected=Array.isArray(rows)?rows:[],hosts=Array.isArray(shoppingCenters)?shoppingCenters:[];
 const summary=summarize(selected,hosts),centers=summary.centers.slice(0,3);
 const centerIds=centers.map(center=>center.id),ids=new Set(centerIds);
 const topRows=selected.filter(row=>ids.has(row.mallId));
 // A brand present in several centers contributes once to the coverage numerator.
 const brands=new Set(topRows.map(row=>row.brand)).size,totalBrands=summary.brands;
 return {centers,centerIds,brands,totalBrands,share:totalBrands?brands/totalBrands*100:0,pos:topRows.length,totalPos:selected.length};
}
export function pointFeatures(rows){
 // A declared store/counter record always owns its own feature. Co-location
 // never changes its identity or the source coordinate; display offsets live
 // exclusively in pins.js and are joined back with a leader line.
 return {type:'FeatureCollection',features:rows.filter(hasPoint).map(r=>({type:'Feature',id:r.id,geometry:{type:'Point',coordinates:[r.longitude,r.latitude]},properties:{id:r.id,brand:r.brand,venue:r.venue,closed:isClosed(r)?1:0}}))};
}
export const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return '';}};
export function toCSV(rows){const headers=['id','brand','name','venue','province','segment','channel','status','origin','latitude','longitude','geometryRole','geometryStatus','coordinateSource','mallId','source','statusSource','checkedOn'];const quote=v=>{const s=v==null?'':String(v);return '"'+(/^[=+@\-]/.test(s)?"'"+s:s).replaceAll('"','""')+'"';};return '\uFEFF'+[headers,...rows.map(r=>headers.map(h=>r[h]))].map(a=>a.map(quote).join(',')).join('\r\n');}
