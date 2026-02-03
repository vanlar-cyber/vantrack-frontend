import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AuthScreen: React.FC = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, fullName || undefined);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfdfd] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tighter text-indigo-600">VanTrack.</h1>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">
            Intelligence Layer
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6">
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                isLogin
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                !isLogin
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-transparent focus:border-indigo-100"
                  placeholder="John Doe"
                />
              </div>
            )}

            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-transparent focus:border-indigo-100"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-transparent focus:border-indigo-100"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                <p className="text-[10px] font-bold text-rose-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
