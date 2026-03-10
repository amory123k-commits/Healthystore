// =========================================================
// Healthy Store - UI Logic
// البيانات في `data.js` داخل `window.HS_DATA`
// =========================================================

const HS = window.HS_DATA || { categories: [], products: [] };
const CATEGORIES = HS.categories || [];
const PRODUCTS = HS.products || [];

// ================================
// DOM
// ================================
const productsGrid = document.getElementById("productsGrid");
const categoryButtonsContainer = document.getElementById("categoryButtons");
const cartSidebar = document.getElementById("cartSidebar");
const cartToggleBtn = document.getElementById("cartToggleBtn");
const cartCloseBtn = document.getElementById("cartCloseBtn");
const cartOverlay = document.getElementById("cartOverlay");
const cartItemsContainer = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");
const cartCountEl = document.getElementById("cartCount");
const whatsappBtn = document.getElementById("whatsappBtn");
const searchInput = document.getElementById("searchInput");
const customerNameInput = document.getElementById("customerName");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const productsSection = document.getElementById("products");

// ================================
// State
// ================================
let currentCategory = "all";
let currentSearchTerm = "";
const cart = {}; // productId -> { ...product, quantity }
let revealObserver = null;

// ================================
// Init
// ================================
function init() {
  renderCategories();
  renderProducts();
  setupCart();
  setupSearch();
  setupThemeToggle();
  setupRevealOnScroll();
  updateCartUI();
  updateWhatsappLink();
}

document.addEventListener("DOMContentLoaded", init);

// ================================
// Categories
// ================================
function renderCategories() {
  categoryButtonsContainer.innerHTML = "";

  const allBtn = createCategoryButton("الكل", "all", true);
  categoryButtonsContainer.appendChild(allBtn);

  CATEGORIES.forEach((c) => {
    categoryButtonsContainer.appendChild(createCategoryButton(c.label, c.value));
  });
}

function createCategoryButton(label, value, active = false) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "category-btn";
  btn.dataset.value = value;
  btn.innerHTML = `<span class="category-dot"></span>${label}`;
  if (active) btn.classList.add("active");

  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".category-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    currentCategory = value;
    renderProducts();

    if (productsSection) {
      productsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  return btn;
}

// ================================
// Products render (Category + Search)
// ================================
function renderProducts() {
  productsGrid.innerHTML = "";

  const term = currentSearchTerm.trim().toLowerCase();

  const getPrimaryImage = (product) => {
    if (Array.isArray(product.images) && product.images.length) {
      return product.images.find(Boolean) || null;
    }
    return product.image || null;
  };

  const filtered = PRODUCTS.filter((p) => {
    const matchesCategory = currentCategory === "all" || p.category === currentCategory;
    if (!matchesCategory) return false;

    if (!term) return true;
    const inName = p.name.toLowerCase().includes(term);
    const inCategory = p.category.toLowerCase().includes(term);
    const inTags = (p.tags || []).some((t) => String(t).toLowerCase().includes(term));
    return inName || inCategory || inTags;
  });

  if (!filtered.length) {
    productsGrid.innerHTML =
      '<p style="grid-column:1/-1;text-align:center;color:rgba(248,250,252,0.75);">لا توجد منتجات مطابقة حالياً.</p>';
    return;
  }

  filtered.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card reveal-on-scroll";
    card.dataset.id = String(product.id);
    card.tabIndex = 0;

    const tagsHtml =
      product.tags && product.tags.length
        ? `<div class="product-tags">
            ${product.tags
              .map((tag) => `<span class="product-tag-pill">${String(tag).trim()}</span>`)
              .join("")}
          </div>`
        : "";

    const primaryImage = getPrimaryImage(product);
    const imageHtml = primaryImage
      ? `<div class="product-image-wrapper">
          <img src="${primaryImage}" alt="${product.name}" loading="lazy" />
        </div>`
      : `<div class="product-image-wrapper product-image-fallback" aria-label="${product.name}">
          <i class="fa-solid fa-star"></i>
        </div>`;

    card.innerHTML = `
      <span class="product-badge">${product.category}</span>
      <h4 class="product-name">${product.name}</h4>
      ${imageHtml}
      ${tagsHtml}
      <div class="product-footer">
        <div class="product-price">
          <div class="product-price-main">
            <span>${product.price}</span>
            <span>${product.currency}</span>
          </div>
        </div>
        <button class="product-add-btn" type="button">
          <i class="fa-solid fa-plus"></i>
          أضف للسلة
        </button>
      </div>
    `;

    // الانتقال لصفحة تفاصيل المنتج
    const goToProduct = () => {
      window.location.href = `product.html?id=${encodeURIComponent(
        String(product.id)
      )}`;
    };

    card.addEventListener("click", goToProduct);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goToProduct();
      }
    });

    card.querySelector(".product-add-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      addToCart(product.id);
    });

    productsGrid.appendChild(card);
  });

  observeRevealElements();
}

