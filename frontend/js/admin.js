// ============================================
// RADO ஊT - Advanced Admin Dashboard
// Version 3.0
// ============================================

const API_URL = '/api';
let adminToken = null;
let currentDateRange = 'week';
let charts = {};
let currentPage = {
    products: 1,
    orders: 1,
    users: 1
};

// ============================================
// AUTHENTICATION
// ============================================

function checkAdminAuth() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        const password = prompt('Enter admin password:');
        if (password === 'admin123') {
            adminToken = 'admin-token-' + Date.now();
            localStorage.setItem('adminToken', adminToken);
            localStorage.setItem('adminName', 'Admin User');
            initDashboard();
        } else {
            alert('Invalid password');
            window.location.href = '/';
        }
    } else {
        adminToken = token;
        initDashboard();
    }
}

function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminName');
    window.location.href = '/';
}

// ============================================
// INITIALIZATION
// ============================================

async function initDashboard() {
    document.getElementById('adminName').textContent = localStorage.getItem('adminName') || 'Admin';
    await loadAllData();
    setupEventListeners();
    startAutoRefresh();
}

async function loadAllData() {
    await Promise.all([
        loadDashboardStats(),
        loadProducts(),
        loadOrders(),
        loadUsers(),
        loadDeliveryPartners(),
        loadTickets(),
        loadRefunds(),
        loadActivityLogs(),
        loadSettings()
    ]);
}

async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_URL}/admin?action=dashboard&range=${currentDateRange}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        
        document.getElementById('totalOrders').textContent = data.totalOrders || 0;
        document.getElementById('totalRevenue').textContent = `₹${(data.totalRevenue || 0).toLocaleString()}`;
        document.getElementById('totalUsers').textContent = data.totalUsers || 0;
        document.getElementById('avgRating').textContent = (data.avgRating || 4.8).toFixed(1);
        
        // Update trends
        if (data.ordersTrend) {
            document.getElementById('ordersTrend').textContent = `${data.ordersTrend > 0 ? '+' : ''}${data.ordersTrend}%`;
            document.getElementById('ordersTrend').className = `trend ${data.ordersTrend > 0 ? 'positive' : 'negative'}`;
        }
        if (data.revenueTrend) {
            document.getElementById('revenueTrend').textContent = `${data.revenueTrend > 0 ? '+' : ''}${data.revenueTrend}%`;
            document.getElementById('revenueTrend').className = `trend ${data.revenueTrend > 0 ? 'positive' : 'negative'}`;
        }
        
        // Update last update time
        document.getElementById('lastUpdate').innerHTML = `Last updated: ${new Date().toLocaleTimeString()}`;
        
        // Render charts
        renderRevenueChart(data.revenueData);
        renderOrderStatusChart(data.orderStatus);
        renderTopProducts(data.topProducts);
        renderRecentOrders(data.recentOrders);
        
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

// ============================================
// CHARTS
// ============================================

function renderRevenueChart(data) {
    const ctx = document.getElementById('revenueChart')?.getContext('2d');
    if (!ctx) return;
    
    if (charts.revenue) charts.revenue.destroy();
    
    charts.revenue = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data?.map(d => d.date) || [],
            datasets: [{
                label: 'Revenue (₹)',
                data: data?.map(d => d.revenue) || [],
                borderColor: '#2E7D32',
                backgroundColor: 'rgba(46, 125, 50, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                tooltip: { callbacks: { label: (ctx) => `₹${ctx.raw.toLocaleString()}` } }
            }
        }
    });
}

