const HS = window.HS_DATA || { products: [] };
const PRODUCTS = HS.products || [];

const productDetails = document.getElementById("productDetails");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const yearSpan = document.getElementById("yearSpan");

function getProductIdFromUrl() {
  const url = new URL(window.location.href);
  const idRaw = url.searchParams.get("id");
  const id = Number(idRaw);
  return Number.isFinite(id) ? id : null;
}

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

function buildWhatsappLink(product, qty) {
  const phone = "201278856853"; // 01278856853
  const total = product.price * qty;

  const lines = [
    "طلب من Healthy Store",
    `المنتج: ${product.name}`,
    `التصنيف: ${product.category}`,
    product.weight ? `الوزن: ${product.weight}` : null,
    product.ingredients ? `المكونات: ${product.ingredients}` : null,
    `الكمية: ${qty}`,
    `السعر: ${product.price} ${product.currency}`,
    `الإجمالي: ${total} ج.م`,
  ].filter(Boolean);

  const message = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${phone}?text=${message}`;
}

function renderProduct(product) {
  const images = Array.isArray(product.images)
    ? product.images.filter(Boolean)
    : [];
  if (!images.length && product.image) images.push(product.image);

  const imageHtml = images.length
    ? `
      <div class="product-gallery">
        <div class="product-details-image">
          <img id="mainProductImage" src="${images[0]}" alt="${product.name}" />
        </div>
        ${
          images.length > 1
            ? `<div class="product-gallery-thumbs" aria-label="صور المنتج">
                ${images
                  .map(
                    (src, idx) => `
                      <button class="thumb-btn ${idx === 0 ? "active" : ""}" type="button" data-src="${src}" aria-label="صورة ${idx + 1}">
                        <img src="${src}" alt="صورة ${idx + 1} لـ ${product.name}" />
                      </button>
                    `
                  )
                  .join("")}
              </div>`
            : ""
        }
      </div>
    `
    : `<div class="product-details-image product-image-fallback">
        <i class="fa-solid fa-star"></i>
      </div>`;

  const tagsHtml =
    product.tags && product.tags.length
      ? `<div class="product-tags">
          ${product.tags
            .map((tag) => `<span class="product-tag-pill">${String(tag).trim()}</span>`)
            .join("")}
        </div>`
      : "";

  productDetails.innerHTML = `
    <section class="details-card fade-in">
      <div class="details-grid">
        ${imageHtml}
        <div class="product-details-info">
          <span class="product-badge">${product.category}</span>
          <h2 class="product-details-title">${product.name}</h2>
          ${tagsHtml}

          <div class="product-details-price">
            <span>${product.price}</span>
            <span>${product.currency}</span>
          </div>

          <div class="details-list">
            <div class="details-item">
              <div class="details-label">الوزن</div>
              <div class="details-value">${product.weight || "غير محدد"}</div>
            </div>
            <div class="details-item">
              <div class="details-label">المكونات</div>
              <div class="details-value">${product.ingredients || "غير متوفر"}</div>
            </div>
          </div>

          <div class="details-actions">
            <div class="qty-control">
              <button class="qty-btn" type="button" id="decQty">-</button>
              <span id="qtyValue">1</span>
              <button class="qty-btn" type="button" id="incQty">+</button>
            </div>
            <a class="whatsapp-btn" id="singleWhatsappBtn" target="_blank" rel="noopener">
              <i class="fa-brands fa-whatsapp"></i>
              اطلب عبر واتساب
            </a>
          </div>
        </div>
      </div>
    </section>
  `;

  let qty = 1;
  const qtyValue = document.getElementById("qtyValue");
  const decQty = document.getElementById("decQty");
  const incQty = document.getElementById("incQty");
  const singleWhatsappBtn = document.getElementById("singleWhatsappBtn");
  const mainProductImage = document.getElementById("mainProductImage");

  const sync = () => {
    qtyValue.textContent = String(qty);
    singleWhatsappBtn.href = buildWhatsappLink(product, qty);
  };

  decQty.addEventListener("click", () => {
    qty = Math.max(1, qty - 1);
    sync();
  });
  incQty.addEventListener("click", () => {
    qty = Math.min(99, qty + 1);
    sync();
  });

  // تفعيل تبديل الصور عند وجود أكثر من صورة
  if (mainProductImage) {
    document.querySelectorAll(".thumb-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const src = btn.getAttribute("data-src");
        if (!src) return;
        mainProductImage.src = src;
        document
          .querySelectorAll(".thumb-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }

  sync();
}

function renderNotFound() {
  productDetails.innerHTML = `
    <section class="details-card fade-in" style="text-align:center;">
      <h2 class="product-details-title">المنتج غير موجود</h2>
      <p style="color: var(--text-muted); margin-top: 0.5rem;">
        تأكد من رابط المنتج ثم ارجع للمتجر.
      </p>
      <div style="margin-top: 1rem;">
        <a class="hero-cta" href="index.html">العودة للمتجر</a>
      </div>
    </section>
  `;
}

function init() {
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
  setupThemeToggle();

  const id = getProductIdFromUrl();
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) {
    renderNotFound();
    return;
  }

  renderProduct(product);
}

document.addEventListener("DOMContentLoaded", init);

