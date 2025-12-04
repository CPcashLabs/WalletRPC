
import React, { useEffect, useState, useRef } from 'react';

interface CountUpProps {
  value: string | number;
  decimals?: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const CountUp: React.FC<CountUpProps> = ({ 
  value, 
  decimals = 4, 
  duration = 1000, 
  className = "",
  prefix = "",
  suffix = ""
}) => {
  // Target value as a number
  const endValue = parseFloat(String(value).replace(/,/g, '')) || 0;
  
  const [displayValue, setDisplayValue] = useState(endValue);
  const startValue = useRef(endValue);
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    startValue.current = displayValue;
    startTime.current = null;
    
    // If values are essentially the same, don't animate
    if (Math.abs(startValue.current - endValue) < Number.EPSILON) {
        setDisplayValue(endValue);
        return;
    }

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = timestamp - startTime.current;
      
      // Ease Out Quart
      const t = Math.min(progress / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      
      const nextValue = startValue.current + (endValue - startValue.current) * ease;
      
      setDisplayValue(nextValue);

      if (progress < duration) {
        rafId.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    rafId.current = requestAnimationFrame(animate);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [endValue, duration]);

  // Format the number
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(displayValue);

  return <span className={className}>{prefix}{formatted}{suffix}</span>;
};