function renderOrderStatusChart(data) {
    const ctx = document.getElementById('orderStatusChart')?.getContext('2d');
    if (!ctx) return;
    
    if (charts.orderStatus) charts.orderStatus.destroy();
    
    charts.orderStatus = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data || {}),
            datasets: [{
                data: Object.values(data || {}),
                backgroundColor: ['#FF9800', '#2196F3', '#9C27B0', '#4CAF50', '#F44336']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function renderTopProducts(products) {
    const container = document.getElementById('topProductsList');
    if (!container) return;
    
    if (!products?.length) {
        container.innerHTML = '<p>No products data available</p>';
        return;
    }
    
    container.innerHTML = products.slice(0, 5).map(product => `
        <div class="product-rank">
            <div class="rank-number">#${product.rank || 1}</div>
            <div class="rank-info">
                <div class="rank-name">${product.name}</div>
                <div class="rank-stats">Sold: ${product.sold} units | ₹${product.revenue}</div>
            </div>
            <div class="rank-progress">
                <div class="progress-bar" style="width: ${(product.sold / products[0].sold) * 100}%"></div>
            </div>
        </div>
    `).join('');
}

function renderRecentOrders(orders) {
    const container = document.getElementById('recentOrdersList');
    if (!container) return;
    
    if (!orders?.length) {
        container.innerHTML = '<p>No recent orders</p>';
        return;
    }
    
    container.innerHTML = orders.slice(0, 5).map(order => `
        <div class="recent-order">
            <div class="order-header">
                <span class="order-number">#${order.orderNumber}</span>
                <span class="order-status status-${order.status}">${order.status}</span>
            </div>
            <div class="order-details">
                <span>₹${order.total}</span>
                <span>${order.customerName || 'Guest'}</span>
                <span>${new Date(order.createdAt).toLocaleTimeString()}</span>
            </div>
        </div>
    `).join('');
}

// ============================================
// PRODUCT MANAGEMENT
// ============================================

async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/admin/products?page=${currentPage.products}&limit=20`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        
        const tbody = document.getElementById('productsTableBody');
        tbody.innerHTML = data.products.map(product => `
            <tr>
                <td><img src="${product.image}" class="product-image" onerror="this.src='/images/placeholder.jpg'"></td>
                <td><strong>${product.name}</strong><br><small>ID: ${product._id.slice(-6)}</small></td>
                <td>₹${product.price}<br><small class="discount">-${product.discount || 0}%</small></td>
                <td><span class="final-price">₹${(product.price * (1 - (product.discount || 0)/100)).toFixed(2)}</span></td>
                <td>
                    <input type="number" value="${product.stock}" style="width: 70px;" 
                           onchange="updateStock('${product._id}', this.value)"
                           class="stock-input ${product.stock < 20 ? 'low-stock' : ''}">
                </td>
                <td><span class="category-badge">${product.category}</span></td>
                <td>${product.totalSold || 0}</td>
                <td>
                    <button onclick="editProduct('${product._id}')" class="btn-icon" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteProduct('${product._id}')" class="btn-icon danger" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button onclick="toggleProductStatus('${product._id}', ${!product.isActive})" class="btn-icon">
                        <i class="fas fa-${product.isActive ? 'eye' : 'eye-slash'}"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        renderPagination('products', data.pagination);
        
    } catch (error) {
        console.error('Failed to load products:', error);
        showToast('Failed to load products', 'error');
    }
}

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
        logActivity('product', `Updated stock for product ${productId} to ${newStock}`);
    } catch (error) {
        showToast('Failed to update stock', 'error');
    }
}

async function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        try {
            await fetch(`${API_URL}/admin/products/${productId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            showToast('Product deleted successfully', 'success');
            logActivity('product', `Deleted product ${productId}`);
            loadProducts();
        } catch (error) {
            showToast('Failed to delete product', 'error');
        }
    }
}

async function toggleProductStatus(productId, status) {
    try {
        await fetch(`${API_URL}/admin/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ isActive: status })
        });
        showToast(`Product ${status ? 'activated' : 'deactivated'}`, 'success');
        loadProducts();
    } catch (error) {
        showToast('Failed to update product status', 'error');
    }
}

function showAddProductModal() {
    document.getElementById('productModal').classList.add('active');
    document.getElementById('productForm').reset();
}

