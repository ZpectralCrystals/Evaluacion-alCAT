import axios, { AxiosError } from "axios";


const browserBaseUrl =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://localhost:8000";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? browserBaseUrl;

export const api = axios.create({
  baseURL: API_BASE_URL,
});


/** Returns the bare server root (no /api suffix), works on any device/IP */
export function getServerRoot(): string {
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Ocurrió un error al comunicarse con la API",
) {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
