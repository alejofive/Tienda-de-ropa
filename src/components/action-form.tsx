"use client";

import { useEffect, useRef, type ComponentProps, type SubmitEvent } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import "./action-form.css";

function SubmissionReset({ onSettled }: { onSettled: () => void }) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending) wasPending.current = true;
    else if (wasPending.current) {
      onSettled();
      wasPending.current = false;
    }
  }, [pending, onSettled]);

  return null;
}

export function ActionForm({ children, onSubmit, ...props }: ComponentProps<"form">) {
  const submittedRef = useRef(false);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    if (submittedRef.current) {
      event.preventDefault();
      return;
    }
    onSubmit?.(event);
    if (!event.defaultPrevented) submittedRef.current = true;
  }

  return <form {...props} onSubmit={handleSubmit}><SubmissionReset onSettled={() => { submittedRef.current = false; }} />{children}</form>;
}

export function SubmitButton({ children, pendingLabel, disabled, ...props }: ComponentProps<"button"> & { pendingLabel: string }) {
  const { pending } = useFormStatus();

  return <button {...props} disabled={disabled || pending} aria-busy={pending}>
    {pending ? <><LoaderCircle className="submit-spinner" size={18} aria-hidden="true" />{pendingLabel}</> : children}
  </button>;
}
