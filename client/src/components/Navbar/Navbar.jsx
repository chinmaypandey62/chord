"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import { Menu, X } from "lucide-react"; // Assuming you have lucide-react installed
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="text-primary">C</span>hord
        </Link>

        {/* Mobile menu button */}
        <button 
          className="navbar-mobile-toggle" 
          onClick={toggleMenu}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Navigation links - will be shown/hidden based on mobile menu state */}
        <div className={`navbar-links ${isMenuOpen ? 'navbar-links-active' : ''}`}>
          {user ? (
            <>
              <Link to="/dashboard" className="nav-link">
                Dashboard
              </Link>
              <div className="nav-divider"></div>
              <button onClick={logout} className="nav-link nav-button">
                Logout
                <span className="nav-username">({user.username})</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/signin" className="nav-link">
                Sign In
              </Link>
              <Link to="/signup" className="nav-link nav-button-primary">
                Sign Up
              </Link>
            </>
          )}
          
          <div className="theme-toggle-wrapper">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;