import { extractConVarValue } from './extract-con-var-value';

describe('extractConVarValue()', () => {
  it('should parse the rcon response when the values are sane', () => {
    expect(extractConVarValue(`"sv_password" = "some password" ( def. "" )
    notify
    - Server password for entry into multiplayer games`)).toEqual('some password');
  });

  it('should handle empty values', () => {
    expect(extractConVarValue(`"tv_password" = ""
    notify
    - SourceTV password for all clients`)).toEqual('');
  });

  it('should handle non-cvar responses', () => {
    expect(extractConVarValue(`<slot:userid:"name">
    0:2:"melkor TV"
    1 users`)).toBeUndefined();
  });

  it('should handle undefined', () => {
    expect(extractConVarValue(undefined)).toBeUndefined();
  });
});
