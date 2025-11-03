import { useNavigate } from 'react-router-dom';
import { isElectronEnv } from '@/lib/navigation';

type Options = { replace?: boolean };

export function useGoTo() {
  const navigate = useNavigate();
  return (path: string, opts: Options = {}) => {
    if (!path.startsWith('/')) path = `/${path}`;
    if (isElectronEnv()) {
      const target = `#${path}`;
      if (opts.replace) {
        const { pathname, search } = window.location;
        const newUrl = `${pathname}${search}${target}`;
        window.history.replaceState(null, '', newUrl);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } else {
        window.location.hash = target;
      }
      return;
    }
    navigate(path, { replace: Boolean(opts.replace) });
  };
}

export default useGoTo;

