import axios from "axios";

const api = axios.create({
  baseURL: "https://qzgipe7jablms5edpu2jyw76xu0qlxmo.lambda-url.us-east-1.on.aws", // Replace with your base URL
});

export default api;
