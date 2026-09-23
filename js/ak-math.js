/*
 * ak-math.js
 * Pure logic for the AK calculation. No DOM access, so it runs both in the
 * browser (window.AKMath) and in Node (require) for tests.
 *
 * AK(day) = e^n   where   n = 51 + (whole calendar days since START_DATE)
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.AKMath = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /** Exponent used on START_DATE. Change these two to re-anchor the counter. */
  var START_EXPONENT = 51;
  /** Calendar date (month is 1-12) on which the exponent equals START_EXPONENT. */
  var START_DATE = { year: 2026, month: 9, day: 21 };

  /** Digits shown after the decimal point. */
  var DEFAULT_DECIMALS = 25;

  var MS_PER_DAY = 86400000;

  /** Days since 1970-01-01 for a calendar date, immune to DST and timezones. */
  function dayNumber(year, month, day) {
    return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
  }

  /**
   * Exponent for a given moment. Uses the *local* calendar date of the visitor,
   * so the number changes at their local midnight. Never goes below the start value.
   */
  function exponentFor(date) {
    var d = date || new Date();
    var today = dayNumber(d.getFullYear(), d.getMonth() + 1, d.getDate());
    var first = dayNumber(START_DATE.year, START_DATE.month, START_DATE.day);
    return START_EXPONENT + Math.max(0, today - first);
  }

  /**
   * e^n for a non-negative integer n, as exact decimal digit strings.
   * Uses BigInt fixed-point arithmetic and the Taylor series sum(n^k / k!).
   * The guard digits cover the size of e^n itself, so every printed digit is correct.
   */
  function expDecimal(n, decimals) {
    if (!Number.isInteger(n) || n < 0) {
      throw new RangeError("n must be a non-negative integer");
    }
    var places = decimals === undefined ? DEFAULT_DECIMALS : decimals;
    if (!Number.isInteger(places) || places < 0) {
      throw new RangeError("decimals must be a non-negative integer");
    }

    var integerDigits = Math.ceil(n / Math.LN10) + 1; // upper bound for digits of e^n
    var guard = integerDigits + 12;
    var scale = 10n ** BigInt(places + guard);
    var big = BigInt(n);

    var term = scale;
    var sum = scale;
    for (var k = 1n; term > 0n; k += 1n) {
      term = (term * big) / k;
      sum += term;
    }

    var cut = 10n ** BigInt(guard);
    var rounded = (sum + cut / 2n) / cut;
    var digits = rounded.toString();
    if (digits.length < places + 1) {
      digits = "0".repeat(places + 1 - digits.length) + digits;
    }
    return {
      integer: digits.slice(0, digits.length - places),
      fraction: digits.slice(digits.length - places)
    };
  }

  /** Everything the UI needs for one press of the AK button. */
  function computeAK(date) {
    var exponent = exponentFor(date);
    var parts = expDecimal(exponent);
    return {
      exponent: exponent,
      integer: parts.integer,
      fraction: parts.fraction,
      text: parts.fraction ? parts.integer + "." + parts.fraction : parts.integer,
      integerDigits: parts.integer.length
    };
  }

  return {
    START_EXPONENT: START_EXPONENT,
    START_DATE: START_DATE,
    DEFAULT_DECIMALS: DEFAULT_DECIMALS,
    exponentFor: exponentFor,
    expDecimal: expDecimal,
    computeAK: computeAK
  };
});
