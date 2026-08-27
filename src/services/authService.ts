// Single-user local app: there is no login. The device owner is always the
// admin, and the "profile" is just a display name kept in localStorage.

export interface UserProfile {
  uid: string;
  displayName: string;
  role: 'admin';
}

const LOCAL_ADMIN_UID = 'local_admin';
const NAME_KEY = 'local_admin_display_name';

export function getLocalProfile(): UserProfile {
  const displayName = (typeof window !== 'undefined' && localStorage.getItem(NAME_KEY)) || 'Amministratore';
  return { uid: LOCAL_ADMIN_UID, displayName, role: 'admin' };
}

export function setLocalDisplayName(name: string) {
  localStorage.setItem(NAME_KEY, name);
}
