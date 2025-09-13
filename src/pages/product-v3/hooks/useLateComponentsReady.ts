import { useEffect, useState, startTransition } from 'react';

export function useLateComponentsReady(organizationId: string | null) {
  const [isComponentsLoaded, setIsComponentsLoaded] = useState(false);
  useEffect(() => {
    if (!isComponentsLoaded && organizationId) {
      startTransition(() => setIsComponentsLoaded(true));
    }
  }, [isComponentsLoaded, organizationId]);
  return isComponentsLoaded;
}

