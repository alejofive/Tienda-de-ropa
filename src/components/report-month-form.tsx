"use client";

import { useEffect, useRef, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import "./action-form.css";

export function ReportMonthForm({ month, current }: { month: string; current: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const submitted = useRef(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending) wasPending.current = true;
    else if (wasPending.current) {
      submitted.current = false;
      wasPending.current = false;
    }
  }, [pending]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitted.current) return;
    submitted.current = true;
    const selected = new FormData(event.currentTarget).get("month");
    startTransition(() => router.push(`/reportes?month=${encodeURIComponent(String(selected ?? ""))}`));
  }

  return <form method="get" className="month-form" onSubmit={handleSubmit}>
    <label htmlFor="month">Elegir mes</label>
    <input id="month" type="month" name="month" defaultValue={month} max={current} />
    <button type="submit" className="button outline" disabled={pending} aria-busy={pending}>
      {pending ? <><LoaderCircle className="submit-spinner" size={18} aria-hidden="true" />Cargando…</> : "Ver"}
    </button>
  </form>;
}
