/** Code generation deliberately refuses unsupported analyses instead of substituting one. */
const single = {
  mean: ['np.mean(x)', 'mean(x)'], median: ['np.median(x)', 'median(x)'],
  trimmed_mean: ['stats.trim_mean(x, 0.1)', 'mean(x, trim=0.1)'],
  sd: ['np.std(x, ddof=1)', 'sd(x)'], variance: ['np.var(x, ddof=1)', 'var(x)'],
  iqr: ['np.quantile(x, 0.75)-np.quantile(x, 0.25)', 'IQR(x, type=7)'],
  quantile_75: ['np.quantile(x, 0.75)', 'as.numeric(quantile(x, 0.75, type=7))'],
  proportion: ['np.mean(x)', 'mean(x)']
};
const groupStats = {diff_means:'mean',diff_medians:'median',diff_proportions:'proportion'};
const pairedStats = {paired_mean_diff:'mean',paired_median_diff:'median'};
const safeLine = v => String(v ?? '').replace(/[\r\n\u2028\u2029]/g,' ');

function prepare(result, payload) {
  if (!result) throw new Error('Run an analysis before exporting code.');
  const id=result.statisticId;
  const B=result.requestedReplicates ?? result.completedReplicates;
  const seed=result.prng?.seed ?? 4289104;
  const confidence=result.confLevel ?? 0.95;
  const method=result.intervalMethod ?? result.ciMethod ?? 'percentile';
  const alternative=result.alternative ?? 'two-sided';
  if (!Number.isSafeInteger(B)||B<2||B>1000000||!Number.isSafeInteger(seed)||seed<0||seed>2147483647) throw new Error('Invalid replicate count or seed.');
  if (!(confidence>0&&confidence<1)) throw new Error('Invalid confidence level.');
  if (!['bootstrap_inference','permutation_inference'].includes(result.analysisType)) throw new Error('This analysis type is not supported by code export.');
  if (!['percentile','basic','normal'].includes(method)) throw new Error(`The ${safeLine(method)} interval is not implemented in code export. No substitute was generated.`);
  if (!['two-sided','less','greater'].includes(alternative)) throw new Error('Unsupported test alternative.');
  let shape, data, stat;
  if (Object.hasOwn(single,id)) {shape='single';data=payload;stat=single[id];}
  else if (Object.hasOwn(groupStats,id)) {shape='groups';data=payload;stat=single[groupStats[id]];}
  else if (Object.hasOwn(pairedStats,id)) {
    if (!Array.isArray(payload) || payload.some(p => typeof p !== 'number' && !(p && typeof p.x === 'number' && Number.isFinite(p.x) && typeof p.y === 'number' && Number.isFinite(p.y)))) throw new Error('Paired exports require finite numeric pairs.');
    shape='single';data=payload.map(p=>typeof p==='number'?p:p.x-p.y);stat=single[pairedStats[id]];
  } else if (['pearson_r','spearman_rho','ols_slope'].includes(id)) {
    shape='pairs';data=payload;
    stat=id==='pearson_r'?['np.corrcoef(x[:,0], x[:,1])[0,1]','cor(x[,1], x[,2])']:
      id==='spearman_rho'?['stats.spearmanr(x[:,0], x[:,1]).statistic',"cor(x[,1], x[,2], method='spearman')"]:
      ['np.cov(x[:,0], x[:,1], ddof=1)[0,1]/np.var(x[:,0], ddof=1)','cov(x[,1], x[,2])/var(x[,1])'];
  } else throw new Error(`Statistic ${safeLine(id)} is not supported by code export. No substitute was generated.`);
  const valid=a=>Array.isArray(a)&&a.length>=2&&a.every(x=>typeof x==='number'&&Number.isFinite(x));
  if (shape==='single'&&!valid(data)||shape==='groups'&&(!valid(data?.g1)||!valid(data?.g2))||shape==='pairs'&&(!Array.isArray(data)||!valid(data.map(p=>p?.x))||!valid(data.map(p=>p?.y)))) throw new Error('Code export needs finite observations matching the selected design.');
  if (id.includes('proportion') && !(shape==='groups'?[...data.g1,...data.g2]:data).every(v=>v===0||v===1)) throw new Error('Proportions require binary 0/1 data.');
  if (result.analysisType==='permutation_inference'&&(shape!=='groups'||result.isExactEnumerated)) throw new Error('Only Monte Carlo independent-group permutation exports are supported. Exact, paired and other designs require their own export implementation.');
  return {id,B,seed,confidence,method,alternative,shape,data,stat,alpha:(1-confidence)/2,permutation:result.analysisType==='permutation_inference'};
}