document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const product = {
        name: document.getElementById('productName').value,
        price: parseFloat(document.getElementById('productPrice').value),
        discount: parseFloat(document.getElementById('productDiscount').value) || 0,
        image: document.getElementById('productImage').value,
        category: document.getElementById('productCategory').value,
        stock: parseInt(document.getElementById('productStock').value),
        description: document.getElementById('productDescription')?.value || '',
        isActive: true
    };
    
    try {
        const response = await fetch(`${API_URL}/admin/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(product)
        });
        
        if (response.ok) {
            showToast('Product added successfully', 'success');
            document.getElementById('productModal').classList.remove('active');
            logActivity('product', `Added new product: ${product.name}`);
            loadProducts();
        } else {
            throw new Error('Failed to add product');
        }
    } catch (error) {
        showToast('Failed to add product', 'error');
    }
});

function filterProducts() {
    const search = document.getElementById('productSearch')?.value.toLowerCase() || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    const stock = document.getElementById('stockFilter')?.value || '';
    
    const rows = document.querySelectorAll('#productsTableBody tr');
    rows.forEach(row => {
        const name = row.cells[1]?.textContent.toLowerCase() || '';
        const prodCategory = row.cells[5]?.textContent || '';
        const stockValue = parseInt(row.cells[4]?.querySelector('input')?.value || 0);
        
        let show = true;
        if (search && !name.includes(search)) show = false;
        if (category && prodCategory !== category) show = false;
        if (stock === 'low' && stockValue >= 20) show = false;
        if (stock === 'out' && stockValue > 0) show = false;
        if (stock === 'in' && stockValue === 0) show = false;
        
        row.style.display = show ? '' : 'none';
    });
}

// ============================================
// ORDER MANAGEMENT
// ============================================

async function loadOrders() {
    try {
        const status = document.getElementById('orderStatusFilter')?.value || 'all';
        const search = document.getElementById('orderSearch')?.value || '';
        const fromDate = document.getElementById('orderDateFrom')?.value;
        const toDate = document.getElementById('orderDateTo')?.value;
        
        let url = `${API_URL}/admin?action=orders&page=${currentPage.orders}&limit=20`;
        if (status !== 'all') url += `&status=${status}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (fromDate) url += `&from=${fromDate}`;
        if (toDate) url += `&to=${toDate}`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('ordersList');
        container.innerHTML = data.orders.map(order => `
            <div class="order-card" data-order-id="${order._id}">
                <div class="order-header">
                    <div class="order-info">
                        <strong class="order-number">#${order.orderNumber}</strong>
                        <span class="order-date">${new Date(order.createdAt).toLocaleString()}</span>
                    </div>
                    <div class="order-actions">
                        <select onchange="updateOrderStatus('${order._id}', this.value)" 
                                class="order-status status-${order.status}">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                            <option value="out-for-delivery" ${order.status === 'out-for-delivery' ? 'selected' : ''}>Out for Delivery</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                        <button onclick="viewOrderDetails('${order._id}')" class="btn-icon" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                
                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-item">
                            <span>${item.quantity}x ${item.name}</span>
                            <span>₹${item.price * item.quantity}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="order-footer">
                    <div class="order-customer">
                        <i class="fas fa-user"></i> ${order.customerInfo.name}
                        <i class="fas fa-phone"></i> ${order.customerInfo.phone}
                    </div>
                    <div class="order-address">
                        <i class="fas fa-location-dot"></i> ${order.customerInfo.address}
                    </div>
                    <div class="order-total">
                        Total: <strong>₹${order.total}</strong>
                        ${order.deliveryFee > 0 ? `<small>(+₹${order.deliveryFee} delivery)</small>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
        if (data.orders.length === 0) {
            container.innerHTML = '<div class="empty-state">No orders found</div>';
        }
        
        renderPagination('orders', data.pagination);
        
    } catch (error) {
        console.error('Failed to load orders:', error);
        showToast('Failed to load orders', 'error');
    }
}

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
        showToast(`Order status updated to ${status}`, 'success');
        logActivity('order', `Updated order ${orderId} status to ${status}`);
        loadOrders();
        loadDashboardStats();
    } catch (error) {
        showToast('Failed to update order', 'error');
    }
}

function viewOrderDetails(orderId) {
    // Implement order details modal
    showToast('Order details feature coming soon', 'info');
}

function filterOrders() {
    currentPage.orders = 1;
    loadOrders();
}

// ============================================
// USER MANAGEMENT
// ============================================

