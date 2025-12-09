// PowerSync Worker Wrapper
// This file helps Vite load PowerSync workers correctly

// Import the actual worker from node_modules
import worker from '@powersync/web/dist/worker/WASQLiteDB.worker?worker';

export default worker;
