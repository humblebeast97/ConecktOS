import { useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Guards a submit action against double-clicks and gives every form the
 * shape it needs for a disabled/loading button. Works with sync or async
 * work — the button stays disabled until the callback resolves.
 *
 * If the callback throws, the thrown value is exposed on `error` for
 * inline surfacing and a toast is shown. `isSubmitting` always clears.
 * `retry()` re-runs the most recent `submit(fn)` — pair it with the
 * error surface so users don't have to re-fill the form.
 *
 *   const { isSubmitting, error, submit, retry } = useSubmit();
 *   <Button disabled={isSubmitting} onClick={() => submit(() => draft.submit("paid"))}>
 *     {isSubmitting ? <Loader2 /> : "Save"}
 *   </Button>
 *   {error ? <button onClick={retry}>Try again</button> : null}
 */
export function useSubmit() {
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastFn = useRef<null | (() => void | Promise<void>)>(null);

  const run = async (fn: () => void | Promise<void>) => {
    if (isSubmitting) return;
    lastFn.current = fn;
    setSubmitting(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      const asError = err instanceof Error ? err : new Error(String(err));
      setError(asError);
      toast.error("Something went wrong", { description: asError.message });
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    if (lastFn.current) void run(lastFn.current);
  };

  return { isSubmitting, error, submit: run, retry };
}
