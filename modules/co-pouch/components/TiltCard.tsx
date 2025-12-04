
import React, { useRef, useState, useEffect } from 'react';

const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

/**
 * High-performance 3D Tilt Card with Glare effect.
 * Uses requestAnimationFrame for 60fps performance on mobile.
 */
export const TiltCard: React.FC<{ 
  children: React.ReactNode; 
  className?: string; 
  onClick?: () => void;
  intensity?: number;
}> = ({ children, className = "", onClick, intensity = 15 }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  
  // Target rotation for smooth interpolation
  const target = useRef({ x: 0, y: 0 });
  const requestRef = useRef<number>(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    
    // Calculate mouse position relative to card center
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation (inverted Y for natural tilt)
    const rotateX = ((y - centerY) / centerY) * -intensity;
    const rotateY = ((x - centerX) / centerX) * intensity;

    target.current = { x: rotateX, y: rotateY };
  };

  const handleMouseEnter = () => setIsHovering(true);
  
  const handleMouseLeave = () => {
    setIsHovering(false);
    target.current = { x: 0, y: 0 };
  };

  // Animation Loop
  useEffect(() => {
    const animate = () => {
      setRotation(prev => ({
        x: lerp(prev.x, target.current.x, 0.1),
        y: lerp(prev.y, target.current.y, 0.1)
      }));
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, []);

  return (
    <div 
      className="perspective-1000"
      style={{ perspective: '1000px' }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <div 
        ref={cardRef}
        className={`relative transition-transform duration-100 ease-out transform-gpu ${className}`}
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(${isHovering ? 1.02 : 1}, ${isHovering ? 1.02 : 1}, 1)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {children}
        
        {/* Dynamic Glare Effect */}
        <div 
          className="absolute inset-0 pointer-events-none rounded-2xl mix-blend-overlay opacity-0 transition-opacity duration-300"
          style={{
            opacity: isHovering ? 0.4 : 0,
            background: `linear-gradient(${rotation.y * 5 + 105}deg, transparent 20%, rgba(255,255,255,0.6) 45%, transparent 60%)`
          }}
        />
      </div>
    </div>
  );
};
