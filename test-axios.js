import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:3000' });
api.interceptors.request.use((config) => {
  console.log("Headers type:", typeof config.headers);
  console.log("Is Headers instance?", config.headers instanceof axios.AxiosHeaders);
  try {
    config.headers.Authorization = "Bearer token";
  } catch (e) {
    console.error("Error setting header:", e.message);
  }
  return config;
});
api.get('/test', { bypassCache: true }).catch(() => {});