function setupSearch() {
  if (!searchInput) return;
  searchInput.addEventListener("input", () => {
    currentSearchTerm = searchInput.value || "";
    renderProducts();
  });
}

// ================================
// Cart (Sidebar)
// ================================
function setupCart() {
  const openCart = () => {
    cartSidebar.classList.add("open");
    cartOverlay.classList.add("visible");
    document.body.classList.add("no-scroll");
  };

  const closeCart = () => {
    cartSidebar.classList.remove("open");
    cartOverlay.classList.remove("visible");
    document.body.classList.remove("no-scroll");
  };

  // Toggle on bag icon (حل مشكلة أنها تبقى مفتوحة)
  cartToggleBtn.addEventListener("click", () => {
    const isOpen = cartSidebar.classList.contains("open");
    if (isOpen) closeCart();
    else openCart();
  });

  cartCloseBtn.addEventListener("click", closeCart);
  cartOverlay.addEventListener("click", closeCart);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCart();
  });
}

function addToCart(productId) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return;

  if (!cart[productId]) {
    cart[productId] = { ...product, quantity: 0 };
  }
  cart[productId].quantity += 1;

  updateCartUI();
  updateWhatsappLink();
}

function changeQuantity(productId, delta) {
  const item = cart[productId];
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) delete cart[productId];

  updateCartUI();
  updateWhatsappLink();
}

function removeFromCart(productId) {
  delete cart[productId];
  updateCartUI();
  updateWhatsappLink();
}

function updateCartUI() {
  const items = Object.values(cart);
  cartItemsContainer.innerHTML = "";

  if (!items.length) {
    cartItemsContainer.innerHTML =
      '<p style="color:rgba(248,250,252,0.75); font-size:0.9rem;">السلة فارغة حالياً.</p>';
  } else {
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <div>
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-meta">${item.category}</div>
        </div>
        <div class="cart-item-price">${item.price * item.quantity} ${item.currency}</div>
        <div class="cart-item-qty">
          <button class="qty-btn" type="button">-</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" type="button">+</button>
        </div>
        <button class="remove-item-btn" type="button">إزالة</button>
      `;

      const qtyBtns = row.querySelectorAll(".qty-btn");
      qtyBtns[0].addEventListener("click", () => changeQuantity(item.id, -1));
      qtyBtns[1].addEventListener("click", () => changeQuantity(item.id, 1));
      row.querySelector(".remove-item-btn").addEventListener("click", () => removeFromCart(item.id));

      cartItemsContainer.appendChild(row);
    });
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  cartTotalEl.textContent = `${total} ج.م`;
  cartCountEl.textContent = String(count);
}

// ================================
// WhatsApp order
// ================================
function updateWhatsappLink() {
  if (!whatsappBtn) return;

  const items = Object.values(cart);
  const customerName = (customerNameInput && customerNameInput.value.trim()) || "";

  let message = "طلب جديد من Healthy Store%0A";
  if (customerName) message += `%0Aالاسم: ${encodeURIComponent(customerName)}%0A`;
  message += "%0A🧾 قائمة الطلب:";

  if (!items.length) {
    message += "%0A(السلة فارغة)";
  } else {
    items.forEach((item, idx) => {
      const line = `${idx + 1}) ${item.name} — ${item.quantity} × ${item.price} ${item.currency}`;
      message += `%0A${encodeURIComponent(line)}`;
    });
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    message += `%0A%0Aالإجمالي: ${total} ج.م`;
  }

  const phone = "201278856853"; // 01278856853
  whatsappBtn.href = `https://wa.me/${phone}?text=${message}`;
}

// ================================
// Theme toggle (Dark/Light)
// ================================
function setupThemeToggle() {
  if (!themeToggleBtn) return;

  const apply = (mode) => {
    const isLight = mode === "light";
    document.body.classList.toggle("theme-light", isLight);
    themeToggleBtn.innerHTML = isLight
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
  };

  const saved = localStorage.getItem("hs-theme");
  if (saved === "light" || saved === "dark") apply(saved);

  themeToggleBtn.addEventListener("click", () => {
    const isLight = document.body.classList.contains("theme-light");
    const next = isLight ? "dark" : "light";
    localStorage.setItem("hs-theme", next);
    apply(next);
  });
}

// ================================
// Reveal on scroll
// ================================
function setupRevealOnScroll() {
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  observeRevealElements();
}

function observeRevealElements() {
  if (!revealObserver) return;
  document
    .querySelectorAll(".reveal-on-scroll:not(.revealed)")
    .forEach((el) => revealObserver.observe(el));
}