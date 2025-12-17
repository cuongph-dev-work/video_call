/**
 * Responsive breakpoints and utilities
 */

export const breakpoints = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/**
 * Get current breakpoint based on window width
 */
export function getCurrentBreakpoint(width: number): Breakpoint {
  if (width >= breakpoints.wide) return 'wide';
  if (width >= breakpoints.desktop) return 'desktop';
  if (width >= breakpoints.tablet) return 'tablet';
  return 'mobile';
}

/**
 * Check if current width matches breakpoint
 */
export function isBreakpoint(width: number, breakpoint: Breakpoint): boolean {
  const current = getCurrentBreakpoint(width);
  const breakpointOrder: Breakpoint[] = ['mobile', 'tablet', 'desktop', 'wide'];
  const currentIndex = breakpointOrder.indexOf(current);
  const targetIndex = breakpointOrder.indexOf(breakpoint);
  return currentIndex >= targetIndex;
}

/**
 * Get grid columns based on participant count and screen size
 */
export function getGridCols(
  participantCount: number,
  isMobile: boolean,
  isTablet: boolean
): number {
  if (isMobile) return 1;
  if (isTablet) {
    if (participantCount <= 2) return 2;
    return 2;
  }
  // Desktop
  if (participantCount <= 1) return 1;
  if (participantCount <= 4) return 2;
  if (participantCount <= 9) return 3;
  return 4;
}

