import { Check, EyeSlash, X } from '@phosphor-icons/react';
import type { ConsentType } from '@/types/sessions';

export function ConsentIcon({ consent }: { consent: ConsentType }) {
  if (consent === 'authorized') {
    return (
      <div className="w-7 h-7 rounded-full bg-check-bg flex items-center justify-center">
        <Check size={14} weight="bold" className="text-check-icon" />
      </div>
    );
  }
  if (consent === 'no_face') {
    return (
      <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center">
        <EyeSlash size={14} weight="bold" className="text-amber-600" />
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-error-container/30 flex items-center justify-center">
      <X size={14} weight="bold" className="text-error" />
    </div>
  );
}
