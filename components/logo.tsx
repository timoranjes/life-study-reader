'use client'

import * as React from 'react'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  variant?: 'auto' | 'light' | 'dark'
}

const sizeMap = {
  sm: { icon: 24, text: 'text-sm' },
  md: { icon: 32, text: 'text-base' },
  lg: { icon: 48, text: 'text-xl' },
  xl: { icon: 64, text: 'text-2xl' },
}

export function Logo({ 
  className = '', 
  size = 'md', 
  showText = true,
  variant = 'auto'
}: LogoProps) {
  const { icon: iconSize, text: textSize } = sizeMap[size]
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Globe with Cross Icon */}
      <svg 
        width={iconSize} 
        height={iconSize} 
        viewBox="0 0 512 512" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {variant === 'dark' ? (
          // Dark variant for light backgrounds
          <>
            <rect fill="#f5f0e8" width="512" height="512" rx="96"/>
            <circle fill="#2563eb" cx="256" cy="256" r="180"/>
            <ellipse stroke="#ffffff" cx="256" cy="256" rx="180" ry="70" strokeWidth="8" fill="none" opacity="0.5"/>
            <ellipse stroke="#ffffff" cx="256" cy="256" rx="180" ry="130" strokeWidth="8" fill="none" opacity="0.4"/>
            <line stroke="#ffffff" x1="76" y1="256" x2="436" y2="256" strokeWidth="8" opacity="0.5"/>
            <ellipse stroke="#ffffff" cx="256" cy="256" rx="70" ry="180" strokeWidth="8" fill="none" opacity="0.5"/>
            <ellipse stroke="#ffffff" cx="256" cy="256" rx="130" ry="180" strokeWidth="8" fill="none" opacity="0.4"/>
            <g transform="translate(256, 256)">
              <rect fill="#ffffff" x="-20" y="-100" width="40" height="200" rx="8"/>
              <rect fill="#ffffff" x="-70" y="-20" width="140" height="40" rx="8"/>
            </g>
          </>
        ) : variant === 'light' ? (
          // Light variant for dark backgrounds
          <>
            <rect fill="#1a1a2e" width="512" height="512" rx="96"/>
            <circle fill="#3b82f6" cx="256" cy="256" r="180"/>
            <ellipse stroke="#ffffff" cx="256" cy="256" rx="180" ry="70" strokeWidth="8" fill="none" opacity="0.5"/>
            <ellipse stroke="#ffffff" cx="256" cy="256" rx="180" ry="130" strokeWidth="8" fill="none" opacity="0.4"/>
            <line stroke="#ffffff" x1="76" y1="256" x2="436" y2="256" strokeWidth="8" opacity="0.5"/>
            <ellipse stroke="#ffffff" cx="256" cy="256" rx="70" ry="180" strokeWidth="8" fill="none" opacity="0.5"/>
            <ellipse stroke="#ffffff" cx="256" cy="256" rx="130" ry="180" strokeWidth="8" fill="none" opacity="0.4"/>
            <g transform="translate(256, 256)">
              <rect fill="#ffffff" x="-20" y="-100" width="40" height="200" rx="8"/>
              <rect fill="#ffffff" x="-70" y="-20" width="140" height="40" rx="8"/>
            </g>
          </>
        ) : (
          // Auto variant with CSS media query
          <>
            <style>
              {`
                .logo-bg { fill: #f5f0e8; }
                .logo-globe { fill: #2563eb; }
                .logo-lines { stroke: #ffffff; }
                .logo-cross { fill: #ffffff; }
                @media (prefers-color-scheme: dark) {
                  .logo-bg { fill: #1a1a2e; }
                  .logo-globe { fill: #3b82f6; }
                }
              `}
            </style>
            <rect className="logo-bg" width="512" height="512" rx="96"/>
            <circle className="logo-globe" cx="256" cy="256" r="180"/>
            <ellipse className="logo-lines" cx="256" cy="256" rx="180" ry="70" strokeWidth="8" fill="none" opacity="0.5"/>
            <ellipse className="logo-lines" cx="256" cy="256" rx="180" ry="130" strokeWidth="8" fill="none" opacity="0.4"/>
            <line className="logo-lines" x1="76" y1="256" x2="436" y2="256" strokeWidth="8" opacity="0.5"/>
            <ellipse className="logo-lines" cx="256" cy="256" rx="70" ry="180" strokeWidth="8" fill="none" opacity="0.5"/>
            <ellipse className="logo-lines" cx="256" cy="256" rx="130" ry="180" strokeWidth="8" fill="none" opacity="0.4"/>
            <g transform="translate(256, 256)">
              <rect className="logo-cross" x="-20" y="-100" width="40" height="200" rx="8"/>
              <rect className="logo-cross" x="-70" y="-20" width="140" height="40" rx="8"/>
            </g>
          </>
        )}
      </svg>
      
      {showText && (
        <div className={`flex flex-col ${textSize}`}>
          <span className="font-bold leading-tight text-primary">生命读经</span>
          <span className="text-muted-foreground text-xs leading-tight hidden sm:block">Life-Study Reader</span>
        </div>
      )}
    </div>
  )
}

// Compact logo mark only (no text)
export function LogoMark({ 
  className = '', 
  size = 'md',
  variant = 'auto'
}: Omit<LogoProps, 'showText'>) {
  return <Logo className={className} size={size} showText={false} variant={variant} />
}