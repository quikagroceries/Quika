"use client";

import React, { useEffect, useRef, useState } from 'react';

export interface StatProps {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  className?: string;
}

// Easing function: easeOutQuart
const easeOutQuart = (x: number): number => 1 - Math.pow(1 - x, 4);

export function Stat({ value, prefix = '', suffix = '', label, className = '' }: StatProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasReduceClass = document.documentElement.classList.contains('reduce-motion');
    
    if (prefersReducedMotion || hasReduceClass) {
      setDisplayValue(value);
      setHasAnimated(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          
          let startTime: number | null = null;
          const duration = 1500; // 1.5 seconds

          const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            
            const easedProgress = easeOutQuart(progress);
            setDisplayValue(Math.floor(easedProgress * value));

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setDisplayValue(value);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.1 }
    );

    if (nodeRef.current) {
      observer.observe(nodeRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [value, hasAnimated]);

  return (
    <div ref={nodeRef} className={`flex flex-col ${className}`}>
      <div className="font-display text-4xl font-extrabold text-ink sm:text-5xl tracking-tight">
        {prefix}{displayValue.toLocaleString('en-NG')}{suffix}
      </div>
      <div className="text-sm text-muted mt-1 font-medium">{label}</div>
    </div>
  );
}
