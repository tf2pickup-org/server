import { isEqual } from "lodash";

export const deepDiff = (o2: any, o1: any) => Object.keys(o2).reduce((diff, key) => {
  if (isEqual(o1[key], o2[key]))
    return diff;

  return {
    ...diff,
    [key]: o2[key],
  };
}, {});
