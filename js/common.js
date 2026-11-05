/* BW08: XHR, JSON/XML, DOM va LocalStorage dung chung. Khong can thu vien. */
var BW = {
    api: "https://fakestoreapi.com/products",
    keys: { cart: "bw08.cart.v1", orders: "bw08.orders.v1", customer: "bw08.customer.v1", admin: "bw08.admin.v1" },
    statuses: { pending: "Chờ xác nhận", processing: "Đang xử lý", delivered: "Đã giao", cancelled: "Đã hủy" },
    categories: { "men's clothing": "Thời trang nam", "women's clothing": "Thời trang nữ", jewelery: "Trang sức", electronics: "Công nghệ" }
};

function byId(id) { return document.getElementById(id); }
function node(tag, text, className) {
    var element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
}
function money(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value); }
function cents(value) { return Math.round(Number(value) * 100); }
function requestText(url) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.timeout = 12000;
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.responseText);
            else reject(new Error("HTTP " + xhr.status + " khi đọc " + url));
        };
        xhr.onerror = function() { reject(new Error("Lỗi kết nối hoặc chính sách CORS khi đọc " + url)); };
        xhr.ontimeout = function() { reject(new Error("Quá thời gian chờ 12 giây: " + url)); };
        xhr.send();
    });
}
function parseXML(text, rootName) {
    var xml = new DOMParser().parseFromString(text, "application/xml");
    if (xml.getElementsByTagName("parsererror").length || !xml.documentElement || xml.documentElement.nodeName !== rootName) {
        throw new Error("XML không hợp lệ hoặc thiếu gốc " + rootName);
    }
    return xml;
}
function xmlText(parent, tag) {
    var child = parent.getElementsByTagName(tag)[0];
    if (!child) throw new Error("XML thiếu trường " + tag);
    return child.textContent;
}
function readJSON(key, fallback) {
    try { var text = localStorage.getItem(key); return text === null ? fallback : JSON.parse(text); }
    catch (error) { console.warn("Không đọc được LocalStorage", key, error); return fallback; }
}
function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { throw new Error("Không lưu được LocalStorage. Hãy cho phép lưu trữ hoặc giải phóng dung lượng."); }
}
function parseProducts(text) {
    var xml = parseXML(text, "products");
    var list = xml.getElementsByTagName("product");
    var products = [], ids = {};
    for (var i = 0; i < list.length; i++) {
        var p = list[i];
        var product = { id: Number(p.getAttribute("id")), title: xmlText(p,"title"), price: Number(xmlText(p,"price")), description: xmlText(p,"description"), category: xmlText(p,"category"), image: xmlText(p,"image"), variants: [] };
        if (!Number.isInteger(product.id) || product.id <= 0 || ids[product.id] || !product.title.trim() || !Number.isFinite(product.price) || product.price < 0) throw new Error("Sản phẩm XML sai cấu trúc");
        ids[product.id] = true;
        var apiRating = p.getElementsByTagName("api_rating")[0];
        if (apiRating) product.apiRating = { rate:Number(apiRating.getAttribute("rate")), count:Number(apiRating.getAttribute("count")) };
        var variants = p.getElementsByTagName("variant");
        for (var j = 0; j < variants.length; j++) {
            var v = variants[j];
            var variant = { id: v.getAttribute("id"), color: v.getAttribute("color"), colorName: v.getAttribute("color_name"), size: v.getAttribute("size"), stock: Number(v.getAttribute("stock")) };
            if (!variant.id || !Number.isInteger(variant.stock) || variant.stock < 0) throw new Error("Biến thể XML sai cấu trúc");
            product.variants.push(variant);
        }
        if (!product.variants.length) throw new Error("Sản phẩm thiếu biến thể");
        products.push(product);
    }
    return { products: products, xml: xml, captured: xml.documentElement.getAttribute("captured_at") };
}
function enrichAPI(raw) {
    if (!Array.isArray(raw) || !raw.length) throw new Error("API không có danh sách sản phẩm");
    var result = [], ids = {};
    for (var i = 0; i < raw.length; i++) {
        var p = raw[i];
        if (!p || !Number.isInteger(p.id) || p.id <= 0 || ids[p.id] || typeof p.title !== "string" || typeof p.description !== "string" || typeof p.category !== "string" || typeof p.image !== "string" || typeof p.price !== "number" || !Number.isFinite(p.price) || p.price < 0) throw new Error("Phản hồi API không đúng cấu trúc");
        ids[p.id] = true;
        var product = { id:p.id, title:p.title, price:p.price, description:p.description, category:p.category, image:p.image, apiRating:p.rating, variants:[] };
        var sizes = p.category.indexOf("clothing") >= 0 ? ["M", "L"] : ["Standard"];
        var colors = [{id:"black", name:"Đen"}, {id:"cream", name:"Kem"}];
        for (var c = 0; c < colors.length; c++) {
            for (var s = 0; s < sizes.length; s++) {
                product.variants.push({ id: colors[c].id + "-" + sizes[s], color: colors[c].id, colorName: colors[c].name, size: sizes[s], stock: 4 + (p.id + c + s) % 5 });
            }
        }
        result.push(product);
    }
    return result;
}
/* Cau 1: Tao XML bang DOM, khong noi chuoi gia tri API vao markup. */
function productsToXML(products, capturedAt) {
    var xml = document.implementation.createDocument(null, "products", null);
    var root = xml.documentElement;
    root.setAttribute("source", BW.api);
    root.setAttribute("captured_at", capturedAt);
    root.setAttribute("currency", "USD");
    root.setAttribute("variant_source", "simulation");
    for (var i = 0; i < products.length; i++) {
        var product = products[i], p = xml.createElement("product");
        p.setAttribute("id", product.id);
        var fields = ["title", "price", "description", "category", "image"];
        for (var j = 0; j < fields.length; j++) {
            var field = xml.createElement(fields[j]);
            field.textContent = product[fields[j]];
            p.appendChild(field);
        }
        if (product.apiRating && Number.isFinite(product.apiRating.rate) && Number.isFinite(product.apiRating.count)) {
            var apiRating = xml.createElement("api_rating");
            apiRating.setAttribute("rate",product.apiRating.rate);
            apiRating.setAttribute("count",product.apiRating.count);
            p.appendChild(apiRating);
        }
        var variants = xml.createElement("variants");
        for (var k = 0; k < product.variants.length; k++) {
            var source = product.variants[k], v = xml.createElement("variant");
            v.setAttribute("id", source.id); v.setAttribute("color", source.color); v.setAttribute("color_name", source.colorName); v.setAttribute("size", source.size); v.setAttribute("stock", source.stock);
            variants.appendChild(v);
        }
        p.appendChild(variants); root.appendChild(p);
    }
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(xml);
}
function findProduct(products, id) { return products.find(function(p) { return p.id === Number(id); }); }
function findVariant(product, variantId) { return product && product.variants.find(function(v) { return v.id === variantId; }); }
function parseReviews(text) {
    var xml = parseXML(text, "reviews"), reviews = xml.getElementsByTagName("review"), map = {};
    for (var i = 0; i < reviews.length; i++) {
        var r = reviews[i], id = Number(xmlText(r,"product_id")), rating = Number(xmlText(r,"rating"));
        if (!Number.isInteger(id) || !Number.isFinite(rating) || rating < 1 || rating > 5) throw new Error("Đánh giá XML không hợp lệ");
        if (!map[id]) map[id] = { sum:0, count:0, average:0, reviews:[] };
        map[id].sum += rating; map[id].count++;
        map[id].reviews.push({ customerId:xmlText(r,"customer_id"), name:xmlText(r,"customer_name"), rating:rating, comment:xmlText(r,"comment"), date:xmlText(r,"date") });
    }
    for (var key in map) map[key].average = map[key].sum / map[key].count;
    return map;
}
function parseOrders(text) {
    var xml = parseXML(text,"carts"), rows = xml.getElementsByTagName("order"), result = [];
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i], items = row.getElementsByTagName("item");
        var order = { id:row.getAttribute("id"), date:xmlText(row,"date"), employeeId:xmlText(row,"employee_id"), customerId:xmlText(row,"customer_id"), customerName:xmlText(row,"customer_name"), email:xmlText(row,"email"), phone:xmlText(row,"phone"), address:xmlText(row,"address"), status:xmlText(row,"status"), seed:true, items:[] };
        for (var j = 0; j < items.length; j++) {
            var item = items[j];
            order.items.push({ productId:Number(item.getAttribute("product_id")), variantId:item.getAttribute("variant_id"), title:xmlText(item,"title"), colorName:xmlText(item,"color_name"), size:xmlText(item,"size"), quantity:Number(xmlText(item,"quantity")), price:Number(xmlText(item,"price")) });
        }
        order.total = orderTotal(order.items); result.push(order);
    }
    return result;
}
function orderTotal(items) { var sum = 0; for (var i = 0; i < items.length; i++) sum += cents(items[i].price) * items[i].quantity; return sum / 100; }
function localOrders() {
    var values = readJSON(BW.keys.orders, []);
    if (!Array.isArray(values)) return [];
    return values.filter(function(o) { return o && typeof o.id === "string" && BW.statuses[o.status] && Array.isArray(o.items) && o.items.every(function(it) { return it && Number.isInteger(it.quantity) && it.quantity > 0 && Number.isFinite(it.price) && it.price >= 0; }); });
}
function allOrders(seeds) {
    var merged = seeds.slice(), local = localOrders();
    for (var i = 0; i < local.length; i++) {
        var at = merged.findIndex(function(order) { return order.id === local[i].id; });
        if (at >= 0) merged[at] = local[i]; else merged.push(local[i]);
    }
    return merged.sort(function(a,b) { return b.date.localeCompare(a.date); });
}
function availableStock(product, variant) {
    var remaining = variant.stock, orders = localOrders();
    // Don mau da nam trong moc ton kho. Chi tru don moi tao tren trinh duyet.
    for (var i = 0; i < orders.length; i++) {
        if (orders[i].seed || orders[i].status === "cancelled") continue;
        for (var j = 0; j < orders[i].items.length; j++) {
            var item = orders[i].items[j];
            if (item.productId === product.id && item.variantId === variant.id) remaining -= item.quantity;
        }
    }
    return Math.max(0, remaining);
}
function productImage(src, title) {
    var image = node("img");
    image.alt = title; image.loading = "lazy";
    image.src = /^https:\/\/fakestoreapi\.com\/img\//.test(src) ? src : "images/placeholder.svg";
    image.addEventListener("error", function() { image.src = "images/placeholder.svg"; }, { once:true });
    return image;
}
function downloadText(text, filename, type) {
    var url = URL.createObjectURL(new Blob([text], {type:type || "application/xml;charset=utf-8"}));
    var link = node("a"); link.href = url; link.download = filename; link.click();
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}
function wireDialogs() {
    var buttons = document.querySelectorAll("[data-close]");
    for (var i = 0; i < buttons.length; i++) buttons[i].addEventListener("click", function() { byId(this.dataset.close).close(); });
}
