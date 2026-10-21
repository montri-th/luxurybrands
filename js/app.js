import {SEGMENTS,CHANNELS,filterRows,summarize,pointFeatures,hasPoint,isClosed,safeURL} from './model.js';
import {renderInsightChart} from './charts.js';
import {installStorePins} from './pins.js';
import {installVenueBuildings} from './buildings.js';
import {assignNeighborhood,neighborhoodRows,summarizeNeighborhoods} from './neighborhoods.js';
import {configureBrandLogos,brandLogoMarkup,getBrandLogo} from './brand-logos.js';
const $=id=>document.getElementById(id),num=n=>new Intl.NumberFormat('th-TH').format(n),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fields=['search','cohort','segment','province','channel','venue','neighborhood'];
const state={data:null,neighborhoods:null,buildingData:null,rows:[],view:'centers',map:null,loaded:false,showCenters:true,showNeighborhoods:true,page:0,mallId:'',chartDispose:null,pins:null,buildings:null,labels:[],mapTheme:'',selectedId:'',popup:null,initialCameraDone:false};
const STYLES={light:'https://tiles.openfreemap.org/styles/positron',dark:'https://tiles.openfreemap.org/styles/dark'};
const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
const statusLabel=r=>isClosed(r)?'Permanently closed':r.status==='temporarily closed'?'Temporarily closed':r.status==='closure_conflict_review'?'หลักฐานปิดขัดกัน · รอตรวจ':r.origin.startsWith('legacy_')?'ประวัติเดิม · ยังไม่ยืนยันใหม่':r.evidence==='primary_listed'?'พบในแหล่งหลัก':r.evidence==='primary_index_listed'?'พบในดัชนีแหล่งหลัก':'หลักฐานต้องตรวจต่อ';
const geometryLabel=r=>!hasPoint(r)?'ยังไม่มีพิกัด':/host|building|complex|representative/.test(r.geometryRole)?'จุดตัวแทนอาคาร / ศูนย์':'จุดสถานที่จากแหล่งข้อมูล';
function link(url,label,cls='source-link'){const u=safeURL(url);return u?`<a class="${cls}" href="${esc(u)}" target="_blank" rel="noopener">${esc(label)} ↗</a>`:'';}
function options(id,values,labels={}){const s=$(id);for(const v of [...new Set(values)].filter(Boolean).sort()){const o=document.createElement('option');o.value=v;o.textContent=labels[v]||v;s.append(o);}}
function values(){return Object.fromEntries(fields.map(k=>[k,$(k).value]));}
function saveURL(){const f=values(),p=new URLSearchParams();for(const [k,v] of Object.entries(f))if(v&&v!==({cohort:'refresh'}[k]||''))p.set(k,v);if(state.mallId)p.set('mall',state.mallId);if(state.view!=='centers')p.set('view',state.view);history.replaceState(null,'',location.pathname+(p.size?'?'+p:''));}
function applyTheme(){const value=$('theme').value,theme=value==='auto'?(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):value;document.documentElement.dataset.theme=theme;try{localStorage.setItem('citymeter-luxury-theme',value);}catch{}
 if(state.map&&theme!==state.mapTheme){state.loaded=false;state.buildings?.dispose();state.buildings=null;state.mapTheme=theme;state.map.setStyle(STYLES[theme],{diff:false});}
 if(state.data)drawChart();
}
function drawChart(){
 if(!state.data)return;state.chartDispose?.();state.chartDispose=null;
 for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-selected',String(b.dataset.view===state.view));
 $('chart').hidden=state.view==='neighborhoods';$('neighborhood-list').hidden=state.view!=='neighborhoods';$('chart').setAttribute('aria-labelledby','tab-'+state.view);
 const notes={centers:'อันดับตามแบรนด์ไม่ซ้ำ · เฉพาะศูนย์ที่จับคู่ CityMETER ได้ · เลือกแท่งเพื่อกรอง',mix:'พื้นที่แทนจำนวนรายการจุดขาย · เลือกเพื่อกรองกลุ่มแบรนด์',compare:'X = แบรนด์ไม่ซ้ำ · Y = รายการจุดขาย · หนึ่งจุด = หนึ่งศูนย์',neighborhoods:'ขอบเขตย่านเชิงวิเคราะห์คงที่ · ถนนและบริบทชื่อย่าน · ยังไม่ใช่ผลสำรวจผู้บริโภค'};
 $('chart-note').textContent=notes[state.view];$('chart-scope').textContent=`${num(state.rows.length)} รายการที่เลือก`;
 if(state.view==='neighborhoods'){
  $('neighborhood-list').replaceChildren();const summaries=summarizeNeighborhoods(state.rows,state.neighborhoods);
  for(const n of summaries){const b=document.createElement('button');b.className='neighborhood-row';b.innerHTML=`<span><strong>${esc(n.name)}</strong><small>${num(n.pos)} รายการจุดขาย · ขอบเขตเสนอวิเคราะห์</small></span><span>${num(n.brands)} แบรนด์ ↗</span>`;b.onclick=()=>selectNeighborhood(n.id);$('neighborhood-list').append(b);}
  const assigned=new Set(summaries.flatMap(n=>[...n.ids]));const outside=state.rows.length-assigned.size,p=document.createElement('p');p.className='small muted';p.textContent=`${num(outside)} รายการยังอยู่นอกขอบเขตที่นิยามหรือไม่มีพิกัด · คงอยู่ในแผนที่และตาราง`; $('neighborhood-list').append(p);return;
 }
 if($('insight-content').hidden)return;
 const summary=summarize(state.rows,state.data.centers);
 try{state.chartDispose=renderInsightChart({elementId:'chart',view:state.view,rows:state.rows,centers:summary.centers,segments:Object.entries(SEGMENTS).map(([id,name])=>({id,name})),theme:document.documentElement.dataset.theme},selection=>{if(selection.type==='venue'){state.mallId=selection.mallId;$('venue').value='';}else $('segment').value=selection.value;update(true);});}catch(e){$('chart').textContent='โหลดกราฟไม่ได้ ดูตัวเลขและรายการในตารางได้';console.error(e);}
}
function selectedNeighborhood(){return state.neighborhoods.features.find(f=>f.id===$('neighborhood').value||f.properties.id===$('neighborhood').value);}
function update(fit=false){
 const f=values(),feature=selectedNeighborhood();const neighborhoodIds=feature?new Set(state.data.rows.filter(r=>assignNeighborhood(r,state.neighborhoods)===feature).map(r=>r.id)):null;
 state.rows=filterRows(state.data.rows,{...f,neighborhoodIds,mallId:state.mallId});state.page=0;const s=summarize(state.rows,state.data.centers),areas=summarizeNeighborhoods(state.rows,state.neighborhoods);
 state.popup?.remove();state.popup=null;state.selectedId='';state.pins?.select('');$('detail').innerHTML='<h2>เลือกจุดเพื่อสำรวจ</h2><p>แต่ละหมุดแทนหนึ่งรายการร้านหรือจุดขาย เลือกเพื่อดูสถานะ ที่มาพิกัด และอาคารที่ตั้ง</p>';
 $('metric-brands').textContent=num(s.brands);$('metric-pos').textContent=num(s.pos);$('metric-centers').textContent=num(s.centers.length);$('metric-neighborhoods').textContent=num(areas.length);$('map-coverage').textContent=`มีพิกัด ${num(s.mapped)}/${num(s.pos)}`;$('result-count').textContent=num(s.pos);
 $('active-selection').hidden=!feature&&!state.mallId;if(feature||state.mallId){$('active-selection').innerHTML=`กำลังดู ${esc(feature?.properties.name||state.data.centers.find(c=>c.id===state.mallId)?.name||'พื้นที่ที่เลือก')}<br><button id="clear-selection">ยกเลิกการเลือกพื้นที่</button>`;$('clear-selection').onclick=()=>{$('neighborhood').value='';state.mallId='';update(true);};}
 state.pins?.update(state.rows);if(state.loaded){state.map.getSource('outlets').setData(pointFeatures(state.rows));updateSpatialLayers();if(fit)fitMap();}
 drawChart();renderTable();saveURL();$('announcement').textContent=`พบ ${s.pos} รายการ ${s.brands} แบรนด์ มีพิกัด ${s.mapped} รายการ แสดงหมุดแยกรายจุดขาย`;
}
function cameraPadding(){const height=$('map').clientHeight,panel=$('insights').getBoundingClientRect().height,edge=Math.min(45,Math.max(12,(height-panel)/6));return {top:edge,left:edge,right:edge,bottom:Math.min(height*.55,panel+edge)};}
function fitMap(){if(!state.loaded)return;const rs=state.rows.filter(hasPoint);if(!rs.length)return;const area=selectedNeighborhood(),b=area?featureBounds(area):new maplibregl.LngLatBounds();if(!area){rs.forEach(r=>b.extend([r.longitude,r.latitude]));const ids=new Set(rs.map(r=>r.id));for(const f of state.buildingData.features)if((f.properties.outlet_ids||[]).some(id=>ids.has(id)))featureBounds(f).toArray().forEach(p=>b.extend(p));}const wide=b.getNorth()-b.getSouth()>.3||b.getEast()-b.getWest()>.3;state.map.jumpTo({pitch:wide?0:state.showCenters?52:0});state.map.fitBounds(b,{padding:cameraPadding(),maxZoom:16,duration:reduced()?0:600});}
function featureBounds(feature){const b=new maplibregl.LngLatBounds();const walk=v=>{if(typeof v[0]==='number')b.extend(v);else v.forEach(walk);};walk(feature.geometry.coordinates);return b;}
function revealDetail(){openMobilePanel();requestAnimationFrame(()=>$('detail').scrollIntoView({block:'start',behavior:reduced()?'auto':'smooth'}));}
function selectNeighborhood(id){const f=state.neighborhoods.features.find(f=>(f.id||f.properties.id)===id);if(!f)return;$('neighborhood').value=id;state.mallId='';update();if(state.loaded){state.map.jumpTo({pitch:state.showCenters?52:0});state.map.fitBounds(featureBounds(f),{padding:cameraPadding(),maxZoom:16,duration:reduced()?0:600});}detailNeighborhood(f);}
function detailNeighborhood(feature){const p=feature.properties,rs=state.rows.filter(r=>assignNeighborhood(r,state.neighborhoods)===feature);$('detail').innerHTML=`<p class="eyebrow">NEIGHBORHOOD CONTEXT</p><h2>${esc(p.name)}</h2><p>${esc(p.definition||p.description||'ขอบเขตเสนอวิเคราะห์จากชื่อย่านและแนวถนน')}</p><p>${num(rs.length)} รายการจุดขาย · ${num(new Set(rs.map(r=>r.brand)).size)} แบรนด์ไม่ซ้ำ</p><p>${esc(p.edges||'')}</p><p>${p.status==='desk-reviewed'?'ตรวจชื่อและแนวขอบบนโต๊ะแล้ว':'ขอบเขตเสนอ · รอทบทวนรอยต่อ'} · ความมั่นใจ ${esc(({low:'ต่ำ',medium:'ปานกลาง',high:'สูง'})[p.confidence]||p.confidence)}</p><p>ขอบเขตเชิงวิเคราะห์ · ยังต้องตรวจการรับรู้กับผู้ใช้พื้นที่</p>${link(p.sourceUrl||p.sourceURLs?.[0]||p.sources?.[0]?.url||p.sources?.[0],'หลักฐานชื่อย่าน')}<p><a href="docs/NEIGHBORHOOD_METHOD.md">นิยามและที่มาขอบเขต ↗</a></p>`;revealDetail();}
function detailRows(ids){
 const rows=state.data.rows.filter(r=>ids.includes(r.id));if(!rows.length)return;
 const first=rows[0],center=state.data.centers.find(c=>c.id===first.mallId);let html=`<p class="eyebrow">STORE EVIDENCE</p>${rows.length===1?brandLogoMarkup(first.brand,{className:'detail-logo'}):''}<h2>${esc(rows.length===1?first.brand:first.venue)}</h2><p>${esc(first.venue)} · ${esc(first.province)}</p>`;
 if(center){html+=`<dl><dt>Shopping Center</dt><dd>${esc(center.name)}</dd><dt>รูปแบบ</dt><dd>${esc(center.type||'ไม่ระบุ')}</dd><dt>GLA ที่รายงาน</dt><dd>${center.gla?num(center.gla)+' ตร.ม.':'ไม่มีข้อมูล'}</dd><dt>ที่มา GLA</dt><dd>${esc(center.glaSource||'—')} · ${esc(center.glaConfidence||'ไม่ระบุความเชื่อมั่น')}</dd></dl>${link(center.source,'ข้อมูล CityMETER ศูนย์การค้า')}`;}
 html+='<ul class="outlet-list">';for(const r of rows)html+=`<li><button class="brand-row" data-outlet="${esc(r.id)}">${brandLogoMarkup(r.brand)}<span><strong>${esc(r.brand)}</strong><br><span class="small muted">${esc(r.name)}</span></span></button><br><span class="status-pill ${isClosed(r)?'closed':''}">${esc(statusLabel(r))}</span><p>${esc(geometryLabel(r))}</p>${link(r.source,'หลักฐานรายการ')} ${link(r.statusSource,'หลักฐานสถานะ')} ${link(r.coordinateSource,'ที่มาพิกัด')}</li>`;html+='</ul>';
 $('detail').innerHTML=html;for(const b of $('detail').querySelectorAll('[data-outlet]'))b.onclick=()=>detailOutlet(b.dataset.outlet);
}
function detailOutlet(id,{fly=true,showPopup=false}={}){const r=state.data.rows.find(x=>x.id===id);if(!r)return;state.selectedId=id;state.pins?.select(id);detailRows([id]);const area=assignNeighborhood(r,state.neighborhoods);
 $('detail').insertAdjacentHTML('beforeend',`<dl><dt>รูปแบบ</dt><dd>${esc(CHANNELS[r.channel]||r.channel)}</dd><dt>กลุ่มแบรนด์</dt><dd>${esc(SEGMENTS[r.segment]||r.segment)}</dd><dt>ย่าน</dt><dd>${esc(area?.properties.name||'ยังอยู่นอกขอบเขตที่นิยาม')}</dd><dt>พิกัดต้นทาง</dt><dd class="data-number">${hasPoint(r)?r.latitude.toFixed(6)+', '+r.longitude.toFixed(6):'ยังไม่มีพิกัด'}</dd><dt>สถานะพิกัด</dt><dd>${esc(r.geometryStatus)}</dd><dt>วันที่ตรวจ</dt><dd>${esc(r.checkedOn)}</dd></dl><p>${esc(r.note||'')}</p>`);
 if(hasPoint(r)&&state.loaded){if(fly)state.map.flyTo({center:[r.longitude,r.latitude],zoom:16,pitch:state.showCenters?52:0,duration:reduced()?0:650});if(showPopup){state.popup?.remove();const wrap=document.createElement('div'),h=document.createElement('h3'),p=document.createElement('p');wrap.innerHTML=brandLogoMarkup(r.brand,{className:'popup-logo'});h.textContent=r.brand;p.textContent=`${r.name||r.venue} · ${geometryLabel(r)}`;wrap.append(h,p);state.popup=new maplibregl.Popup({maxWidth:'280px',offset:14}).setLngLat([r.longitude,r.latitude]).setDOMContent(wrap).addTo(state.map);}}
 const logo=getBrandLogo(r.brand);if(logo)$('detail').insertAdjacentHTML('beforeend',`<p class="logo-credit">${link(logo.sourceURL,'ที่มาโลโก้แบรนด์')} · เครื่องหมายเป็นของเจ้าของแบรนด์</p>`);
 revealDetail();$('results').hidden=true;
}
function bottomSpace(){return $('insights').getBoundingClientRect().height+12;}
function updateLabels(){if(!state.map||!state.neighborhoods)return;$('map').closest('.map-panel').querySelector('.map-note').textContent=state.map.getZoom()<11.5?'หมุดจัดแยกบนจอ · เส้นชี้พิกัดต้นทาง · ซูมดูรายร้าน':'หมุดที่แยกออกมีเส้นเชื่อมกลับพิกัดต้นทาง · เลือกหมุดเพื่อดูร้าน';for(const e of state.labels){const p=state.map.project(e.center);const visible=state.showNeighborhoods&&state.map.getZoom()>=12&&p.x>0&&p.x<$('map').clientWidth&&p.y>60&&p.y<$('map').clientHeight-bottomSpace();e.button.hidden=!visible;e.button.style.left=`${p.x}px`;e.button.style.top=`${p.y}px`;}}
function updateSpatialLayers(){
 if(!state.loaded)return;
 const coverage=state.buildings?.update({rows:state.rows,enabled:state.showCenters,theme:document.documentElement.dataset.theme});
 if(coverage)$('building-coverage').textContent=`รูปทรงอาคารรองรับ ${num(coverage.matchedRows)}/${num(coverage.totalRows)} รายการที่เลือก · ${num(coverage.hostBuildings)} อาคาร · ${num(coverage.unmatchedRows)} รายการยังไม่จับคู่อาคาร${coverage.disputedHeightBuildings?' · ความสูงรอตรวจ '+num(coverage.disputedHeightBuildings)+' อาคาร':''}`;
 const relevant=summarizeNeighborhoods(state.rows,state.neighborhoods),ids=new Set(relevant.map(n=>n.id));
 state.map.getSource('neighborhoods').setData({...state.neighborhoods,features:state.neighborhoods.features.filter(f=>ids.has(f.id||f.properties.id))});
 for(const layer of ['neighborhood-fill','neighborhood-outline'])state.map.setLayoutProperty(layer,'visibility',state.showNeighborhoods?'visible':'none');
 $('neighborhood-labels').replaceChildren();state.labels=[];
 for(const f of state.neighborhoods.features.filter(f=>ids.has(f.id||f.properties.id))){const b=featureBounds(f),center=b.getCenter().toArray(),button=document.createElement('button');button.className='neighborhood-label';button.textContent=f.properties.name;button.title='ขอบเขตย่านเสนอวิเคราะห์ · เลือกเพื่อสำรวจ';button.onclick=()=>selectNeighborhood(f.id||f.properties.id);$('neighborhood-labels').append(button);state.labels.push({button,center});}
 updateLabels();state.pins?.layout();
}
function installSpatialLayers(){
 const map=state.map;state.loaded=true;
 map.addSource('outlets',{type:'geojson',data:pointFeatures(state.rows),cluster:false});
 map.addSource('neighborhoods',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
 map.addLayer({id:'neighborhood-fill',type:'fill',source:'neighborhoods',paint:{'fill-color':'#1D4497','fill-opacity':.045}});
 map.addLayer({id:'neighborhood-outline',type:'line',source:'neighborhoods',paint:{'line-color':document.documentElement.dataset.theme==='dark'?'#A6B5B1':'#5C6A61','line-width':2,'line-dasharray':[4,2]}});
 state.buildings=installVenueBuildings(map,state.buildingData,{rows:state.rows,enabled:state.showCenters,theme:document.documentElement.dataset.theme,onSelect:selection=>{const rs=selection.rows||[];if(rs.length){detailRows(rs.map(r=>r.id));$('detail').insertAdjacentHTML('afterbegin',`<p class="eyebrow">BUILDING CONTEXT</p><p>${esc(selection.heightLabel)} · รูปทรงอาคารที่ตั้ง ไม่ใช่พื้นที่ร้าน</p>${link(selection.feature.properties.source_url,'ที่มารูปทรงอาคาร')}`);revealDetail();}},beforeId:'neighborhood-outline'});
 updateSpatialLayers();state.pins?.layout();if(!state.initialCameraDone){state.initialCameraDone=true;if(fields.some(f=>f!=='cohort'&&$(f).value)||$('cohort').value!=='refresh'||state.mallId)fitMap();}
}
function initMap(){
 if(!window.maplibregl){$('map-failure').hidden=false;return;}
 try{state.mapTheme=document.documentElement.dataset.theme;state.map=new maplibregl.Map({container:'map',center:[100.545,13.739],zoom:14.2,pitch:52,maxPitch:55,attributionControl:true,style:STYLES[state.mapTheme]});state.map.addControl(new maplibregl.NavigationControl({showCompass:true}),'top-right');
 state.pins=installStorePins(state.map,$('map'),{reservedBottom:bottomSpace,onSelect:r=>detailOutlet(r.id,{fly:false,showPopup:true})});state.pins.update(state.rows);
 state.map.on('style.load',installSpatialLayers);state.map.on('move',updateLabels);state.map.on('resize',updateLabels);
 state.map.on('error',e=>console.warn('Map resource',e.error?.message||e));
 }catch(e){$('map-failure').hidden=false;console.error(e);}
}
function renderTable(){const pageSize=25,start=state.page*pageSize,rs=state.rows.slice(start,start+pageSize);$('result-rows').innerHTML=rs.map(r=>`<tr><td><button class="row-name brand-row" data-id="${esc(r.id)}">${brandLogoMarkup(r.brand)}<span>${esc(r.brand)}</span></button><small>${esc(r.name)}</small></td><td>${esc(r.venue)}<small>${esc(r.province)}</small></td><td><span class="status-pill ${isClosed(r)?'closed':''}">${esc(statusLabel(r))}</span>${r.conflict?'<small>⚑ ตรวจหลักฐาน / ตัวตนร้าน</small>':''}</td><td>${esc(geometryLabel(r))}<small class="data-number">${hasPoint(r)?r.latitude.toFixed(5)+', '+r.longitude.toFixed(5):'—'}</small></td><td>${link(r.source,'รายการ')}${link(r.statusSource,'สถานะ')}${link(r.coordinateSource,'พิกัด')}</td></tr>`).join('')||'<tr><td colspan="5">ไม่พบรายการ ลองล้างตัวกรองหรือเลือกชุดข้อมูลอื่น</td></tr>';$('page-label').textContent=state.rows.length?`${num(start+1)}–${num(Math.min(start+pageSize,state.rows.length))} / ${num(state.rows.length)}`:'0 รายการ';$('prev-page').disabled=state.page===0;$('next-page').disabled=start+pageSize>=state.rows.length;for(const b of $('result-rows').querySelectorAll('[data-id]'))b.onclick=()=>{detailOutlet(b.dataset.id);$('detail').scrollIntoView({block:'nearest',behavior:'instant'});};}
function openMobilePanel(){if(matchMedia('(max-width:760px) and (orientation:portrait)').matches){$('sidebar').classList.add('is-open');$('mobile-panel').setAttribute('aria-expanded','true');}}
function closeMobilePanel(){$('sidebar').classList.remove('is-open');$('mobile-panel').setAttribute('aria-expanded','false');if(matchMedia('(max-width:760px) and (orientation:portrait)').matches)$('mobile-panel').focus();}
async function init(){
 try{const fetchJSON=async url=>{const r=await fetch(url);if(!r.ok)throw Error(`${url}: ${r.status}`);return r.json();};let logoCatalog;[state.data,state.neighborhoods,state.buildingData,logoCatalog]=await Promise.all(['data/luxury.json','data/neighborhoods.geojson','data/venue-buildings.geojson','data/brand-logos.json'].map(fetchJSON));const coverage=configureBrandLogos(logoCatalog,state.data.rows);if(!coverage.complete)console.warn('Brand logo coverage',coverage);
  options('segment',Object.keys(SEGMENTS),SEGMENTS);options('channel',state.data.rows.map(r=>r.channel),CHANNELS);options('province',state.data.rows.map(r=>r.province));options('venue',state.data.rows.map(r=>r.venue));for(const f of state.neighborhoods.features){const o=document.createElement('option');o.value=f.id||f.properties.id;o.textContent=f.properties.name;$('neighborhood').append(o);}
  const p=new URLSearchParams(location.search);for(const f of fields)if(p.has(f))$(f).value=p.get(f);if(['centers','mix','compare','neighborhoods'].includes(p.get('view')))state.view=p.get('view');if(state.data.centers.some(c=>c.id===p.get('mall')))state.mallId=p.get('mall');
  try{$('theme').value=localStorage.getItem('citymeter-luxury-theme')||'auto';}catch{}applyTheme();$('theme').onchange=applyTheme;matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>{if($('theme').value==='auto')applyTheme();});
  let timer;for(const f of fields)$(f).addEventListener(f==='search'?'input':'change',()=>{clearTimeout(timer);timer=setTimeout(()=>{state.mallId='';update(f!=='search');if(f==='neighborhood'&&selectedNeighborhood())detailNeighborhood(selectedNeighborhood());},f==='search'?180:0);});
  $('filters').addEventListener('reset',()=>setTimeout(()=>{state.mallId='';$('cohort').value='refresh';update(true);},0));
  for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>{state.view=b.dataset.view;drawChart();saveURL();};
  const tabButtons=[...document.querySelectorAll('[data-view]')];tabButtons.forEach((b,i)=>b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?tabButtons.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabButtons.length)%tabButtons.length;tabButtons[j].focus();tabButtons[j].click();}));
  $('fit-map').onclick=fitMap;$('bangkok-map').onclick=()=>state.map?.flyTo({center:[100.548,13.733],zoom:13,pitch:state.showCenters?45:0,duration:reduced()?0:500});
  $('toggle-centers').onclick=()=>{state.showCenters=!state.showCenters;$('toggle-centers').setAttribute('aria-pressed',String(state.showCenters));updateSpatialLayers();state.map?.easeTo({pitch:state.showCenters?52:0,duration:reduced()?0:400});};
  $('toggle-neighborhoods').onclick=()=>{state.showNeighborhoods=!state.showNeighborhoods;$('toggle-neighborhoods').setAttribute('aria-pressed',String(state.showNeighborhoods));updateSpatialLayers();};
  $('mobile-panel').onclick=()=>{$('sidebar').classList.contains('is-open')?closeMobilePanel():openMobilePanel();};$('close-mobile-panel').onclick=closeMobilePanel;
  document.querySelector('.skip').onclick=()=>{openMobilePanel();$('dataset-title').focus();};
  $('toggle-insights').onclick=()=>{const open=$('insight-content').hidden;$('insight-content').hidden=!open;$('insights').classList.toggle('is-collapsed',!open);$('toggle-insights').setAttribute('aria-expanded',String(open));$('toggle-insights').textContent=open?'ย่อกราฟ ↓':'เปิดกราฟ ↑';requestAnimationFrame(()=>{document.documentElement.style.setProperty('--bottom-panel-height',`${$('insights').getBoundingClientRect().height}px`);state.pins?.layout();updateLabels();drawChart();});};
  const insightSize=new ResizeObserver(()=>{document.documentElement.style.setProperty('--bottom-panel-height',`${$('insights').getBoundingClientRect().height}px`);state.pins?.layout();updateLabels();});insightSize.observe($('insights'));
  $('open-table').onclick=()=>{$('results').hidden=false;closeMobilePanel();$('toggle-table').focus();};$('toggle-table').onclick=()=>{$('results').hidden=true;$('open-table').focus();};
  $('prev-page').onclick=()=>{state.page--;renderTable();};$('next-page').onclick=()=>{state.page++;renderTable();};update();initMap();
 }catch(e){$('load-error').hidden=false;$('load-error').textContent='โหลดข้อมูลไม่สำเร็จ กรุณาเปิดผ่านเว็บเซิร์ฟเวอร์ หรือดูข้อมูลใน repository';console.error(e);}
}
init();
