import type { AppError } from "./errors.js";

export type AppResult<T> =
  | {
      readonly ok: true;
      readonly value: T;
    }
  | {
      readonly ok: false;
      readonly error: AppError;
    };

export function ok<T>(value: T): AppResult<T> {
  return { ok: true, value };
}

export function err<T>(error: AppError): AppResult<T> {
  return { ok: false, error };
}
