# ReadSession — cấu trúc dự án và luồng hoạt động

Tài liệu cho bản demo Android + web 0.5.0. Đọc cùng [README.md](README.md) để cài đặt hoặc chạy dự án. File này giải thích các file do dự án quản lý; thư viện bên ngoài và file Android sinh tự động được mô tả theo nhóm vì chúng được tạo lại khi cài/build.

## 1. Bản đồ thư mục

```text
ReadTracker/                     Tên thư mục trên PC; tên app là ReadSession
├── README.md                    Tổng quan và hướng dẫn cài đặt
├── PROJECT_STRUCTURE.md         Tài liệu này
├── .gitignore                  Danh sách file được phép đưa lên Git
├── app/                        Mã nguồn ứng dụng
│   ├── App.tsx                 Điểm vào Android
│   ├── App.web.tsx             Điểm vào web, bắt buộc đăng nhập
│   ├── scripts/                Công cụ phát hành web
│   ├── index.ts                Đăng ký ứng dụng với Expo
│   ├── app.json                Tên, phiên bản, quyền và cấu hình Android
│   ├── package.json            Thư viện và các lệnh phát triển
│   ├── pnpm-lock.yaml          Phiên bản chính xác của thư viện
│   ├── pnpm-workspace.yaml     Cấu hình pnpm cho dự án
│   ├── .npmrc                  Cách cài thư viện
│   ├── tsconfig.json           Quy tắc kiểm tra TypeScript
│   ├── eas.json                Các cấu hình build Expo/EAS
│   ├── LICENSE                 Giấy phép mã nguồn
│   ├── src/                    Giao diện, xử lý dữ liệu và kết nối
│   ├── assets/                 Tài nguyên đóng gói cùng app
│   ├── plugins/                Tùy chỉnh tạo dự án Android
│   ├── supabase/               Cấu trúc và nâng cấp cơ sở dữ liệu
│   ├── tests/                  Kiểm thử tự động
│   ├── .env.local              Cấu hình cloud tại máy phát triển — riêng
│   ├── .private/               Khóa ký APK và cấu hình bí mật — riêng
│   ├── node_modules/           Thư viện cài bằng pnpm — tạo tự động
│   └── android/                Dự án Android và kết quả build — tạo tự động
├── releases/                   APK được phát hành và mã kiểm tra SHA-256
├── docs/                       Tài liệu nội bộ — riêng
├── .work/                      Log, công cụ kiểm tra và file tạm — riêng
├── LOCAL_DEVELOPMENT.md         Ghi chú phát triển trên máy — riêng
└── Bieu_mau_yeu_cau_app_ReadTracker.docx  Biểu mẫu ý tưởng đã điền — riêng
```

“Riêng” nghĩa là bị Git bỏ qua, không phải file cần có trên GitHub để người khác đọc mã. Đừng đưa nội dung đăng nhập hay khóa ký vào tài liệu công khai.

## 2. Vai trò từng file mã nguồn

