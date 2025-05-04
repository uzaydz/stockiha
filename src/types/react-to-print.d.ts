declare module 'react-to-print' {
  import { RefObject } from 'react';

  export interface UseReactToPrintOptions {
    content: () => HTMLElement | null;
    documentTitle?: string;
    onBeforeGetContent?: () => Promise<void> | void;
    onBeforePrint?: () => Promise<void> | void;
    onAfterPrint?: () => void;
    removeAfterPrint?: boolean;
    suppressErrors?: boolean;
    copyStyles?: boolean;
    pageStyle?: string;
  }

  export type UseReactToPrintHookContent = () => HTMLElement | null;
  export type UseReactToPrintFn = (options?: { pageStyle?: string }) => void;

  export function useReactToPrint(options: UseReactToPrintOptions): UseReactToPrintFn;
}

declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  interface AutoTableSettings {
    html?: HTMLTableElement | string;
    head?: any[][];
    body?: any[][];
    foot?: any[][];
    headStyles?: any;
    bodyStyles?: any;
    footStyles?: any;
    margin?: any;
    theme?: 'striped' | 'grid' | 'plain';
    startY?: number;
    styles?: any;
    didDrawCell?: (data: any) => void;
    willDrawCell?: (data: any) => void;
    didDrawPage?: (data: any) => void;
    didParseCell?: (data: any) => void;
  }

  interface jsPDF {
    autoTable: (options: AutoTableSettings) => void;
  }
}

declare module 'html2canvas' {
  interface Options {
    scale?: number;
    useCORS?: boolean;
    logging?: boolean;
    allowTaint?: boolean;
    ignoreElements?: (element: HTMLElement) => boolean;
  }

  function html2canvas(element: HTMLElement, options?: Options): Promise<HTMLCanvasElement>;
  export default html2canvas;
} 