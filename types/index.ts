// Shared TypeScript types for the application.
// Domain-specific types will be added here as features are built.

export type ApiResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };
