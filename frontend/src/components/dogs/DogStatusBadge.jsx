import React from 'react';

const statusConfigs = {
  available: {
    label: 'Available',
    className: 'bg-green-100 text-green-800 border-green-200',
    icon: '✅'
  },
  unknown: {
    label: 'Checking availability...',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: '🔍'
  },
  adopted: {
    label: 'Found their forever home!',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: '🎉'
  },
  reserved: {
    label: 'Reserved - Adoption pending',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '⏳'
  }
};

export default function DogStatusBadge({ status = 'available', className = '' }) {
  const config = statusConfigs[status] || statusConfigs.available;
  
  return (
    <span 
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors border ${config.className} ${className}`}
    >
      <span className="text-base">{config.icon}</span>
      {config.label}
    </span>
  );
}