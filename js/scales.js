/**
 * Analytical scale used by the neighborhood layer and the mix matrix.
 *
 * Family: LDS 0.9.7 `count` (sequential, totals — not a rate or density).
 * Source: machine.analyticalScales.scales[scaleId="count"], scaleVersion
 * 4ff5c1fb4be71ecd13c48685b38371b528bcd4ce369ce964a75354c2eb4d0980.
 * DATAVIZ-02/03: the exact approved light LUT is consumed unchanged on both
 * themes; class indices are round(i × 40 / (n − 1)); no interpolation here.
 *
 * The consumer (this module) declares the classification method:
 * five equal-interval classes over [1, max] of the current selection, with
 * integer thresholds. Zero is a measured fact (EVID-05 `measured_zero`), never
 * a class of the ramp, and areas without a defined boundary are `out_of_scope`.
 */
export const COUNT_SCALE = Object.freeze({
  scaleId: 'count',
  kind: 'sequential',
  unit: 'แบรนด์ไม่ซ้ำ',
  labelTh: 'จำนวนรวม',
  anchors: ['#F4F0E7', '#7DBAC0', '#213E70'],
  lut: Object.freeze([
    '#F4F0E7', '#EEEDE5', '#E8EBE3', '#E3E8E1', '#DDE5DF', '#D7E3DD', '#D1E0DB', '#CBDDD9',
    '#C5DAD7', '#C0D8D6', '#BAD5D4', '#B4D2D2', '#AED0D0', '#A8CDCE', '#A2CACC', '#9CC8CA',
    '#96C5C8', '#90C2C6', '#8ABFC4', '#83BDC2', '#7DBAC0', '#78B3BC', '#73ADB8', '#6EA7B4',
    '#69A0B0', '#649AAC', '#5F93A8', '#5A8DA4', '#5587A0', '#50809C', '#4C7A98', '#477494',
    '#436E90', '#3E688C', '#3A6288', '#355C84', '#315680', '#2D507C', '#294A78', '#254474',
    '#213E70',
  ]),
  noData: '#D5DAD6',
  zeroOutline: '#7D877F',
  scaleVersion: '4ff5c1fb4be71ecd13c48685b38371b528bcd4ce369ce964a75354c2eb4d0980',
  themePolicy: 'identical-light-values-on-both-themes',
});

/** Label ink on a class fill: the darker/lighter foundation text that reaches the higher contrast. */
export function inkFor(fill) {
  const dark = '#182327', light = '#FFFFFF';
  return contrastRatio(fill, dark) >= contrastRatio(fill, light) ? dark : light;
}

/** Exact class colours for n ∈ {3,5,7,9}: index round(i × 40 / (n − 1)). */
export function classColors(n = 5) {
  if (![3, 5, 7, 9].includes(n)) throw new RangeError('Class count must be 3, 5, 7 or 9');
  return Array.from({length: n}, (_, i) => COUNT_SCALE.lut[Math.round((i * 40) / (n - 1))]);
}

/**
 * Equal-interval thresholds over [1, max]. Returns closed integer intervals
 * [lower, upper] per class so a displayed integer and its class always agree.
 * With max < n the number of classes shrinks so intervals never overlap.
 */
export function countThresholds(max, n = 5) {
  const top = Number.isFinite(max) ? Math.max(0, Math.floor(max)) : 0;
  if (top < 1) return [];
  const classes = Math.min(n, top);
  const intervals = [];
  let lower = 1;
  for (let i = 0; i < classes; i++) {
    const upper = i === classes - 1 ? top : Math.max(lower, Math.floor((top * (i + 1)) / classes));
    intervals.push({lower, upper});
    lower = upper + 1;
  }
  return intervals;
}

/**
 * Build the legend/class model for the current selection.
 * `values` are the measured distinct-brand counts of every defined area
 * (including measured zeros). Areas outside the defined set are out_of_scope
 * and are not passed here.
 */
export function buildCountClasses(values, n = 5) {
  const measured = (Array.isArray(values) ? values : []).filter(v => Number.isFinite(v) && v > 0);
  const max = measured.length ? Math.max(...measured) : 0;
  const intervals = countThresholds(max, n);
  const colors = classColors(n);
  // Map the k shrunken intervals onto evenly spread class colours so the top interval keeps the darkest anchor.
  const picks = intervals.map((_, i) => (intervals.length === 1 ? n - 1 : Math.round((i * (n - 1)) / (intervals.length - 1))));
  const classes = intervals.map((interval, i) => ({
    index: picks[i],
    lower: interval.lower,
    upper: interval.upper,
    fill: colors[picks[i]],
    ink: inkFor(colors[picks[i]]),
    label: interval.lower === interval.upper ? `${interval.lower}` : `${interval.lower}–${interval.upper}`,
  }));
  return {
    scaleId: COUNT_SCALE.scaleId,
    unit: COUNT_SCALE.unit,
    method: 'equal-interval',
    classCount: classes.length,
    max,
    classes,
    zero: {fill: colors[0], outline: COUNT_SCALE.zeroOutline, label: '0'},
  };
}

/**
 * Resolve one value to its EVID-05 state and visual treatment.
 * - measured: finite nonzero → class fill
 * - measured_zero: 0 → lowest fill + zero outline
 * - out_of_scope / no_data: null fill (caller draws bare basemap or hatch)
 */
export function classify(value, model, state = 'measured') {
  if (state === 'out_of_scope') return {state, fill: null, ink: null, label: 'นอกขอบเขตข้อมูล'};
  if (state === 'no_data' || value == null || !Number.isFinite(value)) {
    return {state: 'no_data', fill: COUNT_SCALE.noData, ink: null, label: 'ไม่มีข้อมูล'};
  }
  if (value <= 0) return {state: 'measured_zero', fill: model.zero.fill, ink: inkFor(model.zero.fill), outline: model.zero.outline, label: '0'};
  const cls = model.classes.find(c => value >= c.lower && value <= c.upper) || model.classes.at(-1);
  if (!cls) return {state: 'measured', fill: COUNT_SCALE.lut[40], ink: inkFor(COUNT_SCALE.lut[40]), label: String(value), classIndex: 4};
  return {state: 'measured', fill: cls.fill, ink: cls.ink, label: String(value), classIndex: cls.index};
}

/** Relative luminance (sRGB) for the build-time contrast check used in tests. */
export function contrastRatio(hexA, hexB) {
  const lum = hex => {
    const c = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [a, b] = [lum(hexA), lum(hexB)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
