/* Luong du lieu: API -> object -> XML DOM -> danh sach -> gio hang -> don gia lap. */
var shop = { products:[], reviews:{}, cart:{ items:{} }, customers:[], customer:null, xml:"", loading:false, paying:false };
var toastTimer;
function showToast(message) {
    byId("toast").textContent = message; byId("toast").hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function() { byId("toast").hidden = true; }, 3500);
}
function showSkeleton() {
    var grid = byId("productGrid"); grid.textContent = ""; grid.setAttribute("aria-busy","true");
    byId("emptyState").hidden = true;
    for (var i = 0; i < 8; i++) { var card = node("div",undefined,"skeleton"); card.setAttribute("aria-hidden","true"); card.append(node("div"),node("p"),node("p"),node("p")); grid.appendChild(card); }
}
async function loadCatalog() {
    if (shop.loading) return;
    shop.loading = true; byId("reloadApi").disabled = true; byId("downloadXml").disabled = true;
    showSkeleton(); byId("dataStatus").textContent = "Đang kết nối Fake Store API…";
    try {
        var raw = JSON.parse(await requestText(BW.api));
        var enriched = enrichAPI(raw);
        shop.xml = productsToXML(enriched,new Date().toISOString());
        // Doc lai XML bang DOM de cung mot duong xu ly voi products.xml cuc bo.
        shop.products = parseProducts(shop.xml).products;
        byId("dataStatus").textContent = "API trực tiếp · " + shop.products.length + " sản phẩm · " + new Date().toLocaleTimeString("vi-VN") + ". Màu/size/tồn kho giả lập.";
        byId("dataStatus").dataset.source = "live-api";
    } catch (error) {
        console.warn(error);
        try {
            shop.xml = await requestText("dataset/products.xml");
            var snapshot = parseProducts(shop.xml); shop.products = snapshot.products;
            byId("dataStatus").textContent = "Chưa tải được API trực tiếp (" + error.message + "). Đang dùng bản lưu API ngày 05/11/2026 từ products.xml; màu/size/tồn kho giả lập.";
            byId("dataStatus").dataset.source = "api-snapshot";
        } catch (snapshotError) {
            shop.products = []; byId("dataStatus").textContent = "Không tải được sản phẩm: " + snapshotError.message + ". Hãy mở website qua HTTP và thử lại.";
            byId("dataStatus").dataset.source = "error";
        }
    }
    shop.loading = false; byId("reloadApi").disabled = false;
    byId("downloadXml").disabled = !shop.products.length;
    populateCategories(); restoreCart(); renderProducts(); renderCart();
}
function populateCategories() {
    var select = byId("category"), previous = select.value;
    select.textContent = ""; var first = node("option","Tất cả danh mục"); first.value = ""; select.appendChild(first);
    var seen = {};
    for (var i = 0; i < shop.products.length; i++) {
        var category = shop.products[i].category;
        if (seen[category]) continue;
        seen[category] = true; var option = node("option",BW.categories[category] || category); option.value = category; select.appendChild(option);
    }
    select.value = previous; if (select.selectedIndex < 0) select.value = "";
}
function ratingOf(id) { return shop.reviews[id] ? shop.reviews[id].average : null; }
function filterValid() {
    var low = byId("minPrice"), high = byId("maxPrice"); high.setCustomValidity("");
    if (low.value !== "" && high.value !== "" && Number(low.value) > Number(high.value)) high.setCustomValidity("Giá đến phải lớn hơn hoặc bằng giá từ.");
    var valid = byId("searchForm").checkValidity();
    byId("filterError").textContent = valid ? "" : "Kiểm tra khoảng giá: từ 0, giá từ không vượt giá đến.";
    return valid;
}
function renderProducts() {
    var grid = byId("productGrid"); grid.setAttribute("aria-busy","false");
    if (!filterValid()) return;
    var text = byId("searchText").value.trim().toLocaleLowerCase("vi"), category = byId("category").value, color = byId("color").value;
    var min = byId("minPrice").value === "" ? 0 : Number(byId("minPrice").value);
    var max = byId("maxPrice").value === "" ? Infinity : Number(byId("maxPrice").value), rating = Number(byId("minRating").value);
    var products = shop.products.filter(function(p) {
        return (!text || p.title.toLocaleLowerCase("vi").indexOf(text) >= 0) && (!category || p.category === category) && p.price >= min && p.price <= max && (!color || p.variants.some(function(v) { return v.color === color; })) && (rating === 0 || ratingOf(p.id) !== null && ratingOf(p.id) >= rating);
    });
    var sort = byId("sortBy").value;
    if (sort === "priceAsc") products.sort(function(a,b) { return a.price-b.price; });
    if (sort === "priceDesc") products.sort(function(a,b) { return b.price-a.price; });
    if (sort === "rating") products.sort(function(a,b) { return (ratingOf(b.id) || 0)-(ratingOf(a.id) || 0); });
    grid.textContent = "";
    for (var i = 0; i < products.length; i++) grid.appendChild(productCard(products[i],color));
    byId("resultCount").textContent = products.length + " / " + shop.products.length + " sản phẩm";
    byId("emptyState").hidden = products.length !== 0;
}
function variantSelect(product, id, preferredColor) {
    var select = node("select",undefined,"variant-select"); select.id = id;
    select.setAttribute("aria-label","Màu và kích cỡ của " + product.title);
    for (var i = 0; i < product.variants.length; i++) {
        var v = product.variants[i], option = node("option",v.colorName + " / " + v.size + " · " + availableStock(product,v) + " còn");
        option.value = v.id; select.appendChild(option);
    }
    var preferred = product.variants.find(function(v) { return (!preferredColor || v.color === preferredColor) && availableStock(product,v) > 0; });
    if (preferred) select.value = preferred.id;
    return select;
}
function actionButton(label, action, product, variant, className) {
    var button = node("button",label,className); button.type = "button";
    button.dataset.action = action; button.dataset.id = product.id; button.dataset.variant = variant;
    return button;
}
function productCard(product,color) {
    var card = node("article",undefined,"product-card"); card.dataset.id = product.id;
    var imageArea = node("div",undefined,"product-image"), rating = ratingOf(product.id);
    imageArea.appendChild(productImage(product.image,product.title));
    imageArea.appendChild(node("span",rating === null ? "Chưa đánh giá" : "★ " + rating.toFixed(1),"rating-badge"));
    var info = node("div",undefined,"product-info");
    info.append(node("p",BW.categories[product.category] || product.category,"product-category"),node("h3",product.title),node("p",money(product.price),"product-price"));
    var label = node("label","Màu / Kích cỡ"); label.htmlFor = "variant-" + product.id;
    var select = variantSelect(product,label.htmlFor,color), actions = node("div",undefined,"card-actions");
    var variant = findVariant(product,select.value);
    actions.append(actionButton("Thêm vào giỏ hàng","add",product,select.value,"primary"),actionButton("Xem nhanh","quick",product,select.value,"secondary"));
    actions.firstChild.disabled = availableStock(product,variant) === 0;
    info.append(label,select,node("span","Tồn kho & biến thể mô phỏng","stock-note"),actions,actionButton("Rating Detail (" + (shop.reviews[product.id] ? shop.reviews[product.id].count : 0) + ")","rating",product,select.value,"rating-detail"));
    card.append(imageArea,info); return card;
}
/* Cau 4: Duy nhat 1 click listener tren container; closest bat ca click vao con. */
function handleProductClick(event) {
    var button = event.target.closest("button[data-action]");
    if (!button || !byId("productGrid").contains(button)) return;
    var product = findProduct(shop.products,button.dataset.id);
    if (!product) return;
    var select = button.closest("article").querySelector("select");
    button.dataset.variant = select.value;
    if (button.dataset.action === "add") addToCart(product.id,button.dataset.variant);
    if (button.dataset.action === "quick") showQuick(product,button.dataset.variant);
    if (button.dataset.action === "rating") showRatings(product);
}
function showQuick(product,variantId) {
    var content = byId("quickContent"); content.textContent = "";
    var layout = node("div",undefined,"quick-layout"), info = node("div");
    layout.appendChild(productImage(product.image,product.title));
    info.append(node("p",BW.categories[product.category] || product.category,"eyebrow"),node("h2",product.title),node("p",money(product.price),"product-price"),node("p",product.description));
    var select = variantSelect(product,"quickVariant"); select.value = variantId;
    var add = node("button","Thêm vào giỏ hàng","primary wide");
    add.addEventListener("click",function() { addToCart(product.id,select.value); });
    info.append(select,node("p","Màu, size và tồn kho là dữ liệu giả lập.","hint"),add); layout.appendChild(info); content.appendChild(layout); byId("quickDialog").showModal();
}
function showRatings(product) {
    var content = byId("ratingContent"); content.textContent = ""; content.appendChild(node("h3",product.title));
    var rating = shop.reviews[product.id];
    if (!rating) content.appendChild(node("p","Chưa có đánh giá cho sản phẩm này."));
    else {
        content.appendChild(node("p","★ " + rating.average.toFixed(1) + " / 5 từ " + rating.count + " khách hàng"));
        for (var i = 0; i < rating.reviews.length; i++) {
            var r = rating.reviews[i], row = node("article",undefined,"review-row");
            row.append(node("h3",r.name + " · " + r.customerId),node("p","★ " + r.rating + " / 5 · " + r.date),node("p",r.comment)); content.appendChild(row);
        }
    }
    byId("ratingDialog").showModal();
}
function restoreCart() {
    var stored = readJSON(BW.keys.cart,{items:{}}), clean = {};
    if (stored && stored.items && typeof stored.items === "object") {
        for (var key in stored.items) {
            var item = stored.items[key];
            if (!item) continue;
            var product = findProduct(shop.products,item.productId), variant = findVariant(product,item.variantId);
            if (variant && Number.isInteger(item.quantity) && item.quantity > 0) clean[product.id + "|" + variant.id] = {productId:product.id,variantId:variant.id,quantity:Math.min(item.quantity,availableStock(product,variant))};
        }
    }
    shop.cart = {items:clean};
    for (var k in clean) if (clean[k].quantity === 0) delete clean[k];
}
function cartLines() {
    var lines = [];
    for (var key in shop.cart.items) {
        var item = shop.cart.items[key], product = findProduct(shop.products,item.productId), variant = findVariant(product,item.variantId);
        if (!variant) continue;
        lines.push({key:key,productId:product.id,variantId:variant.id,title:product.title,image:product.image,colorName:variant.colorName,size:variant.size,price:product.price,quantity:item.quantity});
    }
    return lines;
}
function addToCart(id,variantId) {
    if (shop.paying) return;
    var product = findProduct(shop.products,id), variant = findVariant(product,variantId); if (!variant) return;
    var key = product.id + "|" + variant.id, existing = shop.cart.items[key], quantity = existing ? existing.quantity + 1 : 1;
    if (quantity > availableStock(product,variant)) { showToast("Đã đạt số lượng tồn kho của biến thể này."); return; }
    var before = JSON.stringify(shop.cart);
    shop.cart.items[key] = {productId:product.id,variantId:variant.id,quantity:quantity};
    try { writeJSON(BW.keys.cart,shop.cart); renderCart(); showToast("Đã thêm " + variant.colorName + " / " + variant.size + " vào giỏ."); }
    catch (error) { shop.cart = JSON.parse(before); showToast(error.message); }
}
function toggleCart(open) { byId("miniCart").hidden = !open; byId("cartToggle").setAttribute("aria-expanded",String(open)); }
function renderCart() {
    var container = byId("cartItems"), lines = cartLines(), count = 0; container.textContent = "";
    if (!lines.length) container.appendChild(node("p","Giỏ hàng đang trống. Chọn một món đồ bạn thích nhé.","hint"));
    for (var i = 0; i < lines.length; i++) {
        var item = lines[i]; count += item.quantity;
        var row = node("article",undefined,"cart-row"), info = node("div"), controls = node("div",undefined,"quantity-controls");
        row.appendChild(productImage(item.image,item.title)); info.append(node("h3",item.title),node("p",item.colorName + " / " + item.size + " · " + money(item.price)));
        var minus = node("button","−"), plus = node("button","+"), remove = node("button","Xóa","remove");
        minus.dataset.cartAction = "minus"; plus.dataset.cartAction = "plus"; remove.dataset.cartAction = "remove";
        minus.setAttribute("aria-label","Giảm số lượng " + item.title); plus.setAttribute("aria-label","Tăng số lượng " + item.title);
        var buttons = [minus,plus,remove]; for (var j = 0; j < buttons.length; j++) { buttons[j].dataset.key = item.key; buttons[j].disabled = shop.paying; }
        controls.append(minus,node("span",item.quantity),plus,remove); info.appendChild(controls); row.appendChild(info); container.appendChild(row);
    }
    byId("cartCount").textContent = count; byId("cartTotal").textContent = money(orderTotal(lines)); byId("checkoutTotal").textContent = money(orderTotal(lines)); byId("checkoutButton").disabled = !lines.length || shop.paying;
}
function updateCart(event) {
    var button = event.target.closest("button[data-cart-action]"); if (!button || shop.paying) return;
    var item = shop.cart.items[button.dataset.key]; if (!item) return;
    var product = findProduct(shop.products,item.productId), variant = findVariant(product,item.variantId), before = JSON.stringify(shop.cart);
    if (button.dataset.cartAction === "plus") { if (item.quantity >= availableStock(product,variant)) { showToast("Không thể vượt tồn kho."); return; } item.quantity++; }
    if (button.dataset.cartAction === "minus") item.quantity--;
    if (button.dataset.cartAction === "remove" || item.quantity <= 0) delete shop.cart.items[button.dataset.key];
    try { writeJSON(BW.keys.cart,shop.cart); renderCart(); } catch (error) { shop.cart = JSON.parse(before); showToast(error.message); }
}
function checkoutField(id) {
    var input = byId(id), value = input.value.trim(), error = "";
    if (!value) error = "Vui lòng nhập thông tin này.";
    else if (id === "phone" && !/^(?:0|\+84)(?:3|5|7|8|9)\d{8}$/.test(value)) error = "Nhập số di động Việt Nam: 0901234567 hoặc +84901234567.";
    else if (id === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) error = "Email chưa đúng định dạng, ví dụ ten@example.com.";
    else if (id === "fullName" && (value.length < 2 || value.length > 80)) error = "Họ tên cần từ 2 đến 80 ký tự.";
    else if (id === "address" && (value.length < 8 || value.length > 300)) error = "Địa chỉ cần từ 8 đến 300 ký tự.";
    else if (!input.validity.valid) error = "Thông tin vượt độ dài cho phép hoặc sai định dạng.";
    byId(id+"Error").textContent = error; input.setAttribute("aria-invalid",String(!!error)); return !error;
}
function openCheckout() {
    if (!cartLines().length) return;
    toggleCart(false); byId("checkoutStatus").textContent = "";
    if (shop.customer) { byId("fullName").value = shop.customer.name; byId("email").value = shop.customer.email; byId("phone").value = shop.customer.phone; byId("address").value = shop.customer.address; }
    byId("checkoutDialog").showModal();
}
/* Cau 7: Dich vu gia lap cuc bo, KHONG POST toi endpoint san pham. */
async function placeOrder(event) {
    event.preventDefault(); if (shop.paying) return;
    var ids = ["fullName","phone","email","address"], valid = true;
    for (var i = 0; i < ids.length; i++) if (!checkoutField(ids[i])) valid = false;
    if (!valid) { byId("checkoutStatus").textContent = "Kiểm tra lại thông tin giao hàng."; return; }
    if (!cartLines().length) { byId("checkoutStatus").textContent = "Giỏ hàng đang trống."; return; }
    shop.paying = true; byId("placeOrder").disabled = true; byId("checkoutStatus").textContent = "Đang xử lý thanh toán giả lập…"; renderCart();
    try {
        await new Promise(function(resolve) { setTimeout(resolve,600); });
        var lines = cartLines();
        if (!lines.length) throw new Error("Giỏ hàng đã thay đổi. Hãy kiểm tra lại.");
        for (var j = 0; j < lines.length; j++) { var p = findProduct(shop.products,lines[j].productId), v = findVariant(p,lines[j].variantId); if (lines[j].quantity > availableStock(p,v)) throw new Error("Số lượng tồn kho đã thay đổi. Hãy điều chỉnh giỏ hàng."); }
        var order = { id:"BW-" + Date.now() + "-" + Math.random().toString(36).slice(2,6), date:new Date().toISOString(), employeeId:"NV01", customerId:shop.customer ? shop.customer.id : "GUEST", customerName:byId("fullName").value.trim(), phone:byId("phone").value.trim(), email:byId("email").value.trim(), address:byId("address").value.trim(), status:"pending", seed:false, paymentMode:"simulation", items:lines, total:orderTotal(lines) };
        var orders = localOrders(); orders.push(order); writeJSON(BW.keys.orders,orders);
        shop.cart = {items:{}}; writeJSON(BW.keys.cart,shop.cart);
        byId("checkoutStatus").textContent = "Thanh toán giả lập thành công. Mã đơn " + order.id + " · " + money(order.total) + ". Đơn đã lưu trên trình duyệt này.";
        renderProducts(); renderCart(); showToast("Đã lưu đơn " + order.id);
    } catch (error) { byId("checkoutStatus").textContent = error.message; }
    finally { shop.paying = false; byId("placeOrder").disabled = false; renderCart(); }
}
function customerAction() {
    if (shop.customer) { shop.customer = null; sessionStorage.removeItem(BW.keys.customer); byId("customerButton").textContent = "Đăng nhập"; showToast("Đã đăng xuất khách hàng."); }
    else byId("loginDialog").showModal();
}
function loginCustomer(event) {
    event.preventDefault(); var email = byId("customerEmail").value.trim().toLowerCase(), password = byId("customerPassword").value;
    var found = shop.customers.find(function(c) { return c.email.toLowerCase() === email && c.password === password; });
    if (!found) { byId("loginError").textContent = "Email hoặc mật khẩu mô phỏng chưa đúng."; return; }
    shop.customer = {id:found.id,name:found.name,email:found.email,phone:found.phone,address:found.address};
    try { sessionStorage.setItem(BW.keys.customer,JSON.stringify(shop.customer)); } catch (error) { showToast("Phiên đăng nhập chỉ được giữ trong bộ nhớ."); }
    byId("customerButton").textContent = "Đăng xuất · " + found.name; byId("customerPassword").value = ""; byId("loginError").textContent = ""; byId("loginDialog").close();
}
async function startShop() {
    wireDialogs();
    byId("productGrid").addEventListener("click",handleProductClick);
    byId("productGrid").addEventListener("change",function(event) {
        if (!event.target.matches(".variant-select")) return;
        var article = event.target.closest("article"), product = findProduct(shop.products,article.dataset.id), variant = findVariant(product,event.target.value), buttons = article.querySelectorAll("[data-action]");
        for (var i = 0; i < buttons.length; i++) buttons[i].dataset.variant = variant.id;
        article.querySelector('[data-action="add"]').disabled = availableStock(product,variant) === 0;
    });
    byId("searchForm").addEventListener("submit",function(event) { event.preventDefault(); renderProducts(); });
    byId("searchForm").addEventListener("input",function() { var value = Number(byId("minRating").value); byId("ratingValue").textContent = value ? "Từ " + value + " sao" : "Tất cả mức sao"; if (!shop.loading) renderProducts(); });
    byId("searchForm").addEventListener("reset",function() { setTimeout(function() { byId("maxPrice").setCustomValidity(""); byId("ratingValue").textContent = "Tất cả mức sao"; renderProducts(); },0); });
    byId("resetFilters").addEventListener("click",function() { byId("searchForm").reset(); });
    byId("reloadApi").addEventListener("click",loadCatalog);
    byId("downloadXml").addEventListener("click",function() { downloadText(shop.xml,"products.xml"); });
    byId("cartToggle").addEventListener("click",function() { toggleCart(byId("miniCart").hidden); });
    byId("closeCart").addEventListener("click",function() { toggleCart(false); });
    byId("cartItems").addEventListener("click",updateCart);
    byId("checkoutButton").addEventListener("click",openCheckout);
    byId("checkoutForm").addEventListener("submit",placeOrder);
    ["fullName","phone","email","address"].forEach(function(id) { byId(id).addEventListener("input",function() { checkoutField(id); }); byId(id).addEventListener("blur",function() { checkoutField(id); }); });
    byId("customerButton").addEventListener("click",customerAction); byId("customerLogin").addEventListener("submit",loginCustomer);
    window.addEventListener("storage",function(event) { if (event.key === BW.keys.cart || event.key === BW.keys.orders) { restoreCart(); if (!shop.loading) renderProducts(); renderCart(); } });
    document.addEventListener("keydown",function(event) { if (event.key === "Escape") toggleCart(false); });
    showSkeleton();
    await Promise.all([
        requestText("dataset/reviews.xml").then(function(text) { shop.reviews = parseReviews(text); byId("reviewStatus").textContent = "★ Điểm trung bình từ reviews.xml (giả lập), độc lập với rating của API."; }).catch(function(error) { byId("reviewStatus").textContent = "Chưa đọc được đánh giá XML: " + error.message; }),
        requestText("dataset/customers.json").then(function(text) { var data = JSON.parse(text); if (!Array.isArray(data.customers)) throw new Error("Sai cấu trúc khách hàng"); shop.customers = data.customers; }).catch(function(error) { byId("loginError").textContent = "Không tải được tài khoản: " + error.message; })
    ]);
    try { var saved = JSON.parse(sessionStorage.getItem(BW.keys.customer)); if (saved && shop.customers.some(function(c) { return c.id === saved.id; })) { shop.customer = saved; byId("customerButton").textContent = "Đăng xuất · " + saved.name; } } catch (error) { console.warn(error); }
    await loadCatalog();
}
startShop();
