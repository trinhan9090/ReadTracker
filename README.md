# ReadSession

ReadSession giúp bạn chọn sách, tập trung đọc, lưu tiến độ và ghi lại những điều muốn nhớ. Bản **0.5.0 demo** dùng trên Android và trình duyệt PC, cùng một tài khoản Supabase.

- [Mở bản web](https://trinhan9090.github.io/ReadTracker/)
- [Tải APK Android chạy độc lập](releases/ReadSession-0.5.0-demo.apk?raw=true)
- [Cấu trúc và ý nghĩa từng file](PROJECT_STRUCTURE.md)

## Cài đặt và bắt đầu

**Android:** tải APK, mở tệp và cho phép cài ứng dụng từ trình duyệt/trình quản lý tệp khi Android yêu cầu. Bản release chạy độc lập, không cần Expo Go hoặc máy chủ phát triển. Nếu đang dùng 0.4, kết thúc phiên đọc, kiểm tra đồng bộ rồi **cài đè APK 0.5**, không cần gỡ ứng dụng. Cùng mã ứng dụng và khóa ký giúp giữ dữ liệu trong app; nên xuất JSON trước khi cập nhật.

Lần đầu trên Android, chọn dùng local hoặc đăng nhập. Có thể đổi trong **Cài đặt → Tài khoản & đồng bộ**. Dùng local không cần tài khoản hoặc Internet.

**Web:** mở đường dẫn ở trên, đăng nhập bằng tài khoản demo đang dùng trên Android. Web bắt buộc đăng nhập và cần mạng để tải tủ sách. Chưa có đăng ký tự phục vụ; tài khoản được chủ dự án cấp riêng.

**Khi dùng cả hai:** cập nhật Android lên 0.5 trước khi chỉnh sửa trên web. Dữ liệu cloud 0.4 vẫn đọc được. Sau lần ghi bằng 0.5, server từ chối các lần ghi theo giao thức 0.4 của tài khoản đó để tránh bản cũ ghi đè dữ liệu mới. APK 0.4 sẽ báo lỗi đồng bộ; cập nhật lên 0.5 để tiếp tục.

## Tính năng

- Tủ sách với ảnh bìa, ISBN, tiến độ, trạng thái đọc và cảm nghĩ; luôn cho nhập tay khi không có ISBN/kết quả tìm kiếm.
- Tra cứu ISBN trong kho public của nhóm, Open Library, Google Books, Nhã Nam và NXB Trẻ; tìm sách Việt theo tên và kiểm tra ấn bản trước khi dùng.
- Timer bắt đầu/tạm dừng/tiếp tục; lưu trang kết thúc và ghi chú. Có thể thêm/sửa phiên đọc thủ công.
- Mục tiêu thời gian từng phiên, mục tiêu ngày, lịch sử, tổng giờ đọc và chuỗi ngày. Để trống mục tiêu ngày dùng 5 phút; đổi mục tiêu tính lại toàn bộ lịch sử. Phiên ngắn hơn vẫn được lưu.
- Hồ sơ, ảnh đại diện, tối đa ba sách giới thiệu bản thân, tìm bạn theo tên và lời mời kết bạn.
- Sách và ghi chú public/private; hồ sơ public hiển thị tên, tổng giờ, bìa sách; bấm bìa để xem chi tiết được chia sẻ.
- Thùng rác/khôi phục, xuất JSON đầy đủ hoặc CSV lịch sử; tiếng Việt/Anh và giao diện sáng/tối.

Ví dụ sách có mốc cuối 110: **0 → 98** tính 98 trang, phiên sau **98 → 110** tính thêm 12 trang và hoàn thành sách. Đọc lại không xóa lịch sử.

Trên web có chọn tệp ảnh bìa/đại diện; không có chụp ảnh hoặc quét camera. Âm thanh nút bấm và thông báo đẩy nhắc đọc vẫn tạm hoãn.

## Dữ liệu và đồng bộ

Android giữ SQLite riêng cho khách và từng tài khoản. Đăng nhập không tự trộn tủ sách khách. Có thể sao chép tủ sách khách vào tài khoản trống, bắt đầu ở private. Đăng xuất không xóa dữ liệu Android.

Web tải tủ sách từ cloud. Trình duyệt lưu phiên đăng nhập; tab giữ tạm thay đổi chưa đồng bộ và timer trong sessionStorage để có thể khôi phục khi tải lại cùng tab. Đây không phải thư viện offline lâu dài: đóng tab, chế độ riêng tư, giới hạn dung lượng hoặc xóa dữ liệu trình duyệt có thể làm mất phần chưa gửi. Khi gặp lỗi đồng bộ, giữ tab mở hoặc xuất JSON. Form chưa bấm Lưu chưa phải dữ liệu đã lưu; trình duyệt cảnh báo trước khi rời trang.

Sau khi lưu, app gửi từng sách/phiên/cài đặt đã thay đổi. Hai thiết bị sửa các mục khác nhau được gộp; cùng sửa một mục thì giữ bản trên thiết bị và hiện hai lựa chọn trong **Tài khoản & đồng bộ**. Gửi lại cùng yêu cầu không tạo phiên trùng. Xóa/khôi phục cũng tham gia cơ chế so sánh này.

Khi app đang hoạt động, dữ liệu được kiểm tra lại khoảng 10 giây và khi quay lại app. Tạm ngừng đồng bộ khi timer còn mở hoặc khi đang nhập/sửa để tránh thay nội dung đang viết; quay lại màn hình Phiên/Sách hoặc Đồng bộ sau khi lưu. Hồ sơ/bạn bè cần mạng và không nằm trong hàng chờ thư viện. Timer đang chạy **không chuyển giữa thiết bị**; chỉ phiên đã lưu được đồng bộ. Không bảo đảm đồng bộ tiếp sau khi app đóng.

Cloud lưu phiên bản hiện tại, không phải lịch sử sao lưu nhiều phiên bản. Xuất **JSON** trước khi gỡ app, xóa dữ liệu hoặc thay thư viện. CSV chỉ để xem lịch sử.

## Quyền riêng tư

Thư viện private chỉ chủ tài khoản đọc được. Public nghĩa là mọi thành viên đã đăng nhập, không chỉ bạn bè. Với sách public, ngày/thời lượng/mốc trang của phiên được công khai; nội dung ghi chú/cảm nghĩ chỉ hiện khi riêng mục đó được chọn public. Tổng giờ gồm thời gian đọc sách private nhưng không lộ tên hoặc chi tiết sách private.

Tra cứu chỉ gửi ISBN/từ khóa hoặc đường dẫn sách tới nguồn tra cứu, không gửi thư viện hay ghi chú. Nguồn Việt trên web đi qua chức năng `catalog` của Supabase để tương thích trình duyệt; yêu cầu đăng nhập, giới hạn nguồn và dung lượng phản hồi. Không có nguồn nào bảo đảm bao phủ mọi ISBN/ấn bản.

Repo không chứa mật khẩu demo, tài liệu Word riêng, dữ liệu người dùng hay khóa ký Android. Publishable key được thiết kế cho client công khai; không dùng khóa secret/service-role trong mã ứng dụng.

## Chạy mã nguồn

Cần Node.js tương thích Expo, pnpm; Android cần Android SDK/JDK phù hợp. Sau khi clone:

```sh
cd app
pnpm install --frozen-lockfile
```

Tạo `app/.env.local` với project URL và **publishable key** Supabase của bạn:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=YOUR_PUBLISHABLE_KEY
```

Dự án Supabase mới chạy lần lượt `schema.sql`, `upgrade-0.4.sql`, `upgrade-0.5.sql` trong `app/supabase/`. Dự án đã chạy 0.4 chỉ chạy migration 0.5; sao lưu trước khi nâng cấp. Triển khai Edge Function `catalog` từ `app/supabase/functions/catalog/index.ts`; cấu hình nguồn web phù hợp dự án của bạn. Function kiểm tra người dùng qua Supabase Auth, không dùng service-role để đọc thư viện.

```sh
pnpm web                 # Phát triển web
pnpm android             # Build development lên điện thoại
pnpm typecheck
pnpm test
pnpm export:web          # Xuất website tĩnh vào app/dist
```

Android development qua USB có thể cần `adb reverse tcp:8081 tcp:8081` rồi `pnpm start --localhost --port 8081`. PowerShell chặn `npm.ps1` thì dùng `npm.cmd`/`pnpm.cmd`.

## Phát hành web và APK

Web dùng website tĩnh GitHub Pages, Supabase hiện có xử lý đăng nhập/dữ liệu; không chạy Node server trên GitHub. Cấu hình `experiments.baseUrl` hiện là `/ReadTracker`. Mã điều hướng ở trong trang nên tải lại URL gốc không cần rewrite.

Sau `pnpm export:web`, chủ repo có thể chạy `node scripts/deploy-web.cjs` từ thư mục app. Script chỉ đưa nội dung `dist` cùng `.nojekyll` lên nhánh `gh-pages`; chọn GitHub Pages → Deploy from a branch → `gh-pages` → `/ (root)`. Nếu fork, cần sửa và kiểm tra đích deploy, baseUrl, cấu hình Supabase/CORS. Xem [hướng dẫn Expo](https://docs.expo.dev/guides/publishing-websites/#github-pages).

APK release cần khóa ký riêng ổn định. Plugin `withReleaseSigning` đọc tệp ký riêng trên máy build. Không chia sẻ hoặc thay khóa giữa các lần cập nhật của cùng ứng dụng.

## Kiểm chứng bản demo

TypeScript và kiểm thử model/sync/catalog; kiểm thử SQL giao dịch rollback về xung đột, gửi lặp, xóa, quyền riêng tư và bảo vệ tài khoản; kiểm tra web đăng nhập/tra cứu thực tế; build web và APK, kiểm tra chữ ký và tệp công khai. Các kiểm thử này không thay thế việc thử APK trên từng dòng điện thoại.
