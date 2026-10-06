let products = JSON.parse(localStorage.getItem("shopProducts") || "[]");
let currentFilter = "all";

const $ = (id) => document.getElementById(id);

function save() {
  localStorage.setItem("shopProducts", JSON.stringify(products));
  render();
}

function money(value) {
  return "₹" + Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  });
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (char) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
}

function render() {
  const searchText = ($("search").value || "").toLowerCase();

  const list = products.filter(function (product) {
    const matchesType =
      currentFilter === "all" || product.type === currentFilter;

    const matchesSearch =
      JSON.stringify(product).toLowerCase().includes(searchText);

    return matchesType && matchesSearch;
  });

  if (list.length === 0) {
    $("inventory").innerHTML =
      '<p class="muted">No products found. Add your first tyre or battery.</p>';
  } else {
    $("inventory").innerHTML = list
      .map(function (product) {
        return `
          <div class="item">
            <div>
              <h3>
                ${product.type === "tyre" ? "🛞" : "🔋"}
                ${escapeHTML(product.brand)}
                ${escapeHTML(product.model)}
              </h3>

              <div class="muted">
                ${
                  product.type === "tyre"
                    ? escapeHTML(product.size || "No size")
                    : escapeHTML(product.ah || "No Ah")
                }
                ${
                  product.warranty
                    ? " • " + escapeHTML(product.warranty)
                    : ""
                }
                ${
                  product.supplier
                    ? " • " + escapeHTML(product.supplier)
                    : ""
                }
              </div>

              <div>
                Qty:
                <b class="${Number(product.qty) <= 2 ? "low" : ""}">
                  ${product.qty}
                </b>

                • Buy: ${money(product.purchase)}
                • Sell:
                <span class="price">${money(product.selling)}</span>
              </div>
            </div>

            <div class="actions">
              <button onclick="editProduct('${product.id}')">
                Edit
              </button>

              <button onclick="deleteProduct('${product.id}')">
                Delete
              </button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // Dashboard totals
  $("tyreQty").textContent = products
    .filter((p) => p.type === "tyre")
    .reduce((total, p) => total + Number(p.qty || 0), 0);

  $("batteryQty").textContent = products
    .filter((p) => p.type === "battery")
    .reduce((total, p) => total + Number(p.qty || 0), 0);

  const stockValue = products.reduce(function (total, p) {
    return total + Number(p.qty || 0) * Number(p.purchase || 0);
  }, 0);

  $("stockValue").textContent = money(stockValue);

  $("lowStock").textContent = products.filter(
    (p) => Number(p.qty || 0) <= 2
  ).length;
}

function openForm(type, id = null) {
  $("modal").classList.remove("hidden");

  $("type").value = type;
  $("editId").value = id || "";

  $("modalTitle").textContent = id
    ? "Edit Product"
    : type === "tyre"
    ? "Add Tyre"
    : "Add Battery";

  $("sizeLabel").classList.toggle("hidden", type !== "tyre");
  $("ahLabel").classList.toggle("hidden", type !== "battery");
  $("warrantyLabel").classList.toggle(
    "hidden",
    type !== "battery"
  );

  if (id) {
    const product = products.find((p) => p.id === id);

    if (!product) return;

    $("brand").value = product.brand || "";
    $("model").value = product.model || "";
    $("size").value = product.size || "";
    $("ah").value = product.ah || "";
    $("qty").value = product.qty || 0;
    $("purchase").value = product.purchase || 0;
    $("selling").value = product.selling || 0;
    $("warranty").value = product.warranty || "";
    $("supplier").value = product.supplier || "";
  } else {
    $("productForm").reset();
    $("type").value = type;
  }
}

function closeForm() {
  $("modal").classList.add("hidden");
  $("productForm").reset();
  $("editId").value = "";
}

$("productForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const id = $("editId").value;

  const product = {
    id: id || Date.now().toString(),

    type: $("type").value,

    brand: $("brand").value.trim(),

    model: $("model").value.trim(),

    size: $("size").value.trim(),

    ah: $("ah").value.trim(),

    qty: Number($("qty").value),

    purchase: Number($("purchase").value),

    selling: Number($("selling").value),

    warranty: $("warranty").value.trim(),

    supplier: $("supplier").value.trim()
  };

  if (id) {
    products = products.map(function (p) {
      return p.id === id ? product : p;
    });
  } else {
    products.push(product);
  }

  save();
  closeForm();
});

function editProduct(id) {
  const product = products.find((p) => p.id === id);

  if (product) {
    openForm(product.type, id);
  }
}

function deleteProduct(id) {
  const product = products.find((p) => p.id === id);

  if (!product) return;

  if (
    confirm(
      "Delete " +
        product.brand +
        " " +
        product.model +
        " from your stock?"
    )
  ) {
    products = products.filter((p) => p.id !== id);
    save();
  }
}

// Inventory filters
document.querySelectorAll(".filter").forEach(function (button) {
  button.addEventListener("click", function () {
    document.querySelectorAll(".filter").forEach(function (b) {
      b.classList.remove("active");
    });

    button.classList.add("active");

    currentFilter = button.dataset.filter;

    render();
  });
});

// Service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function (error) {
      console.log("Service worker registration failed:", error);
    });
  });
}

// Install button
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", function (event) {
  event.preventDefault();

  deferredPrompt = event;

  const installButton = $("installBtn");

  if (installButton) {
    installButton.classList.remove("hidden");
  }
});

const installButton = $("installBtn");

if (installButton) {
  installButton.addEventListener("click", async function () {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    deferredPrompt = null;

    installButton.classList.add("hidden");
  });
}

// Start the app
render();