| File trong `app/src/` | Mục đích và trách nhiệm |
| --- | --- |
| `ReadSession.tsx` | Giao diện chính với bốn tab Phiên, Sách, Cá nhân, Cài đặt. Quản lý timer, thêm/sửa sách, lưu/sửa phiên, lịch sử, mục tiêu, thùng rác, xuất/nhập dữ liệu. Khôi phục phiên đăng nhập và chọn thư viện theo tài khoản. Hiển thị lựa chọn Local/Đăng nhập lần đầu. |
| `model.ts` | Kiểu dữ liệu Book, Session, Draft, State và các phép tính thuần: trang đã đọc, thời lượng, mục tiêu ngày, chuỗi ngày, dữ liệu đang hoạt động, gợi ý sách, kiểm tra bản sao lưu và xuất CSV. Không gọi mạng. |
| `storage.ts` | Đọc/ghi SQLite trong điện thoại. Tách thư viện khách, thư viện từng tài khoản và tùy chọn lần mở đầu. Không gửi dữ liệu ra mạng. |
| `ui.tsx` | Nút, ô nhập, bìa sách, màu sáng/tối và kiểu trình bày dùng chung. |
| `Social.tsx` | Trang Cá nhân với tổng giờ đọc và điều hướng; trang chỉnh sửa tên/ảnh/ba sách giới thiệu; danh sách bạn bè, lời mời và tìm người theo tên. Không hiển thị danh sách thành viên gợi ý tự động. |
| `PublicProfile.tsx` | Hồ sơ public gồm tên, tổng giờ và bìa sách. Chạm bìa để mở chi tiết sách, phiên đọc và ghi chú được công khai. Không tải trực tiếp thư viện private của người khác. |
| `SyncPanel.tsx` | Trang riêng trong Cài đặt: giải thích Local/Cloud, đăng nhập/đăng xuất, thử đồng bộ, tải bản cloud và sao chép thư viện local vào tài khoản trống. Xác nhận trước khi thay dữ liệu. |
| `UserGuide.tsx` | Hướng dẫn sử dụng trong Cài đặt, bằng tiếng Việt/Anh: sách, phiên, mục tiêu, quyền riêng tư, bạn bè, đồng bộ và các tính năng tạm hoãn. |
| `backend.ts` | Khởi tạo kết nối Supabase từ cấu hình môi trường. Lưu phiên đăng nhập bằng SecureStore, giới hạn thời gian yêu cầu mạng và hỗ trợ làm mới đăng nhập. |
| `online.ts` | Tải thư viện và gọi RPC gửi các thao tác có mã chống lặp. Chỉ định tài khoản dự kiến để server chặn đổi tài khoản giữa lúc gửi. Thu nhỏ ảnh thành JPEG data URL dùng chung thiết bị. |
| `useCloud.ts` | Điều phối tải ban đầu và tự đồng bộ khi thư viện thay đổi, chờ kết thúc phiên đọc. Thử lại khi app hoạt động; chỉ đưa lỗi ra giao diện. Giữ bản local khi lỗi/xung đột. |
| `IsbnTools.tsx` | Nhập/quét ISBN bằng camera, quản lý quyền camera và việc tra cứu. ISBN không bắt buộc. Không có kết quả vẫn nhập sách thủ công được. |
| `isbn.ts` | Chuẩn hóa và kiểm tra chữ số kiểm tra ISBN-10/13; tra Open Library và Google Books. Không lọc theo ngôn ngữ sách. |
| `catalog.ts` | Tìm kiếm và đọc metadata công khai từ website Nhã Nam/NXB Trẻ; kiểm tra nguồn URL và ISBN khớp chính xác. Chỉ đọc thông tin thư mục sách, không lấy nội dung sách. Có thể cần cập nhật khi website đổi cấu trúc. |
| `BookSearch.tsx` | Giao diện tìm sách Việt theo tên, chọn nguồn, xem kết quả và xác nhận trước khi điền ô trống. Không tự thay ISBN đã nhập bằng ISBN của ấn bản khác. |
| `sound.tsx` | Lớp nút bấm chung. Bản 0.5 tiếp tục tạm tắt âm thanh hoàn toàn, kể cả khi dữ liệu cũ từng bật âm thanh. Không tạo bộ phát audio. |

### File mới cho web và đồng bộ 0.5

| File | Trách nhiệm |
| --- | --- |
| `app/App.web.tsx` | Đăng nhập web, giữ phiên, mở Main bằng ID tài khoản; đăng xuất quay về trang đăng nhập. Khởi tạo cách tra nguồn sách Việt qua proxy. |
| `app/src/sync.ts` | So sánh dữ liệu gốc/thiết bị/cloud theo từng sách, phiên và cài đặt; bảo toàn thay đổi khi yêu cầu đang gửi; giải quyết xung đột và trường hợp sách cha bị xóa. |
| `app/src/storage.web.ts` | Đọc/ghi bản phục hồi tạm theo tài khoản trong sessionStorage của tab, chỉ khi có việc chưa đồng bộ hoặc timer. Không lưu thư viện offline lâu dài. |
| `app/src/backend.web.ts` | Supabase client dành cho trình duyệt; lưu phiên đăng nhập bằng cơ chế browser của Supabase, làm mới token và giới hạn thời gian mạng. |
| `app/src/IsbnTools.web.tsx` | Nhập và tra ISBN, tìm theo tên, không nhập module camera. |
| `app/src/dialogs.ts`, `dialogs.web.ts` | Hộp thoại xác nhận Android hoặc trình duyệt. |
| `app/src/transfer.ts`, `transfer.web.ts` | Chia sẻ/chọn file native hoặc tải/chọn file trong trình duyệt; giữ giới hạn nhập JSON 30 MB. |
| `app/src/catalogPage.ts` | Tải HTML nguồn Việt trực tiếp trên Android và trong kiểm thử parser. |
| `app/src/catalogPage.web.ts` | Tải HTML qua Edge Function catalog bằng phiên đăng nhập; tránh giới hạn CORS của nguồn Việt. |
| `app/tests/sync.test.ts` | Gộp hai thiết bị, xung đột, sửa trong lúc gửi, phiên mới gặp sách bị xóa, lựa chọn khôi phục/xóa, tính ổn định khi gộp lặp lại. |
| `app/supabase/upgrade-0.5.sql` | RPC compare-and-set theo từng bản ghi, xác nhận yêu cầu đã nhận, chặn giao thức cũ sau lần ghi 0.5. |
| `app/supabase/functions/catalog/index.ts` | Proxy giới hạn ở Nhã Nam/NXB Trẻ. Kiểm tra đăng nhập, nguồn URL, kích thước phản hồi, timeout, giới hạn yêu cầu/cache theo tiến trình. Không đọc thư viện riêng. Chạy trên Deno, tách khỏi TypeScript app. |
| `app/scripts/deploy-web.cjs` | Chỉ xuất nội dung dist lên nhánh gh-pages, giữ lịch sử nhánh; không đưa .env, dữ liệu hay source riêng vào website. |