export function generatePythonScript(result,payload) {
  try {
    const c=prepare(result,payload), {shape,data,B,seed,stat,alpha,confidence,method}=c;
    const lines=[`# ResampleLab: ${safeLine(result.statisticName || c.id)}`,`# Dataset: ${safeLine(result.datasetTitle)}`,
      '# Independent RNG implementation; simulation draws differ from the browser.',
      '# Resamples are processed individually to bound memory use.',
      'import numpy as np','from scipy import stats',`rng = np.random.default_rng(${seed})`,`B = ${B}`,`def statistic(x):\n    return ${stat[0]}`];
    if(shape==='groups') lines.push(`g1 = np.array(${JSON.stringify(data.g1)}, dtype=float)`,`g2 = np.array(${JSON.stringify(data.g2)}, dtype=float)`,'theta_hat = statistic(g1) - statistic(g2)');
    else lines.push(`x = np.array(${JSON.stringify(shape==='pairs'?data.map(p=>[p.x,p.y]):data)}, dtype=float)`,'theta_hat = statistic(x)');
    if(c.permutation) {
      lines.push('pooled = np.concatenate([g1,g2])','n1 = len(g1)','replicates = []','for _ in range(B):','    shuffled = rng.permutation(pooled)','    replicates.append(statistic(shuffled[:n1])-statistic(shuffled[n1:]))','replicates = np.asarray(replicates)');
      const comparison=c.alternative==='greater'?'replicates >= theta_hat - 1e-12':c.alternative==='less'?'replicates <= theta_hat + 1e-12':'np.abs(replicates) >= abs(theta_hat) - 1e-12';
      lines.push(`p_value = (np.count_nonzero(${comparison}) + 1)/(B + 1)`,`print("${c.alternative} Monte Carlo p-value:", p_value)`);
    } else {
      const sample=shape==='groups'?'statistic(rng.choice(g1,len(g1),replace=True))-statistic(rng.choice(g2,len(g2),replace=True))': 'statistic(x[rng.integers(0,len(x),len(x))])';
      lines.push(`boot_stats = np.array([${sample} for _ in range(B)])`,'boot_stats = boot_stats[np.isfinite(boot_stats)]','if len(boot_stats) < 2: raise ValueError("Insufficient finite bootstrap replicates")','se_boot = np.std(boot_stats, ddof=1)',`bounds = np.quantile(boot_stats, [${alpha}, ${1-alpha}], method="linear")`);
      lines.push(method==='basic'?'ci = 2*theta_hat - bounds[::-1]':method==='normal'?`ci = theta_hat + np.array([-1,1])*stats.norm.ppf(${1-alpha})*se_boot`:'ci = bounds');
      lines.push(`print("Estimate:", theta_hat, "Bootstrap SE:", se_boot, "${confidence*100}% ${method} CI:", ci)`);
    }
    return lines.join('\n');
  } catch(e) {return `# Export unavailable: ${safeLine(e.message)}`;}
}

export function generateRScript(result,payload) {
  try {
    const c=prepare(result,payload),{shape,data,B,seed,stat,alpha,confidence,method}=c;
    const vector=a=>'c('+a.join(', ')+')';
    const lines=[`# ResampleLab: ${safeLine(result.statisticName || c.id)}`,`# Dataset: ${safeLine(result.datasetTitle)}`,
      '# Independent RNG implementation; simulation draws differ from the browser.',`set.seed(${seed})`,`B <- ${B}`,`statistic <- function(x) ${stat[1]}`];
    if(shape==='groups') lines.push(`g1 <- ${vector(data.g1)}`,`g2 <- ${vector(data.g2)}`,'theta_hat <- statistic(g1) - statistic(g2)');
    else lines.push(shape==='pairs'?`x <- cbind(${vector(data.map(p=>p.x))}, ${vector(data.map(p=>p.y))})`:`x <- ${vector(data)}`,'theta_hat <- statistic(x)');
    if(c.permutation) {
      lines.push('pooled <- c(g1,g2)','n1 <- length(g1)','replicates <- replicate(B, { s <- sample(pooled); statistic(s[seq_len(n1)])-statistic(s[-seq_len(n1)]) })');
      const comparison=c.alternative==='greater'?'replicates >= theta_hat - 1e-12':c.alternative==='less'?'replicates <= theta_hat + 1e-12':'abs(replicates) >= abs(theta_hat) - 1e-12';
      lines.push(`p_value <- (sum(${comparison})+1)/(B+1)`,`cat("${c.alternative} Monte Carlo p-value:", p_value, "\\n")`);
    } else {
      const sample=shape==='groups'?'statistic(sample(g1,length(g1),replace=TRUE))-statistic(sample(g2,length(g2),replace=TRUE))':shape==='pairs'?'statistic(x[sample.int(nrow(x),nrow(x),replace=TRUE),,drop=FALSE])':'statistic(x[sample.int(length(x),length(x),replace=TRUE)])';
      lines.push(`boot_stats <- replicate(B, ${sample})`,'boot_stats <- boot_stats[is.finite(boot_stats)]','if (length(boot_stats)<2) stop("Insufficient finite bootstrap replicates")','se_boot <- sd(boot_stats)',`bounds <- quantile(boot_stats, c(${alpha}, ${1-alpha}), type=7)`);
      lines.push(method==='basic'?'ci <- 2*theta_hat - rev(bounds)':method==='normal'?`ci <- theta_hat + c(-1,1)*qnorm(${1-alpha})*se_boot`:'ci <- bounds');
      lines.push(`cat("Estimate:", theta_hat, "Bootstrap SE:", se_boot, "${confidence*100}% ${method} CI:", ci, "\\n")`);
    }
    return lines.join('\n');
  } catch(e) {return `# Export unavailable: ${safeLine(e.message)}`;}
}