async function loadUsers() {
    try {
        const search = document.getElementById('userSearch')?.value || '';
        const sort = document.getElementById('userSort')?.value || 'newest';
        
        let url = `${API_URL}/admin?action=users&page=${currentPage.users}&limit=20&sort=${sort}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('usersList');
        container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Contact</th>
                        <th>Orders</th>
                        <th>Total Spent</th>
                        <th>Joined</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.users.map(user => `
                        <tr>
                            <td>
                                <div class="user-info">
                                    <div class="user-avatar">${user.name?.charAt(0) || 'U'}</div>
                                    <div>
                                        <strong>${user.name || 'Guest'}</strong>
                                        <div class="user-email">${user.email || 'No email'}</div>
                                    </div>
                                </div>
                            </td>
                            <td>${user.phone || '-'}</td>
                            <td>${user.totalOrders || 0}</td>
                            <td>₹${(user.totalSpent || 0).toLocaleString()}</td>
                            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                            <td>
                                <button onclick="viewUserDetails('${user._id}')" class="btn-icon" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button onclick="sendUserMessage('${user._id}')" class="btn-icon" title="Send Message">
                                    <i class="fas fa-envelope"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        if (data.users.length === 0) {
            container.innerHTML = '<div class="empty-state">No users found</div>';
        }
        
        renderPagination('users', data.pagination);
        
    } catch (error) {
        console.error('Failed to load users:', error);
        showToast('Failed to load users', 'error');
    }
}

function filterUsers() {
    currentPage.users = 1;
    loadUsers();
}

function viewUserDetails(userId) {
    showToast('User details feature coming soon', 'info');
}

function sendUserMessage(userId) {
    const message = prompt('Enter message to send:');
    if (message) {
        showToast(`Message sent to user`, 'success');
        logActivity('user', `Sent message to user ${userId}`);
    }
}

// ============================================
// DELIVERY PARTNERS
// ============================================

async function loadDeliveryPartners() {
    try {
        const response = await fetch(`${API_URL}/admin?action=delivery-partners`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('deliveryPartnersList');
        container.innerHTML = (data.partners || []).map(partner => `
            <div class="delivery-card">
                <div class="delivery-header">
                    <div class="delivery-info">
                        <i class="fas fa-user-circle"></i>
                        <div>
                            <strong>${partner.name}</strong>
                            <div class="delivery-status ${partner.status}">${partner.status}</div>
                        </div>
                    </div>
                    <div class="delivery-rating">
                        <i class="fas fa-star"></i> ${partner.rating || '4.5'}
                    </div>
                </div>
                <div class="delivery-stats">
                    <div>📦 Orders: ${partner.ordersDelivered || 0}</div>
                    <div>⏱️ Avg Time: ${partner.avgDeliveryTime || '25'} min</div>
                    <div>💰 Earnings: ₹${partner.earnings || 0}</div>
                </div>
                <div class="delivery-actions">
                    <button onclick="assignOrderToPartner('${partner._id}')" class="btn-small">Assign Order</button>
                    <button onclick="viewPartnerDetails('${partner._id}')" class="btn-small">View Details</button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Failed to load delivery partners:', error);
    }
}

function showAddPartnerModal() {
    showToast('Add partner feature coming soon', 'info');
}

// ============================================
// SUPPORT TICKETS
// ============================================

async function loadTickets() {
    try {
        const status = document.getElementById('ticketStatusFilter')?.value || 'all';
        const response = await fetch(`${API_URL}/admin?action=tickets&status=${status}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('ticketsList');
        container.innerHTML = (data.tickets || []).map(ticket => `
            <div class="ticket-card">
                <div class="ticket-header">
                    <div>
                        <strong>#${ticket.id}</strong>
                        <span class="ticket-status status-${ticket.status}">${ticket.status}</span>
                    </div>
                    <div>${new Date(ticket.createdAt).toLocaleString()}</div>
                </div>
                <div class="ticket-subject">${ticket.subject}</div>
                <div class="ticket-message">${ticket.message}</div>
                <div class="ticket-footer">
                    <span><i class="fas fa-user"></i> ${ticket.userName}</span>
                    <button onclick="replyToTicket('${ticket._id}')" class="btn-small">Reply</button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Failed to load tickets:', error);
    }
}

function filterTickets() {
    loadTickets();
}

function replyToTicket(ticketId) {
    const reply = prompt('Enter your reply:');
    if (reply) {
        showToast('Reply sent to customer', 'success');
        logActivity('ticket', `Replied to ticket ${ticketId}`);
    }
}

// ============================================
// REFUNDS MANAGEMENT
// ============================================

async function loadRefunds() {
    try {
        const response = await fetch(`${API_URL}/admin?action=refunds`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('refundsList');
        container.innerHTML = (data.refunds || []).map(refund => `
            <div class="refund-card">
                <div class="refund-header">
                    <div>Order: #${refund.orderNumber}</div>
                    <div class="refund-amount">₹${refund.amount}</div>
                </div>
                <div class="refund-reason">Reason: ${refund.reason}</div>
                <div class="refund-actions">
                    <button onclick="processRefund('${refund._id}', 'approve')" class="btn-small success">Approve</button>
                    <button onclick="processRefund('${refund._id}', 'reject')" class="btn-small danger">Reject</button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Failed to load refunds:', error);
    }
}

async function processRefund(refundId, action) {
    try {
        await fetch(`${API_URL}/admin/refunds/${refundId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ action })
        });
        showToast(`Refund ${action}d successfully`, 'success');
        logActivity('refund', `${action} refund ${refundId}`);
        loadRefunds();
    } catch (error) {
        showToast('Failed to process refund', 'error');
    }
}

function processPendingRefunds() {
    showToast('Processing pending refunds...', 'info');
    loadRefunds();
}

// ============================================
// REPORTS & EXPORTS
// ============================================

async function generateReport(type) {
    showToast(`Generating ${type} report...`, 'info');
    
    try {
        const response = await fetch(`${API_URL}/admin?action=report&type=${type}&format=json`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        
        // Convert to Excel
        const ws = XLSX.utils.json_to_sheet(data.data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `${type}_report`);
        XLSX.writeFile(wb, `${type}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        showToast(`Report generated successfully`, 'success');
        logActivity('report', `Generated ${type} report`);
        
    } catch (error) {
        showToast('Failed to generate report', 'error');
    }
}

async function exportProducts() {
    await generateReport('products');
}

async function exportOrders() {
    await generateReport('orders');
}

async function exportUsers() {
    await generateReport('users');
}

function importProducts() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.csv';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (event) => {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const products = XLSX.utils.sheet_to_json(sheet);
            
            for (const product of products) {
                await fetch(`${API_URL}/admin/products`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: JSON.stringify(product)
                });
            }
            
            showToast(`Imported ${products.length} products`, 'success');
            loadProducts();
        };
        reader.readAsArrayBuffer(file);
    };
    input.click();
}

