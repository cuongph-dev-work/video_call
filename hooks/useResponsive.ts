'use client';

import { useState, useEffect } from 'react';
import { breakpoints, getCurrentBreakpoint, Breakpoint } from '@/lib/responsive';

export function useResponsive() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateBreakpoint = () => {
      const w = window.innerWidth;
      setWidth(w);
      setBreakpoint(getCurrentBreakpoint(w));
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return {
    breakpoint,
    width,
    isMobile: width < breakpoints.tablet,
    isTablet: width >= breakpoints.tablet && width < breakpoints.desktop,
    isDesktop: width >= breakpoints.desktop,
    isWide: width >= breakpoints.wide,
  };
}

