import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase/services/firebase';
import { toast } from 'react-toastify';

export default function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.warn('Preencha todos os campos.');
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      
      toast.success('Login realizado com sucesso!');
      navigate('/admin'); // Redireciona para o painel principal após o login
    } catch (error: any) {
      console.error('Erro no login:', error);

      // Tratamento de erros comuns do Firebase Auth
      switch (error.code) {
        case 'auth/invalid-email':
          toast.error('E-mail em formato inválido.');
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          toast.error('E-mail ou senha incorretos.');
          break;
        case 'auth/too-many-requests':
          toast.error('Muitas tentativas falhas. Tente novamente mais tarde.');
          break;
        default:
          toast.error('Erro ao realizar login. Tente novamente.');
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
        
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
            🛒
          </div>
          <h1 className="text-2xl font-bold text-white">Acesso ao Sistema</h1>
          <p className="text-xs text-gray-400">
            Informe suas credenciais para entrar no painel administrativo do PDV.
          </p>
        </div>

        {/* Formulário de Login */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-gray-300 font-bold block mb-1">
              E-mail
            </label>
            <input
              type="email"
              placeholder="seuemail@dominio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-gray-300 font-bold block mb-1">
              Senha
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg cursor-pointer mt-2"
          >
            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>

        {/* Rodapé / Informação de Segurança */}
        <div className="text-center pt-2 border-t border-gray-800">
          <span className="text-[11px] text-gray-500">
            🔒 Acesso restrito a usuários autorizados.
          </span>
        </div>

      </div>
    </div>
  );
}