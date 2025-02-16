import axios from "axios";

const api = axios.create({
  baseURL:
    "https://73v6qtopzxmsgoq6oupmvhqale0iocxp.lambda-url.us-east-1.on.aws"
});

export default api;
