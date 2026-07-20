import { Eye, EyeSlash, Prohibit } from '@phosphor-icons/react';
import type { ConsentType } from '@/types/sessions';

export function ConsentIcon({ consent }: { consent: ConsentType }) {
  if (consent === 'authorized') {
    return (
      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
        <Eye size={14} weight="bold" className="text-emerald-600" />
      </div>
    );
  }
  if (consent === 'no_face') {
    return (
      <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
        <EyeSlash size={14} weight="bold" className="text-amber-600" />
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
      <Prohibit size={14} weight="bold" className="text-red-600" />
    </div>
  );
}