Metro chọn các module có đuôi .web cho web khi import không ghi phần mở rộng. Riêng catalog dùng transport được khởi tạo bởi App.web để cùng dùng parser TypeScript trong kiểm thử Node.

### File cấu hình, tài nguyên và kiểm thử

| File | Vai trò |
| --- | --- |
| `app/App.tsx` | Xuất giao diện chính từ `src/ReadSession.tsx`. |
| `app/index.ts` | Gọi cơ chế đăng ký ứng dụng gốc của Expo. |
| `app/app.json` | Tên hiển thị ReadSession, mã gói `com.readsession.app`, phiên bản và versionCode, plugin camera/ảnh/SQLite/SecureStore cùng quyền Android. |
| `app/package.json` | Danh sách thư viện và lệnh start, android, typecheck, test, export:android. |
| `app/pnpm-lock.yaml` | Khóa phiên bản thư viện để các lần cài tái lập được. |
| `app/pnpm-workspace.yaml`, `app/.npmrc` | Cấu hình pnpm, gồm bố trí thư viện phẳng để giảm vấn đề đường dẫn dài trên Windows. |
| `app/tsconfig.json` | Kiểm tra kiểu dữ liệu nghiêm ngặt; cho phép import TypeScript phục vụ kiểm thử trực tiếp. |
| `app/eas.json` | Profile development/preview/production nếu dùng EAS. Có file này không có nghĩa dự án đã thiết lập push notification. |
| `app/plugins/withReleaseSigning.js` | Áp dụng khóa release riêng khi tạo Android; thay tiền tố đường dẫn máy trong phần biên dịch native để hạn chế thông tin cá nhân lọt vào APK. |
| `app/assets/tap.wav` | Âm thanh nút bấm cũ. Được giữ trong nguồn, hiện không phát. |
| `app/tests/model.test.ts` | Kiểm tra trang 0 → 98 → 110, đọc lại, sửa phiên cũ, timer, thùng rác, bản sao lưu và CSV. |
| `app/tests/features.test.ts` | Mục tiêu ngày, chuỗi, lọc sách gợi ý, nhập dữ liệu private và tra ISBN. |
| `app/tests/catalog.test.ts` | Metadata sách Việt, giữ đúng ISBN theo ấn bản, không chấp nhận URL nguồn giả, hủy yêu cầu và không gán kết quả cùng tên thành khớp ISBN. |
| `app/LICENSE` | Điều kiện sử dụng mã nguồn. |
| `releases/*.apk` | Các bản cài Android độc lập đã được chọn phát hành. |
| `releases/*.apk.sha256` | Mã SHA-256 để kiểm tra file APK tải về có nguyên vẹn không. |
| `.gitignore` | Bỏ qua file mới mặc định; chỉ công khai những đường dẫn được cho phép rõ ràng. |

## 3. Dữ liệu nằm ở đâu?

### Trên điện thoại

App dùng cơ sở dữ liệu SQLite `readsession.db` trong vùng lưu trữ riêng của ứng dụng Android. Đây không phải file nằm trong repository trên PC.

| Bảng local | Nội dung |
| --- | --- |
| `app_state` | Một bản State của chế độ local/khách. |
| `account_state` | Một bản State riêng cho mỗi ID tài khoản đã dùng trên máy. |
| `device_preferences` | Ghi nhớ người dùng đã chọn cách lưu ở lần mở đầu; không đồng bộ tùy chọn này lên tài khoản. |

