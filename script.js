// script.js
document.addEventListener('DOMContentLoaded', function () {
    // ====== CẤU HÌNH BACKEND ======
    const API_BASE_URL = "https://web-ban-sach-99po.onrender.com"; // đổi thành URL backend khi deploy

    // ====== BIẾN DÙNG CHUNG ======
    const searchForm = document.querySelector('form[role="search"]');
    const searchInput = searchForm ? searchForm.querySelector('input[type="search"]') : null;
    const productCards = Array.from(document.querySelectorAll('.card'));
    // ====== LỌC & SẮP XẾP SẢN PHẨM ======
    (function initFilterAndSort() {
        const filterCategorySelect = document.getElementById('filterCategory');
        const sortBySelect = document.getElementById('sortBy');

        if (!filterCategorySelect && !sortBySelect) return;

        // Chuẩn hoá dữ liệu sản phẩm
        const items = productCards
            .map(card => {
                const priceEl = card.querySelector('.fw-bold');
                const col = card.closest('.col-md-3');
                const titleEl = card.querySelector('.card-title');

                // Chỉ xử lý những card thực sự là sản phẩm
                if (!priceEl || !col || !titleEl) return null;

                const rawPrice = priceEl.textContent || '';
                const priceNumber = parsePriceToNumber(rawPrice);
                const title = titleEl.textContent.trim();
                const category = card.dataset.category || 'khac';

                card.dataset.priceNumber = priceNumber;

                return { card, col, title, category };
            })
            .filter(Boolean);

        function applyFilterSort() {
            const categoryValue = filterCategorySelect ? filterCategorySelect.value : 'all';
            const sortValue = sortBySelect ? sortBySelect.value : 'none';

            let working = items.slice();

            // Lọc theo thể loại
            working.forEach(item => {
                const matchCategory =
                    categoryValue === 'all' || item.category === categoryValue;
                item.col.style.display = matchCategory ? '' : 'none';
            });

            // Lấy các item đang hiển thị để sắp xếp
            let visible = working.filter(item => item.col.style.display !== 'none');

            if (sortValue === 'price-asc' || sortValue === 'price-desc') {
                visible.sort((a, b) => {
                    const aPrice = parseFloat(a.card.dataset.priceNumber) || 0;
                    const bPrice = parseFloat(b.card.dataset.priceNumber) || 0;
                    return sortValue === 'price-asc' ? aPrice - bPrice : bPrice - aPrice;
                });
            } else if (sortValue === 'title-asc') {
                visible.sort((a, b) => a.title.localeCompare(b.title, 'vi'));
            }

            // Re-append để thay đổi thứ tự
            if (visible.length) {
                const row = visible[0].col.parentElement;
                visible.forEach(item => row.appendChild(item.col));
            }
        }

        if (filterCategorySelect) {
            filterCategorySelect.addEventListener('change', applyFilterSort);
        }
        if (sortBySelect) {
            sortBySelect.addEventListener('change', applyFilterSort);
        }
    })();

    const navItems = document.querySelectorAll('.header__navbar-item');
    const cartIcon = document.querySelector('.bi-cart-fill');
    const cartNavItem = cartIcon ? cartIcon.parentElement : null;

    let cartCount = 0;
    let baseCartText = cartNavItem ? cartNavItem.textContent.trim() : 'Giỏ hàng';

    // Loại bỏ phần (x) nếu có
    if (baseCartText.includes('(')) {
        baseCartText = baseCartText.split('(')[0].trim();
    }

    // ====== DỮ LIỆU GIỎ HÀNG + MODAL ======
    let cartItems = [];

    const cartModalEl = document.getElementById('cartModal');
    let cartModalInstance = null;
    if (window.bootstrap && cartModalEl) {
        cartModalInstance = new bootstrap.Modal(cartModalEl);
    }

    // MODAL THÔNG TIN CÁ NHÂN
    const profileModalEl = document.getElementById('profileModal');
    let profileModalInstance = null;
    if (window.bootstrap && profileModalEl) {
        profileModalInstance = new bootstrap.Modal(profileModalEl);
    }
        // ====== HÀM XỬ LÝ GIÁ TIỀN ======
    function parsePriceToNumber(priceStr) {
        if (!priceStr) return 0;
        // Lấy phần số trong chuỗi, bỏ $, chữ, khoảng trắng,...
        let numStr = priceStr.replace(/[^\d.,]/g, '');
        // Bỏ dấu . ngăn cách nghìn, thay , thành . nếu có
        numStr = numStr.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(numStr);
        return isNaN(num) ? 0 : num;
    }

    function formatCurrencyVND(number) {
        if (!number || isNaN(number)) number = 0;
        try {
            return number.toLocaleString('vi-VN', {
                style: 'currency',
                currency: 'VND'
            });
        } catch {
            // fallback nếu trình duyệt không hỗ trợ
            return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ';
        }
    }

       // ====== RENDER GIỎ HÀNG (CÓ NÚT XOÁ + TỔNG TIỀN) ======
    function renderCartToModal() {
        const cartList = document.getElementById('cartList');
        const totalEl = document.getElementById('cartTotalPrice');
        if (!cartList) return;

        cartList.innerHTML = '';
        if (totalEl) totalEl.textContent = '';

        if (cartItems.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'list-group-item text-center text-muted';
            emptyItem.textContent = 'Giỏ hàng của bạn đang trống.';
            cartList.appendChild(emptyItem);
            if (totalEl) totalEl.textContent = formatCurrencyVND(0);
            return;
        }

        let total = 0;

        cartItems.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';

            const priceNumber = parsePriceToNumber(item.price);
            const itemTotal = priceNumber * item.quantity;
            total += itemTotal;

            li.innerHTML = `
                <div>
                    <div class="fw-semibold">${item.title}</div>
                    <small class="text-muted d-block">${item.price}</small>
                    <small class="text-muted">Thành tiền: ${formatCurrencyVND(itemTotal)}</small>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span class="badge bg-primary rounded-pill">x${item.quantity}</span>
                    <button class="btn btn-danger btn-sm btn-remove" data-index="${index}">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </div>
            `;

            cartList.appendChild(li);
        });

        if (totalEl) {
            totalEl.textContent = formatCurrencyVND(total);
        }

        const removeBtns = document.querySelectorAll('.btn-remove');
        removeBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                const index = this.dataset.index;
                cartItems.splice(index, 1);

                cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
                updateCartDisplay();
                renderCartToModal();
                showToast('Đã xoá sản phẩm khỏi giỏ hàng!', 'success');
            });
        });
    }


    // ====== DANH SÁCH TITLE SẢN PHẨM (CHO GỢI Ý SEARCH) ======
    const productTitles = productCards
        .map(card => {
            const t = card.querySelector('.card-title');
            return t ? t.textContent.trim() : null;
        })
        .filter(Boolean);

    // ====== THÊM CSS SEARCH SUGGEST ======
    (function injectSuggestionStyles() {
        const style = document.createElement('style');
        style.textContent = `
        .search-wrapper-relative {
            position: relative;
            width: 100%;
        }
        .search-suggestions {
            position: absolute;
            top: 100%;
            left: 0;
            right: 50px;
            background: #fff;
            border: 1px solid #ddd;
            border-top: none;
            max-height: 220px;
            overflow-y: auto;
            z-index: 999;
            font-size: 0.9rem;
        }
        .search-suggestion-item {
            padding: 6px 10px;
            cursor: pointer;
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
        }
        .search-suggestion-item:hover {
            background-color: #f1f1f1;
        }
        .search-suggestion-empty {
            padding: 6px 10px;
            color: #777;
        }
        `;
        document.head.appendChild(style);
    })();

    // ====== TOAST ======
    function updateCartDisplay() {
        if (!cartNavItem) return;
        cartNavItem.innerHTML = `<i class="bi bi-cart-fill"></i> ${baseCartText} (${cartCount})`;
    }

    function createToastContainer() {
        let container = document.querySelector('.khai-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'khai-toast-container';
            container.style.position = 'fixed';
            container.style.bottom = '20px';
            container.style.right = '20px';
            container.style.zIndex = '9999';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '10px';
            document.body.appendChild(container);
        }
        return container;
    }

    function showToast(message, type = 'info') {
        const container = createToastContainer();
        const toast = document.createElement('div');
        toast.className = 'khai-toast';
        toast.style.minWidth = '220px';
        toast.style.maxWidth = '320px';
        toast.style.padding = '10px 14px';
        toast.style.borderRadius = '6px';
        toast.style.fontSize = '0.9rem';
        toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        toast.style.color = '#fff';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.justifyContent = 'space-between';
        toast.style.gap = '8px';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.2s ease';

        if (type === 'success') {
            toast.style.backgroundColor = '#198754';
        } else if (type === 'warning') {
            toast.style.backgroundColor = '#ffc107';
            toast.style.color = '#000';
        } else {
            toast.style.backgroundColor = '#0d6efd';
        }

        const span = document.createElement('span');
        span.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.border = 'none';
        closeBtn.style.background = 'transparent';
        closeBtn.style.color = 'inherit';
        closeBtn.style.fontSize = '1.1rem';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.lineHeight = '1';

        closeBtn.addEventListener('click', () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 200);
        });

        toast.appendChild(span);
        toast.appendChild(closeBtn);
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            if (!toast.isConnected) return;
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 200);
        }, 3000);
    }
        // ====== HÀM HIỂN THỊ LOADING TRÊN BUTTON ======
    function setButtonLoading(button, isLoading, loadingText = 'Đang xử lý...') {
        if (!button) return;

        if (isLoading) {
            if (!button.dataset.originalHtml) {
                button.dataset.originalHtml = button.innerHTML;
            }
            button.disabled = true;
            button.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                ${loadingText}
            `;
        } else {
            if (button.dataset.originalHtml) {
                button.innerHTML = button.dataset.originalHtml;
                delete button.dataset.originalHtml;
            }
            button.disabled = false;
        }
    }

    // ====== LỌC SẢN PHẨM ======
    function filterProductsByKeyword(keyword) {
        const kw = keyword.trim().toLowerCase();
        let matchCount = 0;

        productCards.forEach(card => {
            const col = card.closest('.col-md-3, .col-12, .col-6') || card;
            const titleEl = card.querySelector('.card-title');
            const textEl = card.querySelector('.card-text');

            const title = titleEl ? titleEl.textContent.toLowerCase() : '';
            const text = textEl ? textEl.textContent.toLowerCase() : '';

            if (!kw) {
                col.style.display = '';
                matchCount++;
                return;
            }

            if (title.includes(kw) || text.includes(kw)) {
                col.style.display = '';
                matchCount++;
            } else {
                col.style.display = 'none';
            }
        });

        if (kw) {
            if (matchCount === 0) {
                showToast('Không tìm thấy sản phẩm phù hợp.', 'warning');
            } else {
                showToast(`Tìm thấy ${matchCount} sản phẩm phù hợp.`, 'info');
            }
        }
    }

    // ====== SEARCH GỢI Ý ======
    function initSearchWithSuggestions() {
        if (!searchForm || !searchInput) return;

        searchInput.parentElement.classList.add('search-wrapper-relative');

        const suggestionsBox = document.createElement('div');
        suggestionsBox.className = 'search-suggestions';
        searchInput.parentElement.appendChild(suggestionsBox);

        function clearSuggestions() {
            suggestionsBox.innerHTML = '';
        }

        function renderSuggestions(keyword) {
            const kw = keyword.trim().toLowerCase();
            clearSuggestions();
            if (!kw) return;

            const matched = productTitles
                .filter(title => title.toLowerCase().includes(kw))
                .slice(0, 7);

            if (matched.length === 0) {
                const emptyItem = document.createElement('div');
                emptyItem.className = 'search-suggestion-empty';
                emptyItem.textContent = 'Không có gợi ý phù hợp';
                suggestionsBox.appendChild(emptyItem);
                return;
            }

            matched.forEach(title => {
                const item = document.createElement('div');
                item.className = 'search-suggestion-item';
                item.textContent = title;

                item.addEventListener('click', () => {
                    searchInput.value = title;
                    clearSuggestions();
                    filterProductsByKeyword(title);
                });

                suggestionsBox.appendChild(item);
            });
        }

        searchInput.addEventListener('input', function () {
            const value = this.value;
            if (!value) {
                filterProductsByKeyword('');
            }
            renderSuggestions(value);
        });

        searchForm.addEventListener('submit', function (e) {
            e.preventDefault();
            filterProductsByKeyword(searchInput.value);
            clearSuggestions();
        });

        document.addEventListener('click', function (e) {
            if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
                clearSuggestions();
            }
        });
    }

    // ====== NÚT THÊM GIỎ HÀNG ======
    const buyButtons = document.querySelectorAll('.card .btn.btn-primary');

    buyButtons.forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();

            const card = btn.closest('.card');
            const titleEl = card ? card.querySelector('.card-title') : null;
            const priceEl = card ? card.querySelector('.fw-bold') : null;

            const title = titleEl ? titleEl.textContent.trim() : 'Sản phẩm';
            const price = priceEl ? priceEl.textContent.replace('Giá:', '').trim() : '';

            cartCount++;

            const existedIndex = cartItems.findIndex(
                item => item.title === title && item.price === price
            );
            if (existedIndex > -1) {
                cartItems[existedIndex].quantity += 1;
            } else {
                cartItems.push({ title, price, quantity: 1 });
            }

            updateCartDisplay();
            showToast(`Đã thêm "${title}" ${price ? `(${price})` : ''} vào giỏ hàng.`, 'success');
        });
    });

    // ====== KHU SẢN PHẨM ======
    const productSectionTitle = Array.from(document.querySelectorAll('h1.text-center'))
        .find(h1 => h1.textContent && h1.textContent.toUpperCase().includes('DANH MỤC SẢN PHẨM'));
    const productSection = productSectionTitle ? productSectionTitle.parentElement : null;

    // ====== MODAL TÀI KHOẢN (LOGIN / REGISTER GỌI BACKEND) ======
    let accountModalInstance = null;
    let accountNavItem = null;

    function createAccountModal() {
        if (document.getElementById('accountModal')) return;

        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = `
        <div class="modal fade" id="accountModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Tài khoản</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button>
              </div>
              <div class="modal-body">
                <ul class="nav nav-tabs mb-3" id="accountTab" role="tablist">
                  <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="login-tab" data-bs-toggle="tab"
                      data-bs-target="#login-pane" type="button" role="tab">Đăng nhập</button>
                  </li>
                  <li class="nav-item" role="presentation">
                    <button class="nav-link" id="register-tab" data-bs-toggle="tab"
                      data-bs-target="#register-pane" type="button" role="tab">Đăng ký</button>
                  </li>
                </ul>
                <div class="tab-content">
                  <div class="tab-pane fade show active" id="login-pane" role="tabpanel">
                    <form id="loginForm">
                      <div class="mb-3">
                        <label class="form-label">Email</label>
                        <input type="text" class="form-control" id="loginUsername" placeholder="email@example.com">
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Mật khẩu</label>
                        <input type="password" class="form-control" id="loginPassword" placeholder="••••••">
                      </div>
                      <button type="submit" class="btn btn-primary w-100">Đăng nhập</button>
                    </form>
                    <div class="mt-3 small text-muted">
                      * Thông tin đăng nhập sẽ được gửi tới backend để kiểm tra.
                    </div>
                  </div>
                  <div class="tab-pane fade" id="register-pane" role="tabpanel">
                    <form id="registerForm">
                      <div class="mb-3">
                        <label class="form-label">Họ và tên</label>
                        <input type="text" class="form-control" id="registerFullName" placeholder="Nhập họ tên">
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-control" id="registerEmail" placeholder="email@example.com">
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Mật khẩu</label>
                        <input type="password" class="form-control" id="registerPassword" placeholder="••••••">
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Nhập lại mật khẩu</label>
                        <input type="password" class="form-control" id="registerPassword2" placeholder="••••••">
                      </div>
                      <button type="submit" class="btn btn-success w-100">Đăng ký</button>
                    </form>
                    <div class="mt-3 small text-muted">
                      * Dữ liệu được gửi lên backend (RAM), không lưu DB thật.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>`;
        document.body.appendChild(modalDiv.firstElementChild);

        const modalEl = document.getElementById('accountModal');
        if (window.bootstrap && modalEl) {
            accountModalInstance = new bootstrap.Modal(modalEl);
        }

        const loginForm = document.getElementById('loginForm');
        const loginUsernameInput = document.getElementById('loginUsername');
        const loginPasswordInput = document.getElementById('loginPassword');

        const registerForm = document.getElementById('registerForm');
        const registerFullNameInput = document.getElementById('registerFullName');
        const registerEmailInput = document.getElementById('registerEmail');
        const registerPasswordInput = document.getElementById('registerPassword');
        const registerPassword2Input = document.getElementById('registerPassword2');

        // Đăng nhập
                if (loginForm) {
            loginForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const email = loginUsernameInput.value.trim();
                const password = loginPasswordInput.value.trim();

                if (!email) {
                    showToast('Vui lòng nhập email.', 'warning');
                    return;
                }
                if (!password) {
                    showToast('Vui lòng nhập mật khẩu.', 'warning');
                    return;
                }

                const submitBtn = loginForm.querySelector('button[type="submit"]');
                setButtonLoading(submitBtn, true, 'Đang đăng nhập...');

                try {
                    const response = await fetch(`${API_BASE_URL}/api/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });

                    if (!response.ok) {
                        const errData = await response.json().catch(() => ({}));
                        showToast(errData.message || 'Đăng nhập thất bại trên server.', 'warning');
                        return;
                    }

                    const data = await response.json();
                    const username = data.fullName || email;
                    localStorage.setItem('username', username);
                    updateAccountUI(username);
                    showToast('Đăng nhập thành công!', 'success');

                    if (accountModalInstance) {
                        accountModalInstance.hide();
                    }
                } catch (error) {
                    console.error(error);
                    showToast('Không thể kết nối server để đăng nhập. Vui lòng kiểm tra lại backend.', 'warning');
                } finally {
                    setButtonLoading(submitBtn, false);
                }
            });
        }


                if (registerForm) {
            registerForm.addEventListener('submit', async function (e) {
                e.preventDefault();

                const fullName = registerFullNameInput.value.trim();
                const email = registerEmailInput.value.trim();
                const pw1 = registerPasswordInput.value.trim();
                const pw2 = registerPassword2Input.value.trim();

                if (!fullName || !email || !pw1 || !pw2) {
                    showToast('Vui lòng điền đầy đủ thông tin.', 'warning');
                    return;
                }
                if (pw1 !== pw2) {
                    showToast('Mật khẩu nhập lại không khớp.', 'warning');
                    return;
                }

                const submitBtn = registerForm.querySelector('button[type="submit"]');
                setButtonLoading(submitBtn, true, 'Đang đăng ký...');

                try {
                    const response = await fetch(`${API_BASE_URL}/api/register`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fullName, email, password: pw1 })
                    });

                    if (!response.ok) {
                        const errData = await response.json().catch(() => ({}));
                        showToast(errData.message || 'Đăng ký thất bại trên server.', 'warning');
                        return;
                    }

                    showToast('Đăng ký thành công! Hãy dùng email/mật khẩu để đăng nhập.', 'success');

                    if (loginUsernameInput) loginUsernameInput.value = email;
                    if (loginPasswordInput) loginPasswordInput.value = pw1;

                    const loginTabBtn = document.getElementById('login-tab');
                    if (loginTabBtn) {
                        loginTabBtn.click();
                    }
                } catch (error) {
                    console.error(error);
                    showToast('Không thể kết nối server để đăng ký. Vui lòng kiểm tra lại backend.', 'warning');
                } finally {
                    setButtonLoading(submitBtn, false);
                }
            });
        }

    }

    function updateAccountUI(username) {
        if (!accountNavItem) return;
        accountNavItem.innerHTML = `<i class="bi bi-person-fill"></i> Xin chào, ${username}`;
    }

    function resetAccountUI() {
        if (!accountNavItem) return;
        accountNavItem.innerHTML = `<i class="bi bi-person-fill"></i> Tài khoản`;
    }

    function initAccountFeature() {
        accountNavItem = Array.from(navItems).find(item =>
            item.textContent.includes('Tài khoản') || item.textContent.includes('Xin chào')
        );

        if (!accountNavItem) return;

        const savedUsername = localStorage.getItem('username');
        if (savedUsername) {
            updateAccountUI(savedUsername);
        }

        accountNavItem.style.cursor = 'pointer';

        accountNavItem.addEventListener('click', function (e) {
            e.preventDefault();
            const username = localStorage.getItem('username');
            if (username) {
                const confirmLogout = confirm(`Bạn đang đăng nhập là "${username}". Bạn có muốn đăng xuất không?`);
                if (confirmLogout) {
                    localStorage.removeItem('username');
                    resetAccountUI();
                    showToast('Đã đăng xuất.', 'info');
                }
            } else {
                createAccountModal();
                if (accountModalInstance) {
                    accountModalInstance.show();
                }
            }
        });
    }

    // ====== NAV HEADER ======
    navItems.forEach(item => {
        const text = item.textContent.trim();

        if (text.includes('Trang chủ')) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', function () {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        if (text.includes('Sản phẩm') && productSection) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', function () {
                productSection.scrollIntoView({ behavior: 'smooth' });
            });
        }

        if (text.includes('Liên hệ')) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', function () {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            });
        }

        if (text.includes('Thông báo')) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', function () {
                showToast('Hiện chưa có thông báo mới.', 'info');
            });
        }

        if (text.includes('Giỏ hàng')) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', function (e) {
                e.preventDefault();
                renderCartToModal();
                if (cartModalInstance) {
                    cartModalInstance.show();
                } else {
                    if (cartCount === 0) {
                        showToast('Giỏ hàng của bạn đang trống.', 'warning');
                    } else {
                        showToast(`Giỏ hàng hiện có ${cartCount} sản phẩm.`, 'info');
                    }
                }
            });
        }
    });

    // ====== CATEGORY BOX ======
    const categoryBoxes = document.querySelectorAll('.category-box');
    categoryBoxes.forEach(box => {
        box.style.cursor = 'pointer';
        box.addEventListener('click', function (e) {
            e.preventDefault();
            const categoryName = box.querySelector('p') ? box.querySelector('p').textContent.trim() : 'Danh mục';
            if (productSection) {
                productSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // ====== KHỞI TẠO SEARCH + ACCOUNT ======
    initSearchWithSuggestions();
    initAccountFeature();

    // ====== THÔNG TIN CÁ NHÂN & CHECKOUT & AI ======
    (function initProfileAndCheckoutGuard() {
        const profileFullNameInput = document.querySelector('#profile-fullname');
        const profileEmailInput = document.querySelector('#profile-email');
        const profilePhoneInput = document.querySelector('#profile-phone');
        const profileAddressInput = document.querySelector('#profile-address');
        const profileSaveBtn = document.querySelector('#profile-save');

        const nameError = document.querySelector('#profile-fullname-error');
        const emailError = document.querySelector('#profile-email-error');
        const phoneError = document.querySelector('#profile-phone-error');
        const addressError = document.querySelector('#profile-address-error');

        if (!profileFullNameInput || !profileEmailInput || !profilePhoneInput || !profileAddressInput) {
            return;
        }

        let userProfile = {};
        try {
            userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        } catch (e) {
            userProfile = {};
        }

        function isProfileCompleted() {
            return !!(
                userProfile.fullName &&
                userProfile.email &&
                userProfile.phone &&
                userProfile.address
            );
        }

        function fillProfileFormFromData() {
            if (userProfile.fullName) profileFullNameInput.value = userProfile.fullName;
            if (userProfile.email) profileEmailInput.value = userProfile.email;
            if (userProfile.phone) profilePhoneInput.value = userProfile.phone;
            if (userProfile.address) profileAddressInput.value = userProfile.address;
        }

        function clearProfileErrors() {
            [profileFullNameInput, profileEmailInput, profilePhoneInput, profileAddressInput].forEach(input => {
                input.classList.remove('is-invalid');
            });
            [nameError, emailError, phoneError, addressError].forEach(el => {
                if (el) el.classList.add('d-none');
            });
        }

        function validateProfileForm() {
            clearProfileErrors();
            let valid = true;

            const fullName = profileFullNameInput.value.trim();
            const email = profileEmailInput.value.trim();
            const phone = profilePhoneInput.value.trim();
            const address = profileAddressInput.value.trim();

            if (!fullName) {
                profileFullNameInput.classList.add('is-invalid');
                if (nameError) nameError.classList.remove('d-none');
                valid = false;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                profileEmailInput.classList.add('is-invalid');
                if (emailError) emailError.classList.remove('d-none');
                valid = false;
            }

            if (!phone) {
                profilePhoneInput.classList.add('is-invalid');
                if (phoneError) phoneError.classList.remove('d-none');
                valid = false;
            }

            if (!address) {
                profileAddressInput.classList.add('is-invalid');
                if (addressError) addressError.classList.remove('d-none');
                valid = false;
            }

            if (!valid) {
                showToast('Vui lòng kiểm tra lại thông tin cá nhân.', 'warning');
                return false;
            }

            userProfile = { fullName, email, phone, address };
            return true;
        }

        // Chặn mở "Thông tin cá nhân" nếu chưa đăng nhập
        (function initProfileNavGuard() {
            const profileNavItem = document.getElementById('profileNavItem');
            if (!profileNavItem) return;

            profileNavItem.addEventListener('click', function (e) {
                e.preventDefault();

                const username = localStorage.getItem('username');

                if (!username) {
                    showToast('Vui lòng đăng nhập trước khi xem thông tin cá nhân.', 'warning');
                    return;
                }

                if (profileModalInstance) {
                    profileModalInstance.show();
                }
            });
        })();

        fillProfileFormFromData();

        if (profileSaveBtn) {
            profileSaveBtn.addEventListener('click', function (e) {
                e.preventDefault();

                if (!validateProfileForm()) {
                    return;
                }

                localStorage.setItem('userProfile', JSON.stringify(userProfile));
                showToast('Lưu thông tin cá nhân thành công!', 'success');
            });
        }

        // ====== CHECKOUT GỌI BACKEND ======
                const checkoutButtons = document.querySelectorAll('.js-checkout, .btn-checkout, [data-role="checkout"]');

        checkoutButtons.forEach(btn => {
            btn.addEventListener('click', async function (e) {
                e.preventDefault();

                const username = localStorage.getItem('username');
                if (!username) {
                    showToast('Vui lòng đăng nhập trước khi thanh toán.', 'warning');
                    return;
                }

                if (cartItems.length === 0) {
                    showToast('Giỏ hàng của bạn đang trống! Vui lòng thêm sản phẩm trước khi thanh toán.', 'warning');
                    return;
                }

                if (!isProfileCompleted()) {
                    if (typeof validateProfileForm === 'function') {
                        validateProfileForm();
                    }

                    showToast('Vui lòng nhập đầy đủ thông tin cá nhân trước khi thanh toán.', 'warning');

                    if (profileModalInstance) {
                        profileModalInstance.show();
                    } else {
                        const profileSection = document.querySelector('#profile');
                        if (profileSection) {
                            profileSection.scrollIntoView({ behavior: 'smooth' });
                        }
                    }
                    return;
                }

                setButtonLoading(btn, true, 'Đang thanh toán...');

                try {
                    const response = await fetch(`${API_BASE_URL}/api/checkout`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            cartItems,
                            userProfile
                        })
                    });

                    if (!response.ok) {
                        const errData = await response.json().catch(() => ({}));
                        showToast(errData.message || 'Thanh toán thất bại trên server.', 'warning');
                        return;
                    }

                    const data = await response.json();
                    const orderId = data.orderId || 'N/A';

                    showToast(`Đặt hàng thành công! Mã đơn: ${orderId}`, 'success');

                    cartItems = [];
                    cartCount = 0;
                    updateCartDisplay();
                    renderCartToModal();

                    if (cartModalInstance) {
                        cartModalInstance.hide();
                    }
                } catch (error) {
                    console.error(error);
                    showToast('Không thể kết nối server để thanh toán. Vui lòng kiểm tra lại backend.', 'warning');
                } finally {
                    setButtonLoading(btn, false);
                }
            });
        });


        // ====== GỢI Ý SÁCH BẰNG AI ======
        (function initAiSuggest() {
            const btnAi = document.getElementById('btn-ai-suggest');
            const boxAi = document.getElementById('ai-suggestion-box');

            if (!btnAi || !boxAi) return;

                        btnAi.addEventListener('click', async function () {
                if (cartItems.length === 0) {
                    boxAi.textContent = 'Giỏ hàng đang trống, hãy thêm sách trước khi nhờ AI gợi ý.';
                    return;
                }

                boxAi.textContent = 'AI đang suy nghĩ, vui lòng chờ một chút...';
                setButtonLoading(btnAi, true, 'Đang gợi ý...');

                try {
                    const response = await fetch(`${API_BASE_URL}/api/ai-suggest`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cartItems })
                    });

                    if (!response.ok) {
                        boxAi.textContent = 'Không thể lấy gợi ý AI lúc này.';
                        return;
                    }

                    const data = await response.json();
                    boxAi.textContent = data.suggestions || 'AI chưa trả về gợi ý.';
                } catch (error) {
                    console.error(error);
                    boxAi.textContent = 'Lỗi kết nối đến server AI. Vui lòng kiểm tra lại backend.';
                } finally {
                    setButtonLoading(btnAi, false);
                }
            });

        })();

        const savedUsername = localStorage.getItem('username');
        if (savedUsername && !isProfileCompleted()) {
            showToast('Bạn đã đăng nhập, hãy bổ sung thông tin cá nhân trước khi thanh toán.', 'info');
        }
    })();
    // ====== LỌC THEO DANH MỤC TRÒN ======
(function initCircleCategoryFilter() {
    const categoryBoxes = document.querySelectorAll(".category-box");
    if (!categoryBoxes.length) return;

    const productItems = Array.from(document.querySelectorAll(".card")).map(card => {
        const col = card.closest(".col-md-3");
        const category = card.dataset.category || "khac";
        return { card, col, category };
    });

    categoryBoxes.forEach(box => {
        box.style.cursor = "pointer";

        box.addEventListener("click", function () {
            const cat = this.dataset.category;

            productItems.forEach(item => {
                if (cat === "all") {
                    item.col.style.display = "";
                } else {
                    item.col.style.display = (item.category === cat ? "" : "none");
                }
            });

            // Hiệu ứng highlight danh mục đang chọn
            categoryBoxes.forEach(b => b.classList.remove("active-category"));
            this.classList.add("active-category");

            window.scrollTo({ top: document.querySelector("#products").offsetTop - 50, behavior: "smooth" });
        });
    });
})();

});
