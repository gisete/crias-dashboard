'use client';

import { useState } from 'react';
import { PencilSimple, Check, X } from '@phosphor-icons/react';

interface Props {
  label: string;
  value: string | null;
  fieldName: string;
  type?: 'text' | 'select' | 'textarea';
  options?: string[];
  onSave: (fieldName: string, value: string) => Promise<void>;
}

export function InlineEditField({ label, value, fieldName, type = 'text', options, onSave }: Props) {
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

  const displayValue = value || null;

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-label-sm text-gray-500">{label}</span>
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
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center justify-between w-full text-left cursor-pointer"
    >
      <div className="flex flex-col gap-1">
        <span className="text-label-sm text-gray-500">{label}</span>
        {displayValue && (
          <span className="text-body-lg font-medium text-gray-900">{displayValue}</span>
        )}
      </div>
      <PencilSimple
        size={14}
        className="text-gray-400 group-hover:text-gray-900 transition-colors shrink-0"
      />
    </button>
  );
}
