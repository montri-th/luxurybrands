/**
 * Selected neighborhood presence, amCharts 5.20.8. Official examples reviewed 2026-10-21:
 * https://www.amcharts.com/demos/bar-chart/
 * https://www.amcharts.com/demos/bubble-based-heat-map/
 * https://www.amcharts.com/demos/stacked-bar-chart/
 * Values come only from committed, filtered rows. No demo data or animation.
 */
import {buildNeighborhoodChartModel, neighborhoodMatrix, bubbleRadius} from './chart-model.js?v=20261021-r5';
const roots = new Map();
const FONT = 'Bai Jamjuree', DIGITS = 'JetBrains Mono';
const NUMBER = new Intl.NumberFormat('th-TH', {maximumFractionDigits: 0});
const INSTRUCTIONS = 'ใช้ปุ่มลูกศรเลือกข้อมูล และกด Enter เพื่อดูย่านนี้';
const SHORT = {luxury_designer:'ดีไซเนอร์',fine_jewelry:'จิวเวลรี',watches:'นาฬิกา',upscale_streetwear:'Streetwear',thai_designer:'ดีไซน์ไทย',curated_retailer:'Multibrand',beauty_fragrance:'บิวตี้',premium_extension:'พรีเมียม',__unclassified__:'ยังไม่จัดกลุ่ม'};
const key = value => String(value ?? '').trim();
const escaped = value => key(value).replaceAll('[', '[[');
function hash(value) {let result=0;for(const c of key(value))result=((result*31)+c.charCodeAt(0))>>>0;return result;}
function readPalette(element, am5, segments) {
  const style=getComputedStyle(element);
  const get=name=>{const value=style.getPropertyValue(name).trim();if(!value)throw new Error(`Missing chart color token ${name}`);return am5.color(value);};
  return {text:get('--text-primary'),metadata:get('--text-metadata'),grid:get('--border-hairline'),surface:get('--surface-raised'),onFill:get('--chart-on-fill'),
    series:Array.from({length:8},(_,i)=>({fill:get(`--series-${i+1}-fill`),ink:get(`--series-${i+1}-ink`)})),
    segmentIndex:new Map(segments.map((s,i)=>[key(s.id),i%8]))};
}
function tip(root,palette,am5,text='{tooltip}') {
  const t=am5.Tooltip.new(root,{getFillFromSprite:false,getStrokeFromSprite:false,autoTextColor:false,labelText:text});
  t.get('background').setAll({fill:palette.surface,fillOpacity:1,stroke:palette.grid,strokeOpacity:1,cornerRadius:5});
  t.label.setAll({fontFamily:FONT,fontWeight:'400',fontSize:13,fill:palette.text,maxWidth:300,oversizedBehavior:'wrap'});return t;
}
function rendererStyle(renderer,palette,numeric=false) {
  renderer.grid.template.setAll({stroke:palette.grid,strokeOpacity:1});
  renderer.labels.template.setAll({fontFamily:numeric?DIGITS:FONT,fontWeight:'400',fontSize:12,fill:numeric?palette.metadata:palette.text,paddingTop:3,paddingBottom:3});
  renderer.ticks.template.set('visible',false);
}
function empty(element,message,action) {
  const content=document.createElement('div');content.className='chart-empty';
  content.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;height:100%;padding:12px;font:400 14px "Bai Jamjuree",sans-serif;color:var(--text-metadata);text-align:center;';
  const p=document.createElement('p');p.textContent=message;content.append(p);
  if(action){const b=document.createElement('button');b.type='button';b.textContent='ดูทุกย่าน';b.onclick=action;content.append(b);}
  element.replaceChildren(content);let disposed=false;
  return()=>{if(!disposed&&content.parentNode===element)content.remove();disposed=true;};
}
function caption(root,text,palette,am5) {
  root.container.children.push(am5.Label.new(root,{text,fontFamily:FONT,fontSize:12,fontWeight:'400',fill:palette.metadata,paddingLeft:0,paddingTop:0,paddingBottom:4,maxWidth:am5.p100,oversizedBehavior:'truncate'}));
}
const rowLimit=(element,extra=0)=>Math.max(2,Math.min(8,Math.floor((element.clientHeight-49-extra)/25)||3));
const selectArea=(callback,area)=>callback({type:'neighborhood',id:area.id??area.areaId});
function barAxes(root,element,palette,am5,xy) {
  const chart=root.container.children.push(xy.XYChart.new(root,{width:am5.p100,height:am5.p100,panX:false,panY:false,wheelX:'none',wheelY:'none',paddingLeft:0,paddingRight:30,paddingTop:0,paddingBottom:0}));
  const yr=xy.AxisRendererY.new(root,{inversed:true,minGridDistance:18,cellStartLocation:0.18,cellEndLocation:0.82});rendererStyle(yr,palette);yr.grid.template.set('visible',false);
  yr.labels.template.setAll({maxWidth:Math.max(98,Math.min(180,element.clientWidth*0.28)),oversizedBehavior:'truncate',ellipsis:'…',textAlign:'right',paddingRight:8});
  const yAxis=chart.yAxes.push(xy.CategoryAxis.new(root,{categoryField:'category',renderer:yr}));
  const xr=xy.AxisRendererX.new(root,{minGridDistance:48});rendererStyle(xr,palette,true);
  const xAxis=chart.xAxes.push(xy.ValueAxis.new(root,{min:0,maxPrecision:0,extraMax:0.08,numberFormat:'#,###',renderer:xr}));
  return {chart,xAxis,yAxis};
}
function columnStyle(series,palette,callback,group) {
  series.columns.template.setAll({fillOpacity:1,stroke:palette.surface,strokeOpacity:1,strokeWidth:1,tooltipText:'{tooltip}',cursorOverStyle:'pointer',focusable:true,hoverOnFocus:true,role:'button',focusableGroup:group,ariaLabel:`{categoryY}: {brands} แบรนด์ไม่ซ้ำ ${INSTRUCTIONS}`});
  series.columns.template.events.on('click',e=>{const area=e.target.dataItem?.dataContext;if(area)selectArea(callback,area);});
}
function ranking(root,element,model,palette,callback,am5,xy) {
  const data=model.areas.slice(0,rowLimit(element)).map(area=>({...area,category:escaped(area.name),tooltip:`${escaped(area.name)}\n${NUMBER.format(area.brands)} แบรนด์ไม่ซ้ำ · ${NUMBER.format(area.pos)} รายการจุดขาย\nกดเพื่อดูย่านนี้บนแผนที่`}));
  caption(root,`${data.length}/${model.areaCount} ย่าน · เรียงตามแบรนด์ไม่ซ้ำ`,palette,am5);
  const {chart,xAxis,yAxis}=barAxes(root,element,palette,am5,xy);chart.set('ariaLabel','อันดับย่านตามจำนวนแบรนด์ไม่ซ้ำ หน่วยแบรนด์');
  const series=chart.series.push(xy.ColumnSeries.new(root,{name:'แบรนด์ไม่ซ้ำ',xAxis,yAxis,baseAxis:yAxis,valueXField:'brands',categoryYField:'category',fill:palette.series[0].fill,stroke:palette.surface,tooltip:tip(root,palette,am5),interpolationDuration:0}));
  columnStyle(series,palette,callback,'luxury-area-ranking');series.columns.template.setAll({cornerRadiusTR:3,cornerRadiusBR:3});
  series.bullets.push(()=>am5.Bullet.new(root,{locationX:1,sprite:am5.Label.new(root,{text:'{valueX}',populateText:true,centerY:am5.p50,dx:4,fontFamily:DIGITS,fontSize:12,fill:palette.text})}));
  yAxis.data.setAll(data);series.data.setAll(data);
}
function matrix(root,element,model,palette,callback,am5,xy) {
  const labelWidth=Math.max(96,Math.min(165,element.clientWidth*0.28));
  const maxSegments=Math.max(2,Math.min(8,Math.floor((element.clientWidth-labelWidth-14)/65)));
  const m=neighborhoodMatrix(model,{areaLimit:rowLimit(element),segmentLimit:maxSegments});
  caption(root,`${m.areas.length}/${m.totalAreas} ย่าน · ${m.segments.length}/${m.totalSegments} กลุ่ม · ขนาดวง = แบรนด์`,palette,am5);
  const chart=root.container.children.push(xy.XYChart.new(root,{width:am5.p100,height:am5.p100,panX:false,panY:false,wheelX:'none',wheelY:'none',paddingLeft:0,paddingRight:5,paddingTop:0,paddingBottom:0,ariaLabel:'กลุ่มแบรนด์ในแต่ละย่าน พื้นที่วงกลมแทนจำนวนแบรนด์ไม่ซ้ำ สีแทนกลุ่มแบรนด์'}));
  const yr=xy.AxisRendererY.new(root,{inversed:true,minGridDistance:18}),xr=xy.AxisRendererX.new(root,{minGridDistance:20});rendererStyle(yr,palette);rendererStyle(xr,palette);
  yr.grid.template.set('visible',false);yr.labels.template.setAll({maxWidth:labelWidth,oversizedBehavior:'truncate',ellipsis:'…',paddingRight:8});
  xr.grid.template.setAll({location:0.5,strokeDasharray:[2,4]});xr.labels.template.setAll({maxWidth:76,oversizedBehavior:'truncate',ellipsis:'…',textAlign:'center',fontSize:12});
  const yAxis=chart.yAxes.push(xy.CategoryAxis.new(root,{categoryField:'areaId',renderer:yr})),xAxis=chart.xAxes.push(xy.CategoryAxis.new(root,{categoryField:'segmentId',renderer:xr}));
  yr.labels.template.adapters.add('text',(v,t)=>escaped(t.dataItem?.dataContext?.name||v));xr.labels.template.adapters.add('text',(v,t)=>escaped(t.dataItem?.dataContext?.label||v));
  const series=chart.series.push(xy.ColumnSeries.new(root,{xAxis,yAxis,categoryXField:'segmentId',categoryYField:'areaId',valueField:'brands',clustered:false,interpolationDuration:0}));series.columns.template.set('forceHidden',true);
  const bullets=[];let maxRadius=10;
  series.bullets.push((_root,_series,item)=>{
    const cell=item.dataContext,color=palette.series[palette.segmentIndex.get(cell.segmentId)??hash(cell.segmentId)%8],count=NUMBER.format(cell.brands);
    const text=`${escaped(cell.areaName)} · ${escaped(cell.segmentName)}\n${count} แบรนด์ไม่ซ้ำ · ${NUMBER.format(cell.pos)} รายการจุดขาย\nกดเพื่อดูย่านนี้บนแผนที่`;
    const sprite=am5.Container.new(root,{width:24,height:24,centerX:am5.p50,centerY:am5.p50,background:am5.Rectangle.new(root,{fill:palette.surface,fillOpacity:0}),tooltipText:text,tooltip:tip(root,palette,am5,text),cursorOverStyle:'pointer',focusable:true,hoverOnFocus:true,role:'button',focusableGroup:'luxury-area-matrix',ariaLabel:`${escaped(cell.areaName)} ${escaped(cell.segmentName)} ${count} แบรนด์ไม่ซ้ำ ${INSTRUCTIONS}`});
    const circle=sprite.children.push(am5.Circle.new(root,{x:12,y:12,radius:bubbleRadius(cell.brands,m.maxBrands,maxRadius),fill:color.fill,fillOpacity:1,stroke:palette.grid,strokeOpacity:1,strokeWidth:1,interactive:false}));
    const label=sprite.children.push(am5.Label.new(root,{x:12,y:12,centerX:am5.p50,centerY:am5.p50,text:count,fontFamily:DIGITS,fontSize:12,fill:cell.brands?palette.onFill:palette.metadata,interactive:false,visible:!cell.brands||circle.get('radius')>=10}));
    sprite.events.on('click',()=>selectArea(callback,cell));bullets.push({circle,label,cell});return am5.Bullet.new(root,{sprite});
  });
  chart.plotContainer.events.on('boundschanged',()=>{
    maxRadius=Math.max(0,Math.min(15,chart.plotContainer.width()/Math.max(1,m.segments.length)*0.33,chart.plotContainer.height()/Math.max(1,m.areas.length)*0.38));
    for(const b of bullets){const radius=bubbleRadius(b.cell.brands,m.maxBrands,maxRadius);b.circle.set('radius',radius);b.label.set('visible',!b.cell.brands||radius>=10);}
  });
  xAxis.data.setAll(m.segments.map(s=>({...s,segmentId:s.id,label:SHORT[s.id]||s.name})));yAxis.data.setAll(m.areas.map(a=>({...a,areaId:a.id})));series.data.setAll(m.cells);
}
function overlap(root,element,model,palette,callback,am5,xy) {
  caption(root,`เทียบ ${model.areaCount} ย่านที่มีจุดขาย · หน่วยแบรนด์`,palette,am5);
  const legend=root.container.children.push(am5.Legend.new(root,{width:am5.p100,layout:root.horizontalLayout,marginBottom:2,paddingTop:0,paddingBottom:0}));
  legend.labels.template.setAll({fontFamily:FONT,fontSize:12,fill:palette.text});legend.valueLabels.template.set('forceHidden',true);legend.markers.template.setAll({width:9,height:9});
  legend.itemContainers.template.setAll({paddingTop:0,paddingBottom:2,paddingLeft:0,paddingRight:10,interactive:false,focusable:false});
  const data=model.areas.slice(0,rowLimit(element,20)).map(a=>({...a,category:escaped(a.name),tooltip:`${escaped(a.name)}\nเฉพาะย่านนี้ ${NUMBER.format(a.exclusiveBrands)} แบรนด์\nพบในย่านอื่นด้วย ${NUMBER.format(a.sharedBrands)} แบรนด์\nเทียบ ${model.areaCount} ย่านในข้อมูลที่เลือก\nกดเพื่อดูย่านนี้บนแผนที่`}));
  const {chart,xAxis,yAxis}=barAxes(root,element,palette,am5,xy);chart.set('ariaLabel',`แบรนด์เฉพาะย่านและแบรนด์ที่พบร่วมกับย่านอื่น เทียบ ${model.areaCount} ย่านในข้อมูลที่เลือก`);
  const definitions=[{name:'เฉพาะย่านนี้',field:'exclusiveBrands',color:palette.series[1].fill},{name:'พบในย่านอื่นด้วย',field:'sharedBrands',color:palette.series[7].fill}];
  for(const d of definitions){
    const series=chart.series.push(xy.ColumnSeries.new(root,{name:d.name,xAxis,yAxis,baseAxis:yAxis,stacked:true,valueXField:d.field,categoryYField:'category',fill:d.color,stroke:palette.surface,tooltip:tip(root,palette,am5),interpolationDuration:0}));
    columnStyle(series,palette,callback,`luxury-area-${d.field}`);series.columns.template.set('ariaLabel',`{categoryY} ${d.name}: {valueX} แบรนด์ เทียบ ${model.areaCount} ย่าน ${INSTRUCTIONS}`);
    if(d.field==='sharedBrands')series.bullets.push(()=>am5.Bullet.new(root,{locationX:1,sprite:am5.Label.new(root,{text:'{brands}',populateText:true,centerY:am5.p50,dx:4,fontFamily:DIGITS,fontSize:12,fill:palette.text})}));
    series.data.setAll(data);legend.data.push(series);
  }
  yAxis.data.setAll(data);
}
/**
 * Existing view keys are retained. All mark clicks emit {type:'neighborhood',id};
 * a comparison with fewer than two areas offers {type:'resetAreas'}.
 * centers remains an accepted compatibility field; frozen GeoJSON owns membership.
 */
