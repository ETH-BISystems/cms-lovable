// Re-exported from the central service layer at @/services.
// Kept as a barrel so existing module imports (`from '../services/authService'`)
// keep working during the retrofit. New code should import from '@/services'.

export { authService } from '@/services/authService';
