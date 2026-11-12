const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export function assertEqual(actual, expected, msg = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg ? msg + ': ' : ''}erwartet ${e}, erhalten ${a}`);
}

export function assertClose(actual, expected, eps = 1e-6) {
  if (!(Math.abs(actual - expected) <= eps)) {
    throw new Error(`erwartet ${expected} (±${eps}), erhalten ${actual}`);
  }
}

export function assertTrue(value, msg = '') {
  if (!value) throw new Error(msg || 'Bedingung nicht erfüllt');
}

export function assertThrows(fn) {
  try { fn(); } catch (e) { return; }
  throw new Error('erwartete eine Ausnahme');
}

/** @returns {Promise<{passed:number, failed:number, failures:{name:string,error:string}[]}>} */
export async function run(filter = '') {
  const failures = [];
  let passed = 0;
  for (const t of tests) {
    if (filter && !t.name.includes(filter)) continue;
    try {
      await t.fn();
      passed++;
    } catch (e) {
      failures.push({ name: t.name, error: String(e && e.message || e) });
    }
  }
  return { passed, failed: failures.length, failures };
}
