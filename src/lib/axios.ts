import axios from "axios";

// Get API URL and key from environment or window config (for widget)
const getApiConfig = () => {
  // Check if running as embedded widget
  if (typeof window !== 'undefined' && (window as any).__CHAT_WIDGET_CONFIG__) {
    const widgetConfig = (window as any).__CHAT_WIDGET_CONFIG__;
    return {
      baseURL: widgetConfig.apiUrl || import.meta.env.VITE_API_URL || "",
      apiKey: widgetConfig.apiKey,
    };
  }
  
  // Regular app mode
  return {
    baseURL: import.meta.env.VITE_API_URL || "",
    apiKey: null,
  };
};

const apiConfig = getApiConfig();

const axiosInstance = axios.create({
  baseURL: apiConfig.baseURL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  // Add API key header if available (from widget config or env)
  const currentConfig = getApiConfig();
  if (currentConfig.apiKey) {
    config.headers['X-API-Key'] = currentConfig.apiKey;
    config.headers['Authorization'] = `Bearer ${currentConfig.apiKey}`;
  }
  
  // Placeholder for future token handling
  // const token = Cookies.get("access_token");
  // if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default axiosInstance;

