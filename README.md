# ReadSession

ReadSession là ứng dụng Android giúp bạn dành thời gian cho sách, theo dõi tiến độ và ghi lại những điều muốn nhớ sau mỗi lần đọc.

Ứng dụng hướng đến trải nghiệm đơn giản: **chọn sách → bắt đầu đọc → lưu tiến độ và ghi chú**.

## Tính năng

- **Tủ sách:** thêm và sửa thông tin sách, chọn hoặc chụp ảnh bìa, quét barcode ISBN và tra cứu thông tin sách, tìm theo tên hoặc tác giả, lọc trạng thái đọc.
- **Phiên đọc:** bấm giờ, tạm dừng, tiếp tục và lưu mốc dừng; gợi ý vị trí của lần đọc trước; đặt mục tiêu thời gian cho mỗi phiên (tùy chọn).
- **Ghi chú:** lưu suy nghĩ sau mỗi phiên và cảm nghĩ về cuốn sách.
- **Lịch sử:** xem, thêm thủ công hoặc chỉnh sửa phiên đọc.
- **Thống kê:** thời gian đọc, số trang, biểu đồ theo tháng và chuỗi ngày liên tiếp đạt mục tiêu.
- **Quản lý dữ liệu:** thùng rác, khôi phục, xuất lịch sử CSV và sao lưu đầy đủ bằng JSON.
- **Mục tiêu ngày:** cộng tất cả phiên đã lưu trong ngày. Để trống dùng ngưỡng 5 phút; đặt 20 phút thì cần đủ 20 phút. Thay đổi mục tiêu tính lại toàn bộ chuỗi. Ngày chưa đạt vẫn giữ dữ liệu; hôm nay chưa đạt thì chuỗi tới hôm qua vẫn hiển thị.
- **Âm thanh:** tiếng bấm nút nhẹ, bật/tắt trong Cài đặt, mặc định tắt.
- **Giao diện:** tiếng Việt/Anh, chế độ sáng/tối hoặc theo thiết bị.

Ví dụ, với sách có mốc cuối là 110, phiên **0 → 98** ghi nhận 98 trang. Phiên kế tiếp **98 → 110** ghi nhận thêm 12 trang và hoàn thành sách. Đọc lại không xóa lịch sử trước đó.

## Trạng thái

Dự án đang ở bản **0.2.0 draft**, dành cho thử nghiệm. [Tải APK chạy độc lập](releases/ReadSession-0.2.0-draft.apk?raw=true): không cần máy tính, Expo Go hoặc máy chủ phát triển.

Tài khoản, đồng bộ nhiều thiết bị và nhắc đọc chưa có trong phiên bản này.

## Dữ liệu và quyền riêng tư

Sách, ảnh bìa, phiên đọc, ghi chú và cài đặt được lưu trong SQLite trên thiết bị. Ứng dụng không yêu cầu tài khoản và không có máy chủ đồng bộ dữ liệu người dùng. Tra cứu ISBN cần Internet và gửi riêng mã ISBN đến [Open Library](https://openlibrary.org/dev/docs/api/search); ảnh camera và ghi chú không được gửi đi. Kết quả tra cứu chỉ điền ô trống, cần kiểm tra lại đúng ấn bản và số trang. Khi không tìm thấy hoặc mất mạng, có thể nhập thông tin bằng tay.

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

1. Trên điện thoại, [tải ReadSession 0.2.0 draft](releases/ReadSession-0.2.0-draft.apk?raw=true).
2. Mở APK và cho phép trình duyệt hoặc trình quản lý tệp cài ứng dụng khi Android yêu cầu.
3. Cài đặt rồi mở ReadSession. Ứng dụng chạy độc lập, kể cả khi không kết nối máy tính.

Yêu cầu Android 7.0 trở lên, thiết bị ARM 32-bit hoặc 64-bit. Nếu đã cài bản development và gặp lỗi xung đột chữ ký, gỡ bản cũ trước khi cài; thao tác này xóa dữ liệu của bản cũ.

Nếu đang dùng APK release 0.1.0, có thể cài đè 0.2.0 để giữ dữ liệu: hai bản dùng cùng khóa ký. Không cần gỡ bản release cũ.

APK dùng chữ ký release riêng và chứa sẵn mã ứng dụng. Đây là bản draft: quá trình build và chữ ký đã được kiểm tra; bản release này cần được thử nghiệm thêm trên điện thoại. Có thể đối chiếu tệp tải về với [mã SHA-256](releases/ReadSession-0.2.0-draft.apk.sha256).

## Lưu ý khi thử nghiệm

Nếu ứng dụng bị hệ thống tắt giữa phiên, ReadSession khôi phục bản nháp ở mốc lưu gần nhất và tạm dừng. Hãy kiểm tra lại thời lượng trước khi lưu. Khi nhận cuộc gọi, tạm dừng timer thủ công. Mục tiêu phiên không tự dừng timer. Thống kê ngày dùng ngày của phiên đọc (phiên qua nửa đêm thuộc ngày bắt đầu); phiên nhập tay dùng ngày đã chọn.

Repository chứa mã nguồn, cấu hình công khai và APK draft đã kiểm tra. File mới được bỏ qua mặc định; khi bổ sung mã hoặc tài nguyên, cần kiểm tra nội dung và cập nhật danh sách cho phép trong `.gitignore`.
