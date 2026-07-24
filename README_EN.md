<div align="center">

<img src="public/logo.jpg" alt="Steam Region Price Comparator" width="120" style="border-radius:16px" />

# Steam Region Price Comparator

**Compare Steam game prices across 27 regions worldwide.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5.1-000000?logo=express)](https://expressjs.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#license)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

*[Vietnamese](README.md) · **English***

---

A web tool for comparing Steam game prices across **27 regions**, converting them into a common currency using real-time exchange rates, and tracking games against target prices. All user data is stored locally in the browser—no account required and nothing is sent to an external server.

[Try it live](https://steam-region-price.onrender.com) · [Report a bug](https://github.com/vokhoi220808/steam-region-price/issues) · [Request a feature](https://github.com/vokhoi220808/steam-region-price/issues)

</div>

---

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Installation and Usage](#installation-and-usage)
- [Project Structure](#project-structure)
- [API and Caching](#api-and-caching)
- [Security and Storage](#security-and-storage)
- [Notes](#notes)

---

## Features

### 🔍 Regional Price Comparison

- Search for games by **name, App ID, or Steam URL**, with autocomplete support
- Compare prices across **27 regions**: VN, US, UK, EU, JP, KR, CN, BR, MX, CA, AU, IN, ID, PH, TH, SG, MY, TR, ZA, PL, CH, HK, RU, TW, AR, UA, and AE
- Automatically convert prices using **real-time exchange rates**, cached for six hours
- Three display modes: **Table**, **Grid**, and **Bar Chart**
- Sort results, filter regions, show or hide unavailable prices, and display discounted games only
- **Export to CSV**, view price history through the IsThereAnyDeal API, and copy a shareable link

### 🏷️ Top Deals

- Featured games from Steam APIs, including Specials, Deep Discounts, Free Games, Top Sellers, and New Releases
- Grid and list views, search, discount filters, and sorting
- Open any deal directly in the regional price comparison page

### 📊 Price Tracker

- Add games by name, App ID, or URL through a two-step flow
- Set a **target price** in a currency of your choice
- Configure a **preferred region** and multiple **comparison regions** for each game
- Add **tags**, **custom collections**, **notes**, and pin important games
- Statuses include: Target Reached, Near Target, Tracking, No Target, and Error
- Price trends: Increased, Decreased, or Unchanged
- A visual **price scale** for comparing regional prices
- A **summary strip** for quickly filtering by status
- A complete **toolbar** with search, status/region/tag/price filters, ten sorting modes, grid/list switching, and density controls
- A **detail drawer** with Overview, Regional Prices, Local History, and Storage Information tabs
- **Bulk price updates** using three parallel workers

### 💾 Data Management

- **Import and export JSON** using merge, update, or replace modes
- **Export CSV** for the tracked game list
- Automatic **backup and restore** before every write
- **Schema versioning** with migration support from v0 to v1
- **Validation** and **salvage/recovery** for corrupted data
- **Atomic LocalStorage writes** using a temporary key and verification before committing
- Configurable history limits of 90, 180, or 366 records

### 🎨 Interface

- **Dark and light themes** powered by CSS custom properties
- Fully **responsive**, including mobile bottom sheets and a hamburger menu
- **Accessible**, with ARIA roles, focus traps, keyboard navigation, and screen-reader labels
- Skeleton loading, progress indicators, and complete error and empty states
- **Internationalization** for Vietnamese and English

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js 18+, Express 5.1, ES Modules |
| **Frontend** | Vanilla JavaScript and native ES Modules, with no framework |
| **Styling** | Pure CSS, approximately 4,200 lines, using CSS custom properties |
| **Charts** | Chart.js through a CDN |
| **Fonts** | Inter from Google Fonts |
| **APIs** | Steam Store API, Open Exchange Rates, and IsThereAnyDeal |

There is **no build step**. The application runs directly in the browser without Webpack, Vite, or Rollup.

---

## Installation and Usage

### Requirements

- **Node.js 18** or later

### Getting Started

```bash
# Clone the repository
git clone https://github.com/vokhoi220808/steam-region-price.git
cd steam-region-price

# Install dependencies
npm install

# Start the development server with automatic reload
npm run dev

# Or start the production server
npm start
```

Open **http://localhost:3000** in your browser.

### Environment Variables

Create a `.env` file in the project root. Do not commit this file to Git.

```env
PORT=3000
ITAD_API_KEY=your_api_key_here
```

| Variable | Default | Required | Description |
|---|---|---|---|
| `PORT` | `3000` | No | Server port |
| `ITAD_API_KEY` | — | No | API key from [IsThereAnyDeal](https://isthereanydeal.com/dev/key/), required for price history |

> **Note:** The application still works without `ITAD_API_KEY`. Only the price-history feature is affected; the History tab in the detail drawer will display simulated development data instead of live API data.

### Testing

```bash
npm test
```

### Scripts

| Script | Description |
|---|---|
| `npm start` | Start the production server |
| `npm run dev` | Start the development server with file watching using `node --watch` |
| `npm test` | Run all tests using Node.js's built-in test runner |

---

## Project Structure

```text
steam-region-price-comparator/
├── server.js                    # Express server — API proxy and caching
├── package.json
├── public/
│   ├── index.html               # Single-page application, 657 lines
│   ├── app.js                   # Main controller, 2,062 lines
│   ├── style.css                # Theme and layout, 1,094 lines
│   ├── tracker.css              # Price tracker styles, 3,077 lines
│   ├── logo.jpg
│   └── modules/
│       ├── components/          # UI components
│       │   ├── game-card.js         # Game card for grid view
│       │   ├── game-row.js          # Game row for list view
│       │   ├── game-drawer.js       # Detail drawer with tabs
│       │   ├── game-sheet.js        # Add/edit game sheet
│       │   ├── price-scale.js       # Visual price scale
│       │   ├── summary-strip.js     # Status summary and quick filters
│       │   ├── tracker-toolbar.js   # Filter and sorting toolbar
│       │   ├── data-manager.js      # Import/export/backup dialog
│       │   ├── confirm-dialog.js    # Accessible confirmation dialog
│       │   └── empty-state.js       # Empty and no-results states
│       ├── services/            # API layer
│       │   ├── steam-service.js     # Steam API client
│       │   └── history-simulation.js # Simulated price history
│       ├── storage/             # LocalStorage persistence
│       │   ├── storage-schema.js        # Data schema and defaults
│       │   ├── storage-validation.js    # Validation and sanitization
│       │   ├── storage-migrations.js    # Schema migration system
│       │   ├── storage-repository.js    # Full CRUD repository
│       │   └── storage-import-export.js # JSON/CSV import and export
│       ├── tracker/             # Tracker feature logic
│       │   ├── tracker-store.js     # Reactive publish/subscribe store
│       │   ├── tracker-status.js    # Status calculation
│       │   ├── tracker-filters.js   # Filtering and sorting logic
│       │   └── tracker-page.js      # Page orchestrator
│       └── utils/               # Shared utilities
│           ├── currency.js      # Currency formatting
│           ├── dates.js         # Date formatting
│           ├── debounce.js      # Debounce and throttle helpers
│           ├── dom.js           # DOM helpers, focus trap, and XSS protection
│           └── ids.js           # UUID generation
└── test/                        # Tests using Node.js's built-in runner
    ├── history-simulation.test.js
    ├── price-scale.test.js
    ├── storage-repository.test.js
    ├── tracker-filters.test.js
    └── tracker-markup.test.js
```

The project contains approximately **7,800 lines of source code**, excluding `node_modules`.

---

## API and Caching

### Backend Routes

| Route | Description |
|---|---|
| `GET /api/regions` | Return the 27 supported regions, including code, name, and flag |
| `GET /api/search?q=...` | Search for games through the Steam Store Search API |
| `GET /api/compare/:appId?currency=VND&regions=vn,us,...` | Fetch regional prices, convert currencies, and rank the results |
| `GET /api/history/:appId` | Fetch price history from the IsThereAnyDeal API |
| `GET /api/deals?cc=VN` | Fetch featured games from the Steam Featured Categories API |

### API Keys

| API | Authentication | Notes |
|---|---|---|
| **Steam Store API** | No key required | Free to access, with rate limits |
| **Open Exchange Rates** | No key required | Free tier, cached for six hours |
| **IsThereAnyDeal** | API key required | Free registration at [isthereanydeal.com/dev/key](https://isthereanydeal.com/dev/key/) |

> **Why is a CORS proxy required?** Steam's API does not support browser CORS requests, so all frontend requests are sent through the backend server.

### Caching Strategy

| Data | TTL | Storage |
|---|---|---|
| Game prices | 20 minutes | In-memory `Map` |
| Exchange rates | 6 hours | In-memory `Map` |

The server acts as a **CORS proxy**, routing requests to Steam APIs to avoid browser restrictions.

---

## Security and Storage

- **No registration required** — no personal information is collected
- **Local-only data** — tracker data is stored in LocalStorage and is not sent to the server
- **No background processing** — prices are updated only when the user manually selects “Update prices”
- **XSS protection** — all input data is processed through `escapeHtml()` before being inserted into the DOM
- **Atomic writes** — data is written to a temporary key, validated, and then committed
- **Automatic backups** — the previous data state is saved before each write
- **Schema versioning** — migrations are supported when the data schema changes

---

## Notes

- Steam's Storefront API may change or restrict access at any time.
- Exchange rates are fetched from `open.er-api.com` and cached for six hours.
- Steam prices are cached for 20 minutes to reduce the number of requests.
- Tracker history contains only price changes saved on the current device. It is **not official Steam price history**.
- This tool is for reference only and **does not support changing the region of a Steam account**.

---

<div align="center">

Made with ❤️ for the Steam community
## License

Licensed under the [MIT License](LICENSE).

This is an unofficial project and is not affiliated with Valve or Steam.
See [DISCLAIMER.md](DISCLAIMER.md) for additional information.
</div>
