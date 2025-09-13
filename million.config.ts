import million from 'million/compiler';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    million.vite({
      auto: true,
      // Optimize specific components (optional)
      server: true, // Enable optimization during development
      mode: 'react' // Specify React as the framework
    })
  ],
});
