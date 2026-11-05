# Trạng thái kiểm chứng BW08

Ngày kiểm tra: 05/11/2026. Chrome 156 trên Windows; origin http://127.0.0.1:8080.

| Câu | Trạng thái | Bằng chứng |
|---|---|---|
| 1 | Đã chạy đạt | API trực tiếp 20 sản phẩm; JSON gốc và XML có nguồn. TC02. |
| 2 | Đã chạy đạt | Semantic, form, khoảng giá sai và kết quả rỗng. TC03, TC05. |
| 3 | Đã chạy đạt | Skeleton animation và lưới 4/2/1 tại 1280/800/390px. TC01, TC04. |
| 4 | Đã chạy đạt | Click qua container mở đúng Xem nhanh, data-id/data-variant. TC07, TC08. |
| 5 | Đã chạy đạt | Trung bình 4.3, 3 khách hàng; XML sai/rỗng. TC06, TC12. |
| 6 | Đã chạy đạt | Gộp/tách biến thể, tổng tiền, giới hạn kho, khôi phục giỏ. TC08, TC09. |
| 7 | Đã chạy đạt | Regex trực tiếp và lưu đúng một đơn khi submit hai lần. TC10, TC11. |
| 8 | Đã chạy đạt | Phân vai mô phỏng, đổi trạng thái, doanh thu/hoàn tồn, đăng xuất. TC13–TC15. |
| 9 | Chưa kiểm chứng | Sẽ cập nhật khi có kết quả xuất bản và mở Pages thực tế. |

Các trạng thái trên áp dụng những thao tác đã ghi trong BW08-test-results.json, không khẳng định mọi tình huống biên đã kiểm tra. Chưa kiểm chứng: timeout thực tế, LocalStorage đầy/bị chặn, nhiều người thanh toán đồng thời trên hệ thống máy chủ, trình duyệt khác Chrome. Bộ kiểm thử iframe không thay thế toàn bộ đánh giá trực quan và Network thủ công.
