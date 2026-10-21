import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {filterRows, SEGMENTS} from '../js/model.js';
import {assignNeighborhood, summarizeNeighborhoods} from '../js/neighborhoods.js';
import {buildNeighborhoodChartModel, neighborhoodMatrix, bubbleRadius} from '../js/chart-model.js';
const source=JSON.parse(fs.readFileSync(new URL('../data/luxury.json',import.meta.url)));
const geo=JSON.parse(fs.readFileSync(new URL('../data/neighborhoods.geojson',import.meta.url)));
const rows=filterRows(source.rows),segments=Object.entries(SEGMENTS).map(([id,name])=>({id,name}));

test('neighborhood ranking uses distinct brands and conserves selected POS scope',()=>{
 const m=buildNeighborhoodChartModel(rows,geo,segments);
 assert.equal(m.totalPos,345);assert.equal(m.totalBrands,113);assert.equal(m.areaCount,10);
 assert.deepEqual(m.areas.slice(0,3).map(a=>[a.id,a.brands,a.pos]),[['siam',57,64],['phrom-phong',51,56],['chit-lom-phloen-chit',45,55]]);
 assert.equal(m.assignedPos,244);assert.equal(m.outsidePos,101);assert.equal(m.assignedPos+m.outsidePos,m.totalPos);
 for(const a of m.areas)assert.equal(a.exclusiveBrands+a.sharedBrands,a.brands);
});

test('duplicated real POS raises POS count without inflating neighborhood, cell or shared brand counts',()=>{
 const m=buildNeighborhoodChartModel(rows,geo,segments),row=rows.find(r=>r.brand==='Gucci'&&assignNeighborhood(r,geo)?.id==='siam');
 assert.ok(row);const duplicated=buildNeighborhoodChartModel([...rows,{...row,id:'test-copy-of-real-pos'}],geo,segments);
 const a=m.areas.find(a=>a.id==='siam'),b=duplicated.areas.find(a=>a.id==='siam');
 assert.equal(b.pos,a.pos+1);assert.equal(b.brands,a.brands);assert.equal(b.exclusiveBrands,a.exclusiveBrands);assert.equal(b.sharedBrands,a.sharedBrands);
 assert.equal(b.segments.find(s=>s.id===row.segment).brands,a.segments.find(s=>s.id===row.segment).brands);
 assert.equal(duplicated.totalBrands,m.totalBrands);assert.equal(duplicated.assignedPos,m.assignedPos+1);
});

test('exclusive/shared means all assigned selected neighborhoods, including those outside displayed topN',()=>{
 const m=buildNeighborhoodChartModel(rows,geo,segments),display=neighborhoodMatrix(m,{areaLimit:1,segmentLimit:2});
 const siam=m.areas[0];assert.equal(display.areas[0].exclusiveBrands,14);assert.equal(display.areas[0].sharedBrands,43);
 const secondAreas=m.areas.slice(1),expectedShared=siam.brandNames.filter(b=>secondAreas.some(a=>a.brandNames.includes(b))).length;
 assert.equal(siam.sharedBrands,expectedShared);assert.equal(siam.exclusiveBrands,siam.brandNames.length-expectedShared);
 assert.ok(secondAreas.some(a=>a.brandNames.includes('Gucci')));assert.equal(siam.exclusiveBrands+siam.sharedBrands,57);
});

test('matrix cells are complete for shown dimensions; zero means no selected observations in that cell',()=>{
 const m=buildNeighborhoodChartModel(rows,geo,segments),matrix=neighborhoodMatrix(m,{areaLimit:10,segmentLimit:8});
 assert.equal(matrix.cells.length,matrix.areas.length*matrix.segments.length);assert.equal(matrix.maxBrands,28);
 assert.ok(matrix.cells.some(c=>c.brands===0&&c.pos===0));
 for(const cell of matrix.cells){const members=rows.filter(r=>assignNeighborhood(r,geo)?.properties.id===cell.areaId&&r.segment===cell.segmentId);
  assert.equal(cell.pos,members.length);assert.equal(cell.brands,new Set(members.map(r=>r.brand)).size);}
});

test('filtering recomputes scope and overlap while geographic membership stays fixed',()=>{
 const selected=rows.filter(r=>r.brand==='Gucci'),m=buildNeighborhoodChartModel(selected,geo,segments);
 assert.equal(m.totalBrands,1);assert.ok(m.areaCount>1);
 for(const a of m.areas){assert.equal(a.brands,1);assert.equal(a.sharedBrands,1);assert.equal(a.exclusiveBrands,0);}
 const siamOnly=selected.filter(r=>assignNeighborhood(r,geo)?.properties.id==='siam');
 const one=buildNeighborhoodChartModel(siamOnly,geo,segments);assert.equal(one.areaCount,1);assert.equal(one.areas[0].exclusiveBrands,1);
});

test('text labels never assign outside points; source data and geometry remain untouched',()=>{
 const before=JSON.stringify([rows,geo]);const outside=rows.filter(r=>!assignNeighborhood(r,geo));assert.ok(outside.length);
 const m=buildNeighborhoodChartModel(outside.map(r=>({...r,neighborhood:'สยาม'})),geo,segments);
 assert.equal(m.areaCount,0);assert.equal(m.outsidePos,outside.length);assert.equal(m.totalPos,outside.length);
 assert.equal(JSON.stringify([rows,geo]),before);
});

test('stable sort and frozen edge assignment agree with geographic summaries',()=>{
 const m=buildNeighborhoodChartModel(rows,geo,segments),reverse=buildNeighborhoodChartModel([...rows].reverse(),geo,segments);
 assert.deepEqual(m.areas.map(a=>[a.id,a.brands,a.pos,a.exclusiveBrands,a.sharedBrands]),reverse.areas.map(a=>[a.id,a.brands,a.pos,a.exclusiveBrands,a.sharedBrands]));
 const spatial=summarizeNeighborhoods(rows,geo);for(const a of m.areas){const reference=spatial.find(s=>s.id===a.id);assert.equal(a.pos,reference.pos);assert.equal(a.brands,reference.brands);}
});

test('bubble circle area, rather than radius, is proportional to distinct brand count',()=>{
 assert.equal(bubbleRadius(0,100,10),0);assert.equal(bubbleRadius(100,100,10),10);
 const small=bubbleRadius(25,100,10),large=bubbleRadius(100,100,10);assert.equal(small,5);assert.equal(small**2/large**2,0.25);
 assert.equal(bubbleRadius(1,0,10),0);assert.equal(bubbleRadius(1,10,0),0);
});

test('missing/empty geometry and rows produce explicit finite empty models',()=>{
 const m=buildNeighborhoodChartModel(null,null,null);assert.equal(m.totalPos,0);assert.equal(m.areaCount,0);assert.equal(m.outsidePos,0);
 assert.deepEqual(neighborhoodMatrix(m).cells,[]);assert.equal(neighborhoodMatrix(m).maxBrands,0);
 const noGeometry=buildNeighborhoodChartModel(rows,undefined,segments);assert.equal(noGeometry.areaCount,0);assert.equal(noGeometry.outsidePos,345);
 assert.deepEqual(neighborhoodMatrix(buildNeighborhoodChartModel(rows,geo,segments),{areaLimit:0,segmentLimit:0}).cells,[]);
});
