
interface ThemeToggleProps {
  theme: string;
  toggleTheme: () => void;
}

export default function ThemeToggle({ theme, toggleTheme }: ThemeToggleProps) {
  const isDark = theme === 'dark';

  return (
    <button 
      onClick={toggleTheme}
      style={{
        background: isDark ? 'var(--border-card)' : '#cbd5e1',
        border: 'none',
        borderRadius: '30px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.25rem',
        position: 'relative',
        width: '60px',
        height: '30px',
        outline: 'none',
        transition: 'background 0.3s ease'
      }}
      title="Toggle Theme"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ zIndex: 1, marginLeft: '2px' }}>
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f1f5f9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ zIndex: 1, marginRight: '2px' }}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
      <div 
        style={{
          position: 'absolute',
          top: '2px',
          left: isDark ? '32px' : '2px',
          width: '26px',
          height: '26px',
          backgroundColor: '#fff',
          borderRadius: '50%',
          transition: 'left 0.3s ease',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
      />
    </button>
  );
}