State gồm sách, phiên đọc, bản nháp timer, cài đặt, sách gần nhất và thông tin phiên bản đồng bộ. Phiên đăng nhập được giữ qua SecureStore, tách khỏi thư viện sách.

Gỡ app hoặc xóa dữ liệu app sẽ xóa dữ liệu local. Bản cloud đã đồng bộ có thể tải lại sau khi đăng nhập; các thay đổi chỉ còn trên máy thì không. JSON là bản sao lưu đầy đủ để khôi phục; CSV là báo cáo lịch sử.

### Trên Supabase

| Bảng / hàm | Vai trò |
| --- | --- |
| `rs_profiles` | Tên, ảnh đại diện và tối đa ba ID sách giới thiệu. |
| `rs_libraries` | Bản thư viện đầy đủ của chủ tài khoản, số phiên bản và thời điểm cập nhật. Người khác không được đọc bảng này của bạn. |
| `rs_books` | Bản thông tin được chia sẻ của sách public. Cảm nhận chỉ có nội dung nếu được đánh dấu public. |
| `rs_notes` | Bản ghi chú public cho tương thích với app 0.3; chỉ thuộc sách public. |
| `rs_public_sessions` | Ngày, thời lượng, trang đầu/cuối của các phiên thuộc sách public. Trường note được để trống nếu ghi chú private. |
| `rs_reading_totals` | Tổng giây đọc của những phiên/sách chưa xóa, gồm cả thời gian đọc sách private. Không chứa tên hay ghi chú sách private. |
| `rs_friends` | Người gửi, người nhận và trạng thái chấp nhận lời mời; chỉ hai bên đọc được quan hệ này. |
| `rs_sync` | Kiểm tra phiên bản, lưu bản thư viện và tạo lại phần public trong một giao dịch. Không tự gộp các thay đổi xung đột. |
| `rs_sync_for_owner` | Kiểm tra đúng tài khoản đang gửi trước khi gọi `rs_sync`, tránh gửi nhầm thư viện khi đổi tài khoản. |
| `rs_refresh_reading` | Hàm nội bộ tạo lại phiên đọc public và tổng giây; client không có quyền gọi trực tiếp. |

`app/supabase/schema.sql` dựng cấu trúc ban đầu 0.3 cho dự án mới. Sau đó chạy `app/supabase/upgrade-0.4.sql`. Tiếp đó chạy `upgrade-0.5.sql`. Dự án đang chạy 0.4 chỉ cần migration 0.5. File nâng cấp giữ nguyên bản thư viện private và revision, bổ sung phần public từ bản đã đồng bộ.

Public trong demo là **mọi thành viên đã đăng nhập**, không giới hạn ở bạn bè. Sách private không lộ chi tiết; ghi chú private không lộ nội dung. Tổng giờ đọc của tài khoản được công khai theo thiết kế đã chốt.

## 4. Luồng dữ liệu chính

1. Người dùng lưu sách/phiên; model kiểm tra, storage lưu trước khi gửi mạng. Android dùng SQLite, web chỉ giữ phần công việc cần phục hồi tạm trong tab.
2. useCloud tải thư viện hiện tại và gộp với dữ liệu gốc đã nhận trước đó (syncBase). Các mục sửa độc lập được giữ lại từ cả hai phía.
3. Các thay đổi được tạo thành thao tác có opId, ghi vào syncOutbox trước khi gọi mạng. Yêu cầu mất phản hồi được gửi lại nguyên vẹn.
4. rs_apply_ops kiểm tra auth.uid trùng expected_owner, khóa thư viện của tài khoản, so sánh bản gốc từng mục. Nếu khác cả bản gốc lẫn bản gửi thì trả xung đột; không ghi đè mục đó.
5. rs_sync_receipts lưu dấu yêu cầu đã nhận để retry không tạo phiên trùng. Thư viện private và phần public được cập nhật trong cùng giao dịch bằng writer nội bộ, client không được gọi writer trực tiếp.
6. Client nhận kết quả, giữ cả thay đổi phát sinh trong lúc gửi. Xung đột xuất hiện trong SyncPanel với hai bản để người dùng lựa chọn. Sách bị xóa ở cloud không âm thầm làm mất phiên mới còn trên thiết bị.
7. rs_sync_clients đánh dấu tài khoản đã dùng giao thức 0.5. Các lần ghi snapshot 0.4 sau đó bị chặn bằng RS_UPGRADE_REQUIRED; dữ liệu cũ vẫn đọc được.

