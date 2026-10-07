export class ApiError extends Error {
  constructor(public code: string, public status: number, public detail?: Record<string, unknown>) { super(code); }
}
export const invalid = (field: string): never => { throw new ApiError('INVALID_REQUEST', 400, { field }); };
