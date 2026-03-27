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
loadProducts(); // Check if user is logged in
let currentUser = null;

async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch('/api/auth?action=profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            currentUser = await response.json();
            updateUserUI();
        } else {
            localStorage.removeItem('token');
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

function updateUserUI() {
    const cartIcon = document.querySelector('.cart-icon');
    if (currentUser) {
        // Add user menu to navbar
        const navLinks = document.querySelector('.nav-links');
        if (navLinks && !document.querySelector('.user-menu')) {
            const userMenu = document.createElement('div');
            userMenu.className = 'user-menu';
            userMenu.innerHTML = `
                <span class="user-name">👤 ${currentUser.name}</span>
                <div class="user-dropdown">
                    <a href="/profile.html">My Profile</a>
                    <a href="/orders.html">My Orders</a>
                    <a href="#" onclick="logout()">Logout</a>
                </div>
            `;
            navLinks.appendChild(userMenu);
        }
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Call checkAuth on page load
checkAuth(); // Add tracking for AI recommendations
function trackProductView(productId) {
    const token = localStorage.getItem('token');
    const userId = currentUser?._id;
    
    fetch('/api/recommendations?type=track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, userId, sessionId: getSessionId() })
    }).catch(console.error);
}

// Get session ID
function getSessionId() {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random();
        sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
}

// Load recommendations
async function loadRecommendations() {
    const userId = currentUser?._id;
    let url = '/api/recommendations';
    
    if (userId) {
        url += '?type=personalized&userId=' + userId;
    } else {
        url += '?type=trending';
    }
    
    try {
        const response = await fetch(url);
        const recommendations = await response.json();
        renderRecommendations(recommendations);
    } catch (error) {
        console.error('Failed to load recommendations:', error);
    }
}

function renderRecommendations(products) {
    const container = document.getElementById('recommendationsGrid');
    if (!container || !products.length) return;
    
    container.innerHTML = `
        <h3>Recommended for You</h3>
        <div class="products-grid">
            ${products.map(product => `
                <div class="product-card">
                    <img src="${product.image}" alt="${product.name}">
                    <div class="product-info">
                        <div class="product-name">${product.name}</div>
                        <div class="product-price">₹${product.price}</div>
                        <button onclick="addToCart('${product._id}')">Add to Cart</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Load flash sales
async function loadFlashSales() {
    try {
        const response = await fetch('/api/flashsales');
        const sales = await response.json();
        renderFlashSales(sales);
    } catch (error) {
        console.error('Failed to load flash sales:', error);
    }
}

function renderFlashSales(sales) {
    const container = document.getElementById('flashSalesContainer');
    if (!container || !sales.length) return;
    
    container.innerHTML = `
        <div class="flash-sales">
            <h2>⚡ Flash Sales</h2>
            <div class="countdown-timer" id="flashSaleTimer"></div>
            <div class="products-grid">
                ${sales.map(sale => sale.products.map(product => `
                    <div class="product-card flash-sale">
                        <div class="sale-badge">-${product.discountPercentage}%</div>
                        <img src="${product.productId.image}" alt="${product.productId.name}">
                        <div class="product-info">
                            <div class="product-name">${product.productId.name}</div>
                            <div class="product-price">
                                <span class="sale-price">₹${product.salePrice}</span>
                                <span class="original-price">₹${product.originalPrice}</span>
                            </div>
                            <div class="stock-info">Only ${product.maxQuantity - product.soldQuantity} left!</div>
                            <button onclick="addToCart('${product.productId._id}')">Buy Now</button>
                        </div>
                    </div>
                `).join('')).join('')}
            </div>
        </div>
    `;
    
    // Update countdown timers
    sales.forEach(sale => updateCountdown(sale));
}

function updateCountdown(sale) {
    const timer = document.getElementById('flashSaleTimer');
    if (!timer) return;
    
    const interval = setInterval(() => {
        const now = new Date();
        const remaining = sale.timeRemaining;
        
        if (remaining <= 0) {
            clearInterval(interval);
            timer.innerHTML = 'Sale Ended';
            return;
        }
        
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        timer.innerHTML = `Ends in: ${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
}

// Load recommendations and flash sales on page load
document.addEventListener('DOMContentLoaded', () => {
    loadRecommendations();
    loadFlashSales();
});

// Add to cart with flash sale price
function addToCart(productId) {
    // Check if product is in flash sale
    fetch(`/api/flashsales`)
        .then(res => res.json())
        .then(sales => {
            let price = null;
            for (const sale of sales) {
                const product = sale.products.find(p => p.productId._id === productId);
                if (product) {
                    price = product.salePrice;
                    break;
                }
            }
            
            const product = products.find(p => p._id === productId);
            if (product) {
                const itemPrice = price || product.price;
                addToCartWithPrice(product, itemPrice);
            }
        });
}
