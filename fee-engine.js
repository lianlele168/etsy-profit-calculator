(function initFeeEngine(globalScope) {
  const DEFAULT_RATE_DATA = {
    updated: "2026-06-26",
    rates: {
      us: { label: "United States", currency: "USD", symbol: "$", listingFlat: 0.2, transactionRate: 0.065, processingRate: 0.03, processingFlat: 0.25, regulatoryRate: 0, processingBaseIncludesTax: true, transactionBaseIncludesTax: false },
      uk: { label: "United Kingdom", currency: "GBP", symbol: "GBP ", listingFlat: 0.2, transactionRate: 0.065, processingRate: 0.04, processingFlat: 0.2, regulatoryRate: 0.0048, processingBaseIncludesTax: true, transactionBaseIncludesTax: false },
      ca: { label: "Canada domestic / US buyer", currency: "CAD", symbol: "C$", listingFlat: 0.2, transactionRate: 0.065, processingRate: 0.03, processingFlat: 0.25, regulatoryRate: 0.005, processingBaseIncludesTax: true, transactionBaseIncludesTax: false },
      au: { label: "Australia domestic", currency: "AUD", symbol: "A$", listingFlat: 0.2, transactionRate: 0.065, processingRate: 0.03, processingFlat: 0.25, regulatoryRate: 0, processingBaseIncludesTax: true, transactionBaseIncludesTax: false },
      de: { label: "Germany", currency: "EUR", symbol: "EUR ", listingFlat: 0.2, transactionRate: 0.065, processingRate: 0.04, processingFlat: 0.3, regulatoryRate: 0, processingBaseIncludesTax: true, transactionBaseIncludesTax: false },
      fr: { label: "France", currency: "EUR", symbol: "EUR ", listingFlat: 0.2, transactionRate: 0.065, processingRate: 0.04, processingFlat: 0.3, regulatoryRate: 0.0114, processingBaseIncludesTax: true, transactionBaseIncludesTax: false },
      it: { label: "Italy", currency: "EUR", symbol: "EUR ", listingFlat: 0.2, transactionRate: 0.065, processingRate: 0.04, processingFlat: 0.3, regulatoryRate: 0.008, processingBaseIncludesTax: true, transactionBaseIncludesTax: false },
      es: { label: "Spain", currency: "EUR", symbol: "EUR ", listingFlat: 0.2, transactionRate: 0.065, processingRate: 0.04, processingFlat: 0.3, regulatoryRate: 0.0088, processingBaseIncludesTax: true, transactionBaseIncludesTax: false }
    }
  };

  function numeric(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function roundMoney(amount) {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  function normalizeInput(input) {
    const sellerMode = input.sellerMode || "standard";
    return {
      sellerMode,
      location: input.location || "us",
      itemPrice: Math.max(numeric(input.itemPrice), 0),
      quantity: Math.max(Math.round(numeric(input.quantity)), 1),
      shippingCharged: Math.max(numeric(input.shippingCharged), 0),
      discount: Math.max(numeric(input.discount), 0),
      productCost: Math.max(numeric(input.productCost), 0),
      shippingCost: Math.max(numeric(input.shippingCost), 0),
      podExtraCost: sellerMode === "pod" ? Math.max(numeric(input.podExtraCost), 0) : 0,
      taxCollected: Math.max(numeric(input.taxCollected), 0),
      etsyAds: Math.max(numeric(input.etsyAds), 0),
      offsiteRate: Math.max(numeric(input.offsiteRate), 0),
      targetMargin: Math.max(numeric(input.targetMargin), 0)
    };
  }

  function calculateOrder(input, rate) {
    const itemSubtotal = input.itemPrice * input.quantity;
    const orderRevenue = Math.max(itemSubtotal + input.shippingCharged - input.discount, 0);
    const transactionBase = orderRevenue + (rate.transactionBaseIncludesTax ? input.taxCollected : 0);
    const processingBase = orderRevenue + (rate.processingBaseIncludesTax ? input.taxCollected : 0);
    const listingFee = roundMoney(rate.listingFlat * input.quantity);
    const transactionFee = roundMoney(transactionBase * rate.transactionRate);
    const processingFee = roundMoney(processingBase * rate.processingRate + rate.processingFlat);
    const regulatoryFee = roundMoney(orderRevenue * rate.regulatoryRate);
    const offsiteFee = roundMoney(Math.min(orderRevenue * input.offsiteRate, input.offsiteRate > 0 ? 100 : 0));
    const productCosts = roundMoney(input.productCost * input.quantity);
    const operatingCosts = roundMoney(productCosts + input.shippingCost + input.podExtraCost + input.etsyAds);
    const totalFees = roundMoney(listingFee + transactionFee + processingFee + regulatoryFee + offsiteFee);
    const totalCosts = roundMoney(totalFees + operatingCosts);
    const netProfit = roundMoney(orderRevenue - totalCosts);
    const margin = orderRevenue > 0 ? netProfit / orderRevenue : 0;

    return {
      itemSubtotal,
      orderRevenue,
      transactionBase,
      processingBase,
      listingFee,
      transactionFee,
      processingFee,
      regulatoryFee,
      offsiteFee,
      productCosts,
      operatingCosts,
      totalFees,
      totalCosts,
      netProfit,
      margin
    };
  }

  function priceFromRequiredRevenue(requiredRevenue, input) {
    return Math.max((requiredRevenue - input.shippingCharged + input.discount) / input.quantity, 0);
  }

  function solveRequiredRevenue(input, rate, offsiteAsFixedCost) {
    const variableRate = rate.transactionRate + rate.processingRate + rate.regulatoryRate + (offsiteAsFixedCost ? 0 : input.offsiteRate);
    const fixedCosts = (input.productCost * input.quantity)
      + input.shippingCost
      + input.podExtraCost
      + input.etsyAds
      + (rate.listingFlat * input.quantity)
      + rate.processingFlat
      + (rate.processingBaseIncludesTax ? input.taxCollected * rate.processingRate : 0)
      + (rate.transactionBaseIncludesTax ? input.taxCollected * rate.transactionRate : 0)
      + (offsiteAsFixedCost && input.offsiteRate > 0 ? 100 : 0);
    const denominator = 1 - variableRate - input.targetMargin;

    if (denominator <= 0) {
      return { possible: false, price: 0, requiredRevenue: 0 };
    }

    const requiredRevenue = fixedCosts / denominator;
    return {
      possible: true,
      price: priceFromRequiredRevenue(requiredRevenue, input),
      requiredRevenue
    };
  }

  function solveItemPriceForMargin(input, rate) {
    const uncapped = solveRequiredRevenue(input, rate, false);
    if (!uncapped.possible || input.offsiteRate <= 0 || uncapped.requiredRevenue * input.offsiteRate <= 100) {
      return uncapped;
    }

    return solveRequiredRevenue(input, rate, true);
  }

  const api = {
    DEFAULT_RATE_DATA,
    normalizeInput,
    roundMoney,
    calculateOrder,
    solveItemPriceForMargin
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  globalScope.MarginDeskFeeEngine = api;
}(typeof window !== "undefined" ? window : globalThis));
