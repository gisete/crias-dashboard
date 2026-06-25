import { CheckCircle, Envelope, X } from '@phosphor-icons/react';
import type { RegistrationStatus } from '@/types/database';

interface Props {
  status: RegistrationStatus;
  onAction: (newStatus: RegistrationStatus) => Promise<void>;
}

export function StatusActions({ status, onAction }: Props) {
  if (status === 'pago_confirmado' || status === 'cancelado') return null;

  return (
    <div className="mt-auto pt-4 flex flex-col gap-4">
      {status === 'pendente' && (
        <button
          onClick={() => onAction('a_pagar')}
          className="w-full flex items-center justify-center gap-2 bg-on-primary-fixed text-white py-3.5 px-5 rounded-xl text-label-md hover:bg-on-primary-fixed/90 transition-colors shadow-sm"
        >
          <CheckCircle size={16} weight="fill" />
          Confirmar Dados
        </button>
      )}

      {(status === 'a_pagar' || status === 'lembrete') && (
        <>
          <button
            onClick={() => onAction('pago_confirmado')}
            className="w-full flex items-center justify-center gap-2 bg-on-primary-fixed text-white py-3.5 px-5 rounded-xl text-label-md hover:bg-on-primary-fixed/90 transition-colors shadow-sm"
          >
            <CheckCircle size={16} weight="fill" />
            Confirmar Pagamento
          </button>
          <button
            onClick={() => onAction('lembrete')}
            className="w-full flex items-center justify-center gap-2 bg-error text-white py-3.5 px-5 rounded-xl text-label-md hover:bg-error/90 transition-colors shadow-sm"
          >
            <Envelope size={16} weight="fill" />
            Enviar Lembrete
          </button>
          <button
            onClick={() => onAction('cancelado')}
            className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-700 py-3.5 px-5 rounded-xl text-label-md hover:bg-gray-300 transition-colors"
          >
            <X size={16} weight="bold" />
            Cancelar
          </button>
        </>
      )}

      <p className="text-center text-label-sm text-gray-500 italic mt-2">
        Clicar num status envia automaticamente o email correspondente.
      </p>
    </div>
  );
}
