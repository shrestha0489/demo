
import { addAnalysisToDB } from "./Lambdas/demoAddAnalysisToDB.js";
import { demoWebsiteAnalysisFunction } from "./Lambdas/demoWebsiteAnalysisFunction.js";
import { handleMessage } from "./Lambdas/handleMessage.js";
import { initiateAnalysis } from "./Lambdas/initiateAnalysis.js";

export const startAnalysis = async (event) => {
  return initiateAnalysis(event);
};

export const websiteAnalysis = async (event) => {
  return demoWebsiteAnalysisFunction(event);
};

export const suscribeUserToTaskId = async (event) => {
  return handleMessage(event);
};

export const addAnalysisToDBFn = async(event)=>{
  return addAnalysisToDB(event);
}