# Release thiệp cưới: GitHub → Cloudflare Workers

Bộ này chứa đầy đủ mã nguồn của thiệp Đức Trường & Thúy Quỳnh và cấu hình Workers Static Assets. Đã chuẩn bị cho luồng: **sửa source → commit/push GitHub → Cloudflare tự build → website cập nhật**.

## 1. Đưa đúng bộ source lên GitHub

Giải nén `CloudflareRelease.zip` vào `D:\ThiepMoiCuoiOnline\CloudflareRelease`. Đưa **nội dung bên trong** thư mục này vào thư mục gốc của repository. Có thể dùng GitHub Desktop nếu bạn quen giao diện.

Repository nên có cấu trúc:

```text
repository/
├── package.json
├── package-lock.json
├── wrangler.jsonc
├── .node-version
├── .gitignore
├── src/
│   └── worker.mjs
├── scripts/
│   ├── check-site.mjs
│   ├── release.mjs
│   └── worker.test.mjs
└── dist/
    ├── index.html
    ├── styles.css
    ├── app.js
    ├── config.js
    └── assets/
```

**Cần commit cả `dist/`**: đây là source HTML/CSS/JS của trang, đã sẵn sàng để phục vụ. Lệnh `npm run build` kiểm tra mã, đường dẫn ảnh và định tuyến; trang không cần biên dịch framework.

Giữ `.gitignore` đi kèm để bỏ qua `node_modules/` và bộ nhớ đệm. Bộ release không mang theo Git history hoặc cấu hình hosting riêng của bản xem ChatGPT.

## 2. Kiểm tra tên Worker

Trong `wrangler.jsonc`, tên đã đặt là:

```json
"name": "thiep-cuoi-duc-truong-thuy-quynh"
```

Khi tạo Worker trên Cloudflare, dùng đúng tên này. Nếu kết nối vào Worker đã có, sửa `name` cho trùng tên Worker đó. Tên repository GitHub có thể khác tên Worker.

`assets.directory` trỏ tới `./dist`; `src/worker.mjs` xử lý đường dẫn `/thiep-cuoi/` trước khi phục vụ các tệp tĩnh. Đây là cấu hình [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/binding/).

## 3. Kết nối GitHub trên Cloudflare

Với Worker mới:

1. Đăng nhập Cloudflare và mở **Workers & Pages**.
2. Chọn **Create application → Import a repository → Get started**.
3. Chọn GitHub, rồi chọn repository thiệp.
4. Nếu cần kết nối GitHub App, cấp quyền cho repository thiệp bằng **Only select repositories**.
5. Điền bảng cấu hình ở bước 4 bên dưới, rồi chọn **Save and Deploy**.

