'use client';

import { useState } from 'react';
import { CheckCircle, Envelope, X, CircleNotch } from '@phosphor-icons/react';
import type { RegistrationStatus } from '@/types/database';

interface Props {
  status: RegistrationStatus;
  onAction: (newStatus: RegistrationStatus) => Promise<void>;
  hasVoucher: boolean;
  childrenCount: number;
}

export function StatusActions({ status, onAction, hasVoucher, childrenCount }: Props) {
  const [loading, setLoading] = useState<RegistrationStatus | null>(null);

  if (status === 'pago_confirmado' || status === 'cancelado') return null;

  async function handleClick(newStatus: RegistrationStatus) {
    setLoading(newStatus);
    try {
      await onAction(newStatus);
    } finally {
      setLoading(null);
    }
  }

  const disabledClass = loading ? 'opacity-60 cursor-not-allowed pointer-events-none' : '';

  function ActionIcon({ forStatus, icon }: { forStatus: RegistrationStatus; icon: React.ReactNode }) {
    return loading === forStatus ? <CircleNotch size={16} className="animate-spin" /> : icon;
  }

  return (
    <div className="flex flex-row flex-wrap gap-3">
      {status === 'pendente' && (
        hasVoucher && childrenCount === 1 ? (
          <button
            onClick={() => handleClick('pago_confirmado')}
            disabled={!!loading}
            className={`w-auto flex items-center justify-center gap-2 bg-on-primary-fixed text-white py-3.5 px-5 rounded-xl text-label-md hover:bg-on-primary-fixed/90 transition-colors shadow-sm ${disabledClass}`}
          >
            <ActionIcon forStatus="pago_confirmado" icon={<CheckCircle size={16} weight="fill" />} />
            Confirmar Inscrição
          </button>
        ) : (
          <button
            onClick={() => handleClick('a_pagar')}
            disabled={!!loading}
            className={`w-auto flex items-center justify-center gap-2 bg-on-primary-fixed text-white py-3.5 px-5 rounded-xl text-label-md hover:bg-on-primary-fixed/90 transition-colors shadow-sm ${disabledClass}`}
          >
            <ActionIcon forStatus="a_pagar" icon={<CheckCircle size={16} weight="fill" />} />
            Confirmar Dados
          </button>
        )
      )}

      {(status === 'a_pagar' || status === 'lembrete') && (
        <>
          <button
            onClick={() => handleClick('pago_confirmado')}
            disabled={!!loading}
            className={`w-auto flex items-center justify-center gap-2 bg-on-primary-fixed text-white py-3.5 px-5 rounded-xl text-label-md hover:bg-on-primary-fixed/90 transition-colors shadow-sm ${disabledClass}`}
          >
            <ActionIcon forStatus="pago_confirmado" icon={<CheckCircle size={16} weight="fill" />} />
            Confirmar Pagamento
          </button>
          <button
            onClick={() => handleClick('lembrete')}
            disabled={!!loading}
            className={`w-auto flex items-center justify-center gap-2 bg-error text-white py-3.5 px-5 rounded-xl text-label-md hover:bg-error/90 transition-colors shadow-sm ${disabledClass}`}
          >
            <ActionIcon forStatus="lembrete" icon={<Envelope size={16} weight="fill" />} />
            Enviar Lembrete
          </button>
          <button
            onClick={() => handleClick('cancelado')}
            disabled={!!loading}
            className={`w-auto flex items-center justify-center gap-2 bg-gray-200 text-gray-700 py-3.5 px-5 rounded-xl text-label-md hover:bg-gray-300 transition-colors ${disabledClass}`}
          >
            <ActionIcon forStatus="cancelado" icon={<X size={16} weight="bold" />} />
            Cancelar
          </button>
        </>
      )}
    </div>
  );
}
