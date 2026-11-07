/**
 * Discriminated result for every Server Action.
 *
 * Actions never throw for validation or authorisation problems — they return
 * `{ status: "error", errors }` so forms can render inline messages, and toast
 * a generic failure when the error map is empty (database/RPC failure).
 */
export type ActionResult<T = undefined> =
  | { status: "success"; data: T; message?: string }
  | { status: "error"; errors: Record<string, string>; message?: string }
  | { status: "idle" };

export const success = <T,>(data: T, message?: string): ActionResult<T> => ({
  status: "success",
  data,
  message,
});

export const failure = (
  message: string,
  errors: Record<string, string> = {},
): ActionResult<never> => ({ status: "error", errors, message });

export const idle: ActionResult<never> = { status: "idle" };
