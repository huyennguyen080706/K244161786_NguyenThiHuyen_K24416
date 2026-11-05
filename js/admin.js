var admin = { employees:[], seeds:[], products:[], session:null, ready:false };
function validAdmin() { return admin.session && admin.employees.some(function(e) { return e.id === admin.session.id && e.role === "admin"; }); }
function loginAdmin(event) {
    event.preventDefault();
    var found = admin.employees.find(function(e) { return e.email.toLowerCase() === byId("adminEmail").value.trim().toLowerCase() && e.password === byId("adminPassword").value && e.role === "admin"; });
    if (!found) { byId("adminLoginError").textContent = "Email hoặc mật khẩu quản trị chưa đúng."; return; }
    admin.session = {id:found.id,name:found.name};
    try { sessionStorage.setItem(BW.keys.admin,JSON.stringify(admin.session)); } catch (error) { console.warn("Phiên quản trị chỉ ở bộ nhớ",error); }
    byId("adminPassword").value = ""; byId("adminLoginError").textContent = ""; renderAdmin();
}
async function loadAdmin() {
    byId("refreshAdmin").disabled = true;
    try {
        var results = await Promise.all([requestText("dataset/employees.json"),requestText("dataset/carts.xml"),requestText("dataset/products.xml")]);
        var employees = JSON.parse(results[0]);
        if (!Array.isArray(employees.employees)) throw new Error("Sai cấu trúc employees.json");
        admin.employees = employees.employees; admin.seeds = parseOrders(results[1]); admin.products = parseProducts(results[2]).products; admin.ready = true;
        byId("adminLoginButton").disabled = false;
        byId("adminStatus").textContent = "Dữ liệu mô phỏng · Cập nhật lúc " + new Date().toLocaleTimeString("vi-VN") + ". Thay đổi trạng thái lưu LocalStorage, không ghi đè file nguồn.";
        renderAdmin();
    } catch (error) { byId("adminLoginError").textContent = error.message; byId("adminStatus").textContent = error.message; }
    finally { byId("refreshAdmin").disabled = false; }
}
function renderAdmin() {
    var loggedIn = validAdmin(); byId("adminLoginPanel").hidden = loggedIn; byId("dashboard").hidden = !loggedIn; byId("logout").hidden = !loggedIn;
    if (!loggedIn) return;
    byId("employeeName").textContent = "Xin chào, " + admin.session.name + " · " + admin.session.id;
    var orders = allOrders(admin.seeds), revenue = 0, soldCount = 0, pending = 0, sales = {};
    for (var i = 0; i < orders.length; i++) {
        if (orders[i].status === "pending") pending++;
        if (orders[i].status !== "delivered") continue;
        revenue += cents(orderTotal(orders[i].items));
        for (var j = 0; j < orders[i].items.length; j++) {
            var item = orders[i].items[j]; soldCount += item.quantity;
            if (!sales[item.productId]) sales[item.productId] = {title:item.title,quantity:0,revenue:0};
            sales[item.productId].quantity += item.quantity; sales[item.productId].revenue += cents(item.price) * item.quantity;
        }
    }
    byId("statOrders").textContent = orders.length; byId("statPending").textContent = pending; byId("statRevenue").textContent = money(revenue/100); byId("statSold").textContent = soldCount;
    var body = byId("orderTable"); body.textContent = ""; var displayed = 0;
    for (var n = 0; n < orders.length; n++) {
        var order = orders[n]; if (byId("orderFilter").value && order.status !== byId("orderFilter").value) continue;
        displayed++;
        var row = node("tr"), identity = node("td");
        identity.append(node("strong",order.id),node("br"),node("span",new Date(order.date).toLocaleString("vi-VN"),"hint"));
        row.append(identity,node("td",order.customerName + " · " + order.customerId),node("td",order.employeeId),node("td",money(orderTotal(order.items))));
        var statusCell = node("td"), select = node("select"); select.dataset.orderId = order.id; select.setAttribute("aria-label","Trạng thái đơn " + order.id);
        for (var key in BW.statuses) { var option = node("option",BW.statuses[key]); option.value = key; select.appendChild(option); }
        select.value = order.status; statusCell.appendChild(select); row.appendChild(statusCell);
        var actionCell = node("td"), button = node("button","Xem chi tiết","text-button"); button.dataset.orderId = order.id; actionCell.appendChild(button); row.appendChild(actionCell); body.appendChild(row);
    }
    byId("noOrders").hidden = displayed !== 0;
    var soldBody = byId("soldTable"); soldBody.textContent = "";
    var sorted = Object.keys(sales).sort(function(a,b) { return sales[b].quantity-sales[a].quantity; });
    for (var k = 0; k < sorted.length; k++) {
        var sale = sales[sorted[k]], soldRow = node("tr"), barCell = node("td"), track = node("div",undefined,"bar-track"), fill = node("div",undefined,"bar-fill");
        fill.style.width = (sale.quantity / soldCount * 100) + "%"; track.appendChild(fill); barCell.appendChild(track);
        soldRow.append(node("td",sale.title),node("td",sale.quantity),node("td",money(sale.revenue/100)),barCell); soldBody.appendChild(soldRow);
    }
    if (!sorted.length) { var empty = node("tr"), td = node("td","Chưa có sản phẩm từ đơn đã giao."); td.colSpan = 4; empty.appendChild(td); soldBody.appendChild(empty); }
    var inventory = byId("inventoryTable"); inventory.textContent = "";
    for (var p = 0; p < admin.products.length; p++) {
        for (var v = 0; v < admin.products[p].variants.length; v++) {
            var product = admin.products[p], variant = product.variants[v], invRow = node("tr");
            invRow.append(node("td",product.id),node("td",product.title),node("td",variant.colorName + " / " + variant.size),node("td",availableStock(product,variant))); inventory.appendChild(invRow);
        }
    }
}
function changeOrder(event) {
    if (!validAdmin() || !event.target.matches("select[data-order-id]")) return;
    var select = event.target, order = allOrders(admin.seeds).find(function(o) { return o.id === select.dataset.orderId; });
    if (!order || !BW.statuses[select.value]) return;
    // Kho chi duoc giu lai neu kho con du khi khoi phuc mot don moi da huy.
    if (!order.seed && order.status === "cancelled" && select.value !== "cancelled") {
        for (var i = 0; i < order.items.length; i++) {
            var item = order.items[i], p = findProduct(admin.products,item.productId), v = findVariant(p,item.variantId);
            if (!v || item.quantity > availableStock(p,v)) { byId("adminStatus").textContent = "Không khôi phục được đơn: tồn kho không đủ."; renderAdmin(); return; }
        }
    }
    order.status = select.value; order.employeeId = admin.session.id;
    var orders = localOrders(), index = orders.findIndex(function(o) { return o.id === order.id; });
    if (index >= 0) orders[index] = order; else orders.push(order);
    try { writeJSON(BW.keys.orders,orders); byId("adminStatus").textContent = "Đã cập nhật " + order.id + " → " + BW.statuses[order.status] + "."; renderAdmin(); }
    catch (error) { byId("adminStatus").textContent = error.message; renderAdmin(); }
}
function orderDetail(event) {
    if (!validAdmin()) return;
    var button = event.target.closest("button[data-order-id]"); if (!button) return;
    var order = allOrders(admin.seeds).find(function(o) { return o.id === button.dataset.orderId; }); if (!order) return;
    var output = byId("orderDetail"); output.textContent = "";
    output.append(node("h3",order.id),node("p",order.customerName + " · " + order.phone),node("p",order.email),node("p",order.address),node("p","Nhân viên " + order.employeeId + " · " + BW.statuses[order.status]));
    for (var i = 0; i < order.items.length; i++) {
        var item = order.items[i], line = node("div",undefined,"order-line");
        line.append(node("strong",item.title),node("p",item.colorName + " / " + item.size + " · " + item.quantity + " × " + money(item.price) + " = " + money(cents(item.price) * item.quantity / 100))); output.appendChild(line);
    }
    output.appendChild(node("p","Tổng cộng: " + money(orderTotal(order.items)))); byId("orderDialog").showModal();
}
function exportOrders() {
    if (!validAdmin()) return;
    var xml = document.implementation.createDocument(null,"carts",null), root = xml.documentElement;
    root.setAttribute("source","simulation"); root.setAttribute("exported_at",new Date().toISOString());
    var orders = allOrders(admin.seeds);
    for (var i = 0; i < orders.length; i++) {
        var order = orders[i], row = xml.createElement("order"); row.setAttribute("id",order.id);
        var fields = {date:order.date,employee_id:order.employeeId,customer_id:order.customerId,customer_name:order.customerName,email:order.email,phone:order.phone,address:order.address,status:order.status};
        for (var key in fields) { var cell = xml.createElement(key); cell.textContent = fields[key]; row.appendChild(cell); }
        var details = xml.createElement("items");
        for (var j = 0; j < order.items.length; j++) {
            var source = order.items[j], item = xml.createElement("item"); item.setAttribute("product_id",source.productId); item.setAttribute("variant_id",source.variantId);
            var values = {title:source.title,color_name:source.colorName,size:source.size,quantity:source.quantity,price:source.price};
            for (var name in values) { var element = xml.createElement(name); element.textContent = values[name]; item.appendChild(element); }
            details.appendChild(item);
        }
        row.appendChild(details); root.appendChild(row);
    }
    downloadText('<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(xml),"carts-export.xml");
}
wireDialogs();
byId("adminLogin").addEventListener("submit",loginAdmin);
byId("logout").addEventListener("click",function() { admin.session = null; try { sessionStorage.removeItem(BW.keys.admin); } catch (error) { console.warn(error); } renderAdmin(); });
byId("orderTable").addEventListener("change",changeOrder); byId("orderTable").addEventListener("click",orderDetail);
byId("orderFilter").addEventListener("change",renderAdmin); byId("refreshAdmin").addEventListener("click",loadAdmin); byId("exportOrders").addEventListener("click",exportOrders);
window.addEventListener("storage",function(event) { if (event.key === BW.keys.orders) renderAdmin(); });
try { admin.session = JSON.parse(sessionStorage.getItem(BW.keys.admin)); } catch (error) { console.warn(error); }
loadAdmin();
