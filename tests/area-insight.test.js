import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterRows,pointFeatures} from '../js/model.js';
import {assignNeighborhood} from '../js/neighborhoods.js';
import {filterAreaRows,summarizeAreaInsight} from '../js/area-insight.js';

const data=JSON.parse(readFileSync(new URL('../data/luxury.json',import.meta.url)));
const geo=JSON.parse(readFileSync(new URL('../data/neighborhoods.geojson',import.meta.url)));
const current=filterRows(data.rows,{cohort:'refresh'});
const topIds=['siam','phrom-phong','chit-lom-phloen-chit'];

test('default top areas contain 97 distinct brands in 175 of 345 selected POS',()=>{
 const insight=summarizeAreaInsight(current,geo);
 assert.deepEqual(insight.areaIds,topIds);
 assert.deepEqual(insight.areas.map(area=>[area.name,area.brands,area.pos]),[
  ['สยาม',57,64],['พร้อมพงษ์',51,56],['ชิดลม–เพลินจิต',45,55],
 ]);
 assert.equal(insight.brands,97);
 assert.equal(insight.totalBrands,113);
 assert.equal(insight.share,97/113*100);
 assert.equal(insight.pos,175);
 assert.equal(insight.totalPos,345);
 assert.equal(insight.assignedPos,244);
});

test('area selection preserves row identity, order and geographic evidence',()=>{
 const before=JSON.stringify({rows:current,geo});
 const selected=filterAreaRows(Object.freeze([...current]),geo,new Set(topIds));
 const expected=current.filter(row=>topIds.includes(assignNeighborhood(row,geo)?.id));
 assert.deepEqual(selected,expected);
 assert.equal(selected.length,175);
 assert.equal(new Set(selected.map(row=>row.brand)).size,97);
 assert(selected.every(row=>current.includes(row)));
 assert.deepEqual(pointFeatures(selected).features.map(feature=>feature.id),selected.map(row=>row.id));
 assert.equal(JSON.stringify({rows:current,geo}),before);
});

const square=(id,x,priority=100)=>({type:'Feature',id,properties:{id,name:id,priority},
 geometry:{type:'Polygon',coordinates:[[[x,13],[x+.01,13],[x+.01,13.01],[x,13.01],[x,13]]]}});
const point=(id,brand,x)=>({id,brand,longitude:x,latitude:13.005});
const fixture={type:'FeatureCollection',features:[square('a',100),square('b',100.02),square('c',100.04),square('d',100.06)]};

test('ranking uses distinct brands before POS and union brands are counted once',()=>{
 const rows=[
  ...Array.from({length:8},(_,i)=>point('a'+i,'Common',100.005)),
  point('b1','Common',100.025),point('b2','B',100.025),point('b3','B2',100.025),
  point('c1','Common',100.045),point('c2','C',100.045),
  point('d1','Common',100.065),point('d2','D',100.065),point('d3','D',100.065),
  point('outside','Outside',100.1),
 ];
 const insight=summarizeAreaInsight(rows,fixture);
 assert.deepEqual(insight.areaIds,['b','d','c']);
 assert.deepEqual(insight.areas.map(area=>[area.brands,area.pos]),[[3,3],[2,3],[2,2]]);
 assert.equal(insight.brands,5);
 assert.equal(insight.pos,8);
 assert.equal(insight.totalBrands,6);
 assert.equal(insight.totalPos,17);
 assert.equal(insight.assignedPos,16);
 assert.equal(insight.share,5/6*100);
});

test('overlap and shared edges use one fixed assignment rather than selected-area priority',()=>{
 const left=square('left',100,2),right=square('right',100.01,1);
 const boundaries={type:'FeatureCollection',features:[left,right]};
 const row=point('edge','Shared',100.01);
 assert.deepEqual(filterAreaRows([row],boundaries,new Set(['left'])),[]);
 assert.deepEqual(filterAreaRows([row],boundaries,new Set(['left','right'])),[row]);
 const insight=summarizeAreaInsight([row],boundaries);
 assert.deepEqual(insight.areaIds,['right']);
 assert.equal(insight.pos,1);
 assert.equal(insight.assignedPos,1);
});

test('missing and invalid points remain in denominators and never acquire a neighborhood',()=>{
 const rows=[point('inside','Inside',100.005),point('outside','Outside',100.1),
  {id:'null',brand:'Missing',latitude:null,longitude:null},
  {id:'empty',brand:'Missing',latitude:'',longitude:''},
  {id:'strings',brand:'Strings',latitude:'13.005',longitude:'100.005'},
  {id:'invalid',brand:'Invalid',latitude:NaN,longitude:100.005}];
 const insight=summarizeAreaInsight(rows,fixture);
 assert.equal(insight.pos,1);
 assert.equal(insight.assignedPos,1);
 assert.equal(insight.totalPos,6);
 assert.equal(insight.totalBrands,5);
 assert.equal(insight.share,20);
 assert.deepEqual(filterAreaRows(rows,fixture,new Set(['a'])),[rows[0]]);
});

test('each filtered selection uses its own denominator and stable neighborhood boundaries',()=>{
 const membership=new Map(current.map(row=>[row.id,assignNeighborhood(row,geo)]));
 const selected=filterRows(data.rows,{cohort:'refresh',segment:'watches',province:'Bangkok'});
 const first=summarizeAreaInsight(selected,geo);
 const members=filterAreaRows(selected,geo,new Set(first.areaIds));
 assert.equal(first.totalPos,selected.length);
 assert.equal(first.totalBrands,new Set(selected.map(row=>row.brand)).size);
 assert.equal(first.pos,members.length);
 assert.equal(first.brands,new Set(members.map(row=>row.brand)).size);
 assert(first.share>=0&&first.share<=100);
 assert(members.every(row=>assignNeighborhood(row,geo)===membership.get(row.id)));
});

test('empty, unavailable and unknown-area selections have finite honest counts',()=>{
 const empty={areas:[],areaIds:[],brands:0,totalBrands:0,share:0,pos:0,totalPos:0,assignedPos:0};
 assert.deepEqual(summarizeAreaInsight(),empty);
 assert.deepEqual(summarizeAreaInsight(null,null),empty);
 const withoutBoundaries=summarizeAreaInsight(current,{type:'FeatureCollection',features:null});
 assert.equal(withoutBoundaries.pos,0);
 assert.equal(withoutBoundaries.assignedPos,0);
 assert.equal(withoutBoundaries.totalPos,345);
 assert.equal(withoutBoundaries.totalBrands,113);
 assert.deepEqual(filterAreaRows(current,geo,new Set()),[]);
 assert.deepEqual(filterAreaRows(current,geo,new Set(['unknown'])),[]);
 assert.deepEqual(filterAreaRows(current,geo,null),[]);
});
