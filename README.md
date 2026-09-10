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
- **Âm thanh:** tạm tắt trong bản 0.4 để xử lý lỗi phát âm thanh.
- **Giao diện:** tiếng Việt/Anh, chế độ sáng/tối hoặc theo thiết bị.

Ví dụ, với sách có mốc cuối là 110, phiên **0 → 98** ghi nhận 98 trang. Phiên kế tiếp **98 → 110** ghi nhận thêm 12 trang và hoàn thành sách. Đọc lại không xóa lịch sử trước đó.

## Trạng thái

Dự án đang ở bản **0.3.0 demo online**, dành cho thử nghiệm. [Tải APK chạy độc lập](releases/ReadSession-0.4.0-demo.apk?raw=true): không cần máy tính, Expo Go hoặc máy chủ phát triển.

Bản demo online có đăng nhập, hồ sơ, lời mời kết bạn và chia sẻ public/private. Chưa có đăng ký tự phục vụ, khôi phục mật khẩu qua email hoặc nhắc đọc.

## Dữ liệu và quyền riêng tư

Sách, ảnh bìa, phiên đọc, ghi chú và cài đặt được lưu trong SQLite trên thiết bị. Chế độ khách giữ dữ liệu trên máy. Khi đăng nhập, tủ sách riêng của tài khoản được đồng bộ vào Supabase; dữ liệu private chỉ chủ tài khoản có quyền đọc. Hồ sơ tên/ảnh đại diện và sách, ghi chú chọn public hiển thị cho thành viên đã đăng nhập. Tra cứu mã gửi riêng mã sách tới kho sách public của demo, [Open Library](https://openlibrary.org/dev/docs/api/search) và [Google Books](https://developers.google.com/books/docs/v1/using); không gửi ảnh camera hay ghi chú đến các dịch vụ tra cứu. Kết quả tra cứu chỉ điền ô trống, cần kiểm tra lại đúng ấn bản và số trang. Khi không tìm thấy hoặc mất mạng, có thể nhập thông tin bằng tay.

Vào **Cài đặt → Sao lưu đầy đủ JSON** để giữ bản sao dữ liệu trước khi gỡ app hoặc xóa dữ liệu ứng dụng. CSV dùng để xem lịch sử; khôi phục đầy đủ dùng bản sao JSON.

## Dùng bản demo 0.4

- Lần đầu mở app, chọn **Tiếp tục sử dụng local** hoặc **Đăng nhập để lưu online**. Có thể đổi sau ở **Cài đặt → Tài khoản & đồng bộ**.
- Luôn có thể thêm sách bằng tay, không cần ISBN hoặc kết quả tra cứu. Tìm theo tên tại Nhã Nam/NXB Trẻ là lựa chọn hỗ trợ; hãy kiểm tra đúng ấn bản trước khi dùng.
- **Cá nhân** hiển thị tổng giờ đọc và các nút điều hướng tới sách, chỉnh sửa hồ sơ, bạn bè và hồ sơ public. Chọn tối đa ba sách qua danh sách xổ xuống; sách chưa xong cần xác nhận.
- Hồ sơ public có tên, tổng giờ và bìa sách. Chạm bìa mới xem phiên đọc và nội dung được chia sẻ. Public nghĩa là mọi thành viên đã đăng nhập, không chỉ bạn bè. Sách private giấu chi tiết; ghi chú private giấu nội dung. Tổng giờ gồm thời gian đọc sách private.
- Bạn bè chỉ hiện quan hệ/lời mời đã có; tìm người khác bằng tên rồi bấm Tìm. Không có gợi ý tự động.
- Thư viện khách và từng tài khoản tách riêng. Đăng nhập không tự nhập dữ liệu khách; có nút sao chép vào tài khoản trống, bắt đầu ở private.
- Đồng bộ chạy yên lặng khi app đang mở, sau khi lưu xong phiên. Lỗi thì giữ bản local và hiển thị vấn đề; có nút thử lại trong Cài đặt. Không bảo đảm upload tiếp khi app đóng.
- Nếu cloud có bản mới hơn, xuất JSON giữ thay đổi local trước khi tải bản cloud. Chưa tự gộp xung đột từ nhiều máy, chưa có lịch sử sao lưu nhiều phiên bản. Ảnh được thu nhỏ; giới hạn bản thư viện là 12 MB.
- **Cài đặt → Hướng dẫn sử dụng** giải thích các chức năng. Âm thanh tạm tắt; nhắc đọc bằng thông báo đẩy tạm hoãn.

Xem [cấu trúc dự án và giải thích từng file](PROJECT_STRUCTURE.md), gồm luồng Local/Cloud, bảng dữ liệu và những file phải giữ riêng.

## Cài đặt từ mã nguồn

### Chuẩn bị

Để build có phần online, tạo `app/.env.local` (không commit) chứa:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=YOUR_PUBLISHABLE_KEY
```

Khóa publishable được nhúng trong APK; tuyệt đối không dùng secret/service-role key. Với dự án Supabase mới, chạy `app/supabase/schema.sql` một lần, tiếp theo `app/supabase/upgrade-0.4.sql` bằng SQL Editor rồi tạo tài khoản demo đã xác nhận trong Authentication. Các bảng đều bật Row Level Security; phần chia sẻ được tạo trong giao dịch khi đồng bộ. Schema không chứa tài khoản hoặc mật khẩu demo. Với server đã có 0.3, chỉ chạy `upgrade-0.4.sql`, không chạy lại schema ban đầu.


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

1. Trên điện thoại, [tải ReadSession 0.4.0 demo](releases/ReadSession-0.4.0-demo.apk?raw=true).
2. Mở APK và cho phép trình duyệt hoặc trình quản lý tệp cài ứng dụng khi Android yêu cầu.
3. Cài đặt rồi mở ReadSession. Ứng dụng chạy độc lập, kể cả khi không kết nối máy tính.

Yêu cầu Android 7.0 trở lên, thiết bị ARM 32-bit hoặc 64-bit. Nếu đã cài bản development và gặp lỗi xung đột chữ ký, gỡ bản cũ trước khi cài; thao tác này xóa dữ liệu của bản cũ.

Nếu đang dùng APK release 0.1.0, 0.2.0 hoặc 0.3.0, có thể cài đè 0.4.0 để giữ dữ liệu: các bản dùng cùng khóa ký. Không cần gỡ bản release cũ.

APK dùng chữ ký release riêng và chứa sẵn mã ứng dụng. Đây là bản draft: quá trình build và chữ ký đã được kiểm tra; bản release này cần được thử nghiệm thêm trên điện thoại. Có thể đối chiếu tệp tải về với [mã SHA-256](releases/ReadSession-0.4.0-demo.apk.sha256).

## Lưu ý khi thử nghiệm

Nếu ứng dụng bị hệ thống tắt giữa phiên, ReadSession khôi phục bản nháp ở mốc lưu gần nhất và tạm dừng. Hãy kiểm tra lại thời lượng trước khi lưu. Khi nhận cuộc gọi, tạm dừng timer thủ công. Mục tiêu phiên không tự dừng timer. Thống kê ngày dùng ngày của phiên đọc (phiên qua nửa đêm thuộc ngày bắt đầu); phiên nhập tay dùng ngày đã chọn.

Repository chứa mã nguồn, schema Supabase và APK đã kiểm tra. Tài khoản demo, mật khẩu, khóa quản trị và cấu hình máy cá nhân không nằm trong repository. File mới được bỏ qua mặc định; khi bổ sung mã hoặc tài nguyên, cần kiểm tra nội dung và cập nhật danh sách cho phép trong `.gitignore`.
