const API_URL = '/api';
let adminToken = null;

// Check admin authentication
function checkAdminAuth() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        // Redirect to login or prompt
        const password = prompt('Enter admin password:');
        if (password === 'admin123') { // Change this to your secure password
            adminToken = 'admin-token';
            localStorage.setItem('adminToken', adminToken);
            loadDashboard();
        } else {
            alert('Invalid password');
            window.location.href = '/';
        }
    } else {
        adminToken = token;
        loadDashboard();
    }
}

// Load dashboard data
async function loadDashboard() {
    await loadStats();
    await loadRecentOrders();
    await loadTopProducts();
    await loadProducts();
    await loadOrders();
    await loadUsers();
    await loadInventory();
    await loadCoupons();
    await loadCharts();
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/admin?action=dashboard`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        
        document.getElementById('totalOrders').textContent = data.totalOrders || 0;
        document.getElementById('totalRevenue').textContent = `₹${(data.totalRevenue || 0).toFixed(2)}`;
        document.getElementById('totalUsers').textContent = data.totalUsers || 0;
        document.getElementById('totalProducts').textContent = data.totalProducts || 0;
        document.getElementById('lowStockCount').textContent = data.lowStockProducts || 0;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Load recent orders
async function loadRecentOrders() {
    try {
        const response = await fetch(`${API_URL}/admin?action=orders&limit=5`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('recentOrdersList');
        if (data.orders && data.orders.length) {
            container.innerHTML = data.orders.map(order => `
                <div class="order-item" style="padding: 0.5rem; border-bottom: 1px solid #eee;">
                    <div><strong>#${order.orderNumber}</strong> - ₹${order.total}</div>
                    <div class="order-status status-${order.status}">${order.status}</div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p>No recent orders</p>';
        }
    } catch (error) {
        console.error('Failed to load recent orders:', error);
    }
}

