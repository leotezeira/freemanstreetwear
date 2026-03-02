"use client";

import { useState } from "react";
import type { ButtonHTMLAttributes } from "react";

type ConfirmSubmitProps = {
  confirmMessage: string;
  children: React.ReactNode;
} &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick" | "children"> & {
    // Next.js Server Actions allow passing a function here; React types define it as string.
    formAction?: any;
  };

export function ConfirmSubmit({ confirmMessage, children, ...buttonProps }: ConfirmSubmitProps) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <button
      type="submit"
      {...buttonProps}
      disabled={submitting || Boolean(buttonProps.disabled)}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
          return;
        }
        setSubmitting(true);
      }}
    >
      {children}
    </button>
  );
}
