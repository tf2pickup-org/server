export const waitABit = (timeout: number) =>
  new Promise((resolve) => setTimeout(resolve, timeout));
