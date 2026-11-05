# Hướng dẫn đọc và tự kiểm chứng BW08

Nguyễn Thị Huyền — K244161786 — K24416. Đối chiếu 3 trang đề BW08, không sử dụng yêu cầu riêng G09.

## Các phần của bài

| Câu | Tệp chính | Cách triển khai và tự kiểm chứng |
|---|---|---|
| 1 | dataset/products.xml, api-products.json, employees.json, customers.json, carts.xml; js/common.js | XHR đọc đúng API, JSON.parse chuyển văn bản thành object. productsToXML dùng createDocument/createElement/textContent rồi XMLSerializer. Bấm Tải products.xml để lưu phiên bản đang dùng. XML tĩnh đã chứa 20 sản phẩm từ phản hồi thật. Biến thể và hóa đơn bổ sung là giả lập. |
| 2 | index.html; js/store.js | header/nav/main/section/article/aside/footer. Form lọc ở aside, kiểm tra min/max/step và giá từ ≤ giá đến. Thử giá 10–30 USD được 5 sản phẩm; thử 50–30 báo lỗi; tìm từ không khớp thấy trạng thái rỗng. |
| 3 | css/main.css | Grid 4 cột từ 1024px; 2 cột từ 651–1023px; 1 cột đến 650px. Skeleton có animation shimmer trong lúc XHR chưa hoàn tất. DevTools giả lập 1280/800/390px để xem lại. |
| 4 | js/store.js handleProductClick | Một click listener trên productGrid; closest tìm button[data-action]. data-id định danh sản phẩm, data-variant lấy đúng màu/size đang chọn. Không đăng ký listener click riêng cho từng thẻ sản phẩm. |
| 5 | dataset/reviews.xml; js/common.js parseReviews; js/store.js showRatings | Quan hệ nhiều–nhiều qua product_id/customer_id. DOMParser kiểm tra XML lỗi, duyệt review, cộng điểm và số lượng theo product_id. Sản phẩm 1: (5+4+4)/3 hiển thị 4.3. Rating Detail có đủ 3 khách hàng mẫu. Điểm này độc lập API rating 3.9. |
| 6 | js/store.js shop.cart, addToCart, renderCart | Object items dùng khóa productId + biến thể. Thêm Đen/M hai lần và Kem/M một lần: 2 dòng, 3 món, $329.85. Tính tiền bằng số cent để tránh sai số thập phân; chặn số lượng vượt tồn. Mini-cart dùng position:absolute và z-index. |
| 7 | js/store.js checkoutField, placeOrder | Regex email và số di động Việt Nam 0/+84 với đầu 3/5/7/8/9. Kiểm tra input/blur/submit. Khi hợp lệ, mô phỏng dịch vụ bất đồng bộ 600ms, khóa bấm lặp, kiểm tra lại tồn rồi lưu LocalStorage. Không POST dữ liệu giao hàng đến API sản phẩm. |
| 8 | admin.html; js/admin.js | Đăng nhập admin từ employees.json, hiển thị đơn mẫu + đơn mới, xem chi tiết, đổi trạng thái, xuất XML và tồn kho. Chỉ đơn delivered tính doanh thu/số đã bán; hủy đơn mới hoàn lại tồn. Danh tính tài khoản mô phỏng lưu SessionStorage. |
| 9 | index.html; GitHub Pages | Tất cả đường dẫn tương đối, phù hợp Pages dưới thư mục repository. Mở URL gốc của Pages phải hiển thị index.html. Kiểm tra cả admin, dataset và ảnh. Trạng thái xuất bản ghi trong TRANG-THAI.md. |

## Luồng dữ liệu cần hiểu

XHR → JSON.parse → bổ sung variants → DOM XML → parseProducts → mảng sản phẩm → createElement/appendChild tạo giao diện. Dữ liệu người dùng/API hiển thị bằng textContent; không dùng eval hoặc ghép HTML từ dữ liệu ngoài.

reviews.xml → DOMParser → nhóm product_id → sum/count → span.rating-badge trên vùng ảnh. Thiếu review sẽ hiển thị “Chưa đánh giá”; XML lỗi có thông báo.

Giỏ object → kiểm tra Regex → dịch vụ thanh toán giả lập → bw08.orders.v1 trong LocalStorage → ADMIN hợp nhất với carts.xml → thống kê các đơn delivered. Các bước có hàm riêng để dễ giải thích.

## Tự kiểm chứng

1. Mở index qua HTTP và xem dòng nguồn. “API trực tiếp” chỉ xuất hiện sau khi XHR thành công và schema hợp lệ. “Bản lưu API” là ảnh chụp dữ liệu đã tải trước đó.
2. Mở Network, lọc products: request phải tới https://fakestoreapi.com/products. Kiểm tra Console nếu nguồn tải thất bại; không suy mọi lỗi mạng là CORS.
3. Thử các bộ lọc, 3 viewport, Xem nhanh và Rating Detail. Đổi màu/size trước khi thêm giỏ.
4. Thử email sai/số điện thoại sai, sau đó dùng thông tin giả lập hợp lệ và bấm thanh toán. Không nhập dữ liệu cá nhân thật để thử.
5. Vào ADMIN xem đơn mới, chuyển Đã giao rồi Đã hủy; đối chiếu số lượng và doanh thu.
6. Mở kiemthu.html, đóng các tab cửa hàng cùng origin rồi bấm Chạy kiểm thử. Bộ chạy sao lưu/khôi phục các khóa BW08; bấm Tải kết quả JSON để ghi lần chạy của bạn.
7. Với lỗi mạng, có thể dùng DevTools Offline để xác nhận bản lưu và nhãn nguồn. Các nhánh timeout, dung lượng LocalStorage đầy cần ghi “chưa kiểm chứng” nếu chưa thử.

## Giới hạn mô phỏng

Trang tĩnh không tự ghi products.xml/carts.xml lên máy chủ; nút xuất tạo tệp tải xuống để người dùng lưu. Kho và tài khoản chỉ mô phỏng trên từng trình duyệt, không đồng bộ nhiều người dùng hoặc xác thực bảo mật máy chủ. Các đơn mẫu đã nằm trong mốc tồn kho; chỉ đơn mới chưa hủy tiếp tục trừ tồn.

Ảnh cá nhân không có trong tài nguyên và không phải yêu cầu BW08. Footer đã sử dụng đúng họ tên, MSSV và lớp được cung cấp. Không suy diễn số điện thoại/email cá nhân từ repository.
