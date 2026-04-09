export type AppErrorCode = "not_found" | "invalid_input";

export type AppError = {
  readonly code: AppErrorCode;
  readonly message: string;
};

export function appError(code: AppErrorCode, message: string): AppError {
  return { code, message };
}
