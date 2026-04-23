export interface HttpError extends Error {
  statusCode?: number;
  details?: unknown;
}
