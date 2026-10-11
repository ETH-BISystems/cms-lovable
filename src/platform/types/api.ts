/** Standard success response wrapper for API calls. */
export interface ApiResponse<T> {
  data: T;
  success: true;
}

/** Standard error response wrapper for API calls. */
export interface ApiError {
  success: false;
  code: string;
  message: string;
}

/** Union type for any API result. */
export type ApiResult<T> = ApiResponse<T> | ApiError;
