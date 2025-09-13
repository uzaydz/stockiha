import { useEffect } from 'react';


      // إزالة console.table أيضاً
      console.table = () => {};
      console.group = () => {};
      console.groupEnd = () => {};
      console.time = () => {};
      console.timeEnd = () => {};
    }
  }, []);

  return null;
};
