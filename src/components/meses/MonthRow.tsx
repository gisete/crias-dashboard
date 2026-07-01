'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Archive, ClockCounterClockwise, DownloadSimple, Trash } from '@phosphor-icons/react';
import { MONTH_LABELS } from '@/lib/months';
import { updateMonthStatus, deleteMonth, type MonthWithCount } from '@/lib/data/months';

interface Props {
  month: MonthWithCount;
  onChanged: () => void;
}

export function MonthRow({ month, onChanged }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showModal) return;
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && !working) setShowModal(false);
    }
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [showModal, working]);

  const isActive = month.status === 'active';
  const label = `${MONTH_LABELS[month.month - 1]} ${month.year}`;

  async function handleToggleStatus() {
    setWorking(true);
    const result = await updateMonthStatus(month.id, isActive ? 'archived' : 'active');
    setWorking(false);
    if (result.success) onChanged();
  }

  function handleExport() {
    window.open(`/api/months/${month.id}/export`, '_blank');
  }

  async function handleDelete() {
    setWorking(true);
    const result = await deleteMonth(month.id);
    setWorking(false);
    if (result.success) {
      setShowModal(false);
      onChanged();
    } else {
      setShowModal(false);
      setError(result.error ?? 'Erro ao eliminar. Tente novamente.');
    }
  }

  return (
    <div className="flex items-center justify-between bg-surface-container-lowest rounded-xl border border-surface-container-highest p-6">
      <div className="flex items-center gap-4">
        <span className="text-body-lg font-medium text-gray-900">{label}</span>
        <span
          className={`inline-flex items-center px-4 py-2 rounded-full text-label-md ${
            isActive ? 'bg-status-pago-bg text-status-pago-text' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {isActive ? 'Ativo' : 'Arquivado'}
        </span>
        <span className="text-body-md text-gray-500">
          {month.registrationCount} {month.registrationCount === 1 ? 'inscrição' : 'inscrições'}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {error && <p className="text-label-sm text-red-500">{error}</p>}
        {month.registrationCount === 0 && (
          <button
            onClick={() => { setError(null); setShowModal(true); }}
            disabled={working}
            className="flex items-center gap-1.5 text-label-md text-red-300 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <Trash size={14} />
            Eliminar
          </button>
        )}
        <button
          onClick={handleToggleStatus}
          disabled={working}
          className="flex items-center gap-1.5 text-label-md text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
        >
          {isActive ? <Archive size={14} /> : <ClockCounterClockwise size={14} />}
          {isActive ? 'Arquivar' : 'Reativar'}
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 text-label-md text-gray-500 hover:text-gray-900 transition-colors"
        >
          <DownloadSimple size={14} />
          Exportar
        </button>
      </div>

      {showModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => { if (!working) setShowModal(false); }}
        >
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
          <div
            className="relative bg-surface-container-lowest rounded-2xl shadow-xl p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-headline-md text-gray-900 mb-3">Eliminar mês?</h2>
            <p className="text-body-md text-gray-600 mb-8">
              Esta ação vai eliminar permanentemente o mês de {label}. Esta ação não pode ser
              revertida.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                disabled={working}
                className="px-5 py-2.5 rounded-xl text-label-md border border-primary text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={working}
                className="px-5 py-2.5 rounded-xl text-label-md bg-error text-white hover:bg-error/90 transition-colors disabled:opacity-70"
              >
                {working ? 'A eliminar...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
