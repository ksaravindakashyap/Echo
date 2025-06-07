import React from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaGlobe, FaLinkedin, FaGithub, FaArrowLeft } from 'react-icons/fa';

export default function Contact() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <nav className="flex justify-between items-center">
            {/* Logo */}
            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 text-transparent bg-clip-text">
              ECHO
            </Link>
            
            {/* Back to Home */}
            <Link
              to="/"
              className="flex items-center gap-2 font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              <FaArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Get in Touch
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Have questions about ECHO or want to connect? I'd love to hear from you!
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Email Card */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <FaEnvelope className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 ml-4">Email</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Send me an email for any inquiries, feedback, or collaboration opportunities.
            </p>
            <a
              href="mailto:ksaravindakashyap@gmail.com"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors"
            >
              ksaravindakashyap@gmail.com
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Portfolio Card */}
          <div className="bg-gradient-to-br from-purple-50 to-orange-50 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-purple-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-orange-500 rounded-xl flex items-center justify-center">
                <FaGlobe className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 ml-4">Portfolio</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Check out my portfolio to see more of my work and projects.
            </p>
            <a
              href="https://ksaravindakashyap.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold transition-colors"
            >
              ksaravindakashyap.in
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* About Section */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 rounded-2xl p-8 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">About ECHO</h2>
          <p className="text-lg mb-6 opacity-90 max-w-3xl mx-auto">
            ECHO is a real-time chat application built with modern web technologies. 
            It features both public and private chat rooms, powered by WebSocket technology 
            for instant messaging and seamless user experience.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/register"
              className="bg-white text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="border-2 border-white text-white font-semibold px-6 py-3 rounded-lg hover:bg-white hover:text-gray-900 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Additional Contact Info */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Connect With Me</h3>
          <div className="flex justify-center gap-6">
            <a
              href="mailto:ksaravindakashyap@gmail.com"
              className="flex items-center justify-center w-12 h-12 bg-gray-100 hover:bg-blue-100 rounded-full transition-colors group"
              title="Email"
            >
              <FaEnvelope className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
            </a>
            <a
              href="https://ksaravindakashyap.in"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-12 h-12 bg-gray-100 hover:bg-purple-100 rounded-full transition-colors group"
              title="Portfolio"
            >
              <FaGlobe className="w-5 h-5 text-gray-600 group-hover:text-purple-600" />
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <p className="text-gray-600">
            © 2024 ECHO Chat Application. Built with ❤️ by K Saravinda Kashyap
          </p>
        </div>
      </footer>
    </div>
  );
} 