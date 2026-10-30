import test from 'node:test';
import assert from 'node:assert/strict';
import {assertInputSize, assertTableSize, readDelimitedRecords, missingNumber} from '../js/import-safety.js';
test('interactive byte and cell bounds reject large inputs', () => {
  assert.doesNotThrow(()=>assertInputSize(2*1024*1024));
  assert.throws(()=>assertInputSize(2*1024*1024+1), /2 MB/);
  assert.throws(()=>assertInputSize('🙂'.repeat(600000)), /2 MB/);
  assert.throws(()=>assertTableSize(5001,2), /5,000/);
  assert.throws(()=>assertTableSize(3000,40), /100,000/);
});
test('quoted records preserve commas, escaped quotes, BOM and embedded newlines', () => {
  const {records} = readDelimitedRecords('\uFEFFlabel,value\r\n"A, B",2\r\n"A\nB",3\r\n"He said ""yes""",4');
  assert.deepEqual(records, [['label','value'],['A, B','2'],['A\nB','3'],['He said "yes"','4']]);
});
test('malformed quoted records are rejected',()=>{
  assert.throws(()=>readDelimitedRecords('a,b\n"open,2'),/Unclosed/);
  assert.throws(()=>readDelimitedRecords('a,b\n"closed"oops,2'),/Unexpected/);
});
test('missing values are never converted to observed zero',()=>{
  for (const x of [null,undefined,'',' ','NA','null',false,{}]) assert.ok(Number.isNaN(missingNumber(x)));
  assert.equal(missingNumber('0'),0);
  assert.equal(missingNumber('-12.5'),-12.5);
});
import {parseDelimitedDataset,exportReproducibleSessionJSON} from '../js/exporters.js';
test('Resample excludes missing values instead of adding zero observations',()=>{
  const result=parseDelimitedDataset('x,y\n1,2\n2,4\n3,\n4,8');
  assert.equal(result.valid,true);assert.equal(result.dataPayload.length,3);assert.equal(result.missingCount,1);
  const single=parseDelimitedDataset('value\n10\nNA\n30');
  assert.deepEqual(single.dataPayload,[10,30]);
});
test('Resample rejects unsupported JSON, broken sessions and malformed records',()=>{
  for (const input of ['{}','[]','{"sessionType":"ResampleLabSession"}','{"sessionType":"ResampleLabSession","designType":"one_numerical","dataPayload":[null,2]}','a,a\n1,2\n2,3','a,b\n"open,2']) assert.equal(parseDelimitedDataset(input).valid,false,input);
});
test('Resample session counts derive from validated observations',()=>{
  const result=parseDelimitedDataset(exportReproducibleSessionJSON({title:'Example',designType:'one_numerical',statisticId:'mean',dataPayload:[2,3,4]}));
  assert.equal(result.valid,true);assert.equal(result.rowCount,3);
});

test('Resample validates the saved statistic and accepts explicit missing numeric values',()=>{
  assert.equal(parseDelimitedDataset(JSON.stringify({sessionType:'ResampleLabSession',designType:'one_numerical',statisticId:'diff_means',dataPayload:[1,2,3]})).valid,false);
  assert.deepEqual(parseDelimitedDataset('[null,1,2]').dataPayload,[1,2]);
});
