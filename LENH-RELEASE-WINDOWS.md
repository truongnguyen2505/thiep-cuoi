# Lệnh tham khảo trên Windows

Dùng phần này khi muốn kiểm tra trên máy hoặc release trực tiếp. Với luồng GitHub → Workers Builds, bạn chỉ cần commit/push sau khi kết nối repo.

## Cài và kiểm tra trên máy

Cài Node.js 24 LTS từ trang Node.js nếu máy chưa có. Mở PowerShell trong thư mục chứa `package.json`:

```powershell
Set-Location 'D:\ThiepMoiCuoiOnline\CloudflareRelease'
npm.cmd ci
npm.cmd run build
npm.cmd run dev
```

Mở địa chỉ Wrangler in ra, thường là `http://127.0.0.1:8787`. Dùng `Ctrl+C` để dừng. Bộ này yêu cầu Node từ 22 trở lên; Wrangler được cài theo `package-lock.json`. [Yêu cầu Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/).

Kiểm tra đóng gói mà chưa deploy:

```powershell
npm.cmd run dry-run
```

## Release trực tiếp, nếu không dùng tự động qua Git

```powershell
npm.cmd run login
npm.cmd run whoami
npm.cmd run release
```

Đăng nhập đúng tài khoản và kiểm tra `whoami` trước khi release. Lệnh release kiểm tra source rồi đưa bản mới lên Worker chính. Kết quả sẽ in URL thực tế. [Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/workers/).

Muốn deploy vào một Worker thử nghiệm riêng:

```powershell
npm.cmd run release:preview
```

Lệnh này dùng `wrangler.preview.jsonc` với tên kết thúc `-preview`, tạo URL riêng có thể truy cập. Đây là Worker thử nghiệm độc lập; branch previews tự động của Workers Builds dùng lệnh mặc định riêng trên dashboard.

## Liệt kê phiên bản và rollback bằng CLI

```powershell
npm.cmd run versions
npm.cmd run rollback -- VERSION_ID
```

Thay `VERSION_ID` bằng ID thật của bản muốn phục hồi. Wrangler sẽ hỏi xác nhận. Sau rollback, phục hồi source tương ứng trước lần release tiếp theo để không đẩy lại lỗi cũ.

## Lệnh hằng ngày cho luồng GitHub

Nếu repo đã kết nối và bạn đang ở đúng repo:

```powershell
npm.cmd run build
git status
git add dist
git commit -m 'Update wedding invitation'
git push
```

Ví dụ này chỉ thêm thay đổi trong `dist`. Khi sửa cấu hình hoặc lệnh build, commit thêm đúng các tệp đó và `package-lock.json` nếu phụ thuộc thay đổi. Không cần chạy `npm run release` sau push nếu Cloudflare đã tự deploy từ Git.
