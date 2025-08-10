// Augment React's img attributes to allow the lowercase fetchpriority HTML attribute
import 'react';

declare module 'react' {
  interface ImgHTMLAttributes<T> extends HTMLAttributes<T> {
    fetchpriority?: 'high' | 'low' | 'auto' | string;
  }
}
