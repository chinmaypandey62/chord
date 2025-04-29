"use client";

import { useState } from "react";
import Link from "next/link"; // Changed from react-router-dom
import { useAuth } from "../../context/AuthContext";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import { Menu, X, User } from "lucide-react"; // Added User icon
import "./Navbar.css";

const Navbar = () => {
  const auth = useAuth();
  const user = auth?.user;
  const logout = auth?.logout;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link href="/" className="navbar-brand">
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
              <Link href="/dashboard" className="nav-link">
                Dashboard
              </Link>
              {/* Added Profile Link */}
              <Link href="/profile" className="nav-link">
                <User size={18} className="mr-1" />
                Profile
              </Link>
              <div className="nav-divider"></div>
              <button onClick={logout} className="nav-link nav-button">
                Logout
                <span className="nav-username">({user.username})</span>
              </button>
            </>
          ) : (
            <>
              <Link href="/signin" className="nav-link">
                Sign In
              </Link>
              <Link href="/signup" className="nav-link nav-button-primary">
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