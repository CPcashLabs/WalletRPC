import React, { useRef, useState, useEffect } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  glowColor?: string;
}

/**
 * 3D Parallax Card
 * 
 * Desktop: Calculates mouse position to apply 3D transform and glow.
 * Mobile: Renders a static container with high-contrast borders for performance and safety feel.
 */
export const TiltCard: React.FC<TiltCardProps> = ({ 
  children, 
  className = "", 
  intensity = 15,
  glowColor = "rgba(255, 255, 255, 0.4)"
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("");
  const [bgPos, setBgPos] = useState("");
  const [isHovering, setIsHovering] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Check for desktop environment (hover capability) to avoid heavy listeners on mobile
  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    setIsDesktop(media.matches);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || !isDesktop) return;

    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate percentages
    const xPct = x / rect.width;
    const yPct = y / rect.height;
    
    // Calculate rotation (-intensity to +intensity)
    const xRot = (0.5 - yPct) * intensity;
    const yRot = (xPct - 0.5) * intensity;
    
    setTransform(`perspective(1000px) rotateX(${xRot}deg) rotateY(${yRot}deg) scale3d(1.02, 1.02, 1.02)`);
    setBgPos(`${xPct * 100}% ${yPct * 100}%`);
  };

  const handleMouseLeave = () => {
    if (!isDesktop) return;
    setIsHovering(false);
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
  };

  const handleMouseEnter = () => {
    if (!isDesktop) return;
    setIsHovering(true);
  };

  // Mobile Render: High contrast, no calculations, safe look
  if (!isDesktop) {
    return (
      <div className={`relative ${className}`}>
        {/* Mobile-Specific Gradient Border Wrapper */}
        <div className="p-[2px] rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-sm">
          <div className="bg-white rounded-[14px] overflow-hidden h-full">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Desktop Render: 3D Parallax
  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative transition-all duration-200 ease-out transform-gpu ${className}`}
      style={{ 
        transform,
        willChange: 'transform'
      }}
    >
      <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white border border-white/20 h-full">
        {/* Dynamic Glow Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300"
          style={{
            opacity: isHovering ? 1 : 0,
            background: `radial-gradient(circle at ${bgPos}, ${glowColor}, transparent 60%)`
          }}
        />
        <div className="relative z-0 h-full">
          {children}
        </div>
      </div>
    </div>
  );
};