import React from 'react';
import { Link } from 'react-router-dom';

const navigation = {
  main: [
    { name: 'About', href: '#about' },
    { name: 'Contact', href: '#contact' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '#' },
    { name: 'Terms & Conditions', href: '#' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-400">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 text-transparent bg-clip-text">
            ECHO
          </Link>

          {/* Navigation */}
          <nav className="mt-6 md:mt-0">
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {navigation.main.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="hover:text-white transition-colors"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom Row */}
        <div className="mt-8 pt-8 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center text-sm">
          <p className="text-gray-400">© 2025 <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 text-transparent bg-clip-text">ECHO</span>. All rights reserved.</p>
          <div className="mt-4 md:mt-0 flex gap-x-6">
            {navigation.legal.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="hover:text-white transition-colors"
              >
                {item.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
} 