Mạng gửi thao tác riêng lẻ, nhưng cơ sở dữ liệu vẫn giữ snapshot thư viện bên trong rs_libraries và tái tạo phần public. Cách này phù hợp demo nhỏ, chưa phải hệ thống đồng bộ quy mô lớn hoặc lịch sử nhiều phiên bản. Mỗi lô tối đa 50 thao tác, payload tối đa 12 MB. Cài đặt được xem là một mục chung khi giải quyết xung đột.

App tự kiểm tra khoảng 10 giây khi hoạt động và khi quay lại ứng dụng. Tạm dừng lúc timer chưa kết thúc, modal đang mở, ở trang Cá nhân hoặc trang cài đặt đang nhập mục tiêu. Sau khi lưu, chuyển về Phiên/Sách hoặc Đồng bộ để tiếp tục. Không có timer handoff hay dịch vụ upload bảo đảm khi app đóng. Hồ sơ và bạn bè là thao tác online riêng, không trong outbox.

Android giữ riêng khách và mỗi tài khoản. Web bắt buộc đăng nhập, thư viện trong bộ nhớ; sessionStorage chỉ giữ tạm công việc chưa gửi và timer, được xóa khi đã đồng bộ. Đóng tab/xóa browser data có thể mất bản tạm; giới hạn sessionStorage cũng có thể làm thao tác lưu báo lỗi. Trình duyệt cảnh báo khi rời trang với thay đổi hoặc form chưa lưu.

Thông tin điều phối sync không xuất trong JSON người dùng và không gửi vào snapshot cloud. Nhập JSON giữ baseline của tài khoản hiện tại để bản phục hồi tham gia cùng cơ chế đồng bộ.

## 5. Quy tắc ISBN và nhập tay

- **Không bắt buộc có ISBN**, không cần sách tồn tại trong nguồn tra cứu mới được lưu. Nhập tên, tác giả, số trang và tiến độ hợp lệ là đủ.
- ISBN có nhập thì phải đúng định dạng/chữ số kiểm tra. Có thể bỏ trống trường này nếu không có mã.
- Kho public của nhóm, Open Library, Google Books và nguồn Việt có phạm vi dữ liệu khác nhau; không nguồn nào bảo đảm bao phủ mọi ấn bản.
- Tìm theo tên hiện hỗ trợ Nhã Nam và NXB Trẻ. Người dùng xem tác giả/số trang/ISBN nguồn rồi quyết định dùng thông tin.
- Kết quả chỉ điền ô trống, không tự thay dữ liệu đã nhập và không tự đổi ISBN. Không coi kết quả cùng tên là bằng chứng khớp ấn bản.
- ISBN mẫu `9786041267879` có chữ số kiểm tra hợp lệ nhưng chưa có kết quả khớp trong lần kiểm tra nguồn công khai. App vẫn cho lưu sách với mã này khi nhập thông tin thủ công.

