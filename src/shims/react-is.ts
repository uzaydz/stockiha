// Shim for react-is to ensure both default and named exports are available in ESM
import * as ReactIs from 'react-is';

export * from 'react-is';
export default ReactIs as unknown as {
  // Provide a helpful default shape for TS consumers if needed
  typeOf?: any;
  isElement?: any;
  isFragment?: any;
  isContextConsumer?: any;
  isContextProvider?: any;
  isForwardRef?: any;
  isMemo?: any;
  isValidElementType?: any;
  isPortal?: any;
};
