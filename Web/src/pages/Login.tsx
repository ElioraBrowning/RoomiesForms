import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import '../index.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email);
      navigate('/dashboard');
    } catch {
      setError("Couldn't reach the server. Make sure the backend is running on port 5000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Backdrop: SELU green bracketed by the brand stripe, top and bottom. */}
      <div className="login-backdrop" aria-hidden="true">
        <div className="stripe" />
        <div className="login-backdrop-fill" />
        <div className="stripe" />
      </div>

      <div className="login-theme-toggle">
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>

      <div className="login-panel">
        <div className="login-hero">
          <img
            className="login-mascot"
            src="/brand/mascot-230.webp"
            srcSet="/brand/mascot-230.webp 1x, /brand/mascot-460.webp 2x"
            alt=""
            width={230}
            height={287}
          />
          <p className="login-hero-copy">
            Every CS internship form in one place. Start one, save a draft, and watch it move
            through faculty review.
          </p>
        </div>

        <div className="login-form-side">
          <img
            className="login-seal"
            src="/brand/selu-logo.png"
            alt="Southeastern Louisiana University"
            width={900}
            height={218}
          />
          <h1 className="login-title">Sign in</h1>
          <p className="login-sub">
            Use your Southeastern email. No password needed while we're testing.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="login-email">Southeastern email</label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@selu.edu"
                aria-describedby={error ? 'login-error' : undefined}
                aria-invalid={error ? true : undefined}
              />
            </div>

            {error && (
              <p className="login-error" id="login-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn login-submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="login-foot">
            Prototype build. Sign in as <code>eliora.browning@selu.edu</code> for the student
            view or <code>galkadi@selu.edu</code> for faculty.
          </p>
        </div>
      </div>
    </div>
  );
}