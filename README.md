# ReadSession

ReadSession là ứng dụng Android giúp bạn dành thời gian cho sách, theo dõi tiến độ và ghi lại những điều muốn nhớ sau mỗi lần đọc.

Ứng dụng hướng đến trải nghiệm đơn giản: **chọn sách → bắt đầu đọc → lưu tiến độ và ghi chú**.

## Tính năng

- **Tủ sách:** thêm và sửa thông tin sách, chọn ảnh bìa, tìm theo tên hoặc tác giả, lọc trạng thái đọc.
- **Phiên đọc:** bấm giờ, tạm dừng, tiếp tục và lưu mốc dừng; gợi ý vị trí của lần đọc trước.
- **Ghi chú:** lưu suy nghĩ sau mỗi phiên và cảm nghĩ về cuốn sách.
- **Lịch sử:** xem, thêm thủ công hoặc chỉnh sửa phiên đọc.
- **Thống kê:** thời gian đọc, số trang, biểu đồ theo tháng và chuỗi tuần có đọc.
- **Quản lý dữ liệu:** thùng rác, khôi phục, xuất lịch sử CSV và sao lưu đầy đủ bằng JSON.
- **Giao diện:** tiếng Việt/Anh, chế độ sáng/tối hoặc theo thiết bị.

Ví dụ, với sách có mốc cuối là 110, phiên **0 → 98** ghi nhận 98 trang. Phiên kế tiếp **98 → 110** ghi nhận thêm 12 trang và hoàn thành sách. Đọc lại không xóa lịch sử trước đó.

## Trạng thái

Dự án đang ở bản **0.1**, dành cho thử nghiệm và phát triển. Bản development cần kết nối với máy chủ phát triển trên máy tính. APK release chạy độc lập chưa được phát hành.

Quét ISBN, tài khoản, đồng bộ nhiều thiết bị và nhắc đọc chưa có trong phiên bản này.

## Dữ liệu và quyền riêng tư

Sách, ảnh bìa, phiên đọc, ghi chú và cài đặt được lưu trong SQLite trên thiết bị. Ứng dụng không yêu cầu tài khoản và không có máy chủ đồng bộ dữ liệu người dùng.

Vào **Cài đặt → Sao lưu đầy đủ JSON** để giữ bản sao dữ liệu trước khi gỡ app hoặc xóa dữ liệu ứng dụng. CSV dùng để xem lịch sử; khôi phục đầy đủ dùng bản sao JSON.

## Cài đặt từ mã nguồn

### Chuẩn bị

- Node.js 24 và pnpm 11.
- Android Studio cùng Java tương thích với Gradle của dự án.
- Android SDK Platform 36, Build Tools 36.0.0 và Platform Tools. Quá trình build có thể cần tải thêm NDK/CMake tương ứng.
- Điện thoại Android bật **Gỡ lỗi USB** và đã cho phép máy tính kết nối.
- Thiết lập `JAVA_HOME`, `ANDROID_HOME` và thêm Node.js cùng Android Platform Tools vào `PATH` theo vị trí cài đặt trên máy của bạn.

### Cài thư viện và chạy lần đầu

Tải hoặc clone repository, mở terminal tại thư mục gốc, sau đó chạy:

```sh
cd app
pnpm install --frozen-lockfile
pnpm android
```

Dự án dùng cấu trúc thư viện phẳng để tránh đường dẫn quá dài khi build Android trên Windows. Thư mục native `android` được tạo trong quá trình chuẩn bị build và không lưu trong repository.

Chọn điện thoại khi được hỏi, giữ màn hình mở khóa và chấp nhận yêu cầu cài đặt nếu điện thoại hiển thị. Lần đầu cần Internet để tải thư viện và công cụ build. Không cần cài Expo Go.

### Chạy lại bản phát triển qua USB

Sau khi bản development đã được cài, không cần build lại cho mỗi thay đổi giao diện hoặc mã JavaScript:

```sh
adb reverse tcp:8081 tcp:8081
pnpm start --localhost --port 8081
```

Mở ReadSession, chọn máy chủ gần đây hoặc nhập `http://127.0.0.1:8081` trong màn hình development server. Giữ máy chủ chạy trong khi sử dụng bản development.

Trên Windows PowerShell, nếu gặp lỗi kết nối do localhost dùng IPv6, đặt tùy chọn này trước khi khởi động máy chủ:

```powershell
$env:NODE_OPTIONS = "--dns-result-order=ipv4first"
```

Nếu PowerShell chặn file `.ps1`, dùng `pnpm.cmd` thay cho `pnpm` và `npm.cmd` thay cho `npm`; không cần thay đổi execution policy.

### Kiểm tra mã nguồn

Chạy trong thư mục `app`:

```sh
pnpm typecheck
pnpm test
pnpm export:android
```

Lệnh `export:android` tạo bundle Android để kiểm tra mã; kết quả đó không phải file APK.

### Ký bản release

Bản release sử dụng khóa ký riêng. Cấu hình ký được tạo lại bởi plugin của dự án; khóa và mật khẩu không nằm trong repository. Khi tự build release, cần chuẩn bị khóa tại `app/.private/readsession-release.jks` với alias `readsession` và file `app/.private/signing.properties` chứa các thuộc tính `storePassword`, `keyPassword`. Thiếu thông tin ký, build release sẽ dừng thay vì dùng khóa debug.

Giữ khóa ký cho các bản cập nhật tiếp theo. Không đưa thư mục `.private` lên GitHub.

## Cài bằng APK

Khi có bản release, tải APK từ mục **Releases** của repository, mở file trên Android và làm theo hướng dẫn cài đặt. Bản APK release sẽ không yêu cầu máy chủ phát triển. Hiện chưa có bản release độc lập để tải.

## Lưu ý khi thử nghiệm

Nếu ứng dụng bị hệ thống tắt giữa phiên, ReadSession khôi phục bản nháp ở mốc lưu gần nhất và tạm dừng. Hãy kiểm tra lại thời lượng trước khi lưu. Khi nhận cuộc gọi, tạm dừng timer thủ công.

Repository chỉ chứa mã nguồn và cấu hình công khai. File mới được bỏ qua mặc định; khi bổ sung mã hoặc tài nguyên, cần kiểm tra nội dung và cập nhật danh sách cho phép trong `.gitignore`.
