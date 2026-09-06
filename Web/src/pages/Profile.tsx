import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem', color: 'var(--text-heading)' }}>My Profile</h1>
      
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--slu-gold)', color: '#000', 
            border: 'none', fontWeight: 'bold', fontSize: '2rem', display: 'flex', 
            alignItems: 'center', justifyContent: 'center'
          }}>
            {user?.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) || 'U'}
          </div>
          <div>
            <h2 style={{ margin: 0, color: 'var(--text-heading)' }}>{user?.fullName}</h2>
            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-help)' }}>{user?.email}</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1rem', border: '1px solid var(--border-card)', borderRadius: '6px', backgroundColor: 'var(--bg-card-nested)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-help)', textTransform: 'uppercase', fontWeight: 'bold' }}>W-Number</span>
            <div style={{ marginTop: '0.5rem', fontSize: '1.1rem', color: 'var(--text-main)' }}>
              {user?.wNumber || 'Not provided'}
            </div>
          </div>

          <div style={{ padding: '1rem', border: '1px solid var(--border-card)', borderRadius: '6px', backgroundColor: 'var(--bg-card-nested)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-help)', textTransform: 'uppercase', fontWeight: 'bold' }}>Roles</span>
            <div style={{ marginTop: '0.5rem', fontSize: '1.1rem', color: 'var(--text-main)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {user?.roles && user.roles.length > 0 ? user.roles.map((r: string) => (
                <span key={r} style={{ padding: '0.25rem 0.75rem', backgroundColor: 'var(--slu-green)', color: 'white', borderRadius: '20px', fontSize: '0.9rem' }}>
                  {r}
                </span>
              )) : (
                <span style={{ padding: '0.25rem 0.75rem', backgroundColor: 'var(--border-card)', color: 'var(--text-main)', borderRadius: '20px', fontSize: '0.9rem' }}>
                  Student
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
