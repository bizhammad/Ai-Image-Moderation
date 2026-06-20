import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  }

  return (
    <div className="font-manhope min-h-screen flex items-center justify-center bg-white text-slate-900 antialiased px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1">
            Content Moderation Platform
          </span>
          <h2 className="text-xl font-medium tracking-tight text-slate-800">Sign in</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full text-sm bg-transparent border-b border-slate-200 py-2 outline-none text-slate-800 focus:border-slate-900 transition-colors duration-150"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full text-sm bg-transparent border-b border-slate-200 py-2 outline-none text-slate-800 focus:border-slate-900 transition-colors duration-150"
            />
          </div>

          {error && (
            <div className="text-xs font-medium text-rose-700 bg-rose-50/60 border border-rose-100 rounded-md p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-slate-900 text-white font-medium text-sm transition-all hover:bg-slate-800 active:bg-slate-950 duration-150 mt-2"
          >
            Sign in
          </button>
        </form>

        <p className="text-xs text-slate-400 font-light mt-6 text-center">
          No account?{' '}
          <Link to="/register" className="text-slate-600 hover:text-slate-900 font-medium border-b border-dotted border-slate-300">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}