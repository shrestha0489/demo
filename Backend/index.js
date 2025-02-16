import analyze from "./Controllers/analyze.js";

export const handler = async (event) => {
  let body;
  try {
    body = event.body ? (typeof event.body === "string" ? JSON.parse(event.body) : event.body) : event;
  } catch (error) {
    console.log(error);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid JSON body" }),
    };
  }

  const { url } = body;
  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "URL is required" }),
    };
  }

  return analyze(url);
};