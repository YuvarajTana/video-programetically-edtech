import {navigate} from '../lib/router';

export const NavItem = ({
  active,
  icon,
  label,
  path,
  badge,
}: {
  active: boolean;
  icon: string;
  label: string;
  path: string;
  badge?: number;
}) => (
  <button
    className={`nav-item ${active ? 'active' : ''}`}
    onClick={() => navigate(path)}
  >
    <span className="nav-icon">{icon}</span>
    <span>{label}</span>
    {badge ? <em>{badge}</em> : null}
  </button>
);
