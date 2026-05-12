import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
// bien luu tru gia tri form khi submit ok//
const initialFormState = {
  fullName: '',
  email: '',
  password: '',
};
// 
const Auth = ({ onAuthSuccess }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname !== '/register';
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
// xu ly khi thay doi gia tri input//
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };
// chuyen doi giua login and register//
  const toggleMode = () => {
    setFeedback('');
    setFormData(initialFormState);
    navigate(isLogin ? '/register' : '/login');
  };
// xu ly khi submit form//
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin
      ? { email: formData.email, password: formData.password }
      : formData;

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed.');
      }

      if (data.token) {
        localStorage.setItem('ainotes_token', data.token);
      }

      if (data.user) {
        localStorage.setItem('ainotes_user', JSON.stringify(data.user));
      }

      setFeedback(data.message || 'Success.');

      if (isLogin) {
        setFormData(initialFormState);
        if (onAuthSuccess) {
          onAuthSuccess(data.user);
        }
      } else {
        setFormData({
          ...initialFormState,
          email: formData.email,
        });
        navigate('/login');
      }
    } catch (error) {
      setFeedback(error.message || 'Cannot connect to backend server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans">
      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,#3A3A3A_0%,#111111_45%,#000000_100%)] md:flex">
        <div className="absolute top-[-10%] left-[-10%] h-96 w-96 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-white/5 blur-3xl"></div>

        <div className="text-center text-white z-10 px-12">
          <h1 className="text-5xl font-extrabold tracking-tight">AINOTES</h1>
          
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-neutral-100 p-8 sm:p-12 md:w-1/2">
        <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 sm:p-10">
          <div className="text-center mb-10">
            <h1 className="mb-4 text-4xl font-extrabold text-black md:hidden">AINOTES</h1>
            <h2 className="mb-2 text-3xl font-bold text-black">
              {isLogin ? 'Welcome to AINotes!' : 'Create an account'}
            </h2>
            <p className="mt-2 font-medium text-neutral-500">
              {isLogin ? 'Please sign in to continue' : 'Start your journey with AINOTES today'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="animate-fade-in-down">
                <label className="mb-1.5 block text-sm font-semibold text-neutral-800">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Johnny Juzang"
                  className="w-full rounded-xl border border-neutral-300 bg-neutral-100 px-4 py-3.5 transition-all duration-200 focus:border-black focus:bg-white focus:outline-none"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-neutral-800">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-neutral-300 bg-neutral-100 px-4 py-3.5 transition-all duration-200 focus:border-black focus:bg-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-neutral-800">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-neutral-300 bg-neutral-100 px-4 py-3.5 transition-all duration-200 focus:border-black focus:bg-white focus:outline-none"
                required
                minLength={6}
              />
              {isLogin && (
                <div className="flex justify-end mt-2">
      
                </div>
              )}
            </div>

            {feedback && (
              <p className="rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-700">{feedback}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 w-full rounded-xl bg-black px-4 py-3.5 font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-lg hover:shadow-black/20 disabled:cursor-not-allowed disabled:bg-neutral-500 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {isSubmitting ? 'Please wait...' : isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="font-medium text-neutral-600">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={toggleMode}
                className="font-bold text-black transition hover:text-neutral-700 hover:underline focus:outline-none"
              >
                {isLogin ? 'Sign up now' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
