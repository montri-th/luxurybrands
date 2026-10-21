import test from 'node:test';
import assert from 'node:assert/strict';
import {separatePins} from '../js/pins.js';

const desktop={left:12,right:1012,top:78,bottom:658};
const repeated=(count,x=512,y=368)=>Array.from({length:count},(_,i)=>({id:`pos-${String(i).padStart(4,'0')}`,x,y}));

function assertEveryPinPresent(input,output){
 assert.equal(output.length,input.length,'no POS may disappear or be aggregated');
 assert.deepEqual(output.map(pin=>pin.id).sort(),input.map(pin=>pin.id).sort());
 assert.equal(new Set(output.map(pin=>pin.id)).size,input.length);
}
function assertBounded(pins,bounds){
 for(const pin of pins){
  assert.ok(Number.isFinite(pin.x)&&Number.isFinite(pin.y));
  assert.ok(pin.x>=bounds.left&&pin.x<=bounds.right,`${pin.id} must stay inside the horizontal bounds`);
  assert.ok(pin.y>=bounds.top&&pin.y<=bounds.bottom,`${pin.id} must stay inside the vertical bounds`);
 }
}
function assertSeparateSlots(pins){
 // Each pin's complete glyph must fit inside its declared square pitch.
 // A UI glyph taller/wider than that pitch needs a separate rendered-box check.
 const epsilon=1e-8;
 for(let i=0;i<pins.length;i++)for(let j=i+1;j<pins.length;j++){
  const spacing=Math.min(pins[i].spacing,pins[j].spacing);
  const dx=Math.abs(pins[i].x-pins[j].x),dy=Math.abs(pins[i].y-pins[j].y);
  assert.ok(dx+epsilon>=spacing||dy+epsilon>=spacing,`${pins[i].id} and ${pins[j].id} occupy overlapping pin slots`);
 }
}

test('345 co-located declared POS remain individual, bounded and non-overlapping in screen slots',()=>{
 const input=repeated(345);
 const output=separatePins(input,desktop);
 assertEveryPinPresent(input,output);
 assertBounded(output,desktop);
 assertSeparateSlots(output);
 assert.ok(output.every(pin=>pin.anchorX===512&&pin.anchorY===368));
});

test('screen placement is deterministic across repeated calls and input order',()=>{
 const input=[...repeated(45),{id:'edge-a',x:-80,y:900},{id:'edge-b',x:1100,y:30}];
 const first=separatePins(input,desktop);
 assert.deepEqual(separatePins(input,desktop),first);
 assert.deepEqual(separatePins([...input].reverse(),desktop),first);
 assertEveryPinPresent(input,first);
 assertBounded(first,desktop);
 assertSeparateSlots(first);
});

test('layout preserves frozen input screen anchors and geographic source fields',()=>{
 const input=Object.freeze(repeated(30,0,0).map(pin=>Object.freeze({...pin,longitude:100.54321,latitude:13.75432,geometryRole:'host_representative'})));
 const before=JSON.stringify(input);
 const output=separatePins(input,{left:12,right:360,top:78,bottom:420});
 assert.equal(JSON.stringify(input),before);
 for(const pin of output){
  assert.equal(pin.anchorX,0);
  assert.equal(pin.anchorY,0);
  assert.equal(pin.longitude,100.54321);
  assert.equal(pin.latitude,13.75432);
  assert.equal(pin.geometryRole,'host_representative');
 }
 assertBounded(output,{left:12,right:360,top:78,bottom:420});
});

test('dense narrow bounds adapt pitch instead of hiding any of 345 POS',()=>{
 const bounds={left:12,right:288,top:78,bottom:340};
 const input=repeated(345,150,200);
 const output=separatePins(input,bounds);
 assertEveryPinPresent(input,output);
 assertBounded(output,bounds);
 assertSeparateSlots(output);
 assert.ok(output[0].spacing<19,'dense viewport must exercise smaller-pitch recovery');
 assert.ok(output[0].spacing>=10);
 assert.ok(output.every(pin=>pin.spacing===output[0].spacing));
 assert.deepEqual(separatePins(input,bounds),output);
});

test('562 pins use full narrow bounds without overlapping toolbar or label exclusions',()=>{
 const bounds={left:10,right:434,top:10,bottom:252,exclusions:[
  {left:8,right:300,top:8,bottom:54},
  {left:390,right:434,top:8,bottom:108},
  {left:150,right:270,top:110,bottom:142},
 ]};
 const input=repeated(562,220,125);
 const output=separatePins(input,bounds,19,{minSpacing:7});
 assertEveryPinPresent(input,output);
 assertBounded(output,bounds);
 assertSeparateSlots(output);
 assert.ok(output[0].spacing>=7&&output[0].spacing<19);
 for(const pin of output)for(const obstacle of bounds.exclusions){
  const radius=pin.spacing/2;
  const overlaps=pin.x>obstacle.left-radius&&pin.x<obstacle.right+radius&&
   pin.y>obstacle.top-radius&&pin.y<obstacle.bottom+radius;
  assert.equal(overlaps,false,`${pin.id}'s complete slot must not overlap a toolbar or neighborhood label`);
 }
 assert.deepEqual(separatePins([...input].reverse(),bounds,19,{minSpacing:7}),output);
});

test('empty input is empty and insufficient space fails explicitly without partial output',()=>{
 assert.deepEqual(separatePins([],desktop),[]);
 assert.throws(()=>separatePins(repeated(2,0,0),{left:0,right:0,top:0,bottom:0}),/too small for individual pins/);
});