// Load top products
async function loadTopProducts() {
    try {
        const response = await fetch(`${API_URL}/admin?action=analytics`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('topProductsList');
        if (data.topProducts && data.topProducts.length) {
            container.innerHTML = data.topProducts.map(product => `
                <div class="product-item" style="padding: 0.5rem; border-bottom: 1px solid #eee;">
                    <div><strong>${product.product.name}</strong></div>
                    <div>Sold: ${product.totalSold} units</div>
                    <div>Revenue: ₹${product.revenue}</div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p>No top products yet</p>';
        }
    } catch (error) {
        console.error('Failed to load top products:', error);
    }
}

// Load all products
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/admin/products`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        
        const tbody = document.getElementById('productsTableBody');
        tbody.innerHTML = data.products.map(product => `
            <tr>
                <td><img src="${product.image}" class="product-image" onerror="this.src='/images/placeholder.jpg'"></td>
                <td>${product.name}</td>
                <td>₹${product.price}</td>
                <td>
                    <input type="number" value="${product.stock}" style="width: 60px;" 
                           onchange="updateStock('${product._id}', this.value)">
                </td>
                <td>${product.category}</td>
                <td>
                    <button onclick="deleteProduct('${product._id}')" class="btn-danger">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load products:', error);
    }
}

// Load orders
async function loadOrders(status = 'all') {
    try {
        const url = status === 'all' 
            ? `${API_URL}/admin?action=orders`
            : `${API_URL}/admin?action=orders&status=${status}`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('ordersList');
        container.innerHTML = data.orders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <div><strong>#${order.orderNumber}</strong></div>
                    <select onchange="updateOrderStatus('${order._id}', this.value)" 
                            class="order-status status-${order.status}">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                        <option value="out-for-delivery" ${order.status === 'out-for-delivery' ? 'selected' : ''}>Out for Delivery</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                </div>
                <div class="order-items">
                    ${order.items.map(item => `<div>${item.name} x ${item.quantity} = ₹${item.price * item.quantity}</div>`).join('')}
                </div>
                <div class="order-total">Total: ₹${order.total}</div>
                <div class="order-customer">Customer: ${order.customerInfo.name} (${order.customerInfo.phone})</div>
                <div class="order-address">Address: ${order.customerInfo.address}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load orders:', error);
    }
}

// Load users
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/admin?action=users`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('usersList');
        container.innerHTML = `
            <table class="admin-table">
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>Total Spent</th></tr></thead>
                <tbody>
                    ${data.users.map(user => `
                        <tr>
                            <td>${user.name}</td>
                            <td>${user.email}</td>
                            <td>${user.phone || '-'}</td>
                            <td>${user.totalOrders || 0}</td>
                            <td>₹${(user.totalSpent || 0).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

// Load inventory
async function loadInventory() {
    try {
        const response = await fetch(`${API_URL}/admin?action=inventory`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('inventoryList');
        container.innerHTML = data.products.map(product => `
            <div class="inventory-item">
                <div><strong>${product.name}</strong> - Stock: ${product.stock}</div>
                ${product.stock < 20 ? '<span style="color: #FF6F00;">⚠️ Low Stock!</span>' : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load inventory:', error);
    }
}

// Load coupons
async function loadCoupons() {
    try {
        const response = await fetch(`${API_URL}/admin?action=coupons`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('couponsList');
        container.innerHTML = data.coupons.map(coupon => `
            <div class="coupon-card">
                <div>
                    <div class="coupon-code">${coupon.code}</div>
                    <div>${coupon.type === 'percentage' ? `${coupon.value}% off` : `₹${coupon.value} off`}</div>
                    <div>Min order: ₹${coupon.minOrder}</div>
                </div>
                <button onclick="deleteCoupon('${coupon._id}')" class="btn-danger">Delete</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load coupons:', error);
    }
}

// Load charts
async function loadCharts() {
    try {
        const response = await fetch(`${API_URL}/admin?action=analytics`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        
        // Sales Chart
        const ctx1 = document.getElementById('salesChart')?.getContext('2d');
        if (ctx1) {
            new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: Object.keys(data.revenueByDay || {}),
                    datasets: [{
                        label: 'Revenue',
                        data: Object.values(data.revenueByDay || {}),
                        borderColor: '#2E7D32',
                        tension: 0.4
                    }]
                }
            });
        }
        
        // Category Chart
        const ctx2 = document.getElementById('categoryChart')?.getContext('2d');
        if (ctx2 && data.categoryBreakdown) {
            new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(data.categoryBreakdown),
                    datasets: [{
                        data: Object.values(data.categoryBreakdown),
                        backgroundColor: ['#2E7D32', '#FF6F00', '#1976D2', '#7B1FA2']
                    }]
                }
            });
        }
    } catch (error) {
        console.error('Failed to load charts:', error);
    }
}

// Update product stock
async function updateStock(productId, newStock) {
    try {
        await fetch(`${API_URL}/admin/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ stock: parseInt(newStock) })
        });
        showToast('Stock updated successfully', 'success');
    } catch (error) {
        showToast('Failed to update stock', 'error');
    }
}

// Delete product
async function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            await fetch(`${API_URL}/admin/products/${productId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            showToast('Product deleted successfully', 'success');
            loadProducts();
        } catch (error) {
            showToast('Failed to delete product', 'error');
        }
    }
}

// Update order status
async function updateOrderStatus(orderId, status) {
    try {
        await fetch(`${API_URL}/admin/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ status })
        });
        showToast('Order status updated', 'success');
        loadOrders();
    } catch (error) {
        showToast('Failed to update order', 'error');
    }
}

// Filter orders
function filterOrders() {
    const status = document.getElementById('orderStatusFilter').value;
    loadOrders(status);
}

// Show add product modal
function showAddProductModal() {
    document.getElementById('productModal').classList.add('active');
}

// Add product
document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const product = {
        name: document.getElementById('productName').value,
        price: parseInt(document.getElementById('productPrice').value),
        discount: parseInt(document.getElementById('productDiscount').value),
        image: document.getElementById('productImage').value,
        category: document.getElementById('productCategory').value,
        stock: parseInt(document.getElementById('productStock').value),
        isActive: true
    };
    
    try {
        await fetch(`${API_URL}/admin/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(product)
        });
        showToast('Product added successfully', 'success');
        document.getElementById('productModal').classList.remove('active');
        loadProducts();
    } catch (error) {
        showToast('Failed to add product', 'error');
    }
});

// Show add coupon modal
function showAddCouponModal() {
    // Implement coupon modal
    alert('Add coupon functionality - to be implemented');
}

// Save settings
function saveSettings() {
    const settings = {
        deliveryFees: {
            Zone1: parseInt(document.getElementById('zone1Fee').value),
            Zone2: parseInt(document.getElementById('zone2Fee').value),
            Zone3: parseInt(document.getElementById('zone3Fee').value)
        },
        freeDeliveryThreshold: parseInt(document.getElementById('freeDeliveryThreshold').value)
    };
    
    localStorage.setItem('adminSettings', JSON.stringify(settings));
    showToast('Settings saved successfully', 'success');
}

// Show toast
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Logout
function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = '/';
}

// Navigation
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const section = btn.dataset.section;
        
        // Update active states
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        document.getElementById(section).classList.add('active');
    });
});

// Initialize
checkAdminAuth();