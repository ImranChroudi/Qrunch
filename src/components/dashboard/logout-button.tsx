"use client";

import type { ComponentProps, ReactNode } from "react";

import { signOutAction } from "@/app/dashboard/actions/restaurant";
import { Button } from "@/components/ui/button";

type LogoutButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
};

export function LogoutButton({ children, className, variant = "ghost" }: LogoutButtonProps) {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant={variant} className={className}>
        {children}
      </Button>
    </form>
  );
}