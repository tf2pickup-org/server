/**
 * Extracts cvar value from rcon response that looks like that:
 * `"tv_port" = "27020"
 * - Host SourceTV port`
 * @param rconResponse The plain rcon response
 */
export function extractConVarValue(rconResponse: string): string {
  return rconResponse
    ?.split(/\r?\n/)[0]
    ?.match(/^"(.[^"]*)"\s=\s\"(.*)"(\s\(\s?def\.\s\"(.*)\"\s?\))?$/)?.[2]
    ?.toString();
}
