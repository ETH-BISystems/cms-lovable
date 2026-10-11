// Public barrel for the service layer.
// Consumers (hooks, components) MUST import from '@/services' only —
// never from '@/mocks/*' or from a specific service file directly.

export { authService } from './authService';
export { callFunction, registerMockFunction } from './functionsService';
export * from './types';
