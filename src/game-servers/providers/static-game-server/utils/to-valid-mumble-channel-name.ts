export const toValidMumbleChannelName = (name: string): string => {
  return name.replace(/[\s.]+/gi, '-').replace(/#/gi, '');
};