// ============================================
// MARKETING TOOLS
// ============================================

async function sendEmailCampaign() {
    const content = document.getElementById('emailContent')?.value;
    if (!content) {
        showToast('Please enter email content', 'error');
        return;
    }
    
    try {
        await fetch(`${API_URL}/admin/marketing/email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ content })
        });
        showToast('Email campaign sent successfully', 'success');
        logActivity('marketing', 'Sent email campaign');
    } catch (error) {
        showToast('Failed to send email campaign', 'error');
    }
}

async function sendPushNotification() {
    const title = document.getElementById('notificationTitle')?.value;
    const body = document.getElementById('notificationBody')?.value;
    
    if (!title || !body) {
        showToast('Please enter both title and message', 'error');
        return;
    }
    
    try {
        await fetch(`${API_URL}/admin/marketing/push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ title, body })
        });
        showToast('Push notification sent', 'success');
        logActivity('marketing', 'Sent push notification');
    } catch (error) {
        showToast('Failed to send notification', 'error');
    }
}

async function generateBulkCoupons() {
    const count = parseInt(document.getElementById('couponCount')?.value);
    const value = parseFloat(document.getElementById('couponValue')?.value);
    const type = document.getElementById('couponType')?.value;
    
    if (!count || !value) {
        showToast('Please enter coupon count and value', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/admin/coupons/bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ count, value, type })
        });
        const data = await response.json();
        showToast(`Generated ${data.coupons.length} coupons`, 'success');
        logActivity('marketing', `Generated ${count} coupons`);
        
        // Download as CSV
        const csv = data.coupons.map(c => c.code).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'coupons.csv';
        a.click();
        
    } catch (error) {
        showToast('Failed to generate coupons', 'error');
    }
}

// ============================================
// SETTINGS
// ============================================

