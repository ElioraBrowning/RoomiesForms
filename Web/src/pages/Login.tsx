import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../index.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
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
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email);
      navigate('/dashboard');
    } catch (error) {
      alert('Login failed. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-body)' }}>
      <button 
        onClick={toggleTheme} 
        title="Toggle Theme" 
        style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.5rem', fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      <div className="card" style={{ maxWidth: '400px', width: '100%', margin: '1rem' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--text-heading)' }}>Roomie's Forms Login</h2>
        <p style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-help)' }}>Prototype Access</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email (Placeholder)</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@selu.edu"
            />
          </div>
          <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
