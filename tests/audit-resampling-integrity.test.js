/** Batch 18 — run from repository root: node --test tests/audit-resampling-integrity.test.js */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPRNG } from '../js/prng.js';
import { sampleStratified, permuteWithinBlocks } from '../js/stats-core.js';
import { runBootstrapAnalysis, runPermutationAnalysis, runOptionalStoppingSimulation } from '../js/inference-engine.js';
import { studentTCDF } from '../js/distributions.js';

test('stratified sample size never exceeds n when strata outnumber observations requested', () => {
  const pop = Array.from({ length: 8 }, (_, i) => ({ value: i, stratum: `stratum_${i}` }));
  for (const replacement of [true, false]) {
    const sample = sampleStratified(pop, 2, replacement, createPRNG(123));
    assert.equal(sample.length, 2);
    assert.equal(new Set(sample.map(x => x.value)).size, 2);
  }
});

test('stratified allocation is exact and largest-remainder across uneven strata', () => {
  const sizes = [5, 3, 2];
  const pop = sizes.flatMap((size, j) => Array.from({ length: size }, (_, i) => ({ value: `${j}:${i}`, stratum: `g${j}` })));
  const sample = sampleStratified(pop, 6, false, createPRNG(55));
  assert.equal(sample.length, 6);
  const counts = sizes.map((_, j) => sample.filter(x => x.stratum === `g${j}`).length);
  assert.deepEqual(counts, [3, 2, 1]);
});

test('stratified sampling validates capacity, integers, empty populations, and zero request', () => {
  const pop = [{ stratum: 'A', value: 1 }];
  assert.deepEqual(sampleStratified(pop, 0, false, createPRNG(1)), []);
  for (const invalid of [NaN, Infinity, 2.5, -1, 100001]) {
    assert.throws(() => sampleStratified(pop, invalid, true, createPRNG(1)), /integer sample size/i);
  }
  assert.throws(() => sampleStratified(pop, 2, false, createPRNG(1)), /Cannot sample/);
  assert.throws(() => sampleStratified([], 1, true, createPRNG(1)), /empty population/i);
});

test('stratified reproducibility is preserved with matching PRNG seeds', () => {
  const pop = Array.from({ length: 30 }, (_, i) => ({ value: i, stratum: i % 4 }));
  const a = sampleStratified(pop, 14, false, createPRNG(999));
  const b = sampleStratified(pop, 14, false, createPRNG(999));
  assert.deepEqual(a, b);
});

test('blocked permutation preserves group size and blocks for valid two-group inputs', () => {
  const records = [
    { block: 'A', group: 'drug', value: 1 }, { block: 'A', group: 'control', value: 2 },
    { block: 'A', group: 'control', value: 3 }, { block: 'B', group: 'drug', value: 4 },
    { block: 'B', group: 'control', value: 5 }
  ];
  const p = permuteWithinBlocks(records, createPRNG(7));
  assert.deepEqual(p.groupLabels, ['drug', 'control']);
  assert.equal(p.g1.length, 2);
  assert.equal(p.g2.length, 3);
  assert.deepEqual([...p.g1, ...p.g2].sort((a,b)=>a-b), [1,2,3,4,5]);
});

test('blocked two-group permutation rejects a third label and nonfinite outcomes', () => {
  assert.throws(() => permuteWithinBlocks([
    {block:'x',group:'A',value:1},{block:'x',group:'B',value:2},{block:'x',group:'C',value:3}
  ], createPRNG(1)), /exactly two/i);
  assert.throws(() => permuteWithinBlocks([
    {block:'x',group:'A',value:NaN},{block:'x',group:'B',value:2}
  ], createPRNG(1)), /finite numeric/i);
});

test('dependent time-series bootstrap refuses invalid iid confidence intervals', () => {
  const res = runBootstrapAnalysis({statisticId:'mean',dataPayload:[1,2,3,4,5,6,7,8],isDependentTimeSeries:true,replicates:50});
  assert.equal(res.valid, false);
  assert.equal(res.code, 'DEPENDENT_DATA_IID_BOOTSTRAP');
  assert.ok(!res.intervals);
  assert.ok(res.warnings.some(w => w.severity === 'error'));
});

test('ordinary independent-sample bootstrap remains operational and seeded', () => {
  const conf = {statisticId:'mean',dataPayload:[2,3,5,7,11,13,17,19],replicates:100,seed:77};
  const a=runBootstrapAnalysis(conf), b=runBootstrapAnalysis(conf);
  assert.ok(a.intervals.percentile.eligible);
  assert.deepEqual(a.intervals.percentile.ci,b.intervals.percentile.ci);
});

test('permutation inference never presumes randomized causality without study-design metadata', () => {
  const common={statisticId:'diff_means',dataPayload:{g1:[1,2,3],g2:[4,5,6]},replicates:50,seed:42,useExactIfAvailable:true};
  const assumed=runPermutationAnalysis(common);
  assert.equal(assumed.analysisType,'permutation_inference');
  assert.match(assumed.causalScopeNote,/Observational study/i);
  const randomized=runPermutationAnalysis({...common,studyDesign:'randomized_experiment'});
  assert.match(randomized.causalScopeNote,/randomly assigned/i);
});

test('optional-stopping displayed p-values use Student-t with n-1 df', () => {
  const res=runOptionalStoppingSimulation({maxN:25,peekEvery:5,numStudies:50,seed:123,alpha:0.05});
  assert.equal(res.valid,true);
  assert.ok(res.sampleTrajectory.length>=4);
  for (const p of res.sampleTrajectory) {
    const expected=2*(1-studentTCDF(p.tStat,p.n-1));
    assert.ok(Math.abs(p.pVal-expected)<1e-12,`${p.n}: ${p.pVal} != ${expected}`);
    assert.equal(p.pVal<=0.05,p.tStat>=p.tCrit);
  }
});
