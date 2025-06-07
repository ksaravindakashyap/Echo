import React from 'react';
import { Link } from 'react-router-dom';

const navLinks = [
  { name: 'About', href: '#about' },
  { name: 'Contact', href: '#contact' },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-8 py-6">
        <nav className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 text-transparent bg-clip-text">
            ECHO
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="font-medium text-gray-700 hover:text-gray-900 mx-4 transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
            <Link
              to="/login"
              className="font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="bg-orange-500 text-white rounded-lg px-5 py-2 shadow-md hover:bg-orange-600 transition-colors font-medium"
            >
              Sign Up
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
} 