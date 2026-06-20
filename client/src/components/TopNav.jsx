
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function TopNav() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null; // hide entirely on login/register screens

  return (
    <div className="w-full border-b border-slate-100 px-4 py-2 flex justify-end">
      {user.role === 'admin' && (
        <Link
          to={location.pathname === '/admin' ? '/' : '/admin'}
          className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors duration-150"
        >
          {location.pathname === '/admin' ? '← Back to Dashboard' : 'Admin Panel →'}
        </Link>
      )}
    </div>
  );
}