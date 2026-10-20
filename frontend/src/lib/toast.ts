import { toast as sonnerToast } from 'sonner';

/**
 * Standardized notification helper enforcing zero emojis,
 * clean technical copy, and consistent toast duration.
 */
export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      duration: 3500,
    });
  },
  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      duration: 5000,
    });
  },
  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      duration: 3500,
    });
  },
};
