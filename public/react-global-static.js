/**
 * هذا الملف يوفر كائن React ساكن بدوال وهمية لاستخدامه قبل تحميل React الحقيقي
 * يتم تحميله كملف ساكن قبل أي Javascript لضمان توفر React في أي وقت
 */

(function() {
  // التأكد من أن النافذة موجودة
  if (typeof window === 'undefined') return;

  // إنشاء كائن React الوهمي إذا لم يكن موجودًا بالفعل
  if (!window.React) {
    // دوال عامة لـ React
    const noop = () => null;
    const noopWithReturn = (val) => val || {};
    
    // إنشاء كائن React وهمي
    window.React = {
      version: '18.0.0', // نسخة وهمية
      
      // الدوال الأساسية
      createElement: (type, props, ...children) => ({ type, props, children }),
      cloneElement: (element) => ({ ...element }),
      createContext: () => ({
        Provider: noop,
        Consumer: noop,
        displayName: '',
        _currentValue: null
      }),
      createRef: () => ({ current: null }),
      forwardRef: (fn) => fn,
      
      // هوكس
      useState: () => [undefined, noop],
      useEffect: noop,
      useContext: () => null,
      useReducer: () => [null, noop],
      useCallback: (cb) => cb,
      useMemo: (fn) => fn(),
      useRef: () => ({ current: null }),
      useLayoutEffect: noop,
      useImperativeHandle: noop,
      useDebugValue: noop,
      useTransition: () => [false, noop],
      useDeferredValue: (value) => value,
      useId: () => "id",
      
      // كائنات
      Children: {
        map: (children, fn) => Array.isArray(children) ? children.map(fn) : [],
        forEach: (children, fn) => Array.isArray(children) && children.forEach(fn),
        count: (children) => Array.isArray(children) ? children.length : 0,
        only: (children) => Array.isArray(children) ? children[0] : children,
        toArray: (children) => Array.isArray(children) ? children : [children]
      },
      
      // عناصر
      Fragment: Symbol('Fragment'),
      Suspense: Symbol('Suspense'),
      
      // مساعدات
      isValidElement: () => true,
      memo: (component) => component,
      lazy: () => ({ _status: 1, _result: null }),
      
      // إضافة تعريفات لدعم React الحديث
      StrictMode: Symbol('StrictMode'),
      Profiler: Symbol('Profiler'),
      
      // آليات
      Component: class Component {
        setState() {}
        forceUpdate() {}
      },
      PureComponent: class PureComponent {
        setState() {}
        forceUpdate() {}
      }
    };
    
    // نسخة وهمية من ReactDOM
    window.ReactDOM = {
      createRoot: () => ({
        render: noop,
        unmount: noop
      }),
      render: noop,
      hydrate: noop,
      unmountComponentAtNode: noop,
      findDOMNode: noop
    };
    
    // إضافة هوكس مستقلة للنافذة العالمية
    const hooks = [
      'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 
      'useMemo', 'useRef', 'useLayoutEffect', 'useImperativeHandle',
      'useDebugValue', 'useTransition', 'useDeferredValue', 'useId'
    ];
    
    hooks.forEach(hookName => {
      window[hookName] = window.React[hookName];
    });
    
    console.log('تم تعريف React الساكن مؤقتًا لمنع الأخطاء أثناء التحميل');
  }
})(); 