async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/admin/settings`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        
        if (data.settings) {
            document.getElementById('storeName').value = data.settings.storeName || 'Rado ஊT';
            document.getElementById('storeEmail').value = data.settings.storeEmail || '';
            document.getElementById('storePhone').value = data.settings.storePhone || '';
            document.getElementById('zone1Fee').value = data.settings.deliveryFees?.Zone1 || 0;
            document.getElementById('zone2Fee').value = data.settings.deliveryFees?.Zone2 || 30;
            document.getElementById('zone3Fee').value = data.settings.deliveryFees?.Zone3 || 60;
            document.getElementById('freeDeliveryThreshold').value = data.settings.freeDeliveryThreshold || 199;
            document.getElementById('defaultDeliveryTime').value = data.settings.defaultDeliveryTime || 30;
            document.getElementById('maxDeliveryRadius').value = data.settings.maxDeliveryRadius || 30;
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

async function saveSettings() {
    const settings = {
        storeName: document.getElementById('storeName').value,
        storeEmail: document.getElementById('storeEmail').value,
        storePhone: document.getElementById('storePhone').value,
        deliveryFees: {
            Zone1: parseInt(document.getElementById('zone1Fee').value),
            Zone2: parseInt(document.getElementById('zone2Fee').value),
            Zone3: parseInt(document.getElementById('zone3Fee').value)
        },
        freeDeliveryThreshold: parseInt(document.getElementById('freeDeliveryThreshold').value),
        defaultDeliveryTime: parseInt(document.getElementById('defaultDeliveryTime').value),
        maxDeliveryRadius: parseInt(document.getElementById('maxDeliveryRadius').value)
    };
    
    try {
        await fetch(`${API_URL}/admin/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(settings)
        });
        showToast('Settings saved successfully', 'success');
        logActivity('settings', 'Updated system settings');
    } catch (error) {
        showToast('Failed to save settings', 'error');
    }
}

// Settings tabs
document.querySelectorAll('.settings-tab')?.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${tabName}-settings`).classList.add('active');
    });
});

// ============================================
// ACTIVITY LOGS
// ============================================

let allLogs = [];

async function loadActivityLogs() {
    try {
        const response = await fetch(`${API_URL}/admin?action=logs`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        allLogs = data.logs || [];
        renderLogs(allLogs);
    } catch (error) {
        console.error('Failed to load logs:', error);
    }
}

function renderLogs(logs) {
    const container = document.getElementById('logsList');
    container.innerHTML = logs.map(log => `
        <div class="log-entry">
            <div class="log-time">${new Date(log.timestamp).toLocaleString()}</div>
            <div class="log-type type-${log.type}">${log.type}</div>
            <div class="log-action">${log.action}</div>
            <div class="log-user">by ${log.user || 'System'}</div>
        </div>
    `).join('');
    
    if (logs.length === 0) {
        container.innerHTML = '<div class="empty-state">No activity logs found</div>';
    }
}

function filterLogs() {
    const search = document.getElementById('logSearch')?.value.toLowerCase() || '';
    const type = document.getElementById('logTypeFilter')?.value || 'all';
    
    let filtered = allLogs;
    if (search) {
        filtered = filtered.filter(log => log.action.toLowerCase().includes(search));
    }
    if (type !== 'all') {
        filtered = filtered.filter(log => log.type === type);
    }
    
    renderLogs(filtered);
}

function logActivity(type, action) {
    // This would typically be sent to the server
    console.log(`[LOG] ${type}: ${action}`);
    // In production, send to server for persistence
}

// ============================================
// UTILITIES
// ============================================

function renderPagination(section, pagination) {
    const container = document.getElementById(`${section}Pagination`);
    if (!container || !pagination) return;
    
    const totalPages = pagination.pages || 1;
    const current = currentPage[section];
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div class="pagination-controls">';
    if (current > 1) {
        html += `<button onclick="changePage('${section}', ${current - 1})" class="page-btn">← Previous</button>`;
    }
    
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        html += `<button onclick="changePage('${section}', ${i})" class="page-btn ${i === current ? 'active' : ''}">${i}</button>`;
    }
    
    if (current < totalPages) {
        html += `<button onclick="changePage('${section}', ${current + 1})" class="page-btn">Next →</button>`;
    }
    html += '</div>';
    
    container.innerHTML = html;
}

function changePage(section, page) {
    currentPage[section] = page;
    
    switch(section) {
        case 'products':
            loadProducts();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'users':
            loadUsers();
            break;
    }
}

function setDateRange(range) {
    currentDateRange = range;
    loadDashboardStats();
    
    // Update active state on buttons
    document.querySelectorAll('.date-range button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(range)) {
            btn.classList.add('active');
        }
    });
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function startAutoRefresh() {
    setInterval(() => {
        loadDashboardStats();
    }, 30000); // Refresh every 30 seconds
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(section).classList.add('active');
        });
    });
    
    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// Initialize
checkAdminAuth();