import { useEffect, useState } from "react";
import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/lib/theme";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/** Follows the app's theme so dark mode gets a dark toast surface, and turns
 *  on Sonner's rich colors so success / error / warning read with real
 *  contrast against either background. Theme is only applied after mount so
 *  SSR renders with a stable value and hydration doesn't mismatch when the
 *  client reads dark mode out of localStorage. */
const Toaster = ({ ...props }: ToasterProps) => {
  const { effective } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <Sonner
      theme={mounted ? effective : "light"}
      richColors
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
