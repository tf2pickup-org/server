export interface DiagnosticCheckResult {
  success: boolean;
  reportedErrors: string[];
  reportedWarnings: string[];
  effects?: Map<string, any>;
}
