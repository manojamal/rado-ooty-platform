// User Management
let currentUser = null;

async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        showLoginPrompt();
        return;
    }
    
    try {
        const response = await fetch('/api/auth?action=profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            currentUser = await response.json();
            updateUserUI();
            updateCheckoutWithUser();
        } else {
            localStorage.removeItem('token');
            showLoginPrompt();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

function showLoginPrompt() {
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.innerHTML = `
            <button class="login-btn" onclick="location.href='/auth.html'">
                <i class="fas fa-user"></i> Login
            </button>
        `;
    }
}

function updateUserUI() {
    const userMenu = document.getElementById('userMenu');
    if (!userMenu || !currentUser) return;
    
    userMenu.innerHTML = `
        <div class="user-dropdown">
            <button class="user-btn">
                <i class="fas fa-user-circle"></i> ${currentUser.name.split(' ')[0]}
                <i class="fas fa-chevron-down"></i>
            </button>
            <div class="dropdown-content">
                <a href="/profile.html"><i class="fas fa-user"></i> My Profile</a>
                <a href="/orders.html"><i class="fas fa-history"></i> My Orders</a>
                <a href="/wishlist.html"><i class="fas fa-heart"></i> Wishlist</a>
                <a href="/wallet.html"><i class="fas fa-wallet"></i> Wallet</a>
                <a href="/referral.html"><i class="fas fa-gift"></i> Refer & Earn</a>
                <a href="#" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</a>
            </div>
        </div>
    `;
    
    // Add dropdown functionality
    const userBtn = document.querySelector('.user-btn');
    const dropdown = document.querySelector('.dropdown-content');
    if (userBtn && dropdown) {
        userBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        
        document.addEventListener('click', () => {
            dropdown.classList.remove('show');
        });
    }
}

function updateCheckoutWithUser() {
    if (!currentUser) return;
    
    const nameInput = document.getElementById('customerName');
    const phoneInput = document.getElementById('customerPhone');
    
    if (nameInput && currentUser.name) nameInput.value = currentUser.name;
    if (phoneInput && currentUser.phone) phoneInput.value = currentUser.phone;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Apply coupon
async function applyCoupon() {
    const code = document.getElementById('couponCode').value;
    if (!code) return;
    
    try {
        const response = await fetch(`/api/coupons?code=${code}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        const data = await response.json();
        if (data.valid) {
            window.coupon = data;
            showToast(`Coupon applied! ${data.discount}% off`, 'success');
            updateCheckoutSummary();
        } else {
            showToast('Invalid coupon code', 'error');
        }
    } catch (error) {
        showToast('Failed to apply coupon', 'error');
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Track order
async function trackOrder(orderId) {
    const modal = document.getElementById('trackingModal');
    const content = document.getElementById('trackingContent');
    
    try {
        const response = await fetch(`/api/tracking?orderId=${orderId}`);
        const data = await response.json();
        
        content.innerHTML = `
            <div class="tracking-status">
                <div class="status-badge ${data.currentStatus}">
                    ${data.currentStatus.toUpperCase()}
                </div>
                ${data.estimatedArrival ? `<div class="eta">Estimated arrival: ${data.estimatedArrival} minutes</div>` : ''}
                <div class="timeline">
                    ${data.timeline.map(item => `
                        <div class="timeline-item ${item.completed ? 'completed' : ''}">
                            <div class="timeline-icon">${item.completed ? '✓' : '○'}</div>
                            <div class="timeline-content">
                                <div class="timeline-title">${item.status}</div>
                                <div class="timeline-time">${item.time ? new Date(item.time).toLocaleString() : 'Pending'}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    } catch (error) {
        showToast('Failed to track order', 'error');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// Add to global scope
window.checkAuth = checkAuth;
window.logout = logout;
window.applyCoupon = applyCoupon;
window.trackOrder = trackOrder;
window.showToast = showToast;