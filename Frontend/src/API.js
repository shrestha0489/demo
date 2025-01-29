import axios from "axios";

const api = axios.create({
  baseURL: "https://d13fbrqampg8cm.cloudfront.net/api", // Replace with your base URL
});

export default api;
