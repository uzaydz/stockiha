// Shim for eventemitter3 to provide default export
import * as EventEmitterModule from 'eventemitter3';

// eventemitter3 exports a class as default
const EventEmitter = (EventEmitterModule as any).default || EventEmitterModule;

export default EventEmitter;
export { EventEmitter };
