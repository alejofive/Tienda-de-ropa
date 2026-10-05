"use client";

import { useLayoutEffect, useRef } from "react";
import { groupedInput, numericInput } from "@/lib/format";

type MoneyInputProps = {
  name: string;
  value: string;
  onChange: (digits: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
};

function cursorAfterDigits(formatted: string, count: number) {
  let position = 0;
  let seen = 0;
  while (position < formatted.length && seen < count) {
    if (formatted[position] >= "0" && formatted[position] <= "9") seen++;
    position++;
  }
  return position;
}

export function MoneyInput({ name, value, onChange, placeholder, min = 0, max = 2147483647 }: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const nextCursor = useRef<number | null>(null);
  const formatted = groupedInput(value);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.setCustomValidity(value !== "" && (Number(value) < min || Number(value) > max) ? `Ingresa un valor entre ${groupedInput(String(min))} y ${groupedInput(String(max))} pesos` : "");
    if (nextCursor.current !== null && document.activeElement === input) {
      const position = cursorAfterDigits(formatted, nextCursor.current);
      input.setSelectionRange(position, position);
    }
    nextCursor.current = null;
  }, [value, formatted, min, max]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const typed = input.value;
    const digits = typed.replace(/\D/g, "");
    const normalized = numericInput(digits);
    const before = typed.slice(0, input.selectionStart ?? typed.length).replace(/\D/g, "").length;
    const cursor = Math.max(0, Math.min(normalized.length, before - (digits.length - normalized.length)));
    if (normalized === value) {
      input.value = formatted;
      const position = cursorAfterDigits(formatted, cursor);
      input.setSelectionRange(position, position);
      return;
    }
    nextCursor.current = cursor;
    onChange(normalized);
  }

  return <div className="input-prefix"><span>COP $</span><input ref={inputRef} type="text" inputMode="numeric" autoComplete="off" pattern="[0-9]+(\.[0-9]{3})*" maxLength={13} required placeholder={placeholder} value={formatted} onChange={handleChange} /><input type="hidden" name={name} value={value} style={{ display: "none" }} /></div>;
}
