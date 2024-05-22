export type IdGenerator = Generator<number, number, never>;
export function* IdGenerator(start?: number): IdGenerator {
  if (start == null) {
    start = Math.random() * 0x7fffffff;
  }

  start = start & 0x7fffffff;
  yield start;
  for (;;) {
    start = (start + 1) & 0x7fffffff;
    yield start;
  }
}
