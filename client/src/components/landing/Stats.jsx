import React from 'react';
import { CircleStackIcon, BoltIcon, GlobeAltIcon, LockClosedIcon } from '@heroicons/react/24/outline';

const stats = [
  {
    name: 'No User Limits',
    icon: CircleStackIcon,
  },
  {
    name: 'Sub-100ms Message Delivery',
    icon: BoltIcon,
  },
  {
    name: 'Public & Private Rooms',
    icon: (props) => (
      <div className="flex space-x-1">
        <GlobeAltIcon {...props} />
        <LockClosedIcon {...props} />
      </div>
    ),
  },
];

export default function Stats() {
  return (
    <section className="bg-white py-12">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex flex-col md:flex-row justify-center items-center space-y-8 md:space-y-0 md:space-x-12">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="flex items-center space-x-3"
            >
              <stat.icon className="h-6 w-6 text-orange-500" />
              <span className="font-medium text-gray-700">{stat.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 