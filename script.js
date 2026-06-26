const {
  DEFAULT_RATE_DATA,
  normalizeInput,
  calculateOrder,
  solveItemPriceForMargin
} = window.MarginDeskFeeEngine;

let rateData = DEFAULT_RATE_DATA;

const els = {
  form: document.querySelector("#calculator-form"),
  location: document.querySelector("#seller-location"),
  rateSummary: document.querySelector("#rate-summary"),
  targetMargin: document.querySelector("#target-margin"),
  targetMarginOutput: document.querySelector("#target-margin-output"),
  netProfit: document.querySelector("#net-profit"),
  profitHero: document.querySelector(".profit-hero"),
  profitStatus: document.querySelector("#profit-status"),
  profitMargin: document.querySelector("#profit-margin"),
  totalFees: document.querySelector("#total-fees"),
  totalCosts: document.querySelector("#total-costs"),
  orderRevenue: document.querySelector("#order-revenue"),
  suggestedPrice: document.querySelector("#suggested-price"),
  suggestedNote: document.querySelector("#suggested-note"),
  breakdown: document.querySelector("#fee-breakdown"),
  currentProfit: document.querySelector("#current-profit"),
  rolledProfit: document.querySelector("#rolled-profit"),
  absorbedProfit: document.querySelector("#absorbed-profit"),
  copyButton: document.querySelector("#copy-summary"),
  copyStatus: document.querySelector("#copy-status"),
  sellerModeNote: document.querySelector("#seller-mode-note")
};

const MODE_COPY = {
  standard: {
    note: "Standard mode is for handmade, vintage, digital, stocked, or self-fulfilled products. POD-only costs are ignored in this mode.",
    productCost: "Your item cost per unit",
    productCostHint: "Use the material, purchase, or production cost you pay for each item.",
    shippingCost: "Shipping cost you pay"
  },
  pod: {
    note: "POD mode is for print-on-demand orders where a provider produces or fulfills the item. The extra POD cost field is included in profit.",
    productCost: "Print provider base cost",
    productCostHint: "Use the POD provider's base production charge for one item.",
    shippingCost: "Provider shipping charge"
  }
};

function moneyFormatter(rate) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: rate.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function percent(value) {
  return `${(value * 100).toFixed(value > 0 && value < 0.01 ? 2 : 1).replace(/\.0$/, "")}%`;
}

function value(id) {
  const number = Number(document.querySelector(`#${id}`).value);
  return Number.isFinite(number) ? number : 0;
}

function selectedOffsiteRate() {
  const enabled = document.querySelector("#offsite-enabled").checked;
  const selected = document.querySelector('input[name="offsite-rate"]:checked');
  return enabled && selected ? Number(selected.value) : 0;
}

function selectedSellerMode() {
  const selected = document.querySelector('input[name="seller-mode"]:checked');
  return selected ? selected.value : "standard";
}

function updateSellerModeUI() {
  const mode = selectedSellerMode();
  const copy = MODE_COPY[mode] || MODE_COPY.standard;
  document.body.dataset.sellerMode = mode;
  if (els.sellerModeNote) els.sellerModeNote.textContent = copy.note;
  document.querySelectorAll('[data-mode-label="product-cost"]').forEach((node) => {
    node.textContent = copy.productCost;
  });
  document.querySelectorAll('[data-mode-label="product-cost-hint"]').forEach((node) => {
    node.textContent = copy.productCostHint;
  });
  document.querySelectorAll('[data-mode-label="shipping-cost"]').forEach((node) => {
    node.textContent = copy.shippingCost;
  });
}

function getInputs(overrides = {}) {
  const sellerMode = selectedSellerMode();
  return normalizeInput({
    sellerMode,
    location: els.location.value || "us",
    itemPrice: value("price"),
    quantity: value("quantity"),
    shippingCharged: value("shipping-charged"),
    discount: value("discount"),
    productCost: value("product-cost"),
    shippingCost: value("shipping-cost"),
    podExtraCost: value("pod-extra-cost"),
    taxCollected: value("tax-collected"),
    etsyAds: value("etsy-ads"),
    offsiteRate: selectedOffsiteRate(),
    targetMargin: Number(els.targetMargin.value) / 100,
    ...overrides
  });
}

function updateLocationOptions() {
  els.location.innerHTML = Object.entries(rateData.rates)
    .map(([key, rate]) => `<option value="${key}">${rate.label} (${rate.currency})</option>`)
    .join("");
  els.location.value = "us";
}

function updateCurrencySymbols(rate) {
  document.querySelectorAll("[data-currency-symbol]").forEach((node) => {
    node.textContent = rate.symbol;
  });
}

