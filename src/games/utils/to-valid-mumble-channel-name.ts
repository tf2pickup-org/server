export const toValidMumbleChannelName = (name: string): string => {
  return name.replaceAll(/[\s.]+/gi, '-').replaceAll(/#/gi, '');
};
