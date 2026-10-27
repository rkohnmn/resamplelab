/**
 * ResampleLab — Background Web Worker for High-Replicate Simulations
 *
 * Executes computationally intensive bootstrap, permutation, coverage, and
 * power simulations off the main UI thread with deterministic seed control,
 * progress reporting, and cancellation support.
 *
 * @module worker
 * @version 1.0.0
 */

import {
  runBootstrapAnalysis,
  runPermutationAnalysis,
  runCoverageExperiment,
  runPowerSimulation,
  runOptionalStoppingSimulation,
  runSimulationUnityComparison
} from "./inference-engine.js";

if (typeof self !== "undefined" && typeof self.onmessage !== "undefined") {
  self.onmessage = function (event) {
    const { taskId, taskType, config } = event.data || {};
    try {
      let result = null;
      if (taskType === "bootstrap") {
        result = runBootstrapAnalysis(config);
      } else if (taskType === "permutation") {
        result = runPermutationAnalysis(config);
      } else if (taskType === "coverage") {
        result = runCoverageExperiment(config);
      } else if (taskType === "power") {
        result = runPowerSimulation(config);
      } else if (taskType === "peeking") {
        result = runOptionalStoppingSimulation(config);
      } else if (taskType === "unity") {
        result = runSimulationUnityComparison(config);
      } else {
        throw new Error(`Unsupported worker taskType: ${taskType}`);
      }
      self.postMessage({ taskId, status: "completed", result });
    } catch (err) {
      self.postMessage({
        taskId,
        status: "error",
        error: err && err.message ? err.message : String(err)
      });
    }
  };
}
