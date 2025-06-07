import React from 'react';
import { Link } from 'react-router-dom';

export default function RoomCreation() {
  return (
    <section className="bg-white px-8 py-16">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Create Your First Room in Seconds
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Start your own chat room and connect with people instantly. Whether you want a public space for open discussions or a private room for your team, ECHO makes it simple and secure.
          </p>
          <ul className="space-y-3 text-gray-600 mb-8">
            <li className="flex items-center">
              <span className="mr-2">•</span>
              Create public rooms for open discussions
            </li>
            <li className="flex items-center">
              <span className="mr-2">•</span>
              Set up private rooms with secure access codes
            </li>
            <li className="flex items-center">
              <span className="mr-2">•</span>
              Instant messaging with unlimited participants
            </li>
          </ul>
          <Link
            to="/login"
            className="inline-flex items-center bg-orange-500 text-white font-semibold rounded-lg px-6 py-3 shadow-md hover:bg-orange-600 transition-colors"
          >
            Create a Room →
          </Link>
        </div>
      </div>
    </section>
  );
} 