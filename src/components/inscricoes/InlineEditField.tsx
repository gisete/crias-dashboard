'use client';

import { useState, type ReactNode } from 'react';
import { PencilSimple, Check, X } from '@phosphor-icons/react';

interface Props {
  label?: string;
  value: string | null;
  fieldName: string;
  type?: 'text' | 'select' | 'textarea' | 'date';
  options?: string[];
  onSave: (fieldName: string, value: string) => Promise<void>;
  /** Custom rendering for the display-mode value (e.g. a derived age line). */
  displayValue?: ReactNode;
  /** Overrides the default text classes for the plain-text display value. */
  valueClassName?: string;
}

export function InlineEditField({
  label,
  value,
  fieldName,
  type = 'text',
  options,
  onSave,
  displayValue,
  valueClassName = 'text-body-md text-gray-900',
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(fieldName, draft);
    setSaving(false);
    setEditing(false);
  }

  function handleCancel() {
    setDraft(value ?? '');
    setEditing(false);
  }

  function startEditing() {
    setDraft(value ?? '');
    setEditing(true);
  }

  if (editing) {
    return (
      <div>
        {label && (
          <span className="block mb-1 text-label-sm text-gray-400 uppercase tracking-wider">{label}</span>
        )}
        <div className="flex items-start gap-2">
          {type === 'textarea' ? (
            <textarea
              className="flex-1 text-body-md border border-surface-container-highest rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              autoFocus
            />
          ) : type === 'select' && options ? (
            <select
              className="flex-1 text-body-md border border-surface-container-highest rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            >
              <option value="">—</option>
              {options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : type === 'date' ? (
            <input
              type="date"
              className="flex-1 text-body-md border border-surface-container-highest rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
          ) : (
            <input
              type="text"
              className="flex-1 text-body-md border border-surface-container-highest rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0 mt-0.5"
          >
            <Check size={14} weight="bold" />
          </button>
          <button
            onClick={handleCancel}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-container-highest hover:bg-surface-container text-gray-500 transition-colors shrink-0 mt-0.5"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {label && (
        <span className="block mb-1 text-label-sm text-gray-400 uppercase tracking-wider">{label}</span>
      )}
      <button
        onClick={startEditing}
        className="group inline-flex items-center gap-1.5 w-fit text-left -mx-1.5 -my-0.5 px-1.5 py-0.5 rounded-md hover:bg-surface-container-low transition-colors cursor-pointer"
      >
        {displayValue ? (
          displayValue
        ) : value ? (
          <span className={valueClassName}>{value}</span>
        ) : (
          <span className="text-body-md text-gray-400">—</span>
        )}
        <PencilSimple
          size={14}
          className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        />
      </button>
    </div>
  );
}
