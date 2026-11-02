import test from 'node:test';
import assert from 'node:assert/strict';
import {generateRScript,generatePythonScript} from '../js/exporters.js';
const base={statisticId:'median',analysisType:'bootstrap_inference',confLevel:0.90,requestedReplicates:100,prng:{seed:42}};
test('median and non-default confidence survive both script exports',()=>{
  const py=generatePythonScript(base,[1,2,100]);const r=generateRScript(base,[1,2,100]);
  assert.match(py,/return np.median\(x\)/);assert.match(r,/function\(x\) median\(x\)/);
  for(const code of [py,r]) {assert.match(code,/90% percentile CI/);assert.doesNotMatch(code,/0.025/);assert.match(code,/0.95/);}
});
test('export preserves group statistic, tail, pairing, and explicit CI method',()=>{
  for(const gen of [generatePythonScript,generateRScript]) {
    assert.match(gen({...base,statisticId:'diff_medians',analysisType:'permutation_inference',alternative:'less'},{g1:[1,2,100],g2:[3,4,5]}),/less Monte Carlo p-value/);
    assert.match(gen({...base,statisticId:'paired_mean_diff'},[{x:5,y:2},{x:9,y:5}]),/3, ?4/);
    assert.match(gen({...base,intervalMethod:'basic'},[1,2,100]),/90% basic CI/);
    assert.match(gen({...base,intervalMethod:'bca'},[1,2,100]),/^# Export unavailable/);
    assert.match(gen({...base,statisticId:'anova_f'},[1,2,100]),/^# Export unavailable/);
    assert.match(gen({...base,statisticId:'mean'},[1,null,3]),/^# Export unavailable/);
    assert.doesNotMatch(gen({...base,datasetTitle:'title\nprint(123)'},[1,2,100]),/^print\(123\)/m);
  }
});
