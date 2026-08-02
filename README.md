<div align="center">

<img src="public/logo.jpg" alt="Steam Region Price Comparator" width="120" style="border-radius:16px" />

# Steam Region Price Comparator

**So sánh giá game Steam tại 27 khu vực trên toàn thế giới.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5.1-000000?logo=express)](https://expressjs.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#license)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

*Vietnamese · [English](https://github.com/vokhoi220808/steam-region-price/blob/main/README_EN.md)*

---

Công cụ web giúp so sánh giá game Steam trên **27 khu vực** khác nhau, quy đổi về cùng một loại tiền tệ bằng tỷ giá thời gian thực, và theo dõi giá với thông báo mục tiêu. Tất cả dữ liệu người dùng lưu cục bộ trên trình duyệt.

[Try it live](https://steam-region-price.onrender.com) · [Report Bug](https://github.com/vokhoi220808/steam-region-price/issues) · [Request Feature](https://github.com/vokhoi220808/steam-region-price/issues)

</div>

---

## Mục lục

- [Tính năng](#tính-năng)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cài đặt & Chạy](#cài-đặt--chạy)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [API & Caching](#api--caching)
- [Bảo mật & Lưu trữ](#bảo-mật--lưu-trữ)
- [Ghi chú](#ghi-chú)

---

## Tính năng

### 🔍 So sánh giá theo khu vực
- Tìm game, DLC và Complete Bundle bằng **tên, App/Package ID, hoặc Steam URL** (hỗ trợ autocomplete)
- So sánh giá trên **27 khu vực**: VN, US, UK, EU, JP, KR, CN, BR, MX, CA, AU, IN, ID, PH, TH, SG, MY, TR, ZA, PL, CH, HK, RU, TW, AR, UA, AE
- Quy đổi tự động bằng **tỷ giá thời gian thực** (cache 6 giờ)
- 3 chế độ hiển thị: **Bảng**, **Thẻ (Grid)**, **Biểu đồ cột**
- Sắp xếp, lọc region, toggle hiển thị giá chưa bán, filter đang giảm giá
- **Xuất CSV**, biểu đồ lịch sử 3/6/12 tháng và mốc thấp nhất lịch sử (IsThereAnyDeal API), copy link chia sẻ

### 🏷️ Top Deals
- Game nổi bật từ Steam API (Specials, Deep Discounts, Free Games, Top Sellers, New Releases)
- Lịch Steam Sale/Festival và đếm ngược theo lịch chính thức của Valve
- Chế độ Grid & List; lọc theo giảm giá, đánh giá, thể loại, CCU và loại nội dung
- Chuyển trực tiếp sang so sánh giá

### 📊 Theo dõi giá (Price Tracker)
- Thêm game bằng tên, App ID hoặc URL với wizard 2 bước
- Đặt **giá mục tiêu** với tiền tệ tùy chọn
- **Khu vực ưu tiên** và **khu vực so sánh** cho từng game
- **Tag**, **bộ sưu tập tùy chỉnh**, **ghi chú**, **ghim** lên đầu
- Trạng thái: Đạt mục tiêu · Gần mục tiêu · Đang theo dõi · Không có mục tiêu · Lỗi
- Xu hướng giá: Tăng / Giảm / Không đổi
- **Thanh tỷ lệ giá** trực quan so sánh region
- **Summary strip** lọc nhanh theo trạng thái
- **Toolbar** đầy đủ: tìm kiếm, lọc status/region/tag/khoảng giá, 10 chế độ sắp xếp, grid/list, mật độ hiển thị
- **Drawer chi tiết** với tab: Tổng quan · Giá theo vùng · Lịch sử cục bộ · Thông tin lưu trữ
- **Cập nhật giá hàng loạt** (3 worker song song)
- Đồng bộ Wishlist công khai bằng Steam ID hoặc profile link (cần `STEAM_API_KEY`)

### 💾 Quản lý dữ liệu
- **Nhập/xuất JSON** (merge, cập nhật, hoặc ghi đè)
- **Xuất CSV** cho danh sách game
- **Backup & Restore** tự động trước mỗi lần ghi
- **Schema versioning** với migration (v0 → v1)
- **Validation**, **salvage/recovery** cho dữ liệu lỗi
- **Atomic writes** vào localStorage với temp key verification
- **History tracking** có giới hạn cấu hình (90/180/366 bản ghi)

### 🎨 Giao diện
- **Dark/Light theme** với CSS custom properties
- **Responsive** — hoạt động tốt trên mobile (bottom sheets, hamburger menu)
- **Accessible** — ARIA roles, focus traps, keyboard navigation, screen reader labels
- Skeleton loading, progress bar, error/empty states
- **i18n** — Tiếng Việt / English

---

## Công nghệ sử dụng

| Layer | Technology |
|---|---|
| **Backend** | Node.js 18+, Express 5.1, ES Modules |
| **Frontend** | Vanilla JavaScript, Native ES Modules (không framework) |
| **Styling** | Pure CSS (~4,200 dòng), CSS Custom Properties |
| **Charts** | Chart.js (CDN) |
| **Fonts** | Inter (Google Fonts) |
| **APIs** | Steam Store API, Open Exchange Rates, IsThereAnyDeal |

**Không có build step** — chạy trực tiếp trên trình duyệt, không cần webpack/vite/rollup.

---

## Cài đặt & Chạy

### Yêu cầu

- **Node.js 18** trở lên

### Bắt đầu

```bash
# Clone repository
git clone https://github.com/vokhoi220808/steam-region-price.git
cd steam-region-price

# Cài dependencies
npm install

# Chạy development (auto-reload)
npm run dev

# Hoặc chạy production
npm start
```

Mở trình duyệt tại **http://localhost:3000**.

### Biến môi trường

Tạo file `.env` trong thư mục gốc (không commit lên git):

```env
PORT=3000
ITAD_API_KEY=your_api_key_here
STEAM_API_KEY=your_steam_web_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=your_long_random_secret
ALERT_BATCH_SIZE=80
TELEGRAM_BOT_TOKEN=your_bot_token
RESEND_API_KEY=re_xxxxxxxxx
ALERT_FROM_EMAIL=Steam Price Compare <alerts@your-domain.com>
```

| Biến | Mặc định | Bắt buộc | Mô tả |
|---|---|---|---|
| `PORT` | `3000` | Không | Port của server |
| `ITAD_API_KEY` | — | Không | API key từ [IsThereAnyDeal](https://isthereanydeal.com/dev/key/) — cần cho tính năng lịch sử giá |
| `STEAM_API_KEY` | — | Không | Steam Web API key — cần để đồng bộ Wishlist công khai bằng Steam ID/Profile Link |
| `SUPABASE_URL` | — | Cloud Alerts | URL dự án Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Cloud Alerts | Service role key, chỉ đặt ở backend/Vercel Environment Variables |
| `CRON_SECRET` | — | Cloud Alerts | Khóa bảo vệ endpoint cron |
| `ALERT_BATCH_SIZE` | `80` | Không | Số cảnh báo tối đa xử lý mỗi lượt, giới hạn cứng 500 |
| `TELEGRAM_BOT_TOKEN` | — | Telegram | Token của Telegram bot dùng chung cho website |
| `RESEND_API_KEY` | — | Email | API key gửi mail qua Resend |
| `ALERT_FROM_EMAIL` | — | Email | Địa chỉ gửi từ domain đã xác minh |

> **Lưu ý:** Không có các API key thì ứng dụng vẫn chạy bình thường. `ITAD_API_KEY` mở dữ liệu lịch sử giá thật; `STEAM_API_KEY` mở tính năng đồng bộ Wishlist.

### Cloud Price Alerts trên Vercel

1. Tạo dự án Supabase và chạy file `supabase/migrations/001_cloud_price_alerts.sql` trong SQL Editor.
2. Thêm các biến môi trường ở trên vào Vercel; tuyệt đối không đưa service role key vào frontend.
3. Deploy dự án. `vercel.json` gọi `/api/cron/check-alerts` mỗi ngày lúc 02:00 UTC, phù hợp Vercel Hobby.
4. Nếu cần kiểm tra mỗi 6 giờ, dùng Supabase Cron gọi cùng endpoint với header `Authorization: Bearer <CRON_SECRET>` hoặc đổi lịch trên gói Vercel phù hợp.
5. Vào **Theo dõi giá → Thông báo giá**, nhập ít nhất một kênh và bấm **Lưu & đồng bộ**.

Discord hoạt động chỉ với Webhook URL. Telegram cần `TELEGRAM_BOT_TOKEN` và Chat ID của người nhận. Email cần Resend cùng domain gửi đã xác minh. Cron mặc định xử lý 80 cảnh báo/lượt, bốn request giá đồng thời và chỉ báo lại khi giá giảm thêm sau cooldown 24 giờ.

### Kiểm thử

```bash
npm test
```

### Scripts

| Script | Mô tả |
|---|---|
| `npm start` | Khởi động server production |
| `npm run dev` | Dev server với file watching (`node --watch`) |
| `npm test` | Chạy tất cả test (`node --test`) |

---

## Cấu trúc dự án

```
steam-region-price-comparator/
├── server.js                    # Express server — API proxy & caching
├── package.json
├── public/
│   ├── index.html               # Single-page app (657 dòng)
│   ├── app.js                   # Main controller (2,062 dòng)
│   ├── style.css                # Theme & layout (1,094 dòng)
│   ├── tracker.css              # Price tracker styles (3,077 dòng)
│   ├── logo.jpg
│   └── modules/
│       ├── components/          # UI components
│       │   ├── game-card.js         # Game card (grid view)
│       │   ├── game-row.js          # Game row (list view)
│       │   ├── game-drawer.js       # Detail drawer with tabs
│       │   ├── game-sheet.js        # Add/edit game sheet
│       │   ├── price-scale.js       # Visual price scale bar
│       │   ├── summary-strip.js     # Status summary quick filters
│       │   ├── tracker-toolbar.js   # Filter/sort toolbar
│       │   ├── data-manager.js      # Import/export/backup modal
│       │   ├── confirm-dialog.js    # Accessible confirm dialog
│       │   └── empty-state.js       # Empty/no-results states
│       ├── services/            # API layer
│       │   ├── steam-service.js     # Steam API client
│       │   └── history-simulation.js # Simulated price history
│       ├── storage/             # LocalStorage persistence
│       │   ├── storage-schema.js        # Data schema & defaults
│       │   ├── storage-validation.js    # Validation & sanitization
│       │   ├── storage-migrations.js    # Schema migration system
│       │   ├── storage-repository.js    # Full CRUD repository
│       │   └── storage-import-export.js # JSON/CSV import/export
│       ├── tracker/             # Tracker feature logic
│       │   ├── tracker-store.js     # Reactive pub/sub store
│       │   ├── tracker-status.js    # Status computation
│       │   ├── tracker-filters.js   # Filter & sort logic
│       │   └── tracker-page.js      # Page orchestrator
│       └── utils/               # Shared utilities
│           ├── currency.js     # Currency formatting
│           ├── dates.js        # Date formatting
│           ├── debounce.js     # Debounce & throttle
│           ├── dom.js          # DOM helpers, focus trap, XSS safety
│           └── ids.js          # UUID generation
└── test/                        # Tests (Node.js built-in runner)
    ├── history-simulation.test.js
    ├── price-scale.test.js
    ├── storage-repository.test.js
    ├── tracker-filters.test.js
    └── tracker-markup.test.js
```

**Tổng cộng ~7,800 dòng mã nguồn** (không tính node_modules).

---

## API & Caching

### Backend Routes

| Route | Mô tả |
|---|---|
| `GET /api/regions` | Danh sách 27 khu vực (code, tên, flag) |
| `GET /api/search?q=...` | Tìm kiếm game qua Steam Store Search API |
| `GET /api/compare/:appId?currency=VND&regions=vn,us,...` | Lấy giá theo khu vực, quy đổi, xếp hạng |
| `GET /api/history/:appId` | Lịch sử giá từ IsThereAnyDeal API |
| `GET /api/deals?cc=VN` | Game nổi bật từ Steam Featured Categories API |
| `GET /api/deals/metadata?appids=...` | Đánh giá, thể loại và CCU cho bộ lọc nâng cao |
| `GET /api/sales-calendar` | Lịch Steam Sale/Festival sắp tới |
| `GET /api/wishlist?profile=...` | Đồng bộ Wishlist công khai từ Steam |
| `GET /api/cache/status` | Thống kê hit/miss và dung lượng cache |
| `GET /api/alerts/status` | Trạng thái Cloud Alerts và các kênh đã cấu hình |
| `POST /api/alerts/sync` | Đồng bộ các game có giá mục tiêu lên Supabase |
| `POST /api/alerts/test` | Gửi thông báo thử qua các kênh đã lưu |
| `DELETE /api/alerts` | Tắt toàn bộ cảnh báo của thiết bị hiện tại |
| `GET /api/cron/check-alerts` | Job được bảo vệ bằng `CRON_SECRET` để kiểm tra và gửi cảnh báo |

### API Keys

| API | Auth | Ghi chú |
|---|---|---|
| **Steam Store API** | Không cần key | Miễn phí, có rate limit |
| **Open Exchange Rates** | Không cần key | Free tier, cache 6 giờ |
| **IsThereAnyDeal** | Cần API key | Miễn phí, đăng ký tại [isthereanydeal.com/dev/key](https://isthereanydeal.com/dev/key/) |
| **Steam Web API** | Cần API key cho Wishlist | Đăng ký tại [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey) |

> **Tại sao cần CORS proxy?** — Steam API không hỗ trợ CORS, nên tất cả request từ frontend đều đi qua server backend để bypass giới hạn trình duyệt.

### Caching Strategy

| Dữ liệu | TTL | Storage |
|---|---|---|
| Giá game | 20 phút | In-memory Map |
| Tỷ giá | 6 giờ | In-memory Map |
| Deals / CCU | 5 phút | In-memory Map |
| Metadata | 6 giờ | In-memory Map |

Server đóng vai trò **CORS proxy** — tất cả request đến Steam API đều đi qua backend để tránh giới hạn trình duyệt.

---

## Bảo mật & Lưu trữ

- **Không có đăng ký** — không thu thập thông tin cá nhân
- **Dữ liệu lưu cục bộ** trên localStorage — không gửi ra server
- **Không chạy nền** — tracker chỉ cập nhật khi người dùng chủ động nhấn "Cập nhật giá"
- **XSS protection** — tất cả dữ liệu đầu vào đều qua `escapeHtml()` trước khi chèn DOM
- **Atomic writes** — ghi tạm vào temp key, validate, rồi commit để tránh dữ liệu hỏng
- **Auto backup** — tự động sao lưu trước mỗi lần ghi dữ liệu mới
- **Schema versioning** — hỗ trợ migration khi schema thay đổi

---

## Ghi chú

- Steam Storefront API có thể thay đổi hoặc giới hạn truy cập bất cứ lúc nào.
- Tỷ giá được lấy từ `open.er-api.com` và cache 6 giờ.
- Giá Steam được cache 20 phút để giảm số request.
- Lịch sử trong tracker chỉ gồm các lần giá thay đổi đã được lưu trên thiết bị này; đây **không phải lịch sử giá chính thức** của Steam.
- Công cụ chỉ dùng để tham khảo, **không hỗ trợ** đổi vùng tài khoản Steam.

---
## Steam Cloud, PWA và lịch sử giá nội bộ

Phiên bản này hỗ trợ đăng nhập Steam OpenID, đồng bộ tracker/Wishlist theo tài khoản, deal cá nhân hóa, Web Push, PWA/offline shell, snapshot giá nội bộ và dashboard vận hành.

1. Chạy lần lượt migration `supabase/migrations/001_cloud_price_alerts.sql` và `supabase/migrations/002_accounts_pwa_history_reliability.sql` trong Supabase SQL Editor.
2. Sao chép các biến trong `.env.example` vào Vercel. `SESSION_SECRET` phải là chuỗi ngẫu nhiên dài; `PUBLIC_BASE_URL` phải đúng domain production.
3. Tạo VAPID key bằng `npx web-push generate-vapid-keys`, sau đó đặt `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` và `VAPID_SUBJECT`.
4. Thêm SteamID64 của quản trị viên vào `ADMIN_STEAM_IDS`. Dashboard chỉ hiện với các tài khoản này; `ADMIN_TOKEN` dành cho kiểm tra API thủ công.
5. Có thể thêm Upstash Redis để chia sẻ deals cache và rate-limit counter giữa các Vercel Function instance. Nếu bỏ trống, ứng dụng tự dùng in-memory fallback.

Cron không quét 10.000 game mỗi ngày. Nó chỉ đọc `price_alerts` đang bật, theo batch `ALERT_BATCH_SIZE`, cache request trùng và lưu snapshot tối đa khoảng một lần/ngày khi giá không đổi. Khi giá hoặc mức giảm thay đổi, snapshot mới được lưu để tạo biểu đồ và thống kê trung bình 90 ngày. Dự đoán sale là heuristic từ chu kỳ snapshot, không phải cam kết về đợt giảm giá tương lai.

Các API mới: `GET /api/auth/me`, `GET /api/auth/steam`, `GET|POST /api/account/*`, `GET /api/account/deals`, `GET /api/history/internal/:appId`, `GET|POST /api/push/*`, `GET /api/health` và `GET /api/admin/status`.

---

## License

Licensed under the [MIT License](LICENSE).

This is an unofficial project and is not affiliated with Valve or Steam.
See [DISCLAIMER.md](DISCLAIMER.md) for additional information.
<div align="center">


Made with ❤️ for the Steam community

</div>
