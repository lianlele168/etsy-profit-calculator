const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  DEFAULT_RATE_DATA,
  normalizeInput,
  calculateOrder,
  solveItemPriceForMargin
} = require("../fee-engine.js");

const rateData = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/etsy-fee-rates.json"), "utf8"));
const rates = rateData.rates;

function money(value) {
  return Number(value.toFixed(2));
}

function assertMoney(actual, expected, message) {
  assert.equal(money(actual), expected, message);
}

function assertClose(actual, expected, tolerance, message) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, got ${actual}`);
}

const baseInput = normalizeInput({
  itemPrice: 24.99,
  quantity: 1,
  shippingCharged: 4.99,
  discount: 0,
  productCost: 7.5,
  shippingCost: 4.25,
  podExtraCost: 0,
  taxCollected: 0,
  etsyAds: 0,
  offsiteRate: 0,
  targetMargin: 0.35
});

assert.deepEqual(Object.keys(DEFAULT_RATE_DATA.rates), Object.keys(rates), "default fallback rates must match JSON rate keys");

for (const [key, rate] of Object.entries(rates)) {
  assert.equal(typeof rate.label, "string", `${key} label`);
  assert.equal(typeof rate.currency, "string", `${key} currency`);
  assert.equal(typeof rate.symbol, "string", `${key} symbol`);
  assert.equal(rate.listingFlat, 0.2, `${key} listing fee model`);
  assert.equal(rate.transactionRate, 0.065, `${key} transaction fee`);
  assert.equal(typeof rate.processingRate, "number", `${key} processing percent`);
  assert.equal(typeof rate.processingFlat, "number", `${key} processing flat`);
  assert.equal(typeof rate.regulatoryRate, "number", `${key} regulatory rate`);
}

assert.equal(rates.ca.regulatoryRate, 0.005, "Canada regulatory operating fee");
assert.equal(rates.uk.regulatoryRate, 0.0048, "UK regulatory operating fee");
assert.equal(rates.fr.regulatoryRate, 0.0114, "France regulatory operating fee");
assert.equal(rates.it.regulatoryRate, 0.008, "Italy regulatory operating fee");
assert.equal(rates.es.regulatoryRate, 0.0088, "Spain regulatory operating fee");

const usBase = calculateOrder(baseInput, rates.us);
assertMoney(usBase.orderRevenue, 29.98, "US base order revenue");
assertMoney(usBase.listingFee, 0.2, "US base listing fee");
assertMoney(usBase.transactionFee, 1.95, "US base transaction fee");
assertMoney(usBase.processingFee, 1.15, "US base processing fee");
assertMoney(usBase.totalFees, 3.3, "US base total fees");
assertMoney(usBase.netProfit, 14.93, "US base net profit");
assertClose(usBase.margin, 0.4979, 0.0005, "US base margin");

const taxInput = normalizeInput({ ...baseInput, taxCollected: 2 });
const withTax = calculateOrder(taxInput, rates.us);
assertMoney(withTax.transactionFee, 1.95, "US transaction fee excludes sales tax in this model");
assertMoney(withTax.processingFee, 1.21, "US processing fee includes sales tax payment base");
assertMoney(withTax.netProfit, 14.87, "US tax-adjusted net profit");

const offsite15 = calculateOrder(normalizeInput({ ...baseInput, offsiteRate: 0.15 }), rates.us);
assertMoney(offsite15.offsiteFee, 4.5, "15% Offsite Ads fee");
assertMoney(offsite15.netProfit, 10.43, "15% Offsite Ads net profit");

const offsite12 = calculateOrder(normalizeInput({ ...baseInput, offsiteRate: 0.12 }), rates.us);
assertMoney(offsite12.offsiteFee, 3.6, "12% Offsite Ads fee");
assertMoney(offsite12.netProfit, 11.33, "12% Offsite Ads net profit");

const cappedOffsiteInput = normalizeInput({
  itemPrice: 1000,
  quantity: 1,
  shippingCharged: 0,
  productCost: 0,
  shippingCost: 0,
  offsiteRate: 0.15,
  targetMargin: 0.4
});
const cappedOffsite = calculateOrder(cappedOffsiteInput, rates.us);
assertMoney(cappedOffsite.offsiteFee, 100, "Offsite Ads fee is capped at 100");
assertMoney(cappedOffsite.netProfit, 804.55, "high-value capped Offsite Ads net profit");

const countryFeeCases = [
  ["us", 9.95],
  ["uk", 11.38],
  ["ca", 10.45],
  ["au", 9.95],
  ["de", 11],
  ["fr", 12.14],
  ["it", 11.8],
  ["es", 11.88]
];
for (const [country, expectedFees] of countryFeeCases) {
  const input = normalizeInput({ itemPrice: 100, quantity: 1, shippingCharged: 0 });
  const result = calculateOrder(input, rates[country]);
  assertMoney(result.totalFees, expectedFees, `${country} fee matrix on 100 revenue`);
}

const blankInput = normalizeInput({
  itemPrice: "",
  quantity: "",
  shippingCharged: "",
  discount: "",
  productCost: "",
  shippingCost: "",
  podExtraCost: "",
  taxCollected: "",
  etsyAds: "",
  offsiteRate: "",
  targetMargin: ""
});
assert.equal(blankInput.quantity, 1, "blank quantity falls back to 1");
assert.doesNotThrow(() => calculateOrder(blankInput, rates.us));
const blankResult = calculateOrder(blankInput, rates.us);
assertMoney(blankResult.orderRevenue, 0, "blank order has zero revenue");
assertMoney(blankResult.netProfit, -0.45, "blank order still shows fixed listing and payment fees");

const negativeInput = normalizeInput({
  itemPrice: -10,
  quantity: -2,
  shippingCharged: -4,
  discount: -1,
  productCost: -3,
  shippingCost: -8,
  podExtraCost: -2,
  taxCollected: -5,
  etsyAds: -6,
  offsiteRate: -0.15,
  targetMargin: -0.1
});
assert.equal(negativeInput.quantity, 1, "negative quantity falls back to 1");
assert.equal(negativeInput.itemPrice, 0, "negative price is clamped to 0");
assert.equal(negativeInput.offsiteRate, 0, "negative Offsite Ads rate is clamped to 0");

const roundedQuantity = normalizeInput({ ...baseInput, quantity: 2.6 });
assert.equal(roundedQuantity.quantity, 3, "fractional quantity is rounded");
assertMoney(calculateOrder(roundedQuantity, rates.us).listingFee, 0.6, "listing fee follows rounded quantity");

const oversizedDiscount = calculateOrder(normalizeInput({
  itemPrice: 10,
  quantity: 1,
  shippingCharged: 2,
  discount: 99
}), rates.us);
assertMoney(oversizedDiscount.orderRevenue, 0, "discount cannot push revenue below zero");
assertMoney(oversizedDiscount.netProfit, -0.45, "zero-revenue discounted order still has modeled fixed fees");

const standardIgnoresPodExtra = normalizeInput({ ...baseInput, sellerMode: "standard", podExtraCost: 3 });
assert.equal(standardIgnoresPodExtra.podExtraCost, 0, "standard mode ignores POD-only extra cost");
assertMoney(calculateOrder(standardIgnoresPodExtra, rates.us).netProfit, usBase.netProfit, "standard mode profit ignores POD extra cost");

const podWithExtra = normalizeInput({ ...baseInput, sellerMode: "pod", podExtraCost: 3 });
assert.equal(podWithExtra.podExtraCost, 3, "POD mode keeps POD extra cost");
assertMoney(calculateOrder(podWithExtra, rates.us).netProfit, 11.93, "POD extra cost reduces net profit");

const target = solveItemPriceForMargin(baseInput, rates.us);
assert.equal(target.possible, true, "target margin is solvable");
const targetResult = calculateOrder(normalizeInput({ ...baseInput, itemPrice: target.price }), rates.us);
assertClose(targetResult.margin, 0.35, 0.002, "target price reaches target margin");

const impossibleTarget = solveItemPriceForMargin(normalizeInput({ ...baseInput, targetMargin: 0.95 }), rates.us);
assert.equal(impossibleTarget.possible, false, "target margin above remaining variable-fee revenue is impossible");

const cappedTargetInput = normalizeInput({
  itemPrice: 100,
  quantity: 1,
  shippingCharged: 0,
  productCost: 500,
  shippingCost: 100,
  offsiteRate: 0.15,
  targetMargin: 0.3
});
const cappedTarget = solveItemPriceForMargin(cappedTargetInput, rates.us);
assert.equal(cappedTarget.possible, true, "target margin with capped Offsite Ads is solvable");
const cappedTargetResult = calculateOrder(normalizeInput({ ...cappedTargetInput, itemPrice: cappedTarget.price }), rates.us);
assertMoney(cappedTargetResult.offsiteFee, 100, "target solve respects Offsite Ads cap");
assertClose(cappedTargetResult.margin, 0.3, 0.002, "target solve reaches margin after Offsite Ads cap");

for (const [country, rate] of Object.entries(rates)) {
  const targetByCountry = solveItemPriceForMargin(baseInput, rate);
  assert.equal(targetByCountry.possible, true, `${country} target price is solvable`);
  const result = calculateOrder(normalizeInput({ ...baseInput, itemPrice: targetByCountry.price }), rate);
  assertClose(result.margin, baseInput.targetMargin, 0.003, `${country} target margin matrix`);
}

console.log("fee-engine test matrix passed");
