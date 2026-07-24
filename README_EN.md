<div align="center">

<img src="public/logo.jpg" alt="Steam Region Price Comparator" width="120" style="border-radius:16px" />

# Steam Region Price Comparator

**Compare Steam game prices across 27 regions worldwide.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5.1-000000?logo=express)](https://expressjs.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#license)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

*Vietnamese(https://github.com/vokhoi220808/steam-region-price) · [English]*

---

Công cụ web giúp so sánh giá game Steam trên **27 khu vực** khác nhau, quy đổi về cùng một loại tiền tệ bằng tỷ giá thời gian thực, và theo dõi giá với thông báo mục tiêu. Tất cả dữ liệu người dùng lưu cục bộ trên trình duyệt — không cần đăng ký, không gửi ra ngoài.

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
- Tìm game bằng **tên, App ID, hoặc Steam URL** (hỗ trợ autocomplete)
- So sánh giá trên **27 khu vực**: VN, US, UK, EU, JP, KR, CN, BR, MX, CA, AU, IN, ID, PH, TH, SG, MY, TR, ZA, PL, CH, HK, RU, TW, AR, UA, AE
- Quy đổi tự động bằng **tỷ giá thời gian thực** (cache 6 giờ)
- 3 chế độ hiển thị: **Bảng**, **Thẻ (Grid)**, **Biểu đồ cột**
- Sắp xếp, lọc region, toggle hiển thị giá chưa bán, filter đang giảm giá
- **Xuất CSV**, xem lịch sử giá (IsThereAnyDeal API), copy link chia sẻ

### 🏷️ Top Deals
- Game nổi bật từ Steam API (Specials, Deep Discounts, Free Games, Top Sellers, New Releases)
- Chế độ Grid & List, tìm kiếm, lọc giảm giá, sắp xếp
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
```

| Biến | Mặc định | Bắt buộc | Mô tả |
|---|---|---|---|
| `PORT` | `3000` | Không | Port của server |
| `ITAD_API_KEY` | — | Không | API key từ [IsThereAnyDeal](https://isthereanydeal.com/dev/key/) — cần cho tính năng lịch sử giá |

> **Lưu ý:** Không có `ITAD_API_KEY` thì ứng dụng vẫn chạy bình thường, chỉ mất phần lịch sử giá (tab "Lịch sử" trong drawer chi tiết sẽ hiển thị simulated data thay vì data thật).

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

### API Keys

| API | Auth | Ghi chú |
|---|---|---|
| **Steam Store API** | Không cần key | Miễn phí, có rate limit |
| **Open Exchange Rates** | Không cần key | Free tier, cache 6 giờ |
| **IsThereAnyDeal** | Cần API key | Miễn phí, đăng ký tại [isthereanydeal.com/dev/key](https://isthereanydeal.com/dev/key/) |

> **Tại sao cần CORS proxy?** — Steam API không hỗ trợ CORS, nên tất cả request từ frontend đều đi qua server backend để bypass giới hạn trình duyệt.

### Caching Strategy

| Dữ liệu | TTL | Storage |
|---|---|---|
| Giá game | 20 phút | In-memory Map |
| Tỷ giá | 6 giờ | In-memory Map |

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

<div align="center">

Made with ❤️ for the Steam community

</div>
