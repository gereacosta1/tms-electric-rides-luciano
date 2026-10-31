
(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const money = (value) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

  const escapeHTML = (value) => String(value ?? '').replace(
    /[&<>"']/g,
    (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[character]
  );

  /* PRODUCT DATA */

  const products = (
    Array.isArray(window.TMS_PRODUCTS) ? window.TMS_PRODUCTS : []
  )
    .filter((product) =>
      product &&
      product.id != null &&
      typeof product.name === 'string' &&
      Number.isFinite(Number(product.price)) &&
      Number(product.price) >= 0
    )
    .map((product) => ({
      ...product,
      id: String(product.id),
      category: String(product.category || 'Other'),
      price: Number(product.price),
    }));

  const productById = new Map(
    products.map((product) => [product.id, product])
  );

  const storageKey = 'tms-preview-cart';
  const MAX_QUANTITY = 50;

  let category = 'All';
  let query = '';
  let sort = 'featured';
  let cart = {};
  let toastTimer;
  let previouslyFocusedElement = null;
  let activeDialog = null;
  let svgCounter = 0;

  /* PRODUCT IMAGE FALLBACK */

  function speakerPlaceholder() {
    const id = `tms-speaker-${++svgCounter}`;

    return `
      <svg
        class="fallback-speaker"
        viewBox="0 0 400 300"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Illustrative product placeholder"
      >
        <defs>
          <linearGradient
            id="${id}-body"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop stop-color="#4a5b56"/>
            <stop offset=".5" stop-color="#17201e"/>
            <stop offset="1" stop-color="#3c4d48"/>
          </linearGradient>

          <pattern
            id="${id}-dots"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="5"
              cy="5"
              r="1.5"
              fill="#7e8f89"
              opacity=".55"
            />
          </pattern>
        </defs>

        <ellipse
          cx="200"
          cy="259"
          rx="140"
          ry="18"
          fill="#64766b"
          opacity=".2"
        />

        <rect
          x="42"
          y="80"
          rx="76"
          width="316"
          height="150"
          fill="#15221b"
        />

        <rect
          x="48"
          y="82"
          rx="71"
          width="302"
          height="144"
          fill="url(#${id}-body)"
        />

        <rect
          x="55"
          y="88"
          rx="68"
          width="288"
          height="132"
          fill="url(#${id}-dots)"
        />

        <circle
          cx="300"
          cy="154"
          r="58"
          fill="#1d2723"
          stroke="#758a7c"
          stroke-width="2"
        />

        <circle
          cx="300"
          cy="154"
          r="40"
          fill="#26372d"
        />

        <circle
          cx="300"
          cy="154"
          r="26"
          fill="#0f1711"
        />

        <path
          d="M103 156h10l10-20 12 40 15-28 11 8h8"
          stroke="#b3ff59"
          stroke-width="8"
          stroke-linecap="round"
          fill="none"
        />
      </svg>
    `;
  }

  function photoMarkup(product, alt = product.name) {
    if (!product.image || typeof product.image !== 'string') {
      return speakerPlaceholder();
    }

    return `
      <img
        class="product-photo"
        src="${escapeHTML(product.image)}"
        alt="${escapeHTML(alt)}"
        loading="lazy"
      />

      <div class="image-fallback" hidden>
        ${speakerPlaceholder()}
      </div>
    `;
  }

  /* IMAGE ERROR HANDLING */

  document.addEventListener('error', (event) => {
    const image = event.target;

    if (
      !(image instanceof HTMLImageElement) ||
      !image.classList.contains('product-photo')
    ) {
      return;
    }

    const fallback = image.nextElementSibling;

    if (
      !fallback ||
      !fallback.classList.contains('image-fallback')
    ) {
      return;
    }

    image.hidden = true;
    fallback.hidden = false;
  }, true);

  /* NOTIFICATIONS */

  function notify(message) {
    const toast = $('#toast');

    toast.textContent = message;
    toast.classList.add('visible');

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 2900);
  }

  /* PRODUCT CARDS */

  function cardMarkup(product) {
    return `
      <article class="product-card">

        <div class="product-art">

          <span class="product-tag">
            ${escapeHTML(product.tag || 'NEW ARRIVAL')}
          </span>

          ${photoMarkup(product)}

          <span class="fallback-sub">
            PRODUCT PHOTOS SUBJECT TO CONFIRMATION
          </span>

        </div>

        <div class="product-info">

          <div class="product-meta">
            ${escapeHTML(product.category)}
          </div>

          <h3 class="product-title">
            ${escapeHTML(product.name)}
          </h3>

          <div class="product-price">
            ${money(product.price)}
          </div>

          <div class="product-bottom">

            <button
              class="product-details"
              type="button"
              data-details="${escapeHTML(product.id)}"
            >
              VIEW DETAILS ↗
            </button>

            <button
              class="add-to-cart"
              type="button"
              data-add="${escapeHTML(product.id)}"
              aria-label="Add ${escapeHTML(product.name)} to cart"
            >
              +
            </button>

          </div>

        </div>

      </article>
    `;
  }

  /* PRODUCT SEARCH */

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function visibleProducts() {
    const search = normalize(query);

    const visible = products.filter((product) => {
      if (
        category !== 'All' &&
        product.category !== category
      ) {
        return false;
      }

      const content = normalize([
        product.name,
        product.category,
        product.description || '',
      ].join(' '));

      return content.includes(search);
    });

    switch (sort) {
      case 'priceAsc':
        visible.sort((a, b) => a.price - b.price);
        break;

      case 'priceDesc':
        visible.sort((a, b) => b.price - a.price);
        break;

      case 'name':
        visible.sort((a, b) => a.name.localeCompare(b.name));
        break;

      default:
        break;
    }

    return visible;
  }

  /* RENDER PRODUCTS */

  function renderProducts() {
    const visible = visibleProducts();

    $('#product-grid').innerHTML = visible
      .map(cardMarkup)
      .join('');

    $('#results-count').textContent =
      `${visible.length} ${
        visible.length === 1 ? 'product' : 'products'
      }`;

    $('#empty-results').hidden = visible.length !== 0;

    $$('.filter').forEach((button) => {
      const active = button.dataset.filter === category;

      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function setCategory(nextCategory) {
    category = nextCategory;
    renderProducts();
  }

  /* CART STORAGE */

  function restoreCart() {
    try {
      const stored = JSON.parse(
        localStorage.getItem(storageKey) || '{}'
      );

      if (
        !stored ||
        typeof stored !== 'object' ||
        Array.isArray(stored)
      ) {
        return;
      }

      for (const [id, amount] of Object.entries(stored)) {
        if (
          productById.has(id) &&
          Number.isInteger(amount) &&
          amount > 0 &&
          amount <= MAX_QUANTITY
        ) {
          cart[id] = amount;
        }
      }
    } catch (_) {
      cart = {};
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(cart)
      );
    } catch (_) {
      // Storage may be unavailable in private browsing.
    }
  }

  function countItems() {
    return Object.values(cart).reduce(
      (sum, count) => sum + count,
      0
    );
  }

  /* UPDATE SHOPPING CART */

  function updateCart() {
    const count = countItems();

    $('#cart-count').textContent = String(count);
    $('#cart-header-count').textContent = `(${count})`;

    const entries = Object.entries(cart)
      .filter(([id, quantity]) =>
        productById.has(id) && quantity > 0
      );

    $('#cart-items').innerHTML = entries.length
      ? entries.map(([id, quantity]) => {
          const product = productById.get(id);

          return `
            <div class="cart-item">

              <div
                class="cart-item-thumb"
                aria-hidden="true"
              >
                ${photoMarkup(product, '')}
              </div>

              <div class="cart-item-content">

                <h3>
                  ${escapeHTML(product.name)}
                </h3>

                <div class="cart-item-price">
                  ${money(product.price)}
                </div>

                <div class="cart-item-controls">

                  <button
                    class="qty-btn"
                    type="button"
                    data-qty="${escapeHTML(id)}"
                    data-delta="-1"
                    aria-label="Remove one ${escapeHTML(product.name)}"
                  >
                    −
                  </button>

                  <span class="qty-count">
                    ${quantity}
                  </span>

                  <button
                    class="qty-btn"
                    type="button"
                    data-qty="${escapeHTML(id)}"
                    data-delta="1"
                    aria-label="Add one ${escapeHTML(product.name)}"
                  >
                    +
                  </button>

                  <button
                    class="remove-btn"
                    type="button"
                    data-remove="${escapeHTML(id)}"
                    aria-label="Remove ${escapeHTML(product.name)} from cart"
                  >
                    Remove
                  </button>

                </div>

              </div>

            </div>
          `;
        }).join('')
      : `
        <div class="cart-empty">
          <div>↯</div>

          <h3>Your cart is empty</h3>

          <p>
            Add an item from the collection to get started.
          </p>
        </div>
      `;

    const subtotal = entries.reduce(
      (sum, [id, quantity]) =>
        sum + productById.get(id).price * quantity,
      0
    );

    $('#cart-subtotal').textContent = money(subtotal);

    saveCart();
  }

  /* ADD PRODUCT */

  function addItem(id) {
    const product = productById.get(String(id));

    if (!product) return;

    const quantity = cart[product.id] || 0;

    if (quantity >= MAX_QUANTITY) {
      notify('Quantity limit reached for this preview');
      return;
    }

    cart[product.id] = quantity + 1;

    updateCart();
    notify(`${product.name} added to cart`);
  }

  /* CHANGE QUANTITY */

  function changeQuantity(id, delta) {
    if (
      !productById.has(id) ||
      !Number.isInteger(delta)
    ) {
      return;
    }

    const next = Math.max(
      0,
      Math.min(
        MAX_QUANTITY,
        (cart[id] || 0) + delta
      )
    );

    if (next === 0) {
      delete cart[id];
    } else {
      cart[id] = next;
    }

    updateCart();
  }

  /* MODAL MANAGEMENT */

  function openDialog(dialog) {
    if (activeDialog) {
      closeDialog();
    }

    previouslyFocusedElement = document.activeElement;
    activeDialog = dialog;

    $('#overlay').hidden = false;
    document.body.classList.add('modal-open');

    dialog.classList.add('open');
    dialog.setAttribute('aria-hidden', 'false');

    const firstButton = dialog.querySelector(
      'button:not([disabled])'
    );

    if (firstButton) {
      firstButton.focus();
    }
  }

  function closeDialog() {
    if (!activeDialog) return;

    $('#overlay').hidden = true;

    document.body.classList.remove('modal-open');

    activeDialog.classList.remove('open');
    activeDialog.setAttribute('aria-hidden', 'true');

    activeDialog = null;

    const restoreFocus = previouslyFocusedElement;
    previouslyFocusedElement = null;

    if (
      restoreFocus &&
      restoreFocus.isConnected &&
      typeof restoreFocus.focus === 'function'
    ) {
      restoreFocus.focus();
    }
  }

  /* PRODUCT DETAILS */

  function showProduct(id) {
    const product = productById.get(String(id));

    if (!product) return;

    const features = Array.isArray(product.features)
      ? product.features
      : [];

    $('#modal-body').innerHTML = `
      <div class="modal-layout">

        <div class="modal-art">
          ${photoMarkup(product)}
        </div>

        <div class="modal-content">

          <div class="product-meta">
            ${escapeHTML(product.category)} / COLLECTION
          </div>

          <h2>
            ${escapeHTML(product.name)}
          </h2>

          <span class="price">
            ${money(product.price)}
          </span>

          <p>
            ${escapeHTML(product.description || '')}
          </p>

          ${
            features.length
              ? `
                <ul class="feature-list">
                  ${features.map((feature) => `
                    <li>${escapeHTML(feature)}</li>
                  `).join('')}
                </ul>
              `
              : ''
          }

          <button
            type="button"
            class="modal-add"
            data-add="${escapeHTML(product.id)}"
          >
            ADD TO CART ↗
          </button>

        </div>

      </div>
    `;

    openDialog($('#product-modal'));
  }

  /* MOBILE MENU */

  const nav = $('#main-nav');
  const menuToggle = $('#menu-toggle');

  function closeMenu() {
    nav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }

  /* DELEGATED BUTTON EVENTS */

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const filter = event.target.closest('[data-filter]');

    if (filter) {
      setCategory(filter.dataset.filter);
      return;
    }

    const categoryCard = event.target.closest(
      '[data-category]'
    );

    if (categoryCard) {
      setCategory(categoryCard.dataset.category);

      $('#collection').scrollIntoView({
        behavior: 'smooth',
      });

      return;
    }

    const add = event.target.closest('[data-add]');

    if (add) {
      addItem(add.dataset.add);
      return;
    }

    const details = event.target.closest(
      '[data-details]'
    );

    if (details) {
      showProduct(details.dataset.details);
      return;
    }

    const qty = event.target.closest('[data-qty]');

    if (qty) {
      changeQuantity(
        qty.dataset.qty,
        Number(qty.dataset.delta)
      );
      return;
    }

    const remove = event.target.closest(
      '[data-remove]'
    );

    if (remove) {
      delete cart[remove.dataset.remove];
      updateCart();
      return;
    }

    if (
      nav.classList.contains('open') &&
      !event.target.closest('.header')
    ) {
      closeMenu();
    }
  });

  /* SEARCH INPUT */

  $('#product-search').addEventListener(
    'input',
    (event) => {
      query = event.target.value;
      renderProducts();
    }
  );

  /* SORT SELECT */

  $('#sort-products').addEventListener(
    'change',
    (event) => {
      sort = event.target.value;
      renderProducts();
    }
  );

  /* HEADER SEARCH BUTTON */

  $('#search-button').addEventListener(
    'click',
    () => {
      $('#collection').scrollIntoView({
        behavior: 'smooth',
      });

      $('#product-search').focus({
        preventScroll: true,
      });
    }
  );

  /* RESET FILTERS */

  $('#reset-filters').addEventListener(
    'click',
    () => {
      category = 'All';
      query = '';
      sort = 'featured';

      $('#product-search').value = '';
      $('#sort-products').value = 'featured';

      renderProducts();
    }
  );

  /* CART EVENTS */

  $('#open-cart').addEventListener(
    'click',
    () => openDialog($('#cart-panel'))
  );

  $('#close-cart').addEventListener(
    'click',
    closeDialog
  );

  $('#continue-shopping').addEventListener(
    'click',
    closeDialog
  );

  /* PRODUCT MODAL EVENTS */

  $('#close-product').addEventListener(
    'click',
    closeDialog
  );

  $('#overlay').addEventListener(
    'click',
    closeDialog
  );

  /* CHECKOUT PREVIEW */

  // Checkout remains disabled until Stripe is configured.

  $('#checkout-demo').addEventListener(
    'click',
    () => {
      notify('Checkout is not available in this preview.');
    }
  );

  /* MOBILE MENU EVENTS */

  menuToggle.addEventListener('click', () => {
    const expanded = nav.classList.toggle('open');

    menuToggle.setAttribute(
      'aria-expanded',
      String(expanded)
    );
  });

  $$('#main-nav a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  /* KEYBOARD ACCESSIBILITY */

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (activeDialog) {
        event.preventDefault();
        closeDialog();
      } else {
        closeMenu();
      }

      return;
    }

    if (
      event.key !== 'Tab' ||
      !activeDialog
    ) {
      return;
    }

    const focusables = Array.from(
      activeDialog.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])'
      )
    ).filter(
      (element) => element.getClientRects().length > 0
    );

    if (!focusables.length) {
      event.preventDefault();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (
      event.shiftKey &&
      document.activeElement === first
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      document.activeElement === last
    ) {
      event.preventDefault();
      first.focus();
    }
  });

  /* INITIALIZATION */

  $('#year').textContent = String(
    new Date().getFullYear()
  );

  restoreCart();
  renderProducts();
  updateCart();

})();
