'use client';

import { useEffect, useState } from 'react';
import type { UnmatchedSubmission } from '@/types/database';
import { fetchUnmatchedSubmissions } from '@/lib/data/unmatched-submissions';
import { useToast } from '@/contexts/ToastContext';
import { SubmissionCard } from '@/components/revisao/SubmissionCard';

type Tab = 'pending' | 'notified';

const ACTIVE_CLASS = 'bg-on-surface text-white border-on-surface shadow-sm';
const INACTIVE_CLASS =
  'bg-surface-container text-gray-600 border-surface-container-highest hover:bg-surface-container-high';

export default function RevisaoPage() {
  const [submissions, setSubmissions] = useState<UnmatchedSubmission[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const { showToast } = useToast();

  useEffect(() => {
    fetchUnmatchedSubmissions().then(setSubmissions);
  }, []);

  const pendingCount = submissions.filter((s) => s.review_status === 'pending').length;
  const notifiedCount = submissions.filter((s) => s.review_status === 'notified').length;
  const filtered = submissions.filter((s) => s.review_status === activeTab);

  function handleVerified(id: string) {
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    showToast('Inscrição criada com sucesso');
  }

  function handleNotified(id: string, notifiedAt: string) {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, review_status: 'notified' as const, notified_at: notifiedAt } : s)),
    );
    showToast('Notificação enviada');
  }

  function handleDiscarded(id: string) {
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    showToast('Inscrição descartada');
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-headline-lg text-gray-900">Revisão</h1>
        {pendingCount > 0 && (
          <span
            className="text-[13px] px-2.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: '#F0C775', color: '#633806' }}
          >
            {pendingCount}
          </span>
        )}
      </div>

      <p className="text-body-md text-gray-500 mb-6">
        Inscrições de famílias que indicaram ser existentes, mas cujo email não foi encontrado no Brevo.
      </p>

      <div className="flex gap-1.5 mb-8">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 rounded-lg text-label-md border transition-colors ${
            activeTab === 'pending' ? ACTIVE_CLASS : INACTIVE_CLASS
          }`}
        >
          Pendentes ({pendingCount})
        </button>
        <button
          onClick={() => setActiveTab('notified')}
          className={`px-6 py-3 rounded-lg text-label-md border transition-colors ${
            activeTab === 'notified' ? ACTIVE_CLASS : INACTIVE_CLASS
          }`}
        >
          Notificadas ({notifiedCount})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-body-lg text-gray-500">
            {activeTab === 'pending' ? 'Nenhuma inscrição pendente de revisão.' : 'Nenhuma inscrição notificada.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((submission) => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
              onVerified={handleVerified}
              onNotified={handleNotified}
              onDiscarded={handleDiscarded}
            />
          ))}
        </div>
      )}
    </>
  );
}
