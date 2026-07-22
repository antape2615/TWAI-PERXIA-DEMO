import { useEffect, useState } from 'react';
import { getBreakpointFromWidth } from '../utils/columnValidator';

/**
 * @returns {'xs'|'sm'|'md'|'lg'|'xl'}
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState(() => {
    if (typeof window === 'undefined') return 'md';
    return getBreakpointFromWidth(window.innerWidth);
  });

  useEffect(() => {
    const handleResize = () => {
      setBreakpoint(getBreakpointFromWidth(window.innerWidth));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
}

export default useBreakpoint;
