export function normalizeCode(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim()
    .toLowerCase();
}

export function checkAnswer(input, expected) {
  return normalizeCode(input) === normalizeCode(expected);
}
