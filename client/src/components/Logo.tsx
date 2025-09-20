import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ClinicLogo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Medical Cross Background Circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="url(#gradient)"
          stroke="#ffffff"
          strokeWidth="2"
        />
        
        {/* Medical Cross */}
        <rect
          x="45"
          y="25"
          width="10"
          height="50"
          fill="white"
          rx="2"
        />
        <rect
          x="25"
          y="45"
          width="50"
          height="10"
          fill="white"
          rx="2"
        />
        
        {/* Heartbeat Line */}
        <path
          d="M15 50 L25 50 L30 40 L35 60 L40 30 L45 50 L85 50"
          stroke="white"
          strokeWidth="2"
          fill="none"
          opacity="0.8"
        />
        
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function ClinicLogoText({ size = 'md', className = '' }: LogoProps) {
  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <ClinicLogo size={size} />
      <div className="flex flex-col">
        <span className={`font-bold text-blue-600 ${textSizeClasses[size]}`}>
          MyClinic
        </span>
        <span className="text-xs text-gray-500 -mt-1">
          Portal
        </span>
      </div>
    </div>
  );
}