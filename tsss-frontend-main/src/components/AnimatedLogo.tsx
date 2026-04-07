import React from 'react';
// import logoUrl from '@/assets/mwalimulink-logo-3d.png';
const logoUrl = "";

interface AnimatedLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  };

  return (
    <div className={`relative perspective-1000 ${sizeClasses[size]} ${className}`}>
      {/* Container for 3D effect */}
      <div className="w-full h-full relative preserve-3d animate-float-3d">
        {/* Shadow under the logo */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4/5 h-2 bg-black/20 blur-md rounded-full animate-shadow-pulse" />
        
        {/* Main Logo Image */}
        <div className="w-full h-full relative group flex items-center justify-center">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="MwalimuLink Logo" 
              className="w-full h-full object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-110"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          
          <div className={`${logoUrl ? 'hidden' : ''} flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold text-2xl shadow-inner`}>
            M
          </div>
          
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
        </div>
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        @keyframes float-3d {
          0%, 100% {
            transform: translateY(0) rotateX(5deg) rotateY(-5deg);
          }
          50% {
            transform: translateY(-8px) rotateX(-5deg) rotateY(5deg);
          }
        }
        @keyframes shadow-pulse {
          0%, 100% {
            transform: translateX(-50%) scale(1);
            opacity: 0.2;
          }
          50% {
            transform: translateX(-50%) scale(1.2);
            opacity: 0.1;
          }
        }
        .animate-float-3d {
          animation: float-3d 4s ease-in-out infinite;
        }
        .animate-shadow-pulse {
          animation: shadow-pulse 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedLogo;
