import React, { useState } from 'react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../hooks/useToast';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login: customerLogin } = useCustomerAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await customerLogin(email, password);
    if (result.success) {
      addToast('Welcome back!', 'success');
      navigate('/account');
    } else {
      addToast(result.error || 'Login failed', 'error');
    }
    setIsLoading(false);
  };

  const inputClasses = "mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500";

  return (
    <div className="max-w-md mx-auto mt-10 bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700">
      <h1 className="text-3xl font-bold text-white text-center mb-6">Sign In</h1>

      <form onSubmit={handleCustomerLogin} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClasses}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={inputClasses}
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {/* Footer Links */}
      <>
        <div className="mt-6 text-center">
          <Link to="/forgot-password" className="text-sm font-medium text-sky-400 hover:text-sky-300">
            Forgot your password?
          </Link>
        </div>
        <p className="mt-6 text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-sky-400 hover:text-sky-300">
            Sign up
          </Link>
        </p>
      </>
    </div>
  );
};

export default LoginPage;
