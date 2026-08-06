import { Check } from '@phosphor-icons/react';
import type { SessionChild } from '@/types/sessions';
import { calculateAge } from '@/lib/age-calculator';
import { formatSessionValue, getFirstLastName } from '@/lib/plan-display';
import { ConsentIcon } from './ConsentIcon';

const TH = 'py-3 md:py-5 px-3 md:px-6 text-label-sm text-gray-500 uppercase tracking-wider font-medium';
const TH_CENTER = `${TH} text-center`;
const TH_FOTO = `${TH} bg-[#EBF0ED] text-center`;
const TD_FOTO = 'py-2 md:py-4 px-3 md:px-6 bg-[#F8FDFA]';

interface SessionTableProps {
  children: SessionChild[];
  onTogglePhotosReady: (sessionChildId: string, ready: boolean) => void;
  onToggleSessionPhotos: (sessionChildIds: string[], hasPhotos: boolean) => void;
}

export function SessionTable({ children, onTogglePhotosReady, onToggleSessionPhotos }: SessionTableProps) {
  const sorted = [...children].sort((a, b) =>
    a.childName.localeCompare(b.childName, 'pt'),
  );

  function handleTogglePhotos(child: SessionChild) {
    const newValue = !child.hasPhotoPlan;
    const siblingIds = children
      .filter((c) => c.registrationId === child.registrationId)
      .map((c) => c.sessionChildId);

    if (newValue && child.assignedPhotoCount + 1 > child.fotoSessions) {
      const confirmed = window.confirm(
        `Esta família já tem ${child.assignedPhotoCount}/${child.fotoSessions} sessões foto atribuídas. Adicionar mesmo assim?`,
      );
      if (!confirmed) return;
    }

    onToggleSessionPhotos(siblingIds, newValue);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-surface-container-highest bg-surface-container-low">
            <th className={TH}>Criança</th>
            <th className={TH}>Idade</th>
            <th className={TH}>Responsável</th>
            <th className={TH_CENTER}>Consentimento</th>
            <th className={TH_FOTO}>Foto</th>
            <th className={TH_FOTO}>Enviadas</th>
            <th className={TH}>Valor</th>
          </tr>
        </thead>
        <tbody className="text-body-md text-gray-900">
          {sorted.map((child) => (
            <tr
              key={child.sessionChildId}
              className="border-b border-surface-container-highest hover:bg-surface-container-low transition-colors"
            >
              <td className="py-4 px-6 font-medium">{getFirstLastName(child.childName)}</td>
              <td className="py-4 px-6 text-gray-500 whitespace-nowrap">{calculateAge(child.birthDate)}</td>
              <td className="py-4 px-6 text-gray-600">{getFirstLastName(child.responsavelName)}</td>
              <td className="py-4 px-6">
                <div className="flex justify-center">
                  <ConsentIcon consent={child.consent} />
                </div>
              </td>
              <td className={TD_FOTO}>
                <div className="flex justify-center">
                  {(() => {
                    const isToggleable = child.fotoSessions > 0 || child.hasPhotoPlan;
                    if (!isToggleable) {
                      return <span className="text-gray-400">—</span>;
                    }

                    const isOverAssigned = child.assignedPhotoCount > child.fotoSessions;

                    return (
                      <button
                        onClick={() => handleTogglePhotos(child)}
                        title={
                          child.hasPhotoPlan && isOverAssigned
                            ? `Sessões foto atribuídas excedem o plano (${child.assignedPhotoCount}/${child.fotoSessions})`
                            : undefined
                        }
                        className={`group w-7 h-7 rounded-full border-[1.5px] flex items-center justify-center transition-colors touch-manipulation ${
                          child.hasPhotoPlan
                            ? isOverAssigned
                              ? 'border-amber-500 bg-amber-500'
                              : 'border-emerald-600 bg-emerald-600'
                            : 'border-gray-300 bg-transparent hover:border-emerald-600 hover:bg-emerald-50'
                        }`}
                        aria-label={child.hasPhotoPlan ? 'Remover foto desta sessão' : 'Marcar foto nesta sessão'}
                      >
                        <Check
                          size={14}
                          weight="bold"
                          className={
                            child.hasPhotoPlan
                              ? 'text-white'
                              : 'text-transparent group-hover:text-emerald-300'
                          }
                        />
                      </button>
                    );
                  })()}
                </div>
              </td>
              <td className={TD_FOTO}>
                <div className="flex justify-center">
                  {child.hasPhotoPlan ? (
                    <button
                      onClick={() => onTogglePhotosReady(child.sessionChildId, !child.photosReady)}
                      className={`group w-7 h-7 rounded-full border-[1.5px] flex items-center justify-center transition-colors touch-manipulation ${
                        child.photosReady
                          ? 'border-emerald-600 bg-emerald-600'
                          : 'border-gray-300 bg-transparent hover:border-emerald-600 hover:bg-emerald-50'
                      }`}
                      aria-label={child.photosReady ? 'Marcar fotos como não prontas' : 'Marcar fotos como prontas'}
                    >
                      <Check
                        size={14}
                        weight="bold"
                        className={
                          child.photosReady
                            ? 'text-white'
                            : 'text-transparent group-hover:text-emerald-300'
                        }
                      />
                    </button>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
              </td>
              <td className="py-4 px-6 font-medium">{formatSessionValue(child.perSessionValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
