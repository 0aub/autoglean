import { Layers } from "lucide-react";
import { LOGO_PATH, LOGO_SIZE, ANIMATION } from "@/lib/constants";

export const WaveAnimation = () => {
  const { waveSquares, logoOpacity } = ANIMATION;

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
      {/* Logo in Center - render first so it's behind squares */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <img
          src={LOGO_PATH}
          alt="AutoGlean Logo"
          style={{
            width: LOGO_SIZE.animation,
            height: LOGO_SIZE.animation,
            maxWidth: 'none',
            opacity: logoOpacity
          }}
        />
      </div>

      {/* Animated Wave Squares */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="relative">
          {[...Array(waveSquares.count)].map((_, i) => {
            const size = waveSquares.baseSize + i * waveSquares.increment;
            return (
              <div
                key={i}
                className="absolute border-2 border-primary/20 animate-wave-rotate"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  animationDelay: `${i * waveSquares.baseDelay}s`,
                  animationDuration: `${waveSquares.baseDuration + i * waveSquares.durationIncrement}s`,
                  left: '50%',
                  top: '50%',
                  marginLeft: `${-size / 2}px`,
                  marginTop: `${-size / 2}px`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Floating Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-primary-light/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>

      {/* Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
    </div>
  );
};
