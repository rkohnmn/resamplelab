"""Execute generated Python against deterministic analytical and interval fixtures."""
from pathlib import Path
import subprocess, json, io, contextlib
import numpy as np
from scipy import stats
ROOT=Path(__file__).resolve().parents[1]
def generate(result,data):
    script="import {generatePythonScript} from './js/exporters.js'; console.log(generatePythonScript("+json.dumps(result)+","+json.dumps(data)+"));"
    return subprocess.check_output(['node','--input-type=module','-e',script],cwd=ROOT,text=True,encoding='utf-8')
base={'analysisType':'bootstrap_inference','confLevel':0.9,'requestedReplicates':200,'prng':{'seed':42}}
x=[1,2,3,4,100]
fixtures=[('mean',x,22),('median',x,3),('sd',x,np.std(x,ddof=1)),('variance',x,np.var(x,ddof=1)),('trimmed_mean',list(range(10)),4.5),('iqr',x,2),('quantile_75',x,4),('proportion',[1,0,1,0],.5),('diff_medians',{'g1':x,'g2':[4,5,6]},-2),('paired_mean_diff',[{'x':4,'y':1},{'x':9,'y':5}],3.5),('ols_slope',[{'x':1,'y':2},{'x':2,'y':4},{'x':3,'y':6},{'x':4,'y':8}],2)]
for name,data,expected in fixtures:
    for method in ['percentile','basic','normal']:
        namespace={}
        with contextlib.redirect_stdout(io.StringIO()),np.errstate(invalid='ignore',divide='ignore'):
            exec(generate(dict(base,statisticId=name,intervalMethod=method),data),namespace)
        assert np.isclose(namespace['theta_hat'],expected),(name,namespace['theta_hat'],expected)
        q=np.quantile(namespace['boot_stats'],[.05,.95])
        wanted=q if method=='percentile' else 2*expected-q[::-1] if method=='basic' else expected+np.array([-1,1])*stats.norm.ppf(.95)*namespace['se_boot']
        assert np.allclose(namespace['ci'],wanted),(name,method)
for alternative in ['less','greater','two-sided']:
    namespace={}
    with contextlib.redirect_stdout(io.StringIO()):
        exec(generate(dict(base,statisticId='diff_medians',analysisType='permutation_inference',alternative=alternative),{'g1':[1,2,3],'g2':[5,6,7]}),namespace)
    r,t=namespace['replicates'],namespace['theta_hat']
    hits=np.count_nonzero(r<=t+1e-12 if alternative=='less' else r>=t-1e-12 if alternative=='greater' else abs(r)>=abs(t)-1e-12)
    assert np.isclose(namespace['p_value'],(hits+1)/201)
print('PASS: 33 generated bootstrap analyses and 3 directional permutation scripts')
