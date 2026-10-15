# HINO OCC SCADA – Giao diện giám sát tập trung

Giao diện trình diễn hệ thống giám sát tập trung (OCC) cho các nhà máy điện gió và điện mặt trời,
trung tâm OCC đặt tại NMĐG Ia Pếch. Thiết kế và phát triển bởi **HINO Systech Vietnam Co., Ltd.** – Global Services from Japan.

- Xem trực tuyến: https://jameshamers.github.io/Occ-scada/
- Dữ liệu trên giao diện là dữ liệu mô phỏng.

## Nguyên tắc: một nguồn duy nhất

`index.html` là **file được tạo tự động** – không sửa trực tiếp file này. Mọi nội dung nằm trong `src/` và `data/`.
Mỗi con số chỉ khai báo **một lần** trong dữ liệu gốc; tất cả nơi hiển thị (trang đăng nhập, thanh bên, tổng quan,
nguồn dữ liệu, báo cáo, 3 ngôn ngữ) đều tự tính từ đó.

| Muốn sửa | Sửa ở đâu |
|---|---|
| Nhà máy, công suất (MW), số điểm dữ liệu, tọa độ, model, SCADA, kế hoạch tháng | `src/20_data.js` → mảng `STATIONS` |
| Tài khoản, vai trò, quyền | `src/20_data.js` → `USERS`, `ROLES` |
| Chữ hiển thị (Việt – Anh – Trung) | `src/10_i18n.js` (mỗi dòng đủ 3 ngôn ngữ) |
| Màu sắc, phông chữ, bố cục | `src/01_head.html` (phần `:root` là bảng màu) |
| Bản đồ 34 tỉnh | `data/geo/` |

Trong chữ hiển thị, dùng các biến sau thay vì gõ số: `{NP}` số nhà máy, `{NS}` số trạm, `{MW}` tổng công suất,
`{PTS}` tổng điểm dữ liệu, `{NSURV}` số nhà máy đã khảo sát.

## Khi đẩy thay đổi lên GitHub

Mỗi lần có thay đổi trong `src/` hoặc `data/`, GitHub Actions (`.github/workflows/build.yml`) tự chạy:

1. **Kiểm tra tính nhất quán** (`tools/validate.mjs`): đủ 3 ngôn ngữ cho mọi dòng chữ, biến giống nhau giữa các ngôn ngữ,
   tổng công suất tuabin khớp công suất trạm, số điểm là số nguyên dương, tọa độ nằm trong Việt Nam, tỉnh thuộc 34 tỉnh mới,
   cảnh báo trỏ đúng thiết bị, tài khoản trỏ đúng trạm, không có con số gõ cứng trong HTML.
   Nếu có lỗi, bước dựng dừng lại và **trang đang chạy giữ nguyên bản tốt gần nhất**.
2. **Dựng lại `index.html`** (`build.py`) và cập nhật trang GitHub Pages.

Mã build (ví dụ `261015.3b413ac` = ngày + mã nội dung) hiện ở trang đăng nhập, thanh trạng thái và mục "Thông tin hệ thống".
Hai bản giống nhau thì mã build giống nhau – dùng để kiểm tra mọi bản sao đã đồng nhất.

## Chạy trên máy

```
node tools/validate.mjs
python3 build.py
```
