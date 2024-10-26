export function sortedDifferenceBy<T1, T2, TV extends NonNullable<unknown>>(
  data: T1[],
  exclude: T2[],
  toValue: (x: T1 | T2) => TV,
  compare: (a: TV, b: TV) => number,
): T1[] {
  if (data.length === 0) {
    return [];
  }
  if (exclude.length === 0) {
    return [...data];
  }
  let i = 0;
  let iv = toValue(data[i]!);
  let j = 0;
  let jv = toValue(exclude[j]!);
  const result: T1[] = [];
  for (;;) {
    const cmp = compare(iv, jv);
    if (cmp < 0) {
      result.push(data[i++]!);
      if (i === data.length) {
        break;
      }
      iv = toValue(data[i]!);
    } else if (cmp === 0) {
      if (++i === data.length || ++j === exclude.length) {
        break;
      }
      iv = toValue(data[i]!);
      jv = toValue(exclude[j]!);
    } else {
      if (++j === exclude.length) {
        break;
      }
      jv = toValue(exclude[j]!);
    }
  }
  for (; i < data.length; i++) {
    result.push(data[i]!);
  }
  return result;
}