Với Worker đã tồn tại: mở Worker đó → **Settings → Builds → Connect**, rồi chọn repository và cấu hình tương tự. Cloudflare yêu cầu tên Worker khớp `name` trong Wrangler. [Kết nối Worker mới/cũ](https://developers.cloudflare.com/workers/ci-cd/builds/), [quyền repository GitHub](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/).

## 4. Điền các ô build

| Ô trên Cloudflare | Giá trị cho bộ thiệp này |
| --- | --- |
| Worker name | `thiep-cuoi-duc-truong-thuy-quynh` |
| Production branch / Git branch | `main`, hoặc đúng nhánh bạn dùng để phát hành |
| Root directory | Để mặc định nếu `wrangler.jsonc` ở gốc repo |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Preview command, nếu bật branch previews | Giữ mặc định `npx wrangler preview` |

Nếu bạn commit **cả thư mục `CloudflareRelease/`** vào repo thay vì đưa nội dung lên gốc, Root directory phải là `CloudflareRelease`. Không điền đường dẫn ổ D vào ô này. Root directory phải là thư mục chứa `package.json` và `wrangler.jsonc` trong repository.

Không cần ô “Build output directory” cho cách deploy Workers này: vị trí `dist` đã nằm trong `wrangler.jsonc`. Không cần tự tạo GitHub Actions; Workers Builds xử lý quá trình build/deploy. Cloudflare có thể tạo token triển khai trong bước thiết lập Builds, không cần chạy `wrangler login` trên máy chỉ để dùng tích hợp Git. [Các trường cấu hình Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

## 5. Xem kết quả và cập nhật lần sau

Khi deployment thành công, mở URL `workers.dev` mà Cloudflare cung cấp. Xem trên điện thoại và kiểm tra ảnh, tên hai gia đình, giờ tiệc, giờ làm lễ, nút chọn nhà trai/nhà gái, bản đồ và lịch.

Những lần sau:

1. Thay ảnh ở `dist/assets/`, cập nhật đường dẫn trong `dist/config.js` nếu đổi tên tệp.
2. Sửa thông tin tại `dist/config.js`; sửa giao diện tại `dist/styles.css` hoặc `dist/index.html`.
3. Commit và push lên nhánh production.
4. Mở **Deployments → View build history** để theo dõi; kiểm tra website sau khi deployment thành công.

Đã ẩn nút chỉnh thiệp trên bản gửi khách. Chỉnh ảnh/thông tin trong source rồi push sẽ cập nhật cho mọi khách. Thay đổi lưu riêng trong trình duyệt của bản mẫu không tự đi vào GitHub.

Ảnh đi kèm là ảnh minh họa AI, chưa phải ảnh cưới của hai bạn. Phần sổ lưu bút/lời chúc đã được bỏ. Nút xác nhận tham dự đang ẩn; điền liên kết biểu mẫu vào `rsvpUrl` nếu muốn dùng.

## 6. Nếu lần build đầu bị lỗi

| Thông báo hoặc hiện tượng | Cách kiểm tra |
| --- | --- |
| Không tìm thấy `package.json` hoặc Wrangler config | Root directory chưa trỏ đúng thư mục |
| Worker name mismatch | Sửa tên Worker hoặc `name` trong `wrangler.jsonc` cho giống nhau |
| Missing script: build | Chưa commit `package.json` mới của bộ release này |
| Thiếu `dist/index.html` | Chưa commit thư mục `dist` |
| Ảnh 404 | Commit cả ảnh; tên và chữ hoa/thường phải khớp `config.js` |
| Không thấy repo trong danh sách | Kiểm tra repository access của Cloudflare Workers & Pages GitHub App |
| Node version không đủ mới | Dùng Node 24; đã kèm `.node-version` cho build image |

## 7. Dùng /thiep-cuoi trên domain hiện tại

URL chính của thiệp là **https://truongparker.io.vn/thiep-cuoi/**. Website hiện tại tiếp tục dùng hosting và bản ghi DNS hiện có.

- Zone `truongparker.io.vn` phải đang hoạt động trong Cloudflare; bản ghi DNS của hostname này phải bật **Proxied** (mây cam).
- `wrangler.jsonc` khai báo hai Route: `truongparker.io.vn/thiep-cuoi` và `truongparker.io.vn/thiep-cuoi/*`. Wrangler sẽ áp dụng chúng khi deploy. Không gắn toàn bộ hostname `truongparker.io.vn` làm Custom Domain của Worker thiệp cưới.
- `src/worker.mjs` chuyển `/thiep-cuoi` sang `/thiep-cuoi/`, bỏ tiền tố khi đọc tệp từ `dist/`, và giữ các chuyển hướng tài nguyên bên trong đường dẫn thiệp. Dùng URL có dấu `/` cuối khi chia sẻ, kể cả khi thêm query string.
- Bản production và preview vẫn phục vụ thiệp ở `/` trên URL `workers.dev`; preview không khai báo Route trên domain chính.
- Sau khi push, xem **Deployments → View build history**. Kiểm tra **Settings → Domains & Routes** có đủ hai Route, rồi mở trang thiệp, CSS và ảnh trên domain.
- Giữ **Build command** là `npm run build` và **Deploy command** là `npx wrangler deploy`. Nếu báo lỗi quyền sửa Route, kiểm tra API token của Workers Builds có quyền **Zone → Workers Routes → Edit** cho zone này.

`npm run build` kiểm tra source và chạy các kiểm tra định tuyến. Có thể chạy riêng bằng `npm test`.

Tham khảo: [Workers Routes](https://developers.cloudflare.com/workers/configuration/routing/routes/), [Static Assets binding](https://developers.cloudflare.com/workers/static-assets/binding/).

## 8. Quay lại bản ổn định

Với luồng Git, cách dễ theo dõi là **revert commit gây lỗi rồi push** để source và website trở về cùng nội dung. Nếu cần phục hồi website ngay, dùng mục **Deployments** của Worker để chọn phiên bản ổn định và rollback; sau đó sửa/revert source trên GitHub trước lần push tiếp theo. [Rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).

Các lệnh chạy từ máy Windows có trong `LENH-RELEASE-WINDOWS.md`. Ghi lại commit, deployment và URL mỗi lần phát hành theo `NHAT-KY-RELEASE.md`.

## Tình trạng bộ đóng gói

- Đã kiểm tra cú pháp JavaScript, ngày giờ, sự tồn tại và chữ hoa/thường của các đường dẫn ảnh.
- Đã chạy thành công `wrangler deploy --dry-run` với Wrangler `4.151.0`.
- Package lock đã cố định phụ thuộc; không kèm `node_modules`.
- Bộ này chưa đăng nhập hoặc deploy vào tài khoản Cloudflare của bạn. Sau khi bạn kết nối GitHub và chọn Save and Deploy, Cloudflare mới phát hành trang trên tài khoản của bạn.

Hướng dẫn được đối chiếu tài liệu Cloudflare ngày 15/10/2026.

## Tạo link mời theo tên khách

Mở **/thiep-cuoi/admin/** trên tên miền thiệp, nhập tên người nhận rồi chọn **Sao chép link**.
Nút **Mở thiệp xem thử** cho phép kiểm tra tên trước khi gửi. Link có dạng
**/thiep-cuoi/?to=Anh+Minh**; tên tiếng Việt và ký tự đặc biệt được mã hóa tự động.

Khách sẽ thấy **Kính mời: [tên người nhận]** trên màn mở phong bì và trong phần lời mời.
Link không có tên hoặc tên trống dùng **Quý khách**. Mỗi link tự mang tên của người nhận;
trang tạo link không lưu danh sách khách hay thay đổi nội dung thiệp.

Khi chạy **npm run dev**, mở http://127.0.0.1:8787/thiep-cuoi/admin/.
Để dùng trên tên miền chính, phát hành các thay đổi theo quy trình release ở trên.
