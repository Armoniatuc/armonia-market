// ============ Armonía Market — lógica de la tienda ============
(function () {
  "use strict";

  /* ---------------- Datos de productos ----------------
     El catálogo vive en content/products.json y se edita desde
     el panel /admin (sin tocar este archivo). */
  let PRODUCTS = [];

  async function loadProducts() {
    try {
      const res = await fetch("content/products.json", { cache: "no-cache" });
      const data = await res.json();
      PRODUCTS = (data.products || []).map((p, i) => ({
        ...p,
        id: p.id && String(p.id).trim() ? p.id : `item-${i}`,
      }));
    } catch (e) {
      console.error("No se pudo cargar el catálogo de productos", e);
      PRODUCTS = [];
    }
  }

  const SUB_ORDER = {
    alimentos: [
      "Comidas Preparadas",
      "Tés e Infusiones",
      "Secos y Semillas",
      "Aceites y Untables",
      "Líquidos y Bebidas",
      "Snacks y Dulces",
      "Despensa",
    ],
    suplementos: [
      "Energía y Vitalidad",
      "Salud Mental y Memoria",
      "Control de Peso",
      "Articulaciones y Movilidad",
      "Antioxidantes y Anti-age",
      "Defensas e Inmunidad",
      "Digestivo y Antiinflamatorio",
      "Rendimiento Deportivo",
      "Huesos y Sistema Cardiovascular",
      "Belleza y Piel",
    ],
  };

  const WHATSAPP_NUMBER = "5493816071455";
  const CART_KEY = "armonia_cart";
  const currencyFmt = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

  /* ---------------- Estado del carrito ---------------- */
  let cart = loadCart();

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  /* ---------------- Render de productos ---------------- */
  const productGrid = document.getElementById("productGrid");
  const tabs = document.querySelectorAll(".tab");
  const subtabsRow = document.getElementById("subtabsRow");
  const searchInput = document.getElementById("productSearch");
  let activeCategory = "alimentos";
  let activeSub = "todos";
  let searchQuery = "";

  function renderSubtabs() {
    const present = new Set(
      PRODUCTS.filter((p) => p.category === activeCategory).map((p) => p.sub)
    );
    const order = SUB_ORDER[activeCategory] || [];
    const subs = order.filter((s) => present.has(s));

    if (activeSub !== "todos" && !subs.includes(activeSub)) {
      activeSub = "todos";
    }

    subtabsRow.innerHTML = "";
    if (!subs.length) return;

    const allBtn = document.createElement("button");
    allBtn.className = "subtab" + (activeSub === "todos" ? " active" : "");
    allBtn.type = "button";
    allBtn.dataset.sub = "todos";
    allBtn.textContent = "Todos";
    subtabsRow.appendChild(allBtn);

    subs.forEach((sub) => {
      const btn = document.createElement("button");
      btn.className = "subtab" + (activeSub === sub ? " active" : "");
      btn.type = "button";
      btn.dataset.sub = sub;
      btn.textContent = sub;
      subtabsRow.appendChild(btn);
    });
  }

  function getFilteredProducts() {
    let items = PRODUCTS.filter((p) => p.category === activeCategory);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)
      );
    } else if (activeSub !== "todos") {
      items = items.filter((p) => p.sub === activeSub);
    }
    return items;
  }

  function renderProducts() {
    const items = getFilteredProducts();
    productGrid.innerHTML = "";

    if (!items.length) {
      const q = searchQuery.trim();
      productGrid.innerHTML = q
        ? `<p class="empty-state">No encontramos productos que coincidan con "${q}".</p>`
        : '<p class="empty-state">Pronto vamos a sumar productos en esta categoría.</p>';
      return;
    }

    items.forEach((p) => {
      const card = document.createElement("article");
      card.className = "product-card";
      card.innerHTML = `
        <div class="product-media">
          <img src="${p.img}" alt="${p.name}" loading="lazy">
        </div>
        <div class="product-body">
          <span class="product-tag">${p.category === "alimentos" ? "Alimento" : "Suplemento"}</span>
          <h3 class="product-name">${p.name}</h3>
          <p class="product-desc">${p.desc}</p>
          <div class="product-footer">
            <span class="product-price">${p.price == null ? "Precio a confirmar" : currencyFmt.format(p.price)}</span>
            ${
              p.price == null
                ? `<button class="add-btn" disabled title="Precio a confirmar">+</button>`
                : `<button class="add-btn" data-id="${p.id}" aria-label="Agregar ${p.name} al carrito">+</button>`
            }
          </div>
        </div>
      `;
      productGrid.appendChild(card);
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      activeCategory = tab.dataset.category;
      activeSub = "todos";
      searchQuery = "";
      searchInput.value = "";
      renderSubtabs();
      renderProducts();
    });
  });

  subtabsRow.addEventListener("click", (e) => {
    const btn = e.target.closest(".subtab");
    if (!btn) return;
    activeSub = btn.dataset.sub;
    subtabsRow
      .querySelectorAll(".subtab")
      .forEach((b) => b.classList.toggle("active", b === btn));
    renderProducts();
  });

  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderProducts();
  });

  productGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-btn");
    if (!btn) return;
    addToCart(btn.dataset.id);
  });

  /* ---------------- Lógica del carrito ---------------- */
  function addToCart(id) {
    cart[id] = (cart[id] || 0) + 1;
    saveCart();
    renderCart();
    showToast("Producto agregado al carrito");
    openCart();
  }

  function changeQty(id, delta) {
    if (!cart[id]) return;
    cart[id] += delta;
    if (cart[id] <= 0) delete cart[id];
    saveCart();
    renderCart();
  }

  function removeFromCart(id) {
    delete cart[id];
    saveCart();
    renderCart();
  }

  function cartCount() {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  }
  function cartSubtotal() {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const product = PRODUCTS.find((p) => p.id === id);
      return product ? sum + product.price * qty : sum;
    }, 0);
  }

  const cartItemsEl = document.getElementById("cartItems");
  const cartCountEl = document.getElementById("cartCount");
  const cartSubtotalEl = document.getElementById("cartSubtotal");

  function renderCart() {
    const entries = Object.entries(cart);
    cartCountEl.textContent = cartCount();
    cartSubtotalEl.textContent = currencyFmt.format(cartSubtotal());

    if (!entries.length) {
      cartItemsEl.innerHTML =
        '<p class="cart-empty">Tu carrito está vacío. ¡Sumá algún producto!</p>';
      return;
    }

    cartItemsEl.innerHTML = "";
    entries.forEach(([id, qty]) => {
      const product = PRODUCTS.find((p) => p.id === id);
      if (!product) return;
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <img src="${product.img}" alt="${product.name}">
        <div>
          <div class="cart-item-name">${product.name}</div>
          <div class="cart-item-price">${currencyFmt.format(product.price)}</div>
          <div class="cart-qty">
            <button data-action="dec" data-id="${id}" aria-label="Restar unidad">−</button>
            <span>${qty}</span>
            <button data-action="inc" data-id="${id}" aria-label="Sumar unidad">+</button>
          </div>
        </div>
        <button class="cart-remove" data-action="remove" data-id="${id}">Quitar</button>
      `;
      cartItemsEl.appendChild(row);
    });
  }

  cartItemsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === "inc") changeQty(id, 1);
    if (action === "dec") changeQty(id, -1);
    if (action === "remove") removeFromCart(id);
  });

  /* ---------------- Drawer del carrito ---------------- */
  const cartDrawer = document.getElementById("cartDrawer");
  const cartOverlay = document.getElementById("cartOverlay");
  const cartToggle = document.getElementById("cartToggle");
  const cartClose = document.getElementById("cartClose");

  function openCart() {
    cartDrawer.classList.add("open");
    cartOverlay.classList.add("open");
    cartDrawer.setAttribute("aria-hidden", "false");
  }
  function closeCart() {
    cartDrawer.classList.remove("open");
    cartOverlay.classList.remove("open");
    cartDrawer.setAttribute("aria-hidden", "true");
  }
  cartToggle.addEventListener("click", () =>
    cartDrawer.classList.contains("open") ? closeCart() : openCart()
  );
  cartClose.addEventListener("click", closeCart);
  cartOverlay.addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCart();
  });

  /* ---------------- Checkout vía WhatsApp ---------------- */
  document.getElementById("checkoutBtn").addEventListener("click", () => {
    const entries = Object.entries(cart);
    if (!entries.length) {
      showToast("Agregá productos antes de finalizar la compra");
      return;
    }
    const lines = entries.map(([id, qty]) => {
      const product = PRODUCTS.find((p) => p.id === id);
      return `• ${qty}x ${product.name} — ${currencyFmt.format(product.price * qty)}`;
    });
    const message =
      "¡Hola Armonía Market! Quiero hacer este pedido:\n\n" +
      lines.join("\n") +
      `\n\nSubtotal: ${currencyFmt.format(cartSubtotal())}`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener");
  });

  /* ---------------- Toast ---------------- */
  let toastTimer;
  function showToast(text) {
    const toast = document.getElementById("toast");
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  /* ---------------- Menú móvil ---------------- */
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");
  navToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("open");
    navToggle.classList.toggle("open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
  mainNav.querySelectorAll("a").forEach((link) =>
    link.addEventListener("click", () => {
      mainNav.classList.remove("open");
      navToggle.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    })
  );

  /* ---------------- Carrusel del hero ---------------- */
  const track = document.getElementById("carouselTrack");
  const slides = Array.from(track.children);
  const dotsWrap = document.getElementById("carouselDots");
  const prevBtn = document.getElementById("carouselPrev");
  const nextBtn = document.getElementById("carouselNext");
  let current = 0;
  let autoplayTimer;

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.setAttribute("aria-label", `Ir a la imagen ${i + 1}`);
    if (i === 0) dot.classList.add("active");
    dot.addEventListener("click", () => goTo(i));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function goTo(index) {
    current = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle("active", i === current));
  }
  function next() {
    goTo(current + 1);
  }
  function prev() {
    goTo(current - 1);
  }
  function startAutoplay() {
    autoplayTimer = setInterval(next, 4500);
  }
  function stopAutoplay() {
    clearInterval(autoplayTimer);
  }

  nextBtn.addEventListener("click", () => {
    next();
    stopAutoplay();
    startAutoplay();
  });
  prevBtn.addEventListener("click", () => {
    prev();
    stopAutoplay();
    startAutoplay();
  });

  const carouselEl = document.getElementById("heroCarousel");
  carouselEl.addEventListener("mouseenter", stopAutoplay);
  carouselEl.addEventListener("mouseleave", startAutoplay);

  // Soporte táctil básico (swipe)
  let touchStartX = 0;
  track.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX;
      stopAutoplay();
    },
    { passive: true }
  );
  track.addEventListener(
    "touchend",
    (e) => {
      const delta = e.changedTouches[0].clientX - touchStartX;
      if (delta > 40) prev();
      else if (delta < -40) next();
      startAutoplay();
    },
    { passive: true }
  );

  /* ---------------- Init ---------------- */
  (async function init() {
    await loadProducts();

    const requestedTab = new URLSearchParams(location.search).get("tab");
    if (requestedTab && PRODUCTS.some((p) => p.category === requestedTab)) {
      activeCategory = requestedTab;
      tabs.forEach((t) => {
        const isMatch = t.dataset.category === requestedTab;
        t.classList.toggle("active", isMatch);
        t.setAttribute("aria-selected", String(isMatch));
      });
    }
    renderSubtabs();
    renderProducts();
    renderCart();
  })();

  goTo(0);
  startAutoplay();
})();
