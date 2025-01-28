import axios from "axios";

const api = axios.create({
  baseURL: "http://3.87.8.180:5002/api", // Replace with your base URL
});

export default api;
