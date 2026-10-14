import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/user';

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="profile">
      <h1 style={{ marginBottom: '1.5rem', color: 'var(--text-heading)' }}>My Profile</h1>
      
      <div className="card profile-card">
        <div className="profile-head">
          <div className="avatar-lg" aria-hidden="true">
            {getInitials(user?.fullName, user?.email)}
          </div>
          <div className="profile-info">
            <h2 className="profile-name">{user?.fullName || 'User'}</h2>
            <p className="profile-email">{user?.email}</p>
          </div>
        </div>

        <div className="field-list">
          <div className="field">
            <span className="field-label">W-Number</span>
            <div className="field-value">
              {user?.wNumber || <span className="field-value-muted">Not provided</span>}
            </div>
          </div>

          <div className="field">
            <span className="field-label">Roles</span>
            <div className="role-list">
              {user?.roles && user.roles.length > 0 ? (
                user.roles.map((r: string) => (
                  <span key={r} className="role">
                    {r}
                  </span>
                ))
              ) : (
                <span className="role">Student</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
