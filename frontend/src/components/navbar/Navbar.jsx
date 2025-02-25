import React from 'react';
import styles from './Navbar.css'; // Create a new CSS file for Navbar styles
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <div className="header">
      <div className="logo">
        <img src="" alt="Logo" />
        <Link to="/" style={{textDecoration: "none", color: "white"}}>Chord</Link>
      </div>
      <div className="nav-links">
        <Link to="/profile">Profile</Link>
      </div>
    </div>
  );
}

export default Navbar;
