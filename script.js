const cart = JSON.parse(localStorage.getItem("agastyaveda-cart") || "[]");
const cartCount = document.querySelector("#cart-count");
const drawer = document.querySelector(".cart-drawer");
const overlay = document.querySelector(".drawer-overlay");
const toast = document.querySelector(".toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

async function loadRazorpay() {
  if (window.Razorpay) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Payment checkout could not load."));
    document.head.appendChild(script);
  });
}

async function openRazorpayCheckout(data, type) {
  if (!data.keyId) {
    showToast(`${type} created in local preview mode`);
    return;
  }
  try {
    await loadRazorpay();
  } catch (error) {
    showToast(error.message);
    return;
  }
  const options = {
    key: data.keyId,
    amount: data.payment.amount,
    currency: data.payment.currency,
    name: "Agastyaveda",
    description: type === "appointment" ? "Ayurvedic consultation" : "Agastyaveda wellness order",
    order_id: data.payment.id,
    handler: async (response) => {
      const endpoint = type === "appointment" ? "/api/payments/verify" : "/api/orders/verify";
      const payload = {
        orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
        ...(type === "appointment" ? { appointmentId: data.appointment._id } : {})
      };
      const result = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!result.ok) showToast("Payment verification failed. Please contact us.");
      else showToast("Payment received. Thank you.");
    },
    theme: { color: "#2c5e3a" }
  };
  new window.Razorpay(options).open();
}

async function hydrateProducts() {
  try {
    const response = await fetch("/api/products");
    if (!response.ok) throw new Error("Unable to load products");
    const { products } = await response.json();
    document.querySelectorAll(".product-card").forEach((card, index) => {
      const product = products.find((entry) => entry.name === card.dataset.product) || products[index];
      if (!product) {
        card.remove();
        return;
      }
      card.dataset.product = product.name;
      card.dataset.price = product.price;
      card.dataset.productId = product._id;
      const title = card.querySelector(".product-info h3");
      const description = card.querySelector(".product-info p");
      const price = card.querySelector(".product-info strong");
      if (title) title.textContent = product.name;
      if (description) description.textContent = product.description;
      if (price) price.textContent = `₹${Number(product.price).toLocaleString("en-IN")}`;
      const image = card.querySelector(".product-image");
      if (image) {
        image.style.backgroundImage = product.imageUrl ? `url("${product.imageUrl.replace(/"/g, "%22")}")` : "";
        image.classList.toggle("has-product-image", Boolean(product.imageUrl));
        image.querySelectorAll("span, b").forEach((label) => { label.style.display = product.imageUrl ? "none" : ""; });
      }
      let pack = card.querySelector(".product-pack");
      if (!pack) {
        pack = document.createElement("small");
        pack.className = "product-pack";
        card.querySelector(".product-info").appendChild(pack);
      }
      pack.textContent = `${product.packageSize || ""} ${product.packageUnit || ""}`.trim();
      if (!card.querySelector(".product-details-link")) {
        const link = document.createElement("a");
        link.className = "product-details-link";
        link.href = `/product.html?id=${encodeURIComponent(product._id)}`;
        link.textContent = "View details →";
        card.insertBefore(link, card.querySelector(".add-button"));
      }
    });
  } catch (error) {
    console.warn("Using the static product preview:", error.message);
  }
}

function renderCart() {
  cartCount.textContent = cart.length;
  const list = document.querySelector("#cart-items");
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  document.querySelector("#cart-total").textContent = `₹${total.toLocaleString("en-IN")}`;
  if (!cart.length) {
    list.innerHTML = '<p class="empty-cart">Your bag is waiting for something lovely.</p>';
    return;
  }
  list.innerHTML = cart.map((item, index) => `<div class="cart-item"><div>${item.name}<small>₹${item.price.toLocaleString("en-IN")}</small></div><button class="remove-item" data-index="${index}">Remove</button></div>`).join("");
  list.querySelectorAll(".remove-item").forEach((button) => {
    button.addEventListener("click", () => {
      cart.splice(Number(button.dataset.index), 1);
      localStorage.setItem("agastyaveda-cart", JSON.stringify(cart));
      renderCart();
    });
  });
}

hydrateProducts();

document.querySelectorAll(".add-button").forEach((button) => {
  button.addEventListener("click", () => {
    const product = button.closest(".product-card");
    cart.push({ name: product.dataset.product, price: Number(product.dataset.price), productId: product.dataset.productId || "" });
    localStorage.setItem("agastyaveda-cart", JSON.stringify(cart));
    renderCart();
    showToast(`${product.dataset.product} added to your bag`);
  });
});

document.querySelector(".cart-button").addEventListener("click", () => {
  drawer.classList.add("open");
  overlay.classList.add("open");
});
function closeDrawer() {
  drawer.classList.remove("open");
  overlay.classList.remove("open");
}
document.querySelector(".close-drawer").addEventListener("click", closeDrawer);
overlay.addEventListener("click", closeDrawer);
document.querySelector(".checkout-button").addEventListener("click", () => {
  if (!cart.length) showToast("Add a product before checking out");
  else window.location.href = "/checkout.html";
});

const menuButton = document.querySelector(".menu-button");
menuButton.addEventListener("click", () => {
  const nav = document.querySelector(".mobile-nav");
  const isOpen = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", isOpen);
});
document.querySelectorAll(".mobile-nav a").forEach((link) => link.addEventListener("click", () => document.querySelector(".mobile-nav").classList.remove("open")));

document.querySelectorAll(".faq-item").forEach((item) => item.addEventListener("click", () => item.classList.toggle("open")));

const modal = document.querySelector("#booking-modal");
document.querySelector("#open-booking").addEventListener("click", () => modal.classList.add("open"));
document.querySelector(".close-modal").addEventListener("click", () => modal.classList.remove("open"));
modal.addEventListener("click", (event) => { if (event.target === modal) modal.classList.remove("open"); });
document.querySelector("#date-input").min = new Date().toISOString().split("T")[0];
document.querySelector("#booking-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const payload = {
    date: document.querySelector("#date-input").value,
    time: event.target.querySelector("select").value,
    email: event.target.querySelector('input[type="email"]').value
  };
  fetch("/api/appointments", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to request appointment");
    modal.classList.remove("open");
    showToast(`Appointment requested. Payment order ${data.payment.id} is ready`);
    openRazorpayCheckout(data, "appointment");
    event.target.reset();
  }).catch((error) => showToast(error.message));
});
document.querySelector("#contact-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const fields = event.target.querySelectorAll("input, textarea");
  fetch("/api/contact", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: fields[0].value, email: fields[1].value, message: fields[2].value })
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to send message");
    showToast("Thanks for reaching out. We’ll be in touch soon");
    event.target.reset();
  }).catch((error) => showToast(error.message));
});
