# BW08 Nguyễn Thị Huyền K244161786

Bài Phát triển Web kinh doanh, lớp K24416. HTML5, CSS, JavaScript thuần; không cần cài thư viện hay build.

## Chạy website

Mở thư mục này trong VS Code, dùng **Live Server** mở `index.html`. Hoặc chạy `python -m http.server 8000` tại thư mục gốc rồi truy cập `http://localhost:8000/`. Không mở bằng `file://` vì các tệp XML/JSON được đọc bằng AJAX.

- `index.html`: danh sách, tìm kiếm, xem nhanh, đánh giá, giỏ hàng và thanh toán giả lập.
- `admin.html`: đăng nhập, quản lý đơn, thống kê và tồn kho giả lập.
- `kiemthu.html`: chạy kiểm thử hành vi trong trình duyệt và tải nhật ký JSON.
- `docs/HUONG-DAN.md`: giải thích cách làm từng câu và các thao tác tự kiểm chứng.
- `docs/BW08-test-results.json`: kết quả lần kiểm thử thực tế trên localhost.

## Tài khoản thử nghiệm

| Vai trò | Email | Mật khẩu mô phỏng |
|---|---|---|
| ADMIN | admin@bw08.test | AdminBW08! |
| Khách hàng | khach@bw08.test | KhachBW08! |

Đây là đăng nhập phía trình duyệt phục vụ bài học. Tài khoản mẫu được công khai trong JSON; không dùng tài khoản thật.

## Nguồn dữ liệu

Nguồn sản phẩm duy nhất: https://fakestoreapi.com/products. Website thử gọi API trực tiếp. Nếu thất bại, website ghi rõ đang dùng **bản lưu API ngày 05/11/2026** trong `dataset/products.xml`; bản lưu này được chuyển từ phản hồi thực tế `dataset/api-products.json`.

Giá giữ USD theo API. Màu, size, tồn kho, khách hàng, nhân viên, đơn hàng và lịch sử đánh giá là **giả lập** theo BW08. Đánh giá XML được tính riêng với rating có sẵn của API. Xem `dataset/provenance.json`.

Đơn thanh toán lưu trong LocalStorage của từng origin/trình duyệt. `carts.xml` chứa 4 hóa đơn mẫu; xuất đơn ở trang ADMIN tạo tệp tải xuống và không sửa trực tiếp tệp XML trên GitHub Pages. Không có giao dịch tiền thật hoặc API thanh toán thật.

## Kết quả đã kiểm tra

Ngày 05/11/2026, Chrome trên localhost: 15 test đạt, 0 test cần sửa; kiểm chứng 4/2/1 cột ở 1280/800/390px, XML, giỏ hàng, validation và thống kê. GitHub Pages được ghi riêng sau khi xuất bản trong `docs/TRANG-THAI.md`. Kết quả localhost không tự động xác nhận phiên bản trên Pages.

Mã lớp học phần và ngày thi chưa được người dùng cung cấp; báo cáo để rõ hai trường này thay vì tự điền.
