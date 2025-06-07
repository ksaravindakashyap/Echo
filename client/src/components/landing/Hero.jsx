import React from 'react';
import { Link } from 'react-router-dom';
import { heroImage } from '../../assets/images';

export default function Hero() {
  return (
    <section className="relative bg-white px-8 py-16">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <div>
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Create and Join Chat Rooms Instantly
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              ECHO offers public and private chat rooms powered by WebSocket—real-time messaging with no user limits.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="inline-flex items-center bg-orange-500 text-white font-semibold rounded-lg px-6 py-3 shadow-md hover:bg-orange-600 transition-colors"
              >
                ▶️ Get Started
              </Link>
              <Link
                to="/demo"
                className="inline-flex items-center bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg px-6 py-3 hover:bg-gray-50 transition-colors"
              >
                🛠 View Demo
              </Link>
            </div>
          </div>

          {/* Right Column - Image & Chat Bubbles */}
          <div className="relative">
            <img
              src={heroImage}
              alt="ECHO Chat Interface"
              className="rounded-xl shadow-lg w-full h-auto"
            />
            {/* Chat Bubble - Top Left */}
            <div className="absolute top-4 -left-8 bg-white rounded-lg shadow-lg p-4 max-w-xs">
              <p className="text-sm text-gray-700">
                Anyone can join our public rooms!
              </p>
            </div>
            {/* Chat Bubble - Bottom Right */}
            <div className="absolute -bottom-4 -right-8 bg-white rounded-lg shadow-lg p-4 max-w-xs">
              <p className="text-sm text-gray-700">
                Invite friends into private rooms with a 6-digit code.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 