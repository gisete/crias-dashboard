import { Warning } from '@phosphor-icons/react';

interface Props {
  message: string;
  onResend: () => void;
}

export function WebhookErrorBanner({ message, onResend }: Props) {
  return (
    <div className="flex items-start gap-3 bg-error-container/20 border border-error-container rounded-xl p-4 mb-6">
      <Warning size={18} weight="fill" className="text-error mt-0.5 shrink-0" />
      <p className="text-body-md text-error flex-1">{message}</p>
      <button
        onClick={onResend}
        className="text-label-md font-medium text-error border border-error-container rounded-lg px-4 py-1.5 hover:bg-error-container/30 transition-colors shrink-0"
      >
        Reenviar
      </button>
    </div>
  );
}
