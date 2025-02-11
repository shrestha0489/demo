import { analyze } from "./Controllers/analyze";

export const handler = async (event) => {
  let body;
  if (event.body) {
    body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } else {
    body = event;
  }

  const { url } = body;
  return analyze(url);
};
