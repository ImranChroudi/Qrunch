"use client";

import { useId, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * A Switch that actually submits with its form.
 *
 * Radix switches render a `<button>`, so the value never reaches the server on
 * submit — we mirror the state into a hidden input the Zod schema reads.
 */
export function SwitchInput({
  name,
  label,
  defaultChecked = true,
  className,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  className?: string;
}) {
  const id = useId();
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div
      className={cn(
        "flex h-9 items-center gap-2 rounded-md border px-3",
        className,
      )}
    >
      <Switch id={id} checked={checked} onCheckedChange={setChecked} aria-label={label} />
      <label htmlFor={id} className="cursor-pointer text-sm text-muted-foreground">
        {label}
      </label>
      <input type="hidden" name={name} value={checked ? "true" : "false"} />
    </div>
  );
}
