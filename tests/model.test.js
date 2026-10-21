import test from 'node:test';
import assert from 'node:assert/strict';
import {filterRows,summarize,pointFeatures,toCSV,hasPoint,safeURL} from '../js/model.js';

const rows=[
 {id:'a',brand:'A',name:'A Boutique',venue:'One',mallId:'m1',segment:'luxury_designer',origin:'market_refresh',latitude:13.74,longitude:100.53},
 {id:'b',brand:'A',venue:'One',mallId:'m1',segment:'luxury_designer',origin:'market_refresh',latitude:13.74,longitude:100.53},
 {id:'c',brand:'B',venue:'Two',origin:'market_refresh',latitude:13.745,longitude:100.53,status:'permanently closed'},
 {id:'d',brand:'C',venue:'Old',origin:'legacy_unmatched',latitude:null,longitude:null},
];

test('current default excludes confirmed closures and unmatched history, all preserves them',()=>{
 assert.equal(filterRows(rows).length,2);
 assert.equal(filterRows(rows,{cohort:'all'}).length,4);
 assert.equal(filterRows(rows,{cohort:'closed'})[0].id,'c');
 assert.equal(filterRows(rows,{cohort:'legacy'})[0].id,'d');
});

test('brand counts differ from POS and missing geometry remains in the denominator',()=>{
 const s=summarize(rows,[{id:'m1',name:'One'}]);
 assert.equal(s.pos,4);
 assert.equal(s.brands,3);
 assert.equal(s.mapped,3);
 assert.equal(s.centers[0].brands,1);
 assert.equal(s.centers[0].pos,2);
 assert.equal(hasPoint(rows[3]),false);
});

test('each mapped declared POS owns one feature even when brand, venue and source coordinates coincide',()=>{
 const source=rows.map(row=>Object.freeze({...row}));
 const original=JSON.stringify(source);
 const f=pointFeatures(Object.freeze(source));
 assert.equal(f.type,'FeatureCollection');
 assert.equal(f.features.length,3);
 assert.deepEqual(f.features.map(feature=>feature.id),['a','b','c']);
 assert.equal(new Set(f.features.map(feature=>feature.id)).size,3);
 for(const feature of f.features){
  const row=source.find(row=>row.id===feature.id);
  assert.equal(feature.properties.id,row.id);
  assert.equal(feature.geometry.type,'Point');
  assert.deepEqual(feature.geometry.coordinates,[row.longitude,row.latitude]);
 }
 assert.deepEqual(f.features[0].geometry.coordinates,f.features[1].geometry.coordinates);
 assert.equal(f.features[0].properties.closed,0);
 assert.equal(f.features[2].properties.closed,1);
 assert.equal(JSON.stringify(source),original,'feature generation must not jitter or mutate source coordinates');
});

test('neighborhood selection intersects the same search, status and host filters',()=>{
 const selected=new Set(['b','c','d']);
 const scoped=filterRows(rows,{cohort:'all',neighborhoodIds:selected,search:'A',mallId:'m1'});
 assert.deepEqual(scoped.map(row=>row.id),['b']);
 assert.deepEqual(pointFeatures(scoped).features.map(feature=>feature.id),['b']);
 assert.equal(summarize(scoped,[{id:'m1',name:'One'}]).pos,1);
 assert.deepEqual(filterRows(rows,{neighborhoodIds:selected}).map(row=>row.id),['b']);
 assert.deepEqual(filterRows(rows,{cohort:'closed',neighborhoodIds:selected}).map(row=>row.id),['c']);
 assert.deepEqual(filterRows(rows,{cohort:'all',neighborhoodIds:new Set()}),[]);
 assert.deepEqual(pointFeatures([]).features,[]);
 assert.equal(summarize([],[]).brands,0);
});

test('public links and CSV remain safe',()=>{
 assert.equal(safeURL('javascript:alert(1)'),'');
 assert.equal(safeURL('https://example.com'),'https://example.com/');
 assert.ok(toCSV([{brand:'=1+1',name:'A,"B"'}]).includes('"\'=1+1"'));
 assert.ok(toCSV([{name:'A,"B"'}]).includes('"A,""B"""'));
});

test('conflicting closure evidence is retained but excluded from the current default',()=>{
 const r={...rows[0],status:'closure_conflict_review'};
 assert.equal(filterRows([r]).length,0);
 assert.equal(filterRows([r],{cohort:'all'}).length,1);
 assert.equal(filterRows([r],{cohort:'closed'}).length,0);
});

test('center selection includes different venue aliases for one verified host',()=>{
 const rs=[{...rows[0],venue:'ICONSIAM'},{...rows[1],venue:'Siam Takashimaya'}];
 assert.equal(filterRows(rs,{mallId:'m1'}).length,2);
 assert.equal(summarize(rs,[{id:'m1',name:'ICONSIAM'}]).centers[0].pos,2);
});
