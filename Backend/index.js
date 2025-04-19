import { addAnalysisToDB } from "./src/demoAddAnalysisToDB.js";
import { demoWebsiteAnalysisFunction } from "./src/demoWebsiteAnalysisFunction.js";
import { handleMessage } from "./src/handleMessage.js";
import { initiateAnalysis } from "./src/initiateAnalysis.js";

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