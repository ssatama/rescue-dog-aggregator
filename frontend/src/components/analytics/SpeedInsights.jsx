'use client';

import { SpeedInsights as VercelSpeedInsights } from '@vercel/speed-insights/react';

export default function SpeedInsights() {
  // Only render speed insights in production environments
  const isProduction = process.env.NODE_ENV === 'production';
  const isVercelEnvironment = process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview';
  
  if (!isProduction && !isVercelEnvironment) {
    return null;
  }

  return <VercelSpeedInsights />;
}