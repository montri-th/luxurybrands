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
  if(f.clusterIds&&!f.clusterIds.has(r.id))return false;
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
export function distanceMeters(a,b){const rad=Math.PI/180;const dLat=(b.latitude-a.latitude)*rad,dLon=(b.longitude-a.longitude)*rad;const s=Math.sin(dLat/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dLon/2)**2;return 6371008.8*2*Math.atan2(Math.sqrt(s),Math.sqrt(1-s));}
// Connected components of points linked within radius. A chain may span further than radius.
export function clusterRows(rows,radius=800){
 const points=rows.filter(hasPoint),parent=points.map((_,i)=>i),find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));
 for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)if(distanceMeters(points[i],points[j])<=radius){const a=find(i),b=find(j);if(a!==b)parent[b]=a;}
 const groups=new Map();points.forEach((r,i)=>{const key=find(i);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);});
 return [...groups.values()].map(rs=>{
  const h=new Map();for(const r of rs){const n=r.neighborhood||r.venue;h.set(n,(h.get(n)||0)+1);}
  const names=[...h.entries()].sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]);
  return {id:rs.map(r=>r.id).sort()[0],name:names.join(' · '),ids:new Set(rs.map(r=>r.id)),brands:new Set(rs.map(r=>r.brand)).size,pos:rs.length,sites:new Set(rs.map(r=>`${r.latitude.toFixed(5)},${r.longitude.toFixed(5)}`)).size,latitude:rs.reduce((s,r)=>s+r.latitude,0)/rs.length,longitude:rs.reduce((s,r)=>s+r.longitude,0)/rs.length};
 }).sort((a,b)=>b.brands-a.brands||b.pos-a.pos);
}
export function pointFeatures(rows){
 const grouped=new Map();for(const r of rows.filter(hasPoint)){const key=`${r.latitude.toFixed(5)},${r.longitude.toFixed(5)}`;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(r);}
 return {type:'FeatureCollection',features:[...grouped].map(([key,rs])=>({type:'Feature',geometry:{type:'Point',coordinates:[rs[0].longitude,rs[0].latitude]},properties:{key,count:rs.length,ids:JSON.stringify(rs.map(r=>r.id)),closed:rs.every(isClosed)?1:0}}))};
}
export const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return '';}};
export function toCSV(rows){const headers=['id','brand','name','venue','province','segment','channel','status','origin','latitude','longitude','geometryRole','geometryStatus','coordinateSource','mallId','source','statusSource','checkedOn'];const quote=v=>{const s=v==null?'':String(v);return '"'+(/^[=+@\-]/.test(s)?"'"+s:s).replaceAll('"','""')+'"';};return '\uFEFF'+[headers,...rows.map(r=>headers.map(h=>r[h]))].map(a=>a.map(quote).join(',')).join('\r\n');}
