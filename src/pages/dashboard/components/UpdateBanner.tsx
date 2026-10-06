import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

export function UpdateBanner() {
  const [status, setStatus] = useState<'idle' | 'available' | 'downloading' | 'downloaded'>('idle');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!window.electronAPI) return;

    // Escuta atualizações de status
    const cleanupStatus = window.electronAPI.onUpdateStatus((data) => {
      setMessage(data.message);

      if (data.status === 'available') {
        setStatus('available');
        toast.info("Nova atualização disponível!", { autoClose: 5000 });
      } else if (data.status === 'downloaded') {
        setStatus('downloaded');
        toast.success("Atualização pronta para instalação!");
      }
    });

    // Escuta a porcentagem do download
    const cleanupProgress = window.electronAPI.onUpdateProgress((percent) => {
      setStatus('downloading');
      setProgress(Math.round(percent));
    });

    return () => {
      cleanupStatus();
      cleanupProgress();
    };
  }, []);

  // Se não houver atualização pendente, não renderiza nada na tela
  if (status === 'idle') return null;

  return (
    <div className="bg-blue-600 text-white px-4 py-2.5 flex items-center justify-between shadow-lg text-sm font-medium z-50">
      <div className="flex items-center gap-2">
        <span>🚀 {message}</span>
        {status === 'downloading' && (
          <span className="font-bold bg-blue-700 px-2 py-0.5 rounded text-xs">
            {progress}%
          </span>
        )}
      </div>

      <div>
        {status === 'available' && (
          <button
            onClick={() => {
              setStatus('downloading');
              window.electronAPI?.startDownload();
            }}
            className="bg-white text-blue-700 hover:bg-gray-100 font-bold px-3 py-1 rounded text-xs transition-colors cursor-pointer"
          >
            Baixar Atualização
          </button>
        )}

        {status === 'downloaded' && (
          <button
            onClick={() => window.electronAPI?.quitAndInstall()}
            className="bg-green-500 hover:bg-green-400 text-white font-bold px-3 py-1 rounded text-xs transition-colors cursor-pointer"
          >
            Reiniciar e Instalar Agora
          </button>
        )}
      </div>
    </div>
  );
}