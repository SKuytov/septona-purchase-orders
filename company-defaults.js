"use strict";
// Company defaults supplied by the user. This file is public; do not add secrets.
(() => {
  const companyDefaults = Object.freeze({
    buyer: "Septona Bulgaria JSC",
    buyerAddress: "7005 Ruse, Bulgaria\nblvd. Lipnik 155",
    vatId: "BG131253497",
    contact: "Salim Kuytov",
    email: "skuitov@septona-bg.com",
    phone: "+359893036453",
    shipTo: "Septona Bulgaria JSC\n7005 Ruse, Bulgaria\nblvd. Lipnik 155",
    approver: "Salim Kuytov",
    language: "en",
    currency: "EUR",
    payment: "within 14 days net",
    incoterm: "DAP / Delivered at Place Ruse"
  });
  function applyCompanyDefaults() {
    Object.assign(state, companyDefaults);
    hydrate();
  }
  // app.js is a classic deferred script loaded before this one.
  // Its global lexical state and functions are shared with this script.
  applyCompanyDefaults();
  // Preserve the existing confirmation and detect whether a reset occurred.
  // Cancelling leaves the entire current order untouched.
  for (const selector of ["#new", "#example"]) {
    const button = document.querySelector(selector);
    if (!button || typeof button.onclick !== "function") continue;
    const originalHandler = button.onclick;
    button.onclick = function (event) {
      const previousState = state;
      const result = originalHandler.call(this, event);
      if (state !== previousState) applyCompanyDefaults();
      return result;
    };
  }
  // Deliberately do not intercept imports or overwrite imported draft values.
})();
