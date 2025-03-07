
import { demoWebsiteAnalysisFunction } from "./Lambdas/demoWebsiteAnalysisFunction.js";
import { handleMessage } from "./Lambdas/handleMessage.js";
import { initiateAnalysis } from "./Lambdas/initiateAnalysis.js";

const startAnalysis = async (event) => {
  return initiateAnalysis(event);
};

const websiteAnalysis = async (event) => {
  return demoWebsiteAnalysisFunction(event);
};

const suscribeUserToTaskId = async (event) => {
  return handleMessage(event);
};