export function renderInsightChart({elementId,view='centers',rows=[],centers=[],segments=[],neighborhoods,theme}={},onSelect=()=>{}) {
  roots.get(elementId)?.();const element=document.getElementById(elementId);if(!element)return()=>{};element.replaceChildren();
  const select=typeof onSelect==='function'?onSelect:()=>{};
  const keepEmpty=(message,action)=>{const remove=empty(element,message,action);const cleanup=()=>{remove();if(roots.get(elementId)===cleanup)roots.delete(elementId);};roots.set(elementId,cleanup);return cleanup;};
  if(!Array.isArray(rows)||!rows.length)return keepEmpty('ไม่พบรายการจุดขายตามตัวกรองนี้');
  const model=buildNeighborhoodChartModel(rows,neighborhoods,segments);
  if(view==='compare'&&model.areaCount<2)return keepEmpty('เลือกอย่างน้อย 2 ย่านเพื่อเปรียบเทียบ',()=>select({type:'resetAreas'}));
  if(!model.areaCount)return keepEmpty('ยังไม่มีย่านสำหรับกราฟนี้ ดูจุดขายบนแผนที่หรือตาราง');
  const am5=globalThis.am5,xy=globalThis.am5xy;if(!am5||!xy)return keepEmpty('กราฟยังโหลดไม่สำเร็จ โปรดดูข้อมูลเดียวกันในตาราง');
  const label=view==='mix'?'กลุ่มแบรนด์ในแต่ละย่าน':view==='compare'?'แบรนด์เฉพาะย่านและแบรนด์ที่พบร่วมกัน':'ย่านเรียงตามจำนวนแบรนด์ไม่ซ้ำ';
  element.setAttribute('aria-label',label);if(theme)element.dataset.chartTheme=theme;
  let root,disposed=false;const dispose=()=>{if(disposed)return;disposed=true;root?.dispose();if(roots.get(elementId)===dispose)roots.delete(elementId);};
  try{
    root=am5.Root.new(elementId,{focusable:true,ariaLabel:label,role:'document',focusPadding:2});roots.set(elementId,dispose);
    const palette=readPalette(element,am5,segments),rules=am5.Theme.new(root);rules.rule('Label').setAll({fontFamily:FONT,fontWeight:'400',fontSize:12,fill:palette.text});rules.rule('Sprite').setAll({stateAnimationDuration:0});
    root.setThemes([rules]);root.interfaceColors.setAll({text:palette.text,alternativeText:palette.metadata,grid:palette.grid});root.numberFormatter.set('numberFormat','#,###');root.container.set('layout',root.verticalLayout);
    if(view==='mix')matrix(root,element,model,palette,select,am5,xy);else if(view==='compare')overlap(root,element,model,palette,select,am5,xy);else ranking(root,element,model,palette,select,am5,xy);
  }catch(error){dispose();console.error('CityMETER insight chart could not render:',error);return keepEmpty('แสดงกราฟไม่ได้ในขณะนี้ โปรดดูข้อมูลเดียวกันในตาราง');}
  return dispose;
}
