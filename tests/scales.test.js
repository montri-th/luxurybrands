import test from 'node:test';
import assert from 'node:assert/strict';
import {COUNT_SCALE, classColors, countThresholds, buildCountClasses, classify, contrastRatio, inkFor} from '../js/scales.js';

test('count family consumes the exact approved 41-sample LUT and class projections', () => {
  assert.equal(COUNT_SCALE.lut.length, 41);
  assert.deepEqual(COUNT_SCALE.anchors, [COUNT_SCALE.lut[0], COUNT_SCALE.lut[20], COUNT_SCALE.lut[40]]);
  assert.deepEqual(classColors(5), ['#F4F0E7', '#BAD5D4', '#7DBAC0', '#4C7A98', '#213E70']);
  assert.deepEqual(classColors(3), ['#F4F0E7', '#7DBAC0', '#213E70']);
  assert.deepEqual(classColors(7), ['#F4F0E7', '#CBDDD9', '#A8CDCE', '#7DBAC0', '#5A8DA4', '#3E688C', '#213E70']);
  assert.throws(() => classColors(4));
});

test('equal-interval thresholds are closed, contiguous integer intervals that cover 1..max', () => {
  const t = countThresholds(57);
  assert.deepEqual(t, [{lower: 1, upper: 11}, {lower: 12, upper: 22}, {lower: 23, upper: 34}, {lower: 35, upper: 45}, {lower: 46, upper: 57}]);
  for (let v = 1; v <= 57; v++) assert.equal(t.filter(i => v >= i.lower && v <= i.upper).length, 1, `value ${v} belongs to exactly one class`);
  assert.deepEqual(countThresholds(3), [{lower: 1, upper: 1}, {lower: 2, upper: 2}, {lower: 3, upper: 3}]);
  assert.deepEqual(countThresholds(0), []);
  assert.deepEqual(countThresholds(NaN), []);
});

test('classification keeps zero as a measured fact and never collapses missing into a class', () => {
  const model = buildCountClasses([57, 51, 45, 33, 18, 6, 4, 2, 2, 0]);
  assert.equal(model.max, 57);
  assert.equal(model.classCount, 5);
  assert.equal(classify(57, model).fill, '#213E70');
  assert.equal(classify(1, model).fill, '#F4F0E7');
  const zero = classify(0, model);
  assert.equal(zero.state, 'measured_zero');
  assert.equal(zero.outline, COUNT_SCALE.zeroOutline);
  assert.equal(classify(null, model).state, 'no_data');
  assert.equal(classify(5, model, 'out_of_scope').fill, null);
  // A displayed integer and its class always agree with the legend intervals.
  for (const c of model.classes) {
    assert.equal(classify(c.lower, model).fill, c.fill);
    assert.equal(classify(c.upper, model).fill, c.fill);
  }
});

test('fewer distinct values shrink the class count without overlapping intervals and keep the darkest anchor on top', () => {
  const model = buildCountClasses([2, 1, 0]);
  assert.equal(model.classCount, 2);
  assert.equal(model.classes.at(-1).fill, '#213E70');
  assert.equal(model.classes[0].fill, '#F4F0E7');
  assert.deepEqual(buildCountClasses([]).classes, []);
});

test('label ink reaches at least 4.5:1 on every class fill and on the zero fill', () => {
  const model = buildCountClasses([57, 30, 10, 1]);
  for (const c of model.classes) assert.ok(contrastRatio(c.fill, c.ink) >= 4.5, `${c.fill}/${c.ink}`);
  assert.ok(contrastRatio(model.zero.fill, inkFor(model.zero.fill)) >= 4.5);
  assert.equal(inkFor('#213E70'), '#FFFFFF');
  assert.equal(inkFor('#F4F0E7'), '#182327');
});