Nguồn đối chiếu: [website Nhã Nam](https://nhanam.vn), [Thần thoại Sisyphus tại NXB Trẻ](https://www.nxbtre.com.vn/sach/than-thoai-sisyphus-146679.html). Metadata trang NXB Trẻ thuộc ISBN `9786041204676`, không được tự gán thành ISBN mẫu khác.

## 6. Những thư mục/file chỉ có trên máy phát triển

| Đường dẫn | Ý nghĩa |
| --- | --- |
| `app/.env.local` | Project URL và publishable key để build online. Không đặt khóa service-role/secret ở đây vì biến EXPO_PUBLIC được nhúng trong app. |
| `app/.private/readsession-release.jks` | Khóa ký giúp Android nhận biết các APK cập nhật thuộc cùng ứng dụng. Cần giữ kín và giữ ổn định qua các lần phát hành. |
| `app/.private/signing.properties` | Mật khẩu khóa ký; không chia sẻ. |
| `app/build-release.cmd` | Lệnh build tại máy phát triển, chứa đường dẫn công cụ theo máy. |
| `app/run-android.cmd`, `app/start-usb.cmd` | Lệnh tiện ích chạy bản phát triển qua USB. |
| `app/node_modules/` | Mã thư viện bên thứ ba cài từ lockfile. Không chỉnh thủ công làm nguồn chính. |
| `app/android/` | Gradle, cấu hình native, tài nguyên, file biên dịch, cache và APK trung gian. Expo tạo lại; thay đổi lâu dài cần đặt ở app.json/plugin. |
| `app/android/local.properties` | Đường dẫn SDK riêng của máy. |
| `app/.expo/` | Trạng thái phát triển Expo trên máy. |
| `app/dist/` | Bundle xuất thử; không phải APK. |
| `docs/REQUIREMENTS.md` | Yêu cầu nội bộ đã tổng hợp. |
| `docs/TEST_PLAN.md` | Kế hoạch thử nghiệm nội bộ. |
| `docs/RELEASE_BUILD_LOCAL.md` | Ghi chú build/cài release tại máy. |
| `docs/DEMO_ACCOUNTS_LOCAL.md` | Thông tin đăng nhập demo cấp riêng; không đưa lên GitHub. |
| `.work/` | Log build, dữ liệu kiểm thử, script kiểm tra, HTML nguồn tạm và cache. Có thể chứa thông tin riêng, không công khai. |
| `LOCAL_DEVELOPMENT.md` | README phát triển cũ đã chuyển thành tài liệu riêng. |
| `Bieu_mau_yeu_cau_app_ReadTracker.docx` | Biểu mẫu yêu cầu người dùng điền, giữ riêng. |
| `.gitattributes`, `app/gitignore` nếu có | File cấu hình/di sản tại máy hiện chưa nằm trong danh sách nguồn công khai; quy tắc ignore có hiệu lực cho repo là `.gitignore` ở gốc. |

Không cần mô tả từng file trong `node_modules`, `.gradle`, `.cxx`, `build` vì đó là đầu ra của công cụ. Không xóa thư viện, khóa ký hay dữ liệu chỉ vì chúng bị Git ignore.

## 7. Trạng thái bản 0.5

Đã tách Cá nhân/Đồng bộ, bỏ gợi ý bạn bè, thêm điều hướng, tổng giờ public, danh sách xổ xuống chọn ba sách, chi tiết từ bìa sách, hướng dẫn, lựa chọn Local/Đăng nhập một lần và tìm sách Việt theo tên. Đồng bộ thường chạy yên lặng, chỉ hiện vấn đề.

Âm thanh tạm tắt. Thông báo đẩy “Nhắc đọc” tạm hoãn theo yêu cầu, chưa cần Firebase/Expo push. Đã thêm web GitHub Pages, gộp thay đổi từng mục, outbox chống lặp và lựa chọn xung đột. Chưa có lịch sử sao lưu nhiều phiên bản.

Kiểm tra trước phát hành: TypeScript, 32 kiểm thử tự động, tra cứu thực tế hai nguồn sách, kiểm thử SQL về quyền riêng tư/tổng thời gian/xung đột trong giao dịch hoàn tác, kiểm tra API bảo vệ đổi tài khoản, build release, chữ ký và quét file riêng. Đã kiểm tra web đăng nhập và tìm sách Việt; vẫn cần thử APK 0.5 trên điện thoại thật của người dùng.

## 8. Điểm tiếp tục và sao lưu khi phát triển

`docs/UPGRADE_05_PROGRESS_LOCAL.md` ghi mốc đang làm và việc còn lại. `.work/backup-05.cjs` lưu mã nguồn cùng snapshot của các tài khoản demo vào `.work/backups/<thời điểm>/`; chỉ thư mục có COMPLETE.json mới là backup đủ. `.work/LATEST_BACKUP.txt` trỏ bản gần nhất. Tất cả các file này là riêng, không phát hành. Đó là sao lưu tại lúc thực hiện, không phải dịch vụ backup cloud tự động cho mọi người dùng.

## Giao diện web co giãn theo trình duyệt

`app/src/responsive.css` chỉ được nhập từ `App.web.tsx`; `web-assets.d.ts` khai báo kiểu import CSS. Các nativeID trong `ReadSession.tsx` xác định khung chính, header, nội dung cuộn, timer, thống kê, tủ sách và hộp thoại.

Khung web dùng toàn bộ chiều rộng cửa sổ, với khoảng đệm hai bên tự điều chỉnh. Từ 1.000px, timer và thống kê nằm cạnh nhau. Tủ sách tăng từ một cột lên hai cột ở 700px, ba cột ở 1.400px và bốn cột ở 1.900px. Hộp thoại căn giữa trên desktop, giới hạn chiều cao theo cửa sổ để nội dung bên trong cuộn được; màn hình nhỏ dùng bố cục dọc. CSS không được nạp vào APK Android.
