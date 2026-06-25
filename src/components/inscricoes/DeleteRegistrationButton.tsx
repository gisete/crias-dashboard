'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash } from '@phosphor-icons/react';
import { deleteRegistration } from '@/lib/data/registrations';

interface Props {
  registrationId: string;
  childNames: string;
}

export function DeleteRegistrationButton({ registrationId, childNames }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!showModal) return;
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && !deleting) setShowModal(false);
    }
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [showModal, deleting]);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteRegistration(registrationId);
    setDeleting(false);
    if (result.success) {
      setShowModal(false);
    } else {
      setShowModal(false);
      setDeleteError('Erro ao eliminar. Tente novamente.');
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => { setDeleteError(null); setShowModal(true); }}
          className="flex items-center gap-1.5 text-label-md text-red-300 hover:text-red-500 transition-colors"
        >
          <Trash size={14} />
          Eliminar inscrição
        </button>
        {deleteError && (
          <p className="text-label-sm text-red-500">{deleteError}</p>
        )}
      </div>

      {showModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => { if (!deleting) setShowModal(false); }}
        >
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
          <div
            className="relative bg-surface-container-lowest rounded-2xl shadow-xl p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-headline-md text-gray-900 mb-3">Eliminar inscrição?</h2>
            <p className="text-body-md text-gray-600 mb-8">
              Esta ação vai eliminar permanentemente a inscrição
              {childNames ? ` de ${childNames}` : ''} e todos os dados associados (família e crianças).
              Esta ação não pode ser revertida.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl text-label-md border border-primary text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl text-label-md bg-error text-white hover:bg-error/90 transition-colors disabled:opacity-70"
              >
                {deleting ? 'A eliminar...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
