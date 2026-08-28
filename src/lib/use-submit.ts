import { useState } from "react";

/**
 * Guards a submit action against double-clicks and gives every form the
 * shape it needs for a disabled/loading button. Works with sync or async
 * work — the button stays disabled until the callback resolves.
 *
 *   const { isSubmitting, submit } = useSubmit();
 *   <Button disabled={isSubmitting} onClick={() => submit(() => draft.submit("paid"))}>
 *     {isSubmitting ? <Loader2 /> : "Save"}
 *   </Button>
 */
export function useSubmit() {
  const [isSubmitting, setSubmitting] = useState(false);

  const submit = async (fn: () => void | Promise<void>) => {
    if (isSubmitting) return;
    setSubmitting(true);
    try {
      await fn();
    } finally {
      setSubmitting(false);
    }
  };

  return { isSubmitting, submit };
}
