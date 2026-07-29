'use client';

import { useState } from 'react';
import { PencilSimple, Envelope, Trash, ArrowClockwise, CircleNotch, X, Check } from '@phosphor-icons/react';
import type { UnmatchedSubmission } from '@/types/database';
import { shortenPlan } from '@/lib/plan-display';
import { capitalizeMonth } from '@/lib/months';
import { useToast } from '@/contexts/ToastContext';
import { verifySubmission, notifySubmission, discardSubmission } from '@/lib/data/unmatched-submissions';

interface Props {
  submission: UnmatchedSubmission;
  onVerified: (id: string) => void;
  onNotified: (id: string, notifiedAt: string) => void;
  onDiscarded: (id: string) => void;
  onEmailUpdated: (id: string, email: string) => void;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);

  if (diffMin < 60) return `Há ${diffMin} min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 6) return `Há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

function formatDayMonth(dateStr: string): string {
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatDatesSummary(dates: string[], month: string): string {
  if (dates.length === 0) return '';

  const monthAbbrev = capitalizeMonth(month).slice(0, 3);

  const groups = new Map<string, string[]>();
  for (const entry of dates) {
    const match = entry.match(/^(\d+)\s*(\(.+\))?/);
    const day = match?.[1] ?? entry;
    const slot = match?.[2] ?? '';
    const days = groups.get(slot) ?? [];
    days.push(day);
    groups.set(slot, days);
  }

  return Array.from(groups.entries())
    .map(([slot, days]) => `${days.join(', ')} ${monthAbbrev}${slot ? ` ${slot}` : ''}`)
    .join(' · ');
}

export function SubmissionCard({ submission, onVerified, onNotified, onDiscarded, onEmailUpdated }: Props) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draftEmail, setDraftEmail] = useState(submission.email);
  const [loading, setLoading] = useState<'verify' | 'notify' | 'discard' | null>(null);

  function handleEditClick() {
    setDraftEmail(submission.email);
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
    setDraftEmail(submission.email);
  }

  async function handleVerify() {
    setLoading('verify');
    const normalizedEmail = draftEmail.trim().toLowerCase();
    const result = await verifySubmission(submission.id, normalizedEmail);
    if (result.error) {
      showToast(result.error, 'error');
    } else {
      if (normalizedEmail !== submission.email) {
        onEmailUpdated(submission.id, normalizedEmail);
      }
      if (result.found) {
        onVerified(submission.id);
      } else {
        showToast('O email não foi encontrado no Brevo. Contacte a família diretamente.', 'error');
      }
    }
    setLoading(null);
  }

  async function handleNotify() {
    setLoading('notify');
    const result = await notifySubmission(submission.id);
    if (result.error) {
      showToast(result.error, 'error');
    } else {
      onNotified(submission.id, new Date().toISOString());
    }
    setLoading(null);
  }

  async function handleDiscard() {
    setLoading('discard');
    const result = await discardSubmission(submission.id);
    if (result.success) {
      onDiscarded(submission.id);
    } else {
      showToast('Erro ao descartar', 'error');
    }
    setLoading(null);
  }

  const monthLabel = capitalizeMonth(submission.month);

  return (
    <div
      className={`bg-surface-container-lowest rounded-xl border p-5 ${
        editing ? 'border-primary' : 'border-surface-container-highest'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={draftEmail}
                onChange={(e) => setDraftEmail(e.target.value)}
                autoFocus
                className="text-body-md font-medium border-2 border-primary rounded-lg px-3 py-1.5 flex-1 max-w-[320px] focus:outline-none"
              />
              <button
                onClick={handleVerify}
                disabled={loading === 'verify'}
                className="flex items-center gap-1.5 border border-primary text-primary-container bg-[#E1F5EE] hover:bg-[#9FE1CB] text-[13px] px-3 py-1.5 rounded-lg"
              >
                {loading === 'verify' ? (
                  <CircleNotch size={14} className="animate-spin" />
                ) : (
                  <>
                    <ArrowClockwise size={14} />
                    Verificar
                  </>
                )}
              </button>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="group flex items-center gap-1.5">
                <span className="text-body-md font-medium text-gray-900">{submission.email}</span>
                <PencilSimple
                  size={14}
                  className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={handleEditClick}
                />
              </div>
              <div className="text-[13px] text-gray-500 mt-1">
                {shortenPlan(submission.plan)}
                {submission.selected_dates.length > 0 &&
                  ` · ${formatDatesSummary(submission.selected_dates, submission.month)}`}
              </div>
            </>
          )}
        </div>

        <span className="text-[13px] text-gray-400 shrink-0">{timeAgo(submission.created_at)}</span>
      </div>

      <div
        className={`flex items-center justify-between mt-3 pt-3 border-t border-surface-container-highest ${
          editing ? 'opacity-30 pointer-events-none' : ''
        }`}
      >
        <span className="text-[13px] text-gray-500">
          {monthLabel} {submission.year}
        </span>

        <div className="flex items-center gap-2">
          {submission.review_status === 'pending' ? (
            <>
              <button
                onClick={handleNotify}
                disabled={loading === 'notify'}
                className="flex items-center gap-1.5 border border-[#BA7517] text-[#854F0B] bg-[#FFFBF0] hover:bg-[#FEF3CD] text-[13px] px-3 py-1.5 rounded-lg"
              >
                {loading === 'notify' ? (
                  <CircleNotch size={14} className="animate-spin" />
                ) : (
                  <>
                    <Envelope size={14} />
                    Notificar
                  </>
                )}
              </button>
              <button
                onClick={handleDiscard}
                disabled={loading === 'discard'}
                className="border border-surface-container-highest text-gray-400 hover:text-error hover:border-error p-1.5 rounded-lg"
              >
                {loading === 'discard' ? <CircleNotch size={14} className="animate-spin" /> : <Trash size={14} />}
              </button>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1 text-[12px] text-[#0F6E56] bg-[#E1F5EE] px-2.5 py-1 rounded-full font-medium">
                <Check size={12} />
                Notificada {submission.notified_at ? formatDayMonth(submission.notified_at) : ''}
              </span>
              <button
                onClick={handleDiscard}
                disabled={loading === 'discard'}
                className="border border-surface-container-highest text-gray-400 hover:text-error hover:border-error text-[13px] px-3 py-1.5 rounded-lg"
              >
                {loading === 'discard' ? <CircleNotch size={14} className="animate-spin" /> : 'Descartar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
