'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const AK = require('../js/ak-math.js');
const reference = require('./reference.json'); // e^n computed independently with Python's decimal module

test('e^n matches independent reference values digit for digit', () => {
  for (const [n, expected] of Object.entries(reference)) {
    const got = AK.expDecimal(Number(n));
    assert.equal(got.integer, expected.integer, `integer part of e^${n}`);
    assert.equal(got.fraction, expected.fraction, `fraction of e^${n}`);
  }
});

test('exponent is 51 on the start date and grows by one per calendar day', () => {
  const { year, month, day } = AK.START_DATE;
  assert.equal(AK.exponentFor(new Date(year, month - 1, day, 0, 0, 1)), 51);
  assert.equal(AK.exponentFor(new Date(year, month - 1, day, 23, 59, 59)), 51);
  assert.equal(AK.exponentFor(new Date(year, month - 1, day + 1, 0, 0, 1)), 52);
  assert.equal(AK.exponentFor(new Date(year, month - 1, day + 30, 12)), 81);
});

test('exponent never drops below the start value', () => {
  assert.equal(AK.exponentFor(new Date(2020, 0, 1)), 51);
});

test('computeAK returns the digits for the current exponent', () => {
  const { year, month, day } = AK.START_DATE;
  const r = AK.computeAK(new Date(year, month - 1, day + 1, 12));
  assert.equal(r.exponent, 52);
  assert.equal(r.integer, reference['52'].integer);
  assert.equal(r.text, `${reference['52'].integer}.${reference['52'].fraction}`);
});

test('invalid input is rejected', () => {
  assert.throws(() => AK.expDecimal(-1), RangeError);
  assert.throws(() => AK.expDecimal(1.5), RangeError);
});
