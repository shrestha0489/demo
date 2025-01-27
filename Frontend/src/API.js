import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5002/api', // Replace with your base URL
});

export default api;
