/**
 * Field-level error text — pair with `aria-describedby={id}` on the input.
 * Renders nothing when `message` is empty so it can sit under every field.
 */
export function FieldError({ id, message }: { id: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-destructive">
      {message}
    </p>
  );
}
