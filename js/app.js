import {SEGMENTS,CHANNELS,filterRows,summarize,pointFeatures,hasPoint,isClosed,safeURL} from './model.js?v=20261021-r5';
import {summarizeAreaInsight,filterAreaRows} from './area-insight.js?v=20261021-r5';
import {renderInsightChart} from './charts.js?v=20261021-r5';
import {loadMapLibrary,loadChartLibraries} from './vendors.js?v=20261021-r5';
let chartsReady=false,chartsLoading=false,chartError=null;
import {installStorePins} from './pins.js?v=20261021-r5';
import {installVenueBuildings} from './buildings.js?v=20261021-r5';
import {assignNeighborhood,neighborhoodRows,summarizeNeighborhoods} from './neighborhoods.js?v=20261021-r5';
import {configureBrandLogos,brandLogoMarkup,getBrandLogo} from './brand-logos.js?v=20261021-r5';
const $=id=>document.getElementById(id),num=n=>new Intl.NumberFormat('th-TH').format(n),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fields=['search','cohort','segment','province','channel','venue','neighborhood'];
const state={data:null,neighborhoods:null,buildingData:null,rows:[],view:'centers',map:null,loaded:false,showCenters:true,showNeighborhoods:true,page:0,mallId:'',focusCenterIds:[],focusAreaIds:[],chartDispose:null,pins:null,buildings:null,labels:[],mapTheme:'',selectedId:'',popup:null,initialCameraDone:false};
const STYLES={light:'https://tiles.openfreemap.org/styles/positron',dark:'https://tiles.openfreemap.org/styles/dark'};
const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
const statusLabel=r=>isClosed(r)?'Permanently closed':r.status==='temporarily closed'?'Temporarily closed':'';
function link(url,label,cls='source-link'){const u=safeURL(url);return u?`<a class="${cls}" href="${esc(u)}" target="_blank" rel="noopener">${esc(label)} ↗</a>`:'';}
function options(id,values,labels={}){const s=$(id);for(const v of [...new Set(values)].filter(Boolean).sort()){const o=document.createElement('option');o.value=v;o.textContent=labels[v]||v;s.append(o);}}
function values(){return Object.fromEntries(fields.map(k=>[k,$(k).value]));}
function saveURL(){const f=values(),p=new URLSearchParams();for(const [k,v] of Object.entries(f))if(v&&v!==({cohort:'refresh'}[k]||''))p.set(k,v);if(state.mallId)p.set('mall',state.mallId);if(state.focusCenterIds.length)p.set('centers',state.focusCenterIds.join(','));if(state.focusAreaIds.length)p.set('areas',state.focusAreaIds.join(','));if(state.view!=='centers')p.set('view',state.view);history.replaceState(null,'',location.pathname+(p.size?'?'+p:''));}
function renderFirstInsight(baseRows){
 const focused=state.focusAreaIds.length>0,insight=summarizeAreaInsight(focused?filterAreaRows(baseRows,state.neighborhoods,new Set(state.focusAreaIds)):baseRows,state.neighborhoods),count=insight.areas.length;
 const targets=[$('first-insight'),$('map-first-insight')];
 if(!count){for(const el of targets){el.hidden=true;el.replaceChildren();}return;}
 const share=insight.share.toFixed(1),headline=`${count} ย่านรวม ${share}% ของแบรนด์`;
 for(const el of targets){
  el.hidden=false;el.innerHTML=`<div class="aha-copy"><p class="eyebrow">อ่านเมืองผ่านย่าน</p><h2>${esc(focused?`กำลังสำรวจ ${count} ย่าน`:headline)}</h2><p class="aha-evidence">${focused?`<strong>${num(insight.brands)} แบรนด์</strong> · ${num(insight.pos)} จุดขาย`:`<strong>${num(insight.brands)} จาก ${num(insight.totalBrands)} แบรนด์</strong> ในข้อมูลที่เลือก`}</p>${el.id==='first-insight'?`<p class="aha-places">${insight.areas.map(a=>esc(a.name)).join(' · ')}</p>`:''}</div><button type="button" class="aha-action" aria-pressed="${focused}">${focused?'กลับไปดูทั้งหมด':`สำรวจ ${count} ย่าน`}</button>`;
  el.querySelector('button').onclick=()=>{state.focusAreaIds=focused?[]:insight.areaIds;update(true);closeMobilePanel();$('sidebar').scrollTop=0;requestAnimationFrame(()=>$(el.id).querySelector('button')?.focus({preventScroll:true}));};
 }
}
function applyTheme(){const value=$('theme').value,theme=value==='auto'?(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):value;document.documentElement.dataset.theme=theme;try{localStorage.setItem('citymeter-luxury-theme',value);}catch{}
 if(state.map&&theme!==state.mapTheme){state.loaded=false;state.buildings?.dispose();state.buildings=null;state.mapTheme=theme;state.map.setStyle(STYLES[theme],{diff:false});}
 if(state.data)drawChart();
}
function drawChart(){
 if(!state.data)return;state.chartDispose?.();state.chartDispose=null;
 for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-selected',String(b.dataset.view===state.view));
 $('chart').hidden=state.view==='neighborhoods';$('neighborhood-list').hidden=state.view!=='neighborhoods';$('chart').setAttribute('aria-labelledby','tab-'+state.view);
 const notes={centers:'แบรนด์ไม่ซ้ำในแต่ละย่าน · เลือกย่านเพื่อสำรวจ',mix:'พื้นที่วงกลม = จำนวนแบรนด์ไม่ซ้ำ · สีแยกกลุ่มแบรนด์',compare:'แบรนด์เฉพาะย่าน / แบรนด์ที่พบร่วมกับย่านอื่นในข้อมูลที่เลือก',neighborhoods:'เลือกย่านเพื่อสำรวจจุดขาย'};
 $('chart-note').textContent=notes[state.view];$('chart-scope').textContent=`${num(state.rows.length)} รายการที่เลือก`;
 if(state.view==='neighborhoods'){
  $('neighborhood-list').replaceChildren();const summaries=summarizeNeighborhoods(state.rows,state.neighborhoods);
  for(const n of summaries){const b=document.createElement('button');b.className='neighborhood-row';b.innerHTML=`<span><strong>${esc(n.name)}</strong><small>${num(n.pos)} รายการจุดขาย</small></span><span>${num(n.brands)} แบรนด์ ↗</span>`;b.onclick=()=>selectNeighborhood(n.id);$('neighborhood-list').append(b);}
  return;
 }
 if($('insight-content').hidden)return;
 if(!chartsReady){
  if(chartError){$('chart').replaceChildren();const p=document.createElement('p'),b=document.createElement('button');p.textContent='โหลดกราฟไม่สำเร็จ ยังดูข้อมูลในตารางได้';b.textContent='ลองโหลดกราฟใหม่';b.onclick=()=>{chartError=null;drawChart();};$('chart').append(p,b);return;}
  $('chart').textContent='กำลังโหลดกราฟ…';if(!chartsLoading){chartsLoading=true;loadChartLibraries().then(()=>{chartsReady=true;chartsLoading=false;drawChart();}).catch(e=>{chartsLoading=false;chartError=e;drawChart();console.warn(e);});}return;
 }
 const summary=summarize(state.rows,state.data.centers);
 try{state.chartDispose=renderInsightChart({elementId:'chart',view:state.view,rows:state.rows,centers:summary.centers,segments:Object.entries(SEGMENTS).map(([id,name])=>({id,name})),theme:document.documentElement.dataset.theme,neighborhoods:state.neighborhoods},selection=>{state.focusAreaIds=[];state.focusCenterIds=[];if(selection.type==='resetAreas'){$('neighborhood').value='';update(true);return;}if(selection.type==='neighborhood'){selectNeighborhood(selection.id);return;}if(selection.type==='venue'){state.mallId=selection.mallId;$('venue').value='';}else $('segment').value=selection.value;update(true);});}catch(e){$('chart').textContent='โหลดกราฟไม่ได้ ดูตัวเลขและรายการในตารางได้';console.error(e);}
}
function selectedNeighborhood(){return state.neighborhoods.features.find(f=>f.id===$('neighborhood').value||f.properties.id===$('neighborhood').value);}
function update(fit=false){
 const f=values(),feature=selectedNeighborhood();const neighborhoodIds=feature?new Set(state.data.rows.filter(r=>assignNeighborhood(r,state.neighborhoods)===feature).map(r=>r.id)):null;
 const baseRows=filterRows(state.data.rows,{...f,neighborhoodIds,mallId:state.mallId,mallIds:state.focusCenterIds.length?new Set(state.focusCenterIds):null});state.rows=state.focusAreaIds.length?filterAreaRows(baseRows,state.neighborhoods,new Set(state.focusAreaIds)):baseRows;renderFirstInsight(baseRows);state.page=0;const s=summarize(state.rows,state.data.centers),areas=summarizeNeighborhoods(state.rows,state.neighborhoods);
 state.popup?.remove();state.popup=null;state.selectedId='';state.pins?.select('');$('detail').innerHTML='<h2>เลือกจุดเพื่อสำรวจ</h2><p>เลือกหมุดเพื่อดูร้าน สถานะ และอาคารที่ตั้ง</p>';
 $('metric-brands').textContent=num(s.brands);$('metric-pos').textContent=num(s.pos);$('metric-centers').textContent=num(s.centers.length);$('metric-neighborhoods').textContent=num(areas.length);$('map-coverage').textContent=`มีพิกัด ${num(s.mapped)}/${num(s.pos)}`;$('result-count').textContent=num(s.pos);
 $('active-selection').hidden=!feature&&!state.mallId&&!state.focusCenterIds.length&&!state.focusAreaIds.length;if(feature||state.mallId||state.focusCenterIds.length||state.focusAreaIds.length){$('active-selection').innerHTML=`กำลังดู ${esc(state.focusAreaIds.length?`${state.focusAreaIds.length} ย่าน`:state.focusCenterIds.length?`${state.focusCenterIds.length} ศูนย์การค้า`:feature?.properties.name||state.data.centers.find(c=>c.id===state.mallId)?.name||'พื้นที่ที่เลือก')}<br><button id="clear-selection">ยกเลิกการเลือกพื้นที่</button>`;$('clear-selection').onclick=()=>{$('neighborhood').value='';state.mallId='';state.focusCenterIds=[];state.focusAreaIds=[];update(true);};}
 state.pins?.update(state.rows);if(state.loaded){state.map.getSource('outlets').setData(pointFeatures(state.rows));updateSpatialLayers();if(fit)fitMap();}
 drawChart();renderTable();saveURL();$('announcement').textContent=`พบ ${s.pos} รายการ ${s.brands} แบรนด์ มีพิกัด ${s.mapped} รายการ แสดงหมุดแยกรายจุดขาย`;
}
function cameraPadding(){const height=$('map').clientHeight,panel=$('insights').getBoundingClientRect().height,edge=Math.min(45,Math.max(12,(height-panel)/6)),mapTop=$('map').getBoundingClientRect().top,toolbar=document.querySelector('.map-toolbar').getBoundingClientRect(),aha=$('map-first-insight'),bottom=aha.offsetHeight?height-(aha.getBoundingClientRect().top-mapTop)+16:panel+edge;return {top:Math.max(edge,toolbar.bottom-mapTop+12),left:edge,right:edge,bottom:Math.min(height*.55,bottom)};}
function fitMap(){if(!state.loaded)return;const rs=state.rows.filter(hasPoint);if(!rs.length)return;const area=selectedNeighborhood(),b=area?featureBounds(area):new maplibregl.LngLatBounds();if(!area){for(const f of state.neighborhoods.features)if(state.focusAreaIds.includes(f.id||f.properties.id))featureBounds(f).toArray().forEach(p=>b.extend(p));rs.forEach(r=>b.extend([r.longitude,r.latitude]));const ids=new Set(rs.map(r=>r.id));for(const f of state.buildingData.features)if((f.properties.outlet_ids||[]).some(id=>ids.has(id)))featureBounds(f).toArray().forEach(p=>b.extend(p));}const wide=b.getNorth()-b.getSouth()>.3||b.getEast()-b.getWest()>.3;state.map.jumpTo({pitch:wide?0:state.showCenters?52:0});state.map.fitBounds(b,{padding:cameraPadding(),maxZoom:16,duration:reduced()?0:600});}
function featureBounds(feature){const b=new maplibregl.LngLatBounds();const walk=v=>{if(typeof v[0]==='number')b.extend(v);else v.forEach(walk);};walk(feature.geometry.coordinates);return b;}
function revealDetail(){openMobilePanel();requestAnimationFrame(()=>$('detail').scrollIntoView({block:'start',behavior:reduced()?'auto':'smooth'}));}
function selectNeighborhood(id){const f=state.neighborhoods.features.find(f=>(f.id||f.properties.id)===id);if(!f)return;$('neighborhood').value=id;state.mallId='';state.focusCenterIds=[];state.focusAreaIds=[];update();if(state.loaded){state.map.jumpTo({pitch:state.showCenters?52:0});state.map.fitBounds(featureBounds(f),{padding:cameraPadding(),maxZoom:16,duration:reduced()?0:600});}detailNeighborhood(f);}
function detailNeighborhood(feature){const p=feature.properties,rs=state.rows.filter(r=>assignNeighborhood(r,state.neighborhoods)===feature);$('detail').innerHTML=`<p class="eyebrow">สำรวจย่าน</p><h2>${esc(p.name)}</h2><p>${num(rs.length)} รายการจุดขาย · ${num(new Set(rs.map(r=>r.brand)).size)} แบรนด์ไม่ซ้ำ</p>${link(p.sourceUrl||p.sourceURLs?.[0]||p.sources?.[0]?.url||p.sources?.[0],'ข้อมูลย่าน')}`;revealDetail();}
function detailRows(ids){
 const rows=state.data.rows.filter(r=>ids.includes(r.id));if(!rows.length)return;
 const first=rows[0],center=state.data.centers.find(c=>c.id===first.mallId);let html=`<p class="eyebrow">ร้านและทำเล</p>${rows.length===1?brandLogoMarkup(first.brand,{className:'detail-logo'}):''}<h2>${esc(rows.length===1?first.brand:first.venue)}</h2><p>${esc(first.venue)} · ${esc(first.province)}</p>`;
 if(center){html+=`<dl><dt>Shopping Center</dt><dd>${esc(center.name)}</dd><dt>รูปแบบ</dt><dd>${esc(center.type||'ไม่ระบุ')}</dd><dt>GLA ที่รายงาน</dt><dd>${center.gla?num(center.gla)+' ตร.ม.':'ไม่มีข้อมูล'}</dd></dl>${link(center.source,'ข้อมูล CityMETER ศูนย์การค้า')}`;}
 html+='<ul class="outlet-list">';for(const r of rows)html+=`<li><button class="brand-row" data-outlet="${esc(r.id)}">${brandLogoMarkup(r.brand)}<span><strong>${esc(r.brand)}</strong><br><span class="small muted">${esc(r.name)}</span></span></button>${statusLabel(r)?`<p><span class="status-pill ${isClosed(r)?'closed':''}">${esc(statusLabel(r))}</span></p>`:''}${link(r.source,'หลักฐานรายการ')} ${link(r.statusSource,'หลักฐานสถานะ')} ${link(r.coordinateSource,'ที่มาพิกัด')}</li>`;html+='</ul>';
 $('detail').innerHTML=html;for(const b of $('detail').querySelectorAll('[data-outlet]'))b.onclick=()=>detailOutlet(b.dataset.outlet);
}
function detailOutlet(id,{fly=true,showPopup=false}={}){const r=state.data.rows.find(x=>x.id===id);if(!r)return;state.selectedId=id;state.pins?.select(id);detailRows([id]);const area=assignNeighborhood(r,state.neighborhoods);
 $('detail').insertAdjacentHTML('beforeend',`<dl><dt>รูปแบบ</dt><dd>${esc(CHANNELS[r.channel]||r.channel)}</dd><dt>กลุ่มแบรนด์</dt><dd>${esc(SEGMENTS[r.segment]||r.segment)}</dd><dt>ย่าน</dt><dd>${esc(area?.properties.name||r.venue)}</dd><dt>พิกัดต้นทาง</dt><dd class="data-number">${hasPoint(r)?r.latitude.toFixed(6)+', '+r.longitude.toFixed(6):'ยังไม่มีพิกัด'}</dd><dt>วันที่ตรวจ</dt><dd>${esc(r.checkedOn)}</dd></dl>`);
 if(hasPoint(r)&&state.loaded){if(fly)state.map.flyTo({center:[r.longitude,r.latitude],zoom:16,pitch:state.showCenters?52:0,duration:reduced()?0:650});if(showPopup&&!matchMedia('(max-width:760px) and (orientation:portrait)').matches){state.popup?.remove();const wrap=document.createElement('div'),h=document.createElement('h3'),p=document.createElement('p');wrap.innerHTML=brandLogoMarkup(r.brand,{className:'popup-logo'});h.textContent=r.brand;p.textContent=r.name||r.venue;wrap.append(h,p);state.popup=new maplibregl.Popup({maxWidth:'280px',offset:14}).setLngLat([r.longitude,r.latitude]).setDOMContent(wrap).addTo(state.map);}}
 const logo=getBrandLogo(r.brand);if(logo)$('detail').insertAdjacentHTML('beforeend',`<p class="logo-credit">${link(logo.sourceURL,'ที่มาโลโก้แบรนด์')}</p>`);
 revealDetail();$('results').hidden=true;
}
function bottomSpace(){return $('insights').getBoundingClientRect().height+12;}
function updateLabels(){if(!state.map||!state.neighborhoods)return;for(const e of state.labels){const p=state.map.project(e.center),y=p.y-50;const visible=state.showNeighborhoods&&state.map.getZoom()>=12&&p.x>0&&p.x<$('map').clientWidth&&y>60&&y<$('map').clientHeight-bottomSpace();e.button.hidden=!visible;e.button.style.left=`${p.x}px`;e.button.style.top=`${y}px`;}}
function updateSpatialLayers(){
 if(!state.loaded)return;
 const coverage=state.buildings?.update({rows:state.rows,enabled:state.showCenters,theme:document.documentElement.dataset.theme});
 if(coverage)$('building-coverage').textContent=`รูปทรงอาคารรองรับ ${num(coverage.matchedRows)}/${num(coverage.totalRows)} รายการที่เลือก · ${num(coverage.hostBuildings)} อาคาร · ${num(coverage.unmatchedRows)} รายการยังไม่จับคู่อาคาร${coverage.disputedHeightBuildings?' · ความสูงรอตรวจ '+num(coverage.disputedHeightBuildings)+' อาคาร':''}`;
 const relevant=summarizeNeighborhoods(state.rows,state.neighborhoods),ids=new Set(relevant.map(n=>n.id));
 state.map.getSource('neighborhoods').setData({...state.neighborhoods,features:state.neighborhoods.features.filter(f=>ids.has(f.id||f.properties.id))});
 for(const layer of ['neighborhood-fill','neighborhood-outline'])state.map.setLayoutProperty(layer,'visibility',state.showNeighborhoods?'visible':'none');
 $('neighborhood-labels').replaceChildren();state.labels=[];
 for(const f of state.neighborhoods.features.filter(f=>ids.has(f.id||f.properties.id))){const b=featureBounds(f),center=b.getCenter().toArray(),button=document.createElement('button');button.className='neighborhood-label';button.textContent=f.properties.name;button.title='เลือกเพื่อสำรวจย่าน';button.onclick=()=>selectNeighborhood(f.id||f.properties.id);$('neighborhood-labels').append(button);state.labels.push({button,center});}
 updateLabels();state.pins?.layout();
}
function installSpatialLayers(){
 const map=state.map;state.loaded=true;
 map.addSource('outlets',{type:'geojson',data:pointFeatures(state.rows),cluster:false});
 map.addSource('neighborhoods',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
 map.addLayer({id:'neighborhood-fill',type:'fill',source:'neighborhoods',paint:{'fill-color':'#1D4497','fill-opacity':.045}});
 map.addLayer({id:'neighborhood-outline',type:'line',source:'neighborhoods',paint:{'line-color':document.documentElement.dataset.theme==='dark'?'#A6B5B1':'#5C6A61','line-width':2,'line-dasharray':[4,2]}});
 state.buildings=installVenueBuildings(map,state.buildingData,{rows:state.rows,enabled:state.showCenters,theme:document.documentElement.dataset.theme,onSelect:selection=>{const rs=selection.rows||[];if(rs.length){detailRows(rs.map(r=>r.id));$('detail').insertAdjacentHTML('afterbegin',`<p class="eyebrow">อาคารที่ตั้ง</p>${link(selection.feature.properties.source_url,'ที่มารูปทรงอาคาร')}`);revealDetail();}},beforeId:'neighborhood-outline'});
 updateSpatialLayers();state.pins?.layout();if(!state.initialCameraDone){state.initialCameraDone=true;if(fields.some(f=>f!=='cohort'&&$(f).value)||$('cohort').value!=='refresh'||state.mallId||state.focusCenterIds.length||state.focusAreaIds.length)fitMap();}
}
function initMap(){
 if(!window.maplibregl)throw new Error('Map library is unavailable');
 try{state.mapTheme=document.documentElement.dataset.theme;state.map=new maplibregl.Map({container:'map',center:[100.545,13.739],zoom:14.2,pitch:52,maxPitch:55,attributionControl:true,style:STYLES[state.mapTheme]});state.map.addControl(new maplibregl.NavigationControl({showCompass:true}),'top-right');
 state.pins=installStorePins(state.map,$('map'),{reservedBottom:bottomSpace,onSelect:r=>detailOutlet(r.id,{fly:false,showPopup:true})});state.pins.update(state.rows);
 state.map.on('style.load',installSpatialLayers);state.map.on('move',updateLabels);state.map.on('resize',updateLabels);
 state.map.on('error',e=>console.warn('Map resource',e.error?.message||e));
 }catch(e){
  state.loaded=false;state.initialCameraDone=false;
  for(const cleanup of [()=>state.pins?.dispose(),()=>state.buildings?.dispose(),()=>state.map?.remove()]){try{cleanup();}catch(cleanupError){console.warn('Map cleanup',cleanupError);}}
  state.map=null;state.pins=null;state.buildings=null;state.labels=[];
  $('map').querySelectorAll('.store-pin-overlay').forEach(el=>el.remove());$('neighborhood-labels').replaceChildren();
  throw e;
 }
}
function renderTable(){const pageSize=25,start=state.page*pageSize,rs=state.rows.slice(start,start+pageSize);$('result-rows').innerHTML=rs.map(r=>`<tr><td><button class="row-name brand-row" data-id="${esc(r.id)}">${brandLogoMarkup(r.brand)}<span>${esc(r.brand)}</span></button><small>${esc(r.name)}</small></td><td>${esc(r.venue)}<small>${esc(r.province)}</small></td><td>${statusLabel(r)?`<span class="status-pill ${isClosed(r)?'closed':''}">${esc(statusLabel(r))}</span>`:'มีรายการ'}</td><td><small class="data-number">${hasPoint(r)?r.latitude.toFixed(5)+', '+r.longitude.toFixed(5):'ไม่มีพิกัด'}</small></td><td>${link(r.source,'รายการ')}${link(r.statusSource,'สถานะ')}${link(r.coordinateSource,'พิกัด')}</td></tr>`).join('')||'<tr><td colspan="5">ไม่พบรายการ ลองล้างตัวกรองหรือเลือกชุดข้อมูลอื่น</td></tr>';$('page-label').textContent=state.rows.length?`${num(start+1)}–${num(Math.min(start+pageSize,state.rows.length))} / ${num(state.rows.length)}`:'0 รายการ';$('prev-page').disabled=state.page===0;$('next-page').disabled=start+pageSize>=state.rows.length;for(const b of $('result-rows').querySelectorAll('[data-id]'))b.onclick=()=>{detailOutlet(b.dataset.id);$('detail').scrollIntoView({block:'nearest',behavior:'instant'});};}
function openMobilePanel(){if(matchMedia('(max-width:760px) and (orientation:portrait)').matches){$('sidebar').classList.add('is-open');$('mobile-panel').setAttribute('aria-expanded','true');}}
function closeMobilePanel(){$('sidebar').classList.remove('is-open');$('mobile-panel').setAttribute('aria-expanded','false');if(matchMedia('(max-width:760px) and (orientation:portrait)').matches)$('mobile-panel').focus();}
function validOptionalFeatureCollection(value,kind){
 if(value?.type!=='FeatureCollection'||!Array.isArray(value.features))return false;
 const position=p=>Array.isArray(p)&&p.length>=2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90;
 const ring=r=>Array.isArray(r)&&r.length>=4&&r.every(position)&&r[0][0]===r.at(-1)[0]&&r[0][1]===r.at(-1)[1];
 const polygon=p=>Array.isArray(p)&&p.length>0&&p.every(ring);
 return value.features.every(f=>{
  const p=f?.properties,g=f?.geometry;
  if(f?.type!=='Feature'||!p||typeof p!=='object'||Array.isArray(p))return false;
  if(!(g?.type==='Polygon'?polygon(g.coordinates):g?.type==='MultiPolygon'&&Array.isArray(g.coordinates)&&g.coordinates.length>0&&g.coordinates.every(polygon)))return false;
  if(kind==='neighborhood'){const id=f.id||p.id;return typeof id==='string'&&!!id.trim()&&typeof p.name==='string'&&!!p.name.trim();}
  return p.outlet_ids==null||(Array.isArray(p.outlet_ids)&&p.outlet_ids.every(id=>typeof id==='string'));
 });
}
async function fetchJSON(resource){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const r=await fetch(resource,{signal:controller.signal,cache:'no-cache'});if(!r.ok){const e=new Error('โหลดข้อมูลไม่สำเร็จ');e.status=r.status;throw e;}return await r.json();}
 catch(e){e.resource=resource;e.phase='data';throw e;}finally{clearTimeout(timer);}
}
async function startMap(){
 try{await loadMapLibrary();$('map-failure').hidden=true;initMap();}
 catch(e){const el=$('map-failure');el.hidden=false;el.replaceChildren();const p=document.createElement('p'),b=document.createElement('button');p.textContent='โหลดแผนที่ไม่สำเร็จ ข้อมูลและตารางยังใช้งานได้';b.textContent='ลองโหลดแผนที่ใหม่';b.onclick=()=>{b.disabled=true;startMap();};el.append(p,b);console.warn(e);}
}
async function init(){
 try{const resources=['data/luxury.json','data/neighborhoods.geojson','data/venue-buildings.geojson','data/brand-logos.json'];const results=await Promise.allSettled(resources.map(fetchJSON));if(results[0].status==='rejected')throw results[0].reason;state.data=results[0].value;
  for(const [index,kind]of [[1,'neighborhood'],[2,'building']])if(results[index].status==='fulfilled'&&!validOptionalFeatureCollection(results[index].value,kind)){const error=new Error('Invalid optional polygon FeatureCollection');error.resource=resources[index];error.phase='data-schema';results[index]={status:'rejected',reason:error};console.warn('Optional dataset unavailable',error);}
  state.neighborhoods=results[1].status==='fulfilled'?results[1].value:{type:'FeatureCollection',features:[]};state.buildingData=results[2].status==='fulfilled'?results[2].value:{type:'FeatureCollection',features:[]};
  const coverage=configureBrandLogos(results[3].status==='fulfilled'?results[3].value:{brands:[]},state.data.rows);if(!coverage.complete)console.warn('Brand logo coverage',coverage);
  const unavailable=results.slice(1).map((r,i)=>r.status==='rejected'||(i===2&&!coverage.complete)?['ขอบเขตย่าน','รูปทรงอาคาร','โลโก้แบรนด์'][i]:null).filter(Boolean);if(unavailable.length){$('data-warnings').hidden=false;$('data-warnings').textContent=`ข้อมูล${unavailable.join(' / ')}บางส่วนยังไม่พร้อม ข้อมูลจุดขายและตารางยังใช้งานได้ ลองโหลดหน้าใหม่เพื่อเรียกข้อมูลส่วนนี้อีกครั้ง`;}
  options('segment',Object.keys(SEGMENTS),SEGMENTS);options('channel',state.data.rows.map(r=>r.channel),CHANNELS);options('province',state.data.rows.map(r=>r.province));options('venue',state.data.rows.map(r=>r.venue));for(const f of state.neighborhoods.features){const o=document.createElement('option');o.value=f.id||f.properties.id;o.textContent=f.properties.name;$('neighborhood').append(o);}
  const p=new URLSearchParams(location.search);for(const f of fields)if(p.has(f))$(f).value=p.get(f);if(['centers','mix','compare','neighborhoods'].includes(p.get('view')))state.view=p.get('view');if(state.data.centers.some(c=>c.id===p.get('mall')))state.mallId=p.get('mall');if(!state.mallId)state.focusCenterIds=[...new Set((p.get('centers')||'').split(','))].filter(id=>state.data.centers.some(c=>c.id===id)).slice(0,3);state.focusAreaIds=[...new Set((p.get('areas')||'').split(','))].filter(id=>state.neighborhoods.features.some(a=>(a.id||a.properties.id)===id)).slice(0,3);
  try{$('theme').value=localStorage.getItem('citymeter-luxury-theme')||'auto';}catch{}applyTheme();$('theme').onchange=applyTheme;const colorMedia=matchMedia('(prefers-color-scheme:dark)'),onColorChange=()=>{if($('theme').value==='auto')applyTheme();};if(colorMedia.addEventListener)colorMedia.addEventListener('change',onColorChange);else colorMedia.addListener(onColorChange);
  let timer;for(const f of fields)$(f).addEventListener(f==='search'?'input':'change',()=>{clearTimeout(timer);timer=setTimeout(()=>{state.mallId='';state.focusCenterIds=[];state.focusAreaIds=[];update(f!=='search');if(f==='neighborhood'&&selectedNeighborhood())detailNeighborhood(selectedNeighborhood());},f==='search'?180:0);});
  $('filters').addEventListener('reset',()=>setTimeout(()=>{state.mallId='';state.focusCenterIds=[];state.focusAreaIds=[];$('cohort').value='refresh';update(true);},0));
  for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>{state.view=b.dataset.view;drawChart();saveURL();};
  const tabButtons=[...document.querySelectorAll('[data-view]')];tabButtons.forEach((b,i)=>b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?tabButtons.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabButtons.length)%tabButtons.length;tabButtons[j].focus();tabButtons[j].click();}));
  $('fit-map').onclick=fitMap;$('bangkok-map').onclick=()=>state.map?.flyTo({center:[100.548,13.733],zoom:13,pitch:state.showCenters?45:0,duration:reduced()?0:500});
  $('toggle-centers').onclick=()=>{state.showCenters=!state.showCenters;$('toggle-centers').setAttribute('aria-pressed',String(state.showCenters));updateSpatialLayers();state.map?.easeTo({pitch:state.showCenters?52:0,duration:reduced()?0:400});};
  $('toggle-neighborhoods').onclick=()=>{state.showNeighborhoods=!state.showNeighborhoods;$('toggle-neighborhoods').setAttribute('aria-pressed',String(state.showNeighborhoods));updateSpatialLayers();};
  $('mobile-panel').onclick=()=>{$('sidebar').classList.contains('is-open')?closeMobilePanel():openMobilePanel();};$('close-mobile-panel').onclick=closeMobilePanel;
  document.querySelector('.skip').onclick=()=>{openMobilePanel();$('dataset-title').focus();};
  $('toggle-insights').onclick=()=>{const open=$('insight-content').hidden;$('insight-content').hidden=!open;$('insights').classList.toggle('is-collapsed',!open);$('toggle-insights').setAttribute('aria-expanded',String(open));$('toggle-insights').textContent=open?'ย่อกราฟ ↓':'เปิดกราฟ ↑';requestAnimationFrame(()=>{document.documentElement.style.setProperty('--bottom-panel-height',`${$('insights').getBoundingClientRect().height}px`);state.pins?.layout();updateLabels();drawChart();});};
  const resizeInsight=()=>{document.documentElement.style.setProperty('--bottom-panel-height',`${$('insights').getBoundingClientRect().height}px`);state.pins?.layout();updateLabels();};if(typeof ResizeObserver==='function'){const insightSize=new ResizeObserver(resizeInsight);insightSize.observe($('insights'));}else window.addEventListener('resize',resizeInsight);
  $('open-table').onclick=()=>{$('results').hidden=false;closeMobilePanel();$('toggle-table').focus();};$('toggle-table').onclick=()=>{$('results').hidden=true;$('open-table').focus();};
  $('prev-page').onclick=()=>{state.page--;renderTable();};$('next-page').onclick=()=>{state.page++;renderTable();};$('category-items').innerHTML=Object.entries(SEGMENTS).map(([id,name],i)=>`<span><i class="category-swatch" style="--pin-fill:var(--series-${i+1}-fill)" aria-hidden="true"></i>${esc(name)}</span>`).join('');update();window.dispatchEvent(new CustomEvent('citymeter:ready'));startMap();
 }catch(e){window.dispatchEvent(new CustomEvent('citymeter:load-error',{detail:{message:'โหลดข้อมูลจุดขายไม่สำเร็จ กรุณาลองอีกครั้ง',resource:e.resource,status:e.status,phase:e.phase||'startup',diagnostic:e.message}}));console.error(e);}
}
init();
