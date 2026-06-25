import { Check } from '@phosphor-icons/react';
import type { SessionChild } from '@/types/sessions';
import { calculateAge } from '@/lib/age-calculator';
import { ConsentIcon } from './ConsentIcon';

const TH = 'py-5 px-6 text-label-sm text-gray-500 uppercase tracking-wider font-medium';
const TH_CENTER = `${TH} text-center`;
const TH_FOTO = `${TH} bg-[#EBF0ED] text-center`;
const TD_FOTO = 'py-4 px-6 bg-[#F8FDFA]';

function formatValue(v: number): string {
  return Number.isInteger(v) ? `${v}€` : `${v.toFixed(2)}€`;
}

export function SessionTable({ children }: { children: SessionChild[] }) {
  const sorted = [...children].sort((a, b) =>
    a.childName.localeCompare(b.childName, 'pt'),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-surface-container-highest bg-surface-container-low">
            <th className={TH}>Criança</th>
            <th className={TH}>Idade</th>
            <th className={TH}>Responsável</th>
            <th className={TH}>Telefone</th>
            <th className={TH_CENTER}>Consentimento</th>
            <th className={TH_FOTO}>Foto</th>
            <th className={TH}>Valor</th>
          </tr>
        </thead>
        <tbody className="text-body-md text-gray-900">
          {sorted.map((child) => (
            <tr
              key={`${child.childName}-${child.birthDate}`}
              className="border-b border-surface-container-highest hover:bg-surface-container-low transition-colors"
            >
              <td className="py-4 px-6 font-medium">{child.childName}</td>
              <td className="py-4 px-6 text-gray-500 whitespace-nowrap">{calculateAge(child.birthDate)}</td>
              <td className="py-4 px-6 text-gray-600">{child.responsavelName}</td>
              <td className="py-4 px-6 text-gray-500">{child.phone ?? '—'}</td>
              <td className="py-4 px-6">
                <div className="flex justify-center">
                  <ConsentIcon consent={child.consent} />
                </div>
              </td>
              <td className={TD_FOTO}>
                <div className="flex justify-center">
                  {child.hasPhotoPlan ? (
                    <div className="w-7 h-7 rounded-full bg-check-bg flex items-center justify-center">
                      <Check size={14} weight="bold" className="text-check-icon" />
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
              </td>
              <td className="py-4 px-6 font-medium">{formatValue(child.perSessionValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
