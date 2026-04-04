import axios from "axios";

type ApiErrorIssue = {
  message?: string;
};

type ApiErrorResponse = {
  message?: string;
  issues?: ApiErrorIssue[];
};

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return (
      error.response?.data?.message ??
      error.response?.data?.issues?.[0]?.message ??
      error.message ??
      fallback
    );
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}
