let products = JSON.parse(localStorage.getItem('shopProducts') || '[]');
let currentFilter = 'all';

const $ = id => document.getElementById(id);

function save() {
  localStorage.setItem('shopProducts', JSON.stringify(products));
  render();
}

function money(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2
  });
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));
}

function render() {
  const q = $('search').value.toLowerCase();

  let list = products.filter(p =>
    (currentFilter === 'all' || p.type === currentFilter) &&
    JSON.stringify(p).toLowerCase().includes(q)
  );

  $('inventory').innerHTML = list.length
    ? list.map(p => `
      <div class="item">
        <div>
          <h3>
            ${p.type === 'tyre' ? '🛞' : '🔋'}
            ${esc(p.brand)} ${esc(p.model)}
          </h3>

          <div class="muted">
            ${p.type === 'tyre'
              ? esc(p.size || 'No size')
              : esc(p.ah || 'No Ah')}
            ${p.warranty ? ' • ' + esc(p.warranty) : ''}
            ${p.supplier ? ' • ' + esc(p.supplier) : ''}
          </div>

          <div>
            Qty:
            <b class="${p.qty <= 2 ? 'low' : ''}">
              ${p.qty}
            </b>
            • Buy: ${money(p.purchase)}
            • Sell:
            <span class="price">${money(p.selling)}</span>
          </div>
        </div>

        <div class="actions">
          <button onclick="editProduct('${p.id}')">Edit</button>
          <button onclick="deleteProduct('${p.id}')">Delete</button>
        </div>
      </div>
    `).join('')
    : '<p class="muted">No products found. Add your first tyre or battery.</p>';

  $('tyreQty').textContent =
    products
      .filter(p => p.type === 'tyre')
      .reduce((a, p) => a + Number(p.qty), 0);

  $('batteryQty').textContent =
    products
      .filter(p => p.type === 'battery')
      .reduce((a, p) => a + Number(p.qty), 0);

  $('stockValue').textContent =
    money(
      products.reduce(
        (a, p) => a + Number(p.qty) * Number(p.purchase),
        0
      )
    );

  $('lowStock').textContent =
    products.filter(p => Number(p.qty) <= 2).length;
}

function openForm(type, id = null) {
  $('modal').classList.remove('hidden');

  $('type').value = type;
  $('editId').value = id || '';

  $('modalTitle').textContent =
    id ? 'Edit Product' :
    `Add ${type === 'tyre' ? 'Tyre' : 'Battery'}`;

  $('sizeLabel').classList.toggle('hidden', type !== 'tyre');
  $('ahLabel').classList.toggle('hidden', type !== 'battery');
  $('warrantyLabel').classList.toggle('hidden', type !== 'battery');

  if (id) {
    const p = products.find(x => x.id === id);

    $('brand').value = p.brand;
    $('model').value = p.model;
    $('size').value = p.size || '';
    $('ah').value = p.ah || '';
    $('qty').value = p.qty;
    $('purchase').value = p.purchase;
    $('selling').value = p.selling;
    $('warranty').value = p.warranty || '';
    $('supplier').value = p.supplier || '';
  } else {
    $('productForm').reset();
  }
}

function closeForm() {
  $('modal').classList.add('hidden');
  $('productForm').reset();
}

$('productForm').onsubmit = e => {
  e.preventDefault();

  const id = $('editId').value;

  const p = {
    id: id || crypto.randomUUID(),
    type: $('type').value,
    brand: $('brand').value.trim(),
    model: $('model').value.trim(),
    size: $('size').value.trim(),
    ah: $('ah').value.trim(),
    qty: Number($('qty').value),
    purchase: Number($('purchase').value),
    selling: Number($('selling').value),
    warranty: $('warranty').value.trim(),
    supplier: $('supplier').value.trim()
  };

  if (id) {
    products = products.map(x => x.id === id ? p : x);
  } else {
    products.push(p);
  }

  save();
  closeForm();
};

function editProduct(id) {
  openForm(products.find(p => p.id === id).type, id);
}

function deleteProduct(id) {
  if (confirm('Delete this product?')) {
    products = products.filter(p => p.id !== id);
    save();
  }
}

document.querySelectorAll('.filter').forEach(b => {
  b.onclick = () => {
    document
      .querySelectorAll('.filter')
      .forEach(x => x.classList.remove('active'));

    b.classList.add('active');
    currentFilter = b.dataset.filter;

    render();
  };
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

let deferred;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferred = e;

  if ($('installBtn')) {
    $('installBtn').classList.remove('hidden');
  }
});

if ($('installBtn')) {
  $('installBtn').onclick = async () => {
    if (deferred) {
      deferred.prompt();
      deferred = null;
    }
  };
}

render();
