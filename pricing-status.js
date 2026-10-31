
/**
 * TMS ELECTRIC RIDES
 * Product Pricing Verification
 *
 * Controls which products have confirmed prices.
 *
 * Frontend preview only.
 * Production checkout must verify product IDs,
 * prices and availability on a trusted server.
 */

(() => {
  "use strict";

  /* PRODUCT DATA */

  const products = Array.isArray(window.TMS_PRODUCTS)
    ? window.TMS_PRODUCTS
    : [];

  const productById = new Map(
    products.map((product) => [
      String(product.id),
      product,
    ])
  );

  /*
   * VERIFIED PRICES
   *
   * Add IDs only after Luciano confirms
   * their actual selling prices.
   */

  const verifiedPrices = new Set([
    "jbl-flip-6",
    "jbl-charge-3",
  ]);

  /* DOM ELEMENTS */

  const productGrid = document.querySelector(
    "#product-grid"
  );

  const modalBody = document.querySelector(
    "#modal-body"
  );

  const cartItems = document.querySelector(
    "#cart-items"
  );

  const sortSelect = document.querySelector(
    "#sort-products"
  );

  const resultsNote = document.querySelector(
    ".results-note"
  );

  if (!productGrid || !modalBody || !cartItems) {
    console.warn(
      "Pricing verification: storefront elements not found."
    );

    return;
  }

  /* HELPERS */

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  function isVerified(id) {
    return verifiedPrices.has(String(id));
  }

  function verifiedPrice(id) {
    const product = productById.get(String(id));

    if (
      !product ||
      !Number.isFinite(Number(product.price))
    ) {
      return null;
    }

    return money.format(Number(product.price));
  }

  /* PRODUCT CARDS */

  function updateProductCards() {
    const cards = productGrid.querySelectorAll(
      ".product-card"
    );

    cards.forEach((card) => {
      const addButton = card.querySelector(
        "[data-add]"
      );

      if (!addButton) return;

      const id = addButton.dataset.add;

      const priceElement = card.querySelector(
        ".product-price"
      );

      /*
       * Remove duplicated labels created
       * by the previous version.
       */

      card.querySelectorAll(
        ".pricing-pending-label"
      ).forEach((label) => {
        label.remove();
      });

      /* VERIFIED PRODUCT */

      if (isVerified(id)) {
        card.classList.remove("price-unverified");

        addButton.disabled = false;
        addButton.hidden = false;

        addButton.classList.remove(
          "price-review-disabled"
        );

        addButton.removeAttribute("title");

        const confirmedPrice = verifiedPrice(id);

        if (priceElement && confirmedPrice) {
          priceElement.textContent = confirmedPrice;
        }

        return;
      }

      /* UNVERIFIED PRODUCT */

      card.classList.add("price-unverified");

      if (priceElement) {
        priceElement.textContent = "Price to confirm";
      }

      /*
       * Hide purchase button rather than
       * showing a misleading minus icon.
       */

      addButton.disabled = true;
      addButton.hidden = true;

      addButton.classList.add(
        "price-review-disabled"
      );
    });
  }

  /* PRODUCT DETAILS MODAL */

  function updateProductModal() {
    const addButton = modalBody.querySelector(
      ".modal-add[data-add]"
    );

    if (!addButton) return;

    const id = addButton.dataset.add;

    const priceElement = modalBody.querySelector(
      ".price"
    );

    const modalContent = modalBody.querySelector(
      ".modal-content"
    );

    const existingNotice = modalBody.querySelector(
      ".pricing-modal-notice"
    );

    /* VERIFIED PRODUCT */

    if (isVerified(id)) {
      addButton.disabled = false;
      addButton.hidden = false;

      addButton.classList.remove(
        "price-review-disabled"
      );

      if (existingNotice) {
        existingNotice.remove();
      }

      const confirmedPrice = verifiedPrice(id);

      if (priceElement && confirmedPrice) {
        priceElement.textContent = confirmedPrice;
      }

      return;
    }

    /* UNVERIFIED PRODUCT */

    if (priceElement) {
      priceElement.textContent = "Price to confirm";
    }

    addButton.disabled = true;
    addButton.hidden = true;

    addButton.classList.add(
      "price-review-disabled"
    );

    /*
     * Show one explanation without repeating
     * the price status multiple times.
     */

    if (modalContent && !existingNotice) {
      const notice = document.createElement("p");

      notice.className = "pricing-modal-notice";

      notice.textContent =
        "Ordering is unavailable until the store " +
        "confirms the final price and stock.";

      addButton.before(notice);
    }
  }

  /* ADD-TO-CART PROTECTION */

  /*
   * app.js processes cart clicks during bubbling.
   *
   * Capture clicks first to prevent unverified
   * items from reaching the existing handler.
   */

  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const addButton = event.target.closest(
        "[data-add]"
      );

      if (!addButton) return;

      const id = addButton.dataset.add;

      if (isVerified(id)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true
  );

  /* REMOVE OLD UNVERIFIED CART ITEMS */

  /*
   * Use the existing removal buttons rather
   * than editing localStorage directly.
   *
   * This keeps app.js state, subtotals,
   * quantities and storage synchronized.
   */

  function cleanExistingCart() {
    const removeButtons = Array.from(
      cartItems.querySelectorAll("[data-remove]")
    );

    const unverifiedIds = removeButtons
      .map((button) => button.dataset.remove)
      .filter((id) => !isVerified(id));

    for (const id of new Set(unverifiedIds)) {
      const currentButton = Array.from(
        cartItems.querySelectorAll("[data-remove]")
      ).find(
        (button) => button.dataset.remove === id
      );

      if (currentButton) {
        currentButton.click();
      }
    }
  }

  /* PRODUCT SORTING */

  /*
   * Sorting all products by price is disabled
   * until their prices are confirmed.
   */

  function updateSorting() {
    if (!sortSelect) return;

    const hasUnverified = products.some(
      (product) => !isVerified(product.id)
    );

    const optionLabels = {
      priceAsc: "Price: low to high",
      priceDesc: "Price: high to low",
    };

    for (const [value, label] of Object.entries(
      optionLabels
    )) {
      const option = Array.from(
        sortSelect.options
      ).find(
        (item) => item.value === value
      );

      if (!option) continue;

      option.disabled = hasUnverified;

      option.textContent = hasUnverified
        ? `${label} (unavailable)`
        : label;
    }

    if (
      hasUnverified &&
      ["priceAsc", "priceDesc"].includes(
        sortSelect.value
      )
    ) {
      sortSelect.value = "featured";

      sortSelect.dispatchEvent(
        new Event("change", {
          bubbles: true,
        })
      );
    }
  }

  /* CATALOG NOTICE */

  function updateCatalogNotice() {
    if (!resultsNote) return;

    const pendingCount = products.filter(
      (product) => !isVerified(product.id)
    ).length;

    resultsNote.textContent = pendingCount > 0
      ? `${pendingCount} PRICES PENDING CONFIRMATION`
      : "ALL PRODUCT PRICES VERIFIED";
  }

  /* DYNAMIC PRODUCT UPDATES */

  /*
   * app.js replaces product cards during
   * search, sorting and filtering.
   *
   * Observe direct child changes to reapply
   * price verification after each render.
   */

  const productObserver = new MutationObserver(
    updateProductCards
  );

  productObserver.observe(productGrid, {
    childList: true,
  });

  /* DYNAMIC MODAL UPDATES */

  const modalObserver = new MutationObserver(
    updateProductModal
  );

  modalObserver.observe(modalBody, {
    childList: true,
  });

  /* CART UPDATES */

  /*
   * Recheck the cart whenever app.js
   * renders its contents.
   */

  const cartObserver = new MutationObserver(
    cleanExistingCart
  );

  cartObserver.observe(cartItems, {
    childList: true,
  });

  /* INITIALIZATION */

  updateProductCards();
  updateProductModal();
  cleanExistingCart();
  updateSorting();
  updateCatalogNotice();

})();
