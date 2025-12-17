# MediaPipe Setup Instructions

## Issue: pnpm store location error

Nếu gặp lỗi khi cài đặt package:
```
ERR_PNPM_UNEXPECTED_STORE  Unexpected store location
```

## Giải pháp

### Option 1: Reinstall dependencies (Khuyến nghị)
```bash
# Xóa node_modules và reinstall
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install

# Sau đó cài MediaPipe
pnpm add @mediapipe/selfie_segmentation
```

### Option 2: Thay đổi store location
```bash
# Set global store location
pnpm config set store-dir ~/.pnpm-store --global

# Reinstall
rm -rf node_modules
pnpm install
pnpm add @mediapipe/selfie_segmentation
```

### Option 3: Sử dụng npm thay vì pnpm
```bash
# Trong thư mục apps/web
cd apps/web
npm install @mediapipe/selfie_segmentation
```

## Fallback Implementation

Code hiện tại đã có fallback implementation. Nếu MediaPipe chưa được cài đặt:
- Virtual backgrounds sẽ hiển thị warning
- Feature sẽ bị disable
- App vẫn chạy bình thường

## Verify Installation

Sau khi cài đặt thành công:

1. Check package.json:
```bash
grep mediapipe apps/web/package.json
```

2. Restart dev server:
```bash
pnpm dev
```

3. Check browser console - không còn warning "MediaPipe not installed"

## Alternative: Không sử dụng Virtual Backgrounds

Nếu không cần tính năng này ngay:
- Code đã có fallback, app vẫn chạy được
- Virtual backgrounds button sẽ hiện nhưng không hoạt động
- Có thể cài đặt sau khi cần

## Support

- MediaPipe docs: https://google.github.io/mediapipe/
- Issue tracker: https://github.com/google/mediapipe/issues

