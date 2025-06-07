import React from 'react';
import { GlobeAltIcon, LockClosedIcon, CircleStackIcon } from '@heroicons/react/24/outline';

const features = [
  {
    name: 'Public Chat Rooms',
    description: 'Open rooms anyone can join—discover and chat with new people instantly.',
    icon: GlobeAltIcon,
  },
  {
    name: 'Private Chat Rooms',
    description: 'Hidden rooms, only joinable via a 6-digit invite code you generate.',
    icon: LockClosedIcon,
  },
  {
    name: 'Unlimited, Instant Messaging',
    description: 'No cap on participants—real-time delivery powered by WebSocket.',
    icon: CircleStackIcon,
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-gray-50 px-8 py-16">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">
            Features for a better experience
          </h2>
        </div>
        
        <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.name}
              className="flex flex-col items-center bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition"
            >
              <feature.icon className="h-12 w-12 text-orange-500" />
              <h3 className="mt-4 text-xl font-semibold text-gray-900">
                {feature.name}
              </h3>
              <p className="mt-2 text-center text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 