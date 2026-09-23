export function applyIrpfScale(base, brackets) {
  let cuota = 0;
  let prevLimit = 0;
  for (const bracket of brackets) {
    const limit = bracket.upTo == null ? Infinity : Number(bracket.upTo);
    if (base > prevLimit) {
      cuota += (Math.min(base, limit) - prevLimit) * Number(bracket.rate);
    }
    prevLimit = limit;
  }
  return round2(cuota);
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
