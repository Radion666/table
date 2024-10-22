import axios, { AxiosRequestConfig, Method } from "axios";
import { toast } from "react-toastify";

import { AuthTokenStorageKey } from "../constants/default";

interface apiRequestInputType extends AxiosRequestConfig {
  method: Method;
}

const apiConfig = axios.create({});

export const apiUrl = import.meta.env.VITE_API_URL;

apiConfig.interceptors.request.use(async (cfg) => {
  cfg.baseURL = apiUrl;
  cfg.headers!.Authorization = `Bearer ${localStorage.getItem(AuthTokenStorageKey)}`;
  cfg.timeout = 300000;

  return cfg;
});

export const apiConfigRequests = async <T>({
  method,
  url,
  ...other
}: apiRequestInputType): Promise<{
  data: T;
  config: AxiosRequestConfig<any>;
}> => {
  try {
    const { data, config } = await apiConfig.request({
      method: method,
      url: url,
      ...other
    });

    return { data, config };
  } catch (err: any) {
    if (!((err?.name as string) === "CanceledError")) {
      // toast.error(err?.response?.data);
    }
    console.log(`error on ${url}`, err);
    const error = err?.response?.data?.message;
    const errorMsg = Array.isArray(error) ? error?.[0] : error;
    if (errorMsg) {
      toast.error(errorMsg);
    }
    throw err;
  }
};
