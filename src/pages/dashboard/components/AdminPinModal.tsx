import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase/services/firebase'; // Ajuste o caminho da sua exportação do Firebase

interface AdminPinModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export function AdminPinModal({ isOpen, onSuccess, onClose }: AdminPinModalProps) {
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pinInput.trim()) {
      setError('Digite a senha.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Puxa a senha do Firestore (Coleção: settings / Documento: security)
      const securityDoc = await getDoc(doc(db, 'settings', 'security'));
      
      if (!securityDoc.exists()) {
        setError('Configuração de senha não encontrada no Firestore.');
        setLoading(false);
        return;
      }

      const storedPin = securityDoc.data()?.adminPin;

      if (String(pinInput).trim() === String(storedPin).trim()) {
        onSuccess();
      } else {
        setError('Senha incorreta! Tente novamente.');
      }
    } catch (err) {
      console.error('Erro ao verificar PIN:', err);
      setError('Erro ao conectar ao banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onKeyDown={(e) => e.stopPropagation()}
        onKeyUp={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white">Acesso do Administrador</h2>
          <button 
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-5">
          Informe a senha para acessar o painel de gerenciamento.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Digite a senha..."
              autoFocus
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-center text-lg tracking-widest focus:outline-none focus:border-blue-500"
            />
            {error && <p className="text-red-400 text-xs mt-2 text-center font-medium">{error}</p>}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 bg-gray-700 hover:bg-gray-600 text-gray-300 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-1/2 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}