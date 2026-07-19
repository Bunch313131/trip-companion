'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type Variant = 'text' | 'textarea' | 'date';

/**
 * Click-to-edit inline field. Displays as text until tapped; commits on
 * blur or Enter (Cmd/Ctrl+Enter for textarea), cancels on Escape. Only
 * writes when the value actually changed. `onSave` should persist to
 * Firestore; failures roll back and toast.
 */
export function EditableText({
  value,
  onSave,
  variant = 'text',
  placeholder = 'Add…',
  className = '',
  displayClassName = '',
  displayValue,
  editable = true,
  ariaLabel,
}: {
  value: string;
  onSave: (next: string) => Promise<void>;
  variant?: Variant;
  placeholder?: string;
  className?: string;
  displayClassName?: string;
  /** Text shown when not editing (defaults to `value`). Lets a date field
   *  display "Jul 27" while editing the raw ISO value. */
  displayValue?: string;
  editable?: boolean;
  ariaLabel?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (variant !== 'date') {
        const el = inputRef.current;
        el.setSelectionRange?.(el.value.length, el.value.length);
      }
    }
  }, [editing, variant]);

  async function commit() {
    const next = draft.trim();
    if (next === value.trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } catch {
      toast.error('Could not save — check your connection');
      setDraft(value);
    } finally {
      setSaving(false);
    }
  }

  if (!editable) {
    return (
      <span className={displayClassName}>
        {displayValue ?? (value || <span className="text-text-mute">{placeholder}</span>)}
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setEditing(true)}
        className={`-mx-1 rounded px-1 text-left transition-colors hover:bg-surface-2 ${displayClassName}`}
      >
        {displayValue ?? (value || <span className="text-text-mute">{placeholder}</span>)}
      </button>
    );
  }

  const shared = {
    ref: inputRef as never,
    value: draft,
    disabled: saving,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDraft(value);
        setEditing(false);
      } else if (e.key === 'Enter' && (variant !== 'textarea' || e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        commit();
      }
    },
    className: `w-full rounded border border-primary bg-surface px-1 outline-none ${className}`,
  };

  if (variant === 'textarea') {
    return <textarea {...shared} rows={3} />;
  }
  return <input {...shared} type={variant === 'date' ? 'date' : 'text'} />;
}
