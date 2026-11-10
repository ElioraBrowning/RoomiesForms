import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/user';

const NOTIF_KEY = 'selu_reviewer_notification_pref';
const DEFAULT_VIEW_KEY = 'selu_dean_default_view';
type NotifPref = 'daily' | 'realtime' | 'off';

export default function Profile() {
  const { user } = useAuth();

  const [notifPref, setNotifPref] = useState<NotifPref>(() => {
    try {
      return (localStorage.getItem(NOTIF_KEY) as NotifPref) || 'daily';
    } catch {
      return 'daily';
    }
  });

  const [defaultToTasks, setDefaultToTasks] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DEFAULT_VIEW_KEY) === 'tasks';
    } catch {
      return false;
    }
  });

  const handleNotifChange = (pref: NotifPref) => {
    setNotifPref(pref);
    try {
      localStorage.setItem(NOTIF_KEY, pref);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleDefaultView = (toTasks: boolean) => {
    setDefaultToTasks(toTasks);
    try {
      localStorage.setItem(DEFAULT_VIEW_KEY, toTasks ? 'tasks' : 'overview');
    } catch (e) {
      console.error(e);
    }
  };

  const isReviewer = user?.roles?.some((r) =>
    ['Faculty', 'Department Head', 'Dean'].includes(r)
  );

  return (
    <div className="profile">
      <div className="page-head">
        <h1>My profile</h1>
      </div>
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

        {isReviewer && (
          <div className="profile-section-block">
            <h3 className="profile-section-title">Reviewer Notification Preferences</h3>
            <p className="profile-section-desc">
              Choose how RoomiesForms alerts you when students submit or resubmit internship forms for approval.
            </p>

            <div className="dean-notif-radios">
              <label className="dean-notif-option">
                <input
                  type="radio"
                  name="notifPref"
                  value="daily"
                  checked={notifPref === 'daily'}
                  onChange={() => handleNotifChange('daily')}
                />
                <div className="dean-notif-content">
                  <div className="dean-notif-heading">
                    <strong>Daily Digest</strong>
                    <span className="dean-notif-badge">Recommended</span>
                  </div>
                  <p>Receive one morning summary email of all pending forms ready for your review at 8:00 AM.</p>
                </div>
              </label>

              <label className="dean-notif-option">
                <input
                  type="radio"
                  name="notifPref"
                  value="realtime"
                  checked={notifPref === 'realtime'}
                  onChange={() => handleNotifChange('realtime')}
                />
                <div className="dean-notif-content">
                  <div className="dean-notif-heading">
                    <strong>Real-Time Notifications</strong>
                  </div>
                  <p>Receive an email immediately whenever a student submits an application or revision.</p>
                </div>
              </label>

              <label className="dean-notif-option">
                <input
                  type="radio"
                  name="notifPref"
                  value="off"
                  checked={notifPref === 'off'}
                  onChange={() => handleNotifChange('off')}
                />
                <div className="dean-notif-content">
                  <div className="dean-notif-heading">
                    <strong>Mute Email Notifications</strong>
                  </div>
                  <p>Do not send review notifications. Forms will only be visible when logging into the Task Center.</p>
                </div>
              </label>
            </div>

            <div className="profile-section-block">
              <h3 className="profile-section-title">Default Dashboard View</h3>
              <p className="profile-section-desc">
                Choose which workspace opens first when you log into RoomiesForms.
              </p>
              <label className="dean-notif-option">
                <input
                  type="checkbox"
                  checked={defaultToTasks}
                  onChange={(e) => handleToggleDefaultView(e.target.checked)}
                />
                <div className="dean-notif-content">
                  <div className="dean-notif-heading">
                    <strong>Default to Task Center &amp; Approvals</strong>
                  </div>
                  <p>Skip the Program Outcomes summary and land straight into your active review queue.</p>
                </div>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
