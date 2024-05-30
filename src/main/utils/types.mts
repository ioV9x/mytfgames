export type DeepRequired<T> = {
  [P in keyof T]-?: Exclude<T[P], undefined> extends object
    ? DeepRequired<T[P]>
    : T[P];
};
