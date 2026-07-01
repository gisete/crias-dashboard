'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowsClockwise, Check } from '@phosphor-icons/react';
import { resyncRegistration } from '@/lib/data/registrations';
import type { Family, Child } from '@/types/database';

interface Props {
  registrationId: string;
  family: Family;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
}

export function ResyncButton({ registrationId, family, onUpdate }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!showModal) return;
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && !syncing) setShowModal(false);
    }
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [showModal, syncing]);

  async function handleConfirm() {
    setSyncing(true);
    setError(null);
    const result = await resyncRegistration(registrationId);
    setSyncing(false);
    setShowModal(false);

    if (!result.success) {
      setError(result.error ?? 'Erro ao sincronizar.');
      return;
    }

    const updates: Record<string, unknown> = {};
    if (result.family) {
      updates.family = { ...family, ...result.family };
    }
    if (result.children) {
      updates.children = result.children as Child[];
    }
    if (result.updated) {
      updates.num_children = result.updated.childrenCount;
    }
    onUpdate(registrationId, updates);

    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => { setError(null); setShowModal(true); }}
        disabled={syncing}
        className="flex items-center gap-1.5 text-label-md text-gray-600 border border-surface-container-highest rounded-lg px-4 py-2 hover:bg-surface-container-low transition-colors disabled:opacity-50"
      >
        <ArrowsClockwise size={14} className={syncing ? 'animate-spin' : ''} />
        {syncing ? 'A sincronizar...' : 'Re-sincronizar'}
      </button>
      {error && <p className="text-label-sm text-red-500">{error}</p>}
      {success && (
        <p className="flex items-center gap-1.5 text-label-sm text-status-pago-text">
          <Check size={12} weight="bold" />
          Dados atualizados
        </p>
      )}

      {showModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => { if (!syncing) setShowModal(false); }}
        >
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
          <div
            className="relative bg-surface-container-lowest rounded-2xl shadow-xl p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-headline-md text-gray-900 mb-3">Re-sincronizar dados?</h2>
            <p className="text-body-md text-gray-600 mb-8">
              Atualizar dados desta família a partir do Brevo?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                disabled={syncing}
                className="px-5 py-2.5 rounded-xl text-label-md border border-primary text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={syncing}
                className="px-5 py-2.5 rounded-xl text-label-md bg-on-primary-fixed text-white hover:bg-on-primary-fixed/90 transition-colors disabled:opacity-70"
              >
                {syncing ? 'A sincronizar...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
