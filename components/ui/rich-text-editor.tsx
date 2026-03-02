"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Bold, Italic, Link2, List } from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
  required?: boolean;
  error?: string | null;
};

function normalizeHtml(html: string) {
  return html.replace(/\u00a0/g, " ").trim();
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeightClassName = "min-h-44",
  required,
  error,
}: Props) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = useState(false);

  const isEmpty = useMemo(() => {
    const cleaned = normalizeHtml(value)
      .replace(/<br\s*\/?\s*>/gi, "")
      .replace(/<p>\s*<\/p>/gi, "")
      .replace(/<p>\s*<br\s*\/?\s*>\s*<\/p>/gi, "");
    return cleaned.length === 0;
  }, [value]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    // Keep DOM in sync when value changes externally.
    if (normalizeHtml(el.innerHTML) !== normalizeHtml(value)) {
      el.innerHTML = value;
    }
  }, [value]);

  function exec(command: string, arg?: string) {
    // eslint-disable-next-line
    document.execCommand(command, false, arg);
    const html = editorRef.current?.innerHTML ?? "";
    onChange(html);
  }

  function onInput() {
    const html = editorRef.current?.innerHTML ?? "";
    onChange(html);
  }

  function setLink() {
    const url = window.prompt("URL del link");
    if (!url) return;
    exec("createLink", url);
  }

  const showRequired = required && !focused && isEmpty;
  const finalError = error ?? (showRequired ? "Descripción requerida" : null);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-secondary px-3 py-2" onClick={() => exec("bold")} aria-label="Negrita">
          <Icon icon={Bold} />
        </button>
        <button type="button" className="btn-secondary px-3 py-2" onClick={() => exec("italic")} aria-label="Cursiva">
          <Icon icon={Italic} />
        </button>
        <button
          type="button"
          className="btn-secondary px-3 py-2"
          onClick={() => exec("insertUnorderedList")}
          aria-label="Lista"
        >
          <Icon icon={List} />
        </button>
        <button type="button" className="btn-secondary px-3 py-2" onClick={setLink} aria-label="Link">
          <Icon icon={Link2} />
        </button>
      </div>

      <div
        className={[
          "input-base",
          minHeightClassName,
          "py-3",
          "text-sm",
          "[&_*]:max-w-full",
          finalError ? "border-red-300 focus:border-red-500 dark:border-red-900/60 dark:focus:border-red-700" : "",
        ].join(" ")}
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        onInput={onInput}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        data-placeholder={placeholder ?? ""}
        suppressContentEditableWarning
      />

      {finalError ? <p className="text-sm text-red-700 dark:text-red-300">{finalError}</p> : null}

      <style jsx>{`
        [data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: rgba(100, 116, 139, 0.9);
        }
      `}</style>
    </div>
  );
}
