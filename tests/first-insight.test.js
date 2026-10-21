import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterRows,summarize,summarizeFirstInsight,pointFeatures} from '../js/model.js';

const data=JSON.parse(readFileSync(new URL('../data/luxury.json',import.meta.url)));
const current=filterRows(data.rows,{cohort:'refresh'});
const topIds=[
 '49b5afdc-2436-48bc-8a89-007ac5541d98',
 'a574110c-d856-40fd-a3e6-d3c42c00cd3d',
 'b5d400a8-a9bb-4d2b-ac51-fab752313a21',
];

test('default first insight counts 73 unique brands in 120 of 345 selected POS',()=>{
 const first=summarizeFirstInsight(current,data.centers);
 assert.deepEqual(first.centerIds,topIds);
 assert.deepEqual(first.centers.map(c=>[c.name,c.brands,c.pos]),[
  ['Siam Paragon',52,55],['ICONSIAM',33,33],['Central Embassy',32,32],
 ]);
 assert.equal(first.brands,73);
 assert.equal(first.totalBrands,113);
 assert.equal(first.share,73/113*100);
 assert.equal(first.pos,120);
 assert.equal(first.totalPos,345);
});

test('multi-center action selects the same 120 rows, brands and mapped feature identities',()=>{
 const first=summarizeFirstInsight(current,data.centers);
 const selected=filterRows(data.rows,{cohort:'refresh',mallIds:new Set(first.centerIds)});
 assert.equal(selected.length,first.pos);
 assert.equal(new Set(selected.map(r=>r.brand)).size,first.brands);
 assert.deepEqual(pointFeatures(selected).features.map(f=>f.id),selected.map(r=>r.id));
 assert(selected.every(r=>topIds.includes(r.mallId)));
 assert.equal(summarizeFirstInsight(selected,data.centers).share,100);
});

test('a real brand listed at three centers contributes once, not three brands',()=>{
 const gucci=current.filter(r=>r.brand==='Gucci'&&topIds.includes(r.mallId));
 assert.equal(gucci.length,3);
 assert.equal(new Set(gucci.map(r=>r.mallId)).size,3);
 const first=summarizeFirstInsight(gucci,data.centers);
 assert.equal(first.centers.length,3);
 assert.equal(first.centers.reduce((n,c)=>n+c.brands,0),3);
 assert.equal(first.brands,1);
 assert.equal(first.totalBrands,1);
 assert.equal(first.share,100);
 assert.equal(first.pos,3);
});

test('center Set intersects cohort, search, segment and individual-center filters',()=>{
 const ids=new Set(topIds);
 const selected=filterRows(data.rows,{cohort:'refresh',mallIds:ids,search:'Rolex',segment:'watches'});
 assert.equal(selected.length,3);
 assert(selected.every(r=>ids.has(r.mallId)&&r.brand==='Rolex'&&r.segment==='watches'));
 assert.equal(summarizeFirstInsight(selected,data.centers).brands,1);
 const one=filterRows(data.rows,{cohort:'refresh',mallIds:ids,mallId:topIds[0]});
 assert.equal(one.length,55);
 assert.deepEqual(filterRows(data.rows,{mallIds:new Set()}),[]);
 const excludedCenter=data.centers.find(c=>!ids.has(c.id));
 assert.deepEqual(filterRows(data.rows,{mallIds:ids,mallId:excludedCenter.id}),[]);
});

test('filtered insight uses its own selected denominator and summarize ordering without mutation',()=>{
 const selected=filterRows(data.rows,{cohort:'refresh',province:'Bangkok',segment:'watches'});
 assert(selected.length>0&&selected.length<current.length);
 const before=JSON.stringify({selected,centers:data.centers});
 const first=summarizeFirstInsight(Object.freeze([...selected]),Object.freeze([...data.centers]));
 assert.equal(first.totalPos,selected.length);
 assert.equal(first.totalBrands,new Set(selected.map(r=>r.brand)).size);
 assert.deepEqual(first.centerIds,summarize(selected,data.centers).centers.slice(0,3).map(c=>c.id));
 const chosen=selected.filter(r=>first.centerIds.includes(r.mallId));
 assert.equal(first.pos,chosen.length);
 assert.equal(first.brands,new Set(chosen.map(r=>r.brand)).size);
 assert.equal(JSON.stringify({selected,centers:data.centers}),before);
});

test('no matched center keeps selected denominators instead of implying no brand presence',()=>{
 const withoutHost=current.filter(r=>!r.mallId);
 assert(withoutHost.length>0);
 const first=summarizeFirstInsight(withoutHost,data.centers);
 assert.deepEqual(first.centerIds,[]);
 assert.equal(first.brands,0);
 assert.equal(first.pos,0);
 assert.equal(first.share,0);
 assert.equal(first.totalBrands,new Set(withoutHost.map(r=>r.brand)).size);
 assert.equal(first.totalPos,withoutHost.length);
 const missingRegistry=summarizeFirstInsight(current,[]);
 assert.equal(missingRegistry.totalPos,345);
 assert.equal(missingRegistry.centers.length,0);
});

test('empty and absent inputs produce finite zero counts',()=>{
 const empty={centers:[],centerIds:[],brands:0,totalBrands:0,share:0,pos:0,totalPos:0};
 assert.deepEqual(summarizeFirstInsight([],data.centers),empty);
 assert.deepEqual(summarizeFirstInsight(),empty);
 assert.deepEqual(summarizeFirstInsight(null,null),empty);
});
