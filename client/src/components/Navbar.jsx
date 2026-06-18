import React from 'react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <div className="nav-logo-icon">✓</div>
        <span>Task Manager</span>
      </div>
      {user && (
        <div className="nav-user">
          <div className="user-profile">
            <div className="avatar">{getInitials(user.name)}</div>
            <span className="user-name">{user.name}</span>
          </div>
          <button className="btn-logout" onClick={logout}>
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
