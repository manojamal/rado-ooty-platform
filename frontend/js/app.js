const API_URL = '/api';

let products = [];
let cart = [];

// Load products from API
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        products = await response.json();
        renderProducts();
    } catch (error) {
        console.error('Failed to load products:', error);
        document.getElementById('productsGrid').innerHTML = '<div class="loading">Failed to load products. Please refresh.</div>';
    }
}

// Render products grid
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!products.length) {
        grid.innerHTML = '<div class="loading">No products available</div>';
        return;
    }
    
    grid.innerHTML = products.map(product => `
        <div class="product-card">
            <img class="product-image" src="${product.image || '/images/placeholder.jpg'}" alt="${product.name}">
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">₹${product.price}</div>
                <button class="add-to-cart" onclick="addToCart('${product._id}')">Add to Cart</button>
            </div>
        </div>
    `).join('');
}

// Add to cart
function addToCart(productId) {
    const product = products.find(p => p._id === productId);
    if (!product) return;
    
    const existing = cart.find(item => item.productId === productId);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ ...product, productId, quantity: 1 });
    }
    
    updateCart();
}

// Update cart display
function updateCart() {
    const cartItemsDiv = document.getElementById('cartItems');
    const cartTotalDiv = document.getElementById('cartTotal');
    const cartCount = document.getElementById('cartCount');
    
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p>Your cart is empty</p>';
        cartTotalDiv.innerHTML = '';
        cartCount.textContent = '0';
        return;
    }
    
    let total = 0;
    cartItemsDiv.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="cart-item">
                <span>${item.name} x ${item.quantity}</span>
                <span>₹${itemTotal}</span>
            </div>
        `;
    }).join('');
    
    cartTotalDiv.innerHTML = `Total: ₹${total}`;
    cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
}

// Checkout
async function checkout() {
    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }
    
    const customerName = prompt('Enter your name:');
    const customerPhone = prompt('Enter your phone number:');
    const customerAddress = prompt('Enter your delivery address:');
    
    if (!customerName || !customerPhone || !customerAddress) {
        alert('Please fill all details');
        return;
    }
    
    const orderData = {
        items: cart.map(item => ({ productId: item.productId, quantity: item.quantity })),
        customerInfo: {
            name: customerName,
            phone: customerPhone,
            address: customerAddress
        },
        deliverySlot: 'Express',
        zone: 'Zone 1'
    };
    
    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        const order = await response.json();
        alert(`Order placed successfully! Order #: ${order.orderNumber}`);
        cart = [];
        updateCart();
    } catch (error) {
        alert('Failed to place order. Please try again.');
    }
}

// Event listeners
document.getElementById('checkoutBtn').addEventListener('click', checkout);
document.getElementById('cartIcon').addEventListener('click', () => {
    document.getElementById('cartSidebar').classList.toggle('open');
});

// Load products on page load
loadProducts();