function renderBreakdown(input, rate, result, formatMoney) {
  const mode = selectedSellerMode();
  const productCostLabel = mode === "pod" ? "Provider product cost" : "Product cost";
  const shippingCostLabel = mode === "pod" ? "Provider fulfillment shipping" : "Shipping cost";
  const offsiteLabel = input.offsiteRate ? `Offsite Ads (${percent(input.offsiteRate)})` : "Offsite Ads";
  const rows = [
    ["Listing fee", `${formatMoney.format(rate.listingFlat)} x ${input.quantity}`, result.listingFee],
    ["Transaction fee", `${percent(rate.transactionRate)} x order revenue`, result.transactionFee],
    ["Payment processing", `${percent(rate.processingRate)} x payment base + ${formatMoney.format(rate.processingFlat)}`, result.processingFee],
    [offsiteLabel, input.offsiteRate ? `${percent(input.offsiteRate)} x order revenue, capped at 100` : "Disabled", result.offsiteFee],
    ["Regulatory operating fee", rate.regulatoryRate ? `${percent(rate.regulatoryRate)} x order revenue` : "Not applied for this profile", result.regulatoryFee],
    [productCostLabel, `${formatMoney.format(input.productCost)} x ${input.quantity}`, result.productCosts],
    [shippingCostLabel, mode === "pod" ? "Provider fulfillment shipping cost" : "Seller-paid fulfillment cost", input.shippingCost],
    ...(mode === "pod" ? [["Extra POD cost", "Design, packaging, sample, or provider add-on cost", input.podExtraCost]] : []),
    ["Manual Etsy Ads", "Manual ad spend entered by seller", input.etsyAds]
  ];

  els.breakdown.innerHTML = rows.map(([name, formula, amount]) => `
    <tr>
      <td>${name}</td>
      <td>${formula}</td>
      <td>${formatMoney.format(amount)}</td>
    </tr>
  `).join("");
}

function render() {
  updateSellerModeUI();
  const input = getInputs();
  const rate = rateData.rates[input.location] || rateData.rates.us;
  const result = calculateOrder(input, rate);
  const target = solveItemPriceForMargin(input, rate);
  const formatMoney = moneyFormatter(rate);

  updateCurrencySymbols(rate);
  els.targetMarginOutput.textContent = `${Math.round(input.targetMargin * 100)}%`;
  els.rateSummary.textContent = `${rate.label}: listing approx. ${formatMoney.format(rate.listingFlat)}, transaction ${percent(rate.transactionRate)}, processing ${percent(rate.processingRate)} + ${formatMoney.format(rate.processingFlat)}. Rates updated ${rateData.updated}.`;

  els.netProfit.textContent = formatMoney.format(result.netProfit);
  els.profitMargin.textContent = percent(result.margin);
  els.totalFees.textContent = formatMoney.format(result.totalFees);
  els.totalCosts.textContent = formatMoney.format(result.totalCosts);
  els.orderRevenue.textContent = formatMoney.format(result.orderRevenue);
  els.profitHero.classList.toggle("loss", result.netProfit < 0);
  els.profitStatus.textContent = result.netProfit < 0 ? "This modeled order loses money." : result.margin < 0.2 ? "Profitable, but margin is thin." : "Healthy modeled profit.";

  if (target.possible) {
    els.suggestedPrice.textContent = formatMoney.format(target.price);
    els.suggestedNote.textContent = `Estimated item price to reach ${Math.round(input.targetMargin * 100)}% margin with the selected fee profile.`;
  } else {
    els.suggestedPrice.textContent = "Not feasible";
    els.suggestedNote.textContent = "The selected target margin is higher than the remaining revenue after variable fees.";
  }

  const rolledInput = getInputs({
    itemPrice: input.itemPrice + input.shippingCharged / input.quantity,
    shippingCharged: 0
  });
  const absorbedInput = getInputs({ shippingCharged: 0 });
  const rolled = calculateOrder(rolledInput, rate);
  const absorbed = calculateOrder(absorbedInput, rate);
  els.currentProfit.textContent = formatMoney.format(result.netProfit);
  els.rolledProfit.textContent = formatMoney.format(rolled.netProfit);
  els.absorbedProfit.textContent = formatMoney.format(absorbed.netProfit);

  renderBreakdown(input, rate, result, formatMoney);

  return { input, rate, result, target, formatMoney };
}

async function loadRates() {
  try {
    const response = await fetch("data/etsy-fee-rates.json", { cache: "no-store" });
    if (response.ok) {
      rateData = await response.json();
    }
  } catch {
    rateData = DEFAULT_RATE_DATA;
  }
  updateLocationOptions();
  render();
}

els.form.addEventListener("input", () => {
  render();
  els.copyStatus.textContent = "";
});

els.location.addEventListener("change", () => {
  render();
  els.copyStatus.textContent = "";
});

document.querySelectorAll('input[name="seller-mode"]').forEach((node) => {
  node.addEventListener("change", () => {
    render();
    els.copyStatus.textContent = "";
  });
});

els.copyButton.addEventListener("click", async () => {
  const { input, result, target, formatMoney } = render();
  const summary = [
    "Etsy fee calculation",
    `Order revenue: ${formatMoney.format(result.orderRevenue)}`,
    `Total Etsy fees: ${formatMoney.format(result.totalFees)}`,
    `Total costs: ${formatMoney.format(result.totalCosts)}`,
    input.sellerMode === "pod" ? `Extra POD cost: ${formatMoney.format(input.podExtraCost)}` : null,
    `Net profit: ${formatMoney.format(result.netProfit)}`,
    `Profit margin: ${percent(result.margin)}`,
    target.possible ? `Suggested item price for ${Math.round(input.targetMargin * 100)}% margin: ${formatMoney.format(target.price)}` : "Target margin: not feasible with current inputs"
  ].filter(Boolean).join("\n");

  try {
    await navigator.clipboard.writeText(summary);
    els.copyStatus.textContent = "Summary copied.";
  } catch {
    els.copyStatus.textContent = summary;
  }
});

loadRates();

window.MarginDeskCalculator = {
  calculateOrder,
  solveItemPriceForMargin,
  DEFAULT_RATE_DATA
};
