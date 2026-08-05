/**
 * Steam Regional Price Comparator (UI V6)
 * App.js - Vanilla JS Controller
 */

// --- MODEL / STATE ---
const state = {
  currentData: null,
  selectedProductType: "app",
  region: (localStorage.getItem("steam_region") || "VN").toUpperCase(),
  currency: localStorage.getItem("steam_target_currency") || "VND",
  pinnedVN: false,
  availableOnly: false,
  saleOnly: false,
  countrySearch: "",
  sort: { by: "converted", desc: false },
  view: window.innerWidth <= 768 ? "card" : "table",
  checkedAt: null,
  lang: localStorage.getItem("steam_lang") || "vi",
  theme: localStorage.getItem("steam_theme") || "dark",
  trackedGames: JSON.parse(localStorage.getItem("steam_tracked_games")) || {}
};

const I18N = {
  vi: {
    hero_title: "Tìm kiếm & so sánh giá Steam tại 14 quốc gia",
    hero_desc: "Một lần tìm kiếm. Mọi khu vực. Biết ngay đâu là mức giá đáng mua nhất.",
    search_placeholder: "Tìm game hoặc dán đường dẫn Steam...",
    search_btn: "So sánh giá",
    region_title: "Khu vực cần so sánh",
    currency_title: "Tiền tệ quy đổi",
    fx_updated: "Tỷ giá đã cập nhật",
    refresh_fx: "Làm mới",
    empty_title: "Tìm một game để bắt đầu so sánh giá",
    empty_desc: "Hãy nhập tên trò chơi hoặc dán Link Steam vào thanh tìm kiếm phía trên.",
    t_rank: "Hạng",
    t_region: "Khu vực",
    t_steam: "Giá Steam",
    t_discount: "Giảm giá",
    t_converted: "Giá quy đổi",
    t_diff: "Chênh lệch",
    t_status: "Trạng thái",
    t_action: "Hành động",
    nav_compare: "So sánh giá",
    nav_deals: "Game đang giảm",
    nav_track: "Theo dõi giá",
    badge_best: "👑 Rẻ nhất",
    badge_you: "Vùng của bạn",
    badge_worst: "Cao nhất",
    unavailable: "Không khả dụng tại khu vực này",
    free: "Miễn phí",
    just_now: "Vừa xong",
    mins_ago: "phút trước",
    hours_ago: "giờ trước",
    dev: "Nhà phát triển:",
    publisher: "Nhà xuất bản:",
    release: "Phát hành:",
    search_empty: "Không tìm thấy kết quả",
    open_steam: "Mở trên Steam",
    group_sea: "Đông Nam Á",
    group_asia: "Châu Á",
    group_americas: "Châu Mỹ",
    group_europe: "Châu Âu",
    group_other: "Khác",
    selected_regions: "Đã chọn {count}/{total} khu vực",
    copied: "Đã sao chép liên kết chia sẻ.",
    csv_exported: "Đã tải xuống file CSV.",
    fx_refreshed: "Tỷ giá đã được làm mới",
    paste_err: "Vui lòng cho phép quyền dán từ clipboard",
    loading_data: "Đã tải dữ liệu thành công",
    search_region: "Tìm quốc gia hoặc tiền tệ...",
    qa_popular: "Phổ biến",
    qa_asia: "Châu Á",
    qa_sea: "Đông Nam Á",
    qa_all: "Chọn tất cả",
    qa_none: "Bỏ chọn",
    fx_note: "Tất cả mức giá sẽ được quy đổi sang {curr} theo tỷ giá mới nhất.",
    fx_payment_note: "Tỷ giá thanh toán thực tế có thể chênh lệch do ngân hàng hoặc phí chuyển đổi ngoại tệ của Steam.",
    summary_regions: "{count} khu vực được chọn",
    summary_converted: "Quy đổi sang {curr}",
    summary_updated: "Tỷ giá cập nhật {time}",
    compare_btn: "So sánh giá tại {count} khu vực",
    reset_settings: "Khôi phục thiết lập mặc định",
    unknown: "Không rõ",
    stat_lowest: "Giá thấp nhất",
    stat_highest: "Giá cao nhất",
    stat_regions: "Số khu vực bán:",
    stat_sales: "Đang giảm giá:",
    disclaimer: "Giá hiển thị chỉ nhằm mục đích tham khảo. Việc thay đổi vùng cửa hàng hoặc sử dụng phương thức che giấu vị trí có thể vi phạm điều khoản sử dụng của Steam.",
    loading_checking: "Đang kiểm tra giá tại các khu vực",
    loading_progress: "{count}/{total} khu vực hoàn tất",
    err_title: "Không thể lấy giá từ Steam lúc này.",
    err_desc: "Đã xảy ra lỗi không mong muốn.",
    err_retry: "Thử lại",
    table_search: "Tìm quốc gia...",
    filter_avail: "Khu vực có bán",
    filter_sale: "Đang giảm giá",
    filter_pin: "Ghim Việt Nam",
    toolbar_converting: "Đang quy đổi sang:",
    toolbar_change: "Đổi",
    export_csv: "Xuất CSV",
    chart_title: "Biểu đồ giá quy đổi theo từng khu vực ({curr})",
    sheet_title: "Chọn tiền tệ quy đổi",
    sheet_search: "Tìm theo mã hoặc tên...",
    price_history: "Lịch sử giá",
    history_range_1y: "1 Năm",
    history_range_6m: "6 Tháng",
    history_range_3m: "3 Tháng",
    history_loading_real: "Đang tải dữ liệu thật từ máy chủ...",
    history_note_real: "* Dữ liệu gốc bằng USD (từ ITAD) đã được quy đổi sang tỉ giá hiện tại.",
    steam_login: "Đăng nhập Steam",
    steam_logout: "Đăng xuất",
    err_invalid_appid: "App ID không tồn tại trên Steam Store.",
    toast_refreshed: "Đã làm mới giá game thành công."
  },
  en: {
    hero_title: "Search & compare Steam prices across 14 countries",
    hero_desc: "One search. Every region. Instantly see where the price is worth buying.",
    search_placeholder: "Search game or paste Steam URL...",
    search_btn: "Compare",
    region_title: "Regions to Compare",
    currency_title: "Target Currency",
    fx_updated: "FX Rates Updated",
    refresh_fx: "Refresh",
    empty_title: "Find a game to start comparing",
    empty_desc: "Enter a game name or paste a Steam Link in the search bar above.",
    t_rank: "Rank",
    t_region: "Region",
    t_steam: "Steam Price",
    t_discount: "Discount",
    t_converted: "Converted",
    t_diff: "Difference",
    t_status: "Status",
    t_action: "Action",
    nav_compare: "Compare Prices",
    nav_deals: "Top Deals",
    nav_track: "Price Tracker",
    badge_best: "👑 Best",
    badge_you: "Your Region",
    badge_worst: "Highest",
    unavailable: "Not available in this region",
    free: "Free",
    just_now: "Just now",
    mins_ago: "mins ago",
    hours_ago: "hours ago",
    dev: "Developer:",
    publisher: "Publisher:",
    release: "Release:",
    search_empty: "No results found",
    open_steam: "Open in Steam",
    group_sea: "SEA",
    group_asia: "Asia",
    group_americas: "Americas",
    group_europe: "Europe",
    group_other: "Other",
    selected_regions: "Selected {count}/{total} regions",
    copied: "Link copied to clipboard.",
    csv_exported: "CSV downloaded.",
    fx_refreshed: "FX rates refreshed",
    paste_err: "Please allow clipboard access",
    loading_data: "Data loaded successfully",
    search_region: "Search region or currency...",
    qa_popular: "Popular",
    qa_asia: "Asia",
    qa_sea: "SEA",
    qa_all: "Select All",
    qa_none: "Deselect All",
    fx_note: "All prices are converted to {curr} using the latest FX rates.",
    fx_payment_note: "Your actual payment rate may differ due to bank charges or Steam currency-conversion fees.",
    summary_regions: "{count} regions selected",
    summary_converted: "Converted to {curr}",
    summary_updated: "Rates updated {time}",
    compare_btn: "Compare in {count} regions",
    reset_settings: "Reset to default settings",
    unknown: "Unknown",
    stat_lowest: "Lowest Price",
    stat_highest: "Highest Price",
    stat_regions: "Available in:",
    stat_sales: "On Sale:",
    disclaimer: "Prices shown are for reference only. Changing store regions or using VPNs to hide your location may violate Steam's Terms of Service.",
    loading_checking: "Checking prices across regions",
    loading_progress: "{count}/{total} regions completed",
    err_title: "Cannot fetch prices from Steam at this time.",
    err_desc: "An unexpected error occurred.",
    err_retry: "Retry",
    table_search: "Search region...",
    filter_avail: "Available Regions",
    filter_sale: "On Sale",
    filter_pin: "Pin Vietnam",
    toolbar_converting: "Converting to:",
    toolbar_change: "Change",
    export_csv: "Export CSV",
    chart_title: "Converted Price Chart by Region ({curr})",
    sheet_title: "Select Target Currency",
    sheet_search: "Search by code or name...",
    price_history: "Price History",
    history_range_1y: "1 Year",
    history_range_6m: "6 Months",
    history_range_3m: "3 Months",
    history_loading_real: "Loading real data from server...",
    history_note_real: "* Original USD data (from ITAD) converted to current exchange rates.",
    steam_login: "Sign in with Steam",
    steam_logout: "Sign out",
    err_invalid_appid: "App ID does not exist on Steam Store.",
    toast_refreshed: "Successfully refreshed game prices."
  }
};

function t(key) {
  return I18N[state.lang][key] || key;
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (el.tagName === "INPUT" && el.hasAttribute("placeholder")) {
      el.setAttribute("placeholder", t(key));
    } else {
      // Keep existing inner HTML if needed, but mostly text content
      el.childNodes.forEach(child => {
        if(child.nodeType === 3 && child.textContent.trim().length > 0) {
          child.textContent = t(key);
        }
      });
      if(el.childNodes.length === 0) el.textContent = t(key);
    }
  });
  
  const toggleBtn = document.getElementById("langToggleBtn");
  if(toggleBtn) toggleBtn.textContent = state.lang === "vi" ? "EN" : "VI";
  
  if (typeof updateRegionSummary === "function") updateRegionSummary();
  
  const sumConvEl = document.getElementById("summaryConvertedText");
  if(sumConvEl) sumConvEl.innerHTML = t("summary_converted").replace("{curr}", `<strong id="summaryCurrCode">${state.currency}</strong>`);
  
  const hintEl = document.getElementById("currencyHintText");
  if(hintEl) hintEl.innerHTML = t("fx_note").replace("{curr}", `<strong id="hintCurrencyCode">${state.currency}</strong>`);
  
  const chartTitle = document.getElementById("chartTitleText");
  if(chartTitle) chartTitle.innerHTML = t("chart_title").replace("{curr}", `<span id="chartLabel">${state.currency}</span>`);
  
  updateTimeAgo();
}

function toggleLang() {
  state.lang = state.lang === "vi" ? "en" : "vi";
  localStorage.setItem("steam_lang", state.lang);
  applyI18n();
  renderRegions();
  setupCurrencyDropdown();
  if (state.currentData && state.currentData.prices) {
    state.currentData.prices.forEach(p => {
      const dataRegion = REGIONS_DATA.find(r => r.code === p.code);
      if (dataRegion) {
        p.name = state.lang === "vi" ? dataRegion.name : dataRegion.en_name;
      }
    });
    renderData();
    fetchRealData(String(state.currentData.appId));
  }
}

const REGIONS_DATA = [
  { code: "vn", name: "Việt Nam", en_name: "Vietnam", group: "sea", curr: "VND" },
  { code: "us", name: "Hoa Kỳ", en_name: "United States", group: "am", curr: "USD" },
  { code: "cn", name: "Trung Quốc", en_name: "China", group: "as", curr: "CNY" },
  { code: "hk", name: "Hồng Kông", en_name: "Hong Kong", group: "as", curr: "HKD" },
  { code: "tw", name: "Đài Loan", en_name: "Taiwan", group: "as", curr: "TWD" },
  { code: "jp", name: "Nhật Bản", en_name: "Japan", group: "as", curr: "JPY" },
  { code: "kr", name: "Hàn Quốc", en_name: "South Korea", group: "as", curr: "KRW" },
  { code: "sg", name: "Singapore", en_name: "Singapore", group: "sea", curr: "SGD" },
  { code: "th", name: "Thái Lan", en_name: "Thailand", group: "sea", curr: "THB" },
  { code: "id", name: "Indonesia", en_name: "Indonesia", group: "sea", curr: "IDR" },
  { code: "ph", name: "Philippines", en_name: "Philippines", group: "sea", curr: "PHP" },
  { code: "in", name: "Ấn Độ", en_name: "India", group: "as", curr: "INR" },
  { code: "br", name: "Brazil", en_name: "Brazil", group: "am", curr: "BRL" },
  { code: "mx", name: "Mexico", en_name: "Mexico", group: "am", curr: "MXN" },
  { code: "ca", name: "Canada", en_name: "Canada", group: "am", curr: "CAD" },
  { code: "au", name: "Úc", en_name: "Australia", group: "oc", curr: "AUD" },
  { code: "gb", name: "Vương quốc Anh", en_name: "United Kingdom", group: "eu", curr: "GBP" },
  { code: "de", name: "Châu Âu (Đức)", en_name: "Europe (Germany)", group: "eu", curr: "EUR" },
  { code: "my", name: "Malaysia", en_name: "Malaysia", group: "sea", curr: "MYR" },
  { code: "tr", name: "Thổ Nhĩ Kỳ", en_name: "Turkey", group: "eu", curr: "TRY" },
  { code: "ar", name: "Argentina", en_name: "Argentina", group: "am", curr: "ARS" },
  { code: "ua", name: "Ukraina", en_name: "Ukraine", group: "eu", curr: "UAH" }
];

let selectedRegions = new Set(["vn", "us", "cn", "hk", "tw", "jp", "kr", "sg", "th", "my", "tr", "ar", "ua", "au"]);

const CURRENCIES = [
  { code: "VND", name: "Việt Nam Đồng", en_name: "Vietnamese Dong", flagCode: "vn", pop: true },
  { code: "USD", name: "Đô la Mỹ", en_name: "US Dollar", flagCode: "us", pop: true },
  { code: "EUR", name: "Euro", en_name: "Euro", flagCode: "eu", pop: true },
  { code: "GBP", name: "Bảng Anh", en_name: "British Pound", flagCode: "gb", pop: true },
  { code: "CNY", name: "Nhân dân tệ", en_name: "Chinese Yuan", flagCode: "cn", pop: true },
  { code: "HKD", name: "Đô la Hồng Kông", en_name: "Hong Kong Dollar", flagCode: "hk" },
  { code: "TWD", name: "Đô la Đài Loan", en_name: "Taiwan Dollar", flagCode: "tw" },
  { code: "JPY", name: "Yên Nhật", en_name: "Japanese Yen", flagCode: "jp" },
  { code: "KRW", name: "Won Hàn Quốc", en_name: "South Korean Won", flagCode: "kr" },
  { code: "SGD", name: "Đô la Singapore", en_name: "Singapore Dollar", flagCode: "sg" },
  { code: "THB", name: "Bạt Thái Lan", en_name: "Thai Baht", flagCode: "th" },
  { code: "IDR", name: "Rupiah Indonesia", en_name: "Indonesian Rupiah", flagCode: "id" },
  { code: "PHP", name: "Peso Philippines", en_name: "Philippine Peso", flagCode: "ph" },
  { code: "INR", name: "Rupee Ấn Độ", en_name: "Indian Rupee", flagCode: "in" },
  { code: "BRL", name: "Real Brazil", en_name: "Brazilian Real", flagCode: "br" },
  { code: "MXN", name: "Peso Mexico", en_name: "Mexican Peso", flagCode: "mx" },
  { code: "CAD", name: "Đô la Canada", en_name: "Canadian Dollar", flagCode: "ca" },
  { code: "AUD", name: "Đô la Úc", en_name: "Australian Dollar", flagCode: "au" }
];

// Live FX Rates mapping (Relative to USD)
let LIVE_FX = {};

async function fetchFxRates() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        LIVE_FX = data.rates;
      }
    }
  } catch (e) {
    console.warn("Lỗi tải tỷ giá trực tuyến, dùng tỷ giá mặc định:", e);
  }
  // Fallback if failed
  if (!LIVE_FX["VND"]) {
    LIVE_FX = {
      VND: 25400, USD: 1, EUR: 0.92, GBP: 0.79, CNY: 7.2, HKD: 7.8,
      TWD: 32, JPY: 153, KRW: 1370, SGD: 1.35, THB: 36, IDR: 16000,
      PHP: 57, INR: 83, BRL: 5.1, MXN: 17, CAD: 1.36, AUD: 1.5
    };
  }
}

// --- UTILS ---
function getFlagHtml(code) {
  if (!code) return "";
  return `<img src="https://flagcdn.com/20x15/${code.toLowerCase()}.png" alt="${code}" class="img-flag" />`;
}

function formatCurrency(val, code) {
  if (!Number.isFinite(val)) return "—";
  const noDecimals = ["VND", "JPY", "KRW"].includes(code);
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: code,
    maximumFractionDigits: noDecimals ? 0 : 2
  }).format(val).replace(/\s/g, " "); // Ensure space between number and symbol
}

function showToast(message, type = 'success') {
  let root = document.getElementById('accountToastRoot');
  if (!root) {
    root = document.createElement('div');
    root.id = 'accountToastRoot';
    root.className = 'account-toast-root';
    document.body.append(root);
  }
  const item = document.createElement('div');
  item.className = `account-toast ${type}`;
  item.textContent = message;
  root.append(item);
  setTimeout(() => item.remove(), 3500);
}
window.showToast = showToast;

function setInlineFieldError(input, message) {
  if (!input) return;
  input.setAttribute("aria-invalid", "true");
  const isMainSearch = input.id === "searchInput";
  const scope = isMainSearch
    ? input.closest(".search-container")
    : input.closest("form, .setup-card");
  let error = scope?.querySelector(".inline-field-error");
  if (!error) {
    error = document.createElement("p");
    error.className = "inline-field-error";
    error.setAttribute("aria-live", "polite");
    if (isMainSearch) {
      input.closest(".search-input-group")?.insertAdjacentElement("afterend", error);
    } else {
      input.closest(".region-controls, form")?.insertAdjacentElement("afterend", error);
    }
  }
  if (error) error.textContent = message;
  input.addEventListener("input", () => {
    input.removeAttribute("aria-invalid");
    error?.remove();
  }, { once: true });
}

function clearInlineFieldError(input) {
  if (!input) return;
  input.removeAttribute("aria-invalid");
  const scope = input.id === "searchInput"
    ? input.closest(".search-container")
    : input.closest("form, .setup-card");
  scope
    ?.querySelector(".inline-field-error")
    ?.remove();
}

function showFeedback(message, type = "success") {
  const region = document.getElementById("feedbackRegion");
  if (!region) return;
  const feedback = document.createElement("div");
  feedback.className = `copy-feedback ${type}`;
  feedback.setAttribute("role", type === "error" ? "alert" : "status");
  feedback.textContent = message;
  region.appendChild(feedback);
  requestAnimationFrame(() => feedback.classList.add("show"));
  setTimeout(() => {
    feedback.classList.remove("show");
    setTimeout(() => feedback.remove(), 220);
  }, 2400);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("Clipboard unavailable");
}

function exportCurrentComparisonCsv() {
  if (!state.currentData?.prices?.length) return;
  const rows = [
    ["Khu vực", "Tiền tệ", "Giá hiện tại", "Mức giảm", `Quy đổi ${state.currency}`],
    ...state.currentData.prices.map((price) => [
      price.name,
      price.curr || "",
      price.final || "",
      price.discount || 0,
      price.convertedValue || ""
    ])
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `steam-price-${state.currentData.appId}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// --- PRICE HISTORY CHART LOGIC ---
let priceHistoryChartInstance = null;
let activeHistorySource = "real";

function renderPriceHistoryChart(months = 12) {
  if (activeHistorySource === "internal") return renderInternalHistoryChart(months);
  return activeHistorySource === "simulated" ? renderSimulatedHistoryChart(months) : renderRealHistoryChart(months);
}

function initThemeToggle() {
  const toggleBtn = document.getElementById("themeToggleBtn");
  const saved = localStorage.getItem("steamPriceTheme") || "dark";
  
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (toggleBtn) {
      toggleBtn.innerHTML = theme === "light"
        ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
        : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    }
  }

  applyTheme(saved);

  toggleBtn?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";
    localStorage.setItem("steamPriceTheme", next);
    applyTheme(next);
  });
}

function setupHotkeyListeners() {
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey && e.key.toLowerCase() === "k") || (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName))) {
      e.preventDefault();
      const searchInput = document.getElementById("searchInput");
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  });
}

async function init() {
  initThemeToggle();
  setupHotkeyListeners();
  applyI18n();
  setupEvents();
  renderRegions();
  updateRegionSummary();
  setupDealsEvents();
  setupCurrencyDropdown();
  initBudgetComboModal();
  initCoopWishlistModal();
  initRealCostModal();
  initEmbedModal();
  
  // Check URL params
  const urlParams = new URLSearchParams(window.location.search);
  const routeMatch = window.location.pathname.match(/^\/game\/(\d+)\/?$/);
  const appIdParam = urlParams.get('appId') || routeMatch?.[1];
  state.selectedProductType = urlParams.get('type') === 'sub' ? 'sub' : 'app';
  if (appIdParam) {
    document.getElementById("searchInput").value = appIdParam;
    fetchRealData(appIdParam);
  } else {
    document.getElementById("searchInput").value = "";
  }
  
  document.querySelectorAll(".switch-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === state.view);
  });
  
  setInterval(updateTimeAgo, 60000);
  setInterval(updateDealsCountdowns, 1000);
  
  await fetchFxRates();
}

function renderRegionItem(region, isYou) {
  const isSelected = selectedRegions.has(region.code);
  const rName = state.lang === "vi" ? region.name : region.en_name;
  return `
    <div class="region-item ${isSelected ? 'selected' : ''}" data-code="${region.code}">
      <span class="r-flag">${getFlagHtml(region.code)}</span>
      <span class="r-name">${rName}</span>
      <span class="r-curr">${region.curr}</span>
      <svg class="check-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </div>
  `;
}

function renderRegions(searchTerm = "") {
  const container = document.getElementById("regionList");
  if (!container) return;
  
  const q = searchTerm.toLowerCase();
  const filtered = REGIONS_DATA.filter(r => {
    const rName = state.lang === "vi" ? r.name : r.en_name;
    return rName.toLowerCase().includes(q) || r.curr.toLowerCase().includes(q) || r.code.toLowerCase().includes(q);
  });
  
  container.innerHTML = filtered.map(r => renderRegionItem(r, false)).join("");

  container.querySelectorAll(".region-item").forEach(item => {
    item.addEventListener("click", () => {
      const code = item.dataset.code;
      if (selectedRegions.has(code)) selectedRegions.delete(code);
      else selectedRegions.add(code);
      renderRegions(document.getElementById("regionSearchInput")?.value || "");
      updateRegionSummary();
    });
  });
  
  const countEl = document.getElementById("regionCountText");
  if(countEl) countEl.textContent = t("selected_regions").replace("{count}", selectedRegions.size).replace("{total}", REGIONS_DATA.length);
  
  const cboxAll = document.getElementById("selectAllRegions");
  if (cboxAll) cboxAll.checked = selectedRegions.size === REGIONS_DATA.length;
}

function updateRegionSummary() {
  const count = selectedRegions.size;
  const total = REGIONS_DATA.length;
  
  const countEl = document.getElementById("regionCountText");
  if(countEl) countEl.textContent = t("selected_regions").replace("{count}", count).replace("{total}", total);
  
  const sumRegEl = document.getElementById("summaryRegionsText");
  if(sumRegEl) sumRegEl.innerHTML = t("summary_regions").replace("{count}", `<strong id="summarySelectedCount">${count}</strong>`);
  
  const sumConvEl = document.getElementById("summaryConvertedText");
  if(sumConvEl) sumConvEl.innerHTML = t("summary_converted").replace("{curr}", `<strong id="summaryCurrCode">${state.currency}</strong>`);
  
  const compBtnEl = document.getElementById("compareBtnText");
  if(compBtnEl) compBtnEl.innerHTML = t("compare_btn").replace("{count}", `<span id="btnRegionCount">${count}</span>`);
  
  document.getElementById("triggerCompareBtn").disabled = count === 0;
}

function setupCurrencyDropdown() {
  const trigger = document.getElementById("currencyComboboxTrigger");
  const popover = document.getElementById("currencyPopover");
  const searchInput = document.getElementById("currencyPopoverSearch");
  const list = document.getElementById("currencyPopoverList");
  
  let isOpen = false;
  
  function updateTriggerDisplay() {
    const c = CURRENCIES.find(x => x.code === state.currency);
    const cName = state.lang === "vi" ? c.name : c.en_name;
    document.getElementById("currencyTriggerContent").innerHTML = `<span class="flag">${getFlagHtml(c.flagCode)}</span> <span class="code">${c.code}</span> <span class="name">${cName}</span>`;
    document.getElementById("hintCurrencyCode").textContent = c.code;
    document.getElementById("summaryCurrCode").textContent = c.code;
    document.getElementById("toolbarCurrDisplay").textContent = c.code;
    document.getElementById("thCurrLabel").textContent = c.code;
    document.getElementById("chartLabel").textContent = c.code;
  }
  
  function renderList(query = "") {
    const q = query.toLowerCase();
    const currentList = CURRENCIES.filter(c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
    
    let html = "";
    if (currentList.length === 0) html = `<div class="curr-item" style="color:var(--text-muted)">Không tìm thấy</div>`;
    else {
      if (!q) {
        html += `<div class="curr-group">Phổ biến</div>`;
        html += currentList.filter(c => c.pop).map(renderItem).join("");
        html += `<div class="curr-group">Tất cả</div>`;
        html += currentList.filter(c => !c.pop).map(renderItem).join("");
      } else {
        html += currentList.map(renderItem).join("");
      }
    }
    list.innerHTML = html;
    
    list.querySelectorAll(".curr-item").forEach(el => {
      el.addEventListener("click", () => {
        changeCurrency(el.dataset.code);
        close();
      });
    });
  }
  
  function renderItem(c) {
    const cName = state.lang === "vi" ? c.name : c.en_name;
    return `<div class="curr-item ${c.code === state.currency ? 'selected' : ''}" data-code="${c.code}">
      <span class="flag">${getFlagHtml(c.flagCode)}</span>
      <span class="code">${c.code}</span>
      <span class="name">${cName}</span>
      <svg class="check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </div>`;
  }
  
  function open() {
    if (window.innerWidth <= 768) {
      openMobileSheet();
      return;
    }
    isOpen = true;
    trigger.setAttribute("aria-expanded", "true");
    popover.classList.add("show");
    searchInput.value = "";
    renderList();
    searchInput.focus();
  }
  
  function close() {
    isOpen = false;
    trigger.setAttribute("aria-expanded", "false");
    popover.classList.remove("show");
  }
  
  trigger.addEventListener("click", () => isOpen ? close() : open());
  document.addEventListener("click", e => {
    if (!trigger.contains(e.target) && !popover.contains(e.target)) close();
  });
  
  searchInput.addEventListener("input", e => renderList(e.target.value));
  
  updateTriggerDisplay();
  
  const overlay = document.getElementById("mobileOverlay");
  const sheet = document.getElementById("currencyBottomSheet");
  const closeSheetBtn = document.getElementById("closeSheetBtn");
  const sheetSearch = document.getElementById("sheetSearchInput");
  const sheetList = document.getElementById("sheetCurrencyList");
  
  function openMobileSheet() {
    overlay.classList.add("show");
    sheet.classList.add("show");
    sheetSearch.value = "";
    
    let html = CURRENCIES.map(c => {
      const cName = state.lang === "vi" ? c.name : c.en_name;
      return `
      <div class="curr-item ${c.code === state.currency ? 'selected' : ''}" data-code="${c.code}" style="padding: 16px 20px;">
        <span class="flag">${getFlagHtml(c.flagCode)}</span>
        <span class="code">${c.code}</span>
        <span class="name">${cName}</span>
      </div>
      `;
    }).join("");
    sheetList.innerHTML = html;
    
    sheetList.querySelectorAll(".curr-item").forEach(el => {
      el.addEventListener("click", () => {
        changeCurrency(el.dataset.code);
        closeMobileSheet();
      });
    });
  }
  
  function closeMobileSheet() {
    overlay.classList.remove("show");
    sheet.classList.remove("show");
  }
  
  closeSheetBtn.addEventListener("click", closeMobileSheet);
  overlay.addEventListener("click", closeMobileSheet);
  sheetSearch.addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    sheetList.querySelectorAll(".curr-item").forEach(el => {
      const text = el.textContent.toLowerCase();
      el.style.display = text.includes(q) ? "flex" : "none";
    });
  });
}

function changeCurrency(code) {
  if (!code) return;
  state.currency = code;
  localStorage.setItem("steam_target_currency", code);
  
  const c = CURRENCIES.find(x => x.code === code) || { code, name: code, en_name: code, flagCode: "us" };
  const cName = state.lang === "vi" ? c.name : c.en_name;

  const matchingRegion = REGIONS_DATA.find(r => r.curr === code);
  if (matchingRegion) {
    state.region = matchingRegion.code.toUpperCase();
    localStorage.setItem("steam_region", state.region);
    const globalRegionSelect = document.getElementById("globalRegionSelect");
    if (globalRegionSelect) globalRegionSelect.value = state.region;
  }

  const triggerContent = document.getElementById("currencyTriggerContent");
  if (triggerContent) {
    triggerContent.innerHTML = `<span class="flag">${getFlagHtml(c.flagCode)}</span> <span class="code">${c.code}</span> <span class="name">${cName}</span>`;
  }

  const hintEl = document.getElementById("hintCurrencyCode");
  if (hintEl) hintEl.textContent = c.code;
  const summaryEl = document.getElementById("summaryCurrCode");
  if (summaryEl) summaryEl.textContent = c.code;
  const toolbarEl = document.getElementById("toolbarCurrDisplay");
  if (toolbarEl) toolbarEl.textContent = c.code;
  const thEl = document.getElementById("thCurrLabel");
  if (thEl) thEl.textContent = c.code;
  const chartEl = document.getElementById("chartLabel");
  if (chartEl) chartEl.textContent = c.code;
  
  if (state.currentData) {
    processData();
    renderData();
  }

  const dealsView = document.getElementById("dealsView");
  if (dealsView && !dealsView.classList.contains("hidden") && typeof renderDeals === "function") {
    renderDeals();
  }

  if (window.TrackerView && typeof window.TrackerView.renderWatchlist === "function") {
    window.TrackerView.renderWatchlist();
  }
}

// --- TOP DEALS LOGIC ---
let dealsData = null;
let dealsState = {
  category: "specials",
  search: "",
  sort: "default",
  view: "grid",
  discountFilter: "0",
  reviewFilter: "0",
  genreFilter: "all",
  ccuFilter: "0",
  contentFilter: "all",
  budgetFilter: "0",
  metadataLoading: false,
  page: 1,
  itemsPerPage: 12
};

let saleCalendarData = null;
let dealsEventsReady = false;

function formatCountdown(milliseconds) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function renderSaleCalendar() {
  const grid = document.getElementById("saleCalendarGrid");
  const loading = document.getElementById("saleCalendarLoading");
  if (!grid || !saleCalendarData?.events?.length) return;
  const now = Date.now();
  const events = saleCalendarData.events.slice(0, 4);
  const valveDate = { day: "2-digit", month: "2-digit", timeZone: "America/Los_Angeles" };
  grid.innerHTML = events.map((event, index) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    const active = start.getTime() <= now && end.getTime() > now;
    const target = active ? end : start;
    return `<article class="sale-event ${index === 0 ? "is-next" : ""}" data-sale-target="${target.toISOString()}">
      <span class="sale-event-label">${active ? "Đang diễn ra" : (index === 0 ? "Sự kiện tiếp theo" : event.kind === "seasonal" ? "Seasonal Sale" : "Festival")}</span>
      <h4 title="${event.name}">${event.name}</h4>
      <div class="sale-event-date">${start.toLocaleDateString("vi-VN", valveDate)} – ${end.toLocaleDateString("vi-VN", { ...valveDate, year: "numeric" })} (PT)</div>
      <div class="sale-countdown">${active ? "Kết thúc sau " : "Còn "}${formatCountdown(target.getTime() - now)}</div>
    </article>`;
  }).join("");
  loading?.classList.add("hidden");
  grid.classList.remove("hidden");
}

async function fetchSaleCalendar() {
  if (saleCalendarData) return renderSaleCalendar();
  try {
    const response = await fetch("/api/sales-calendar");
    if (!response.ok) throw new Error("Calendar unavailable");
    saleCalendarData = await response.json();
    renderSaleCalendar();
  } catch {
    const loading = document.getElementById("saleCalendarLoading");
    if (loading) loading.innerHTML = `<span style="height:auto;padding:12px;color:var(--text-muted)">Chưa thể tải lịch sự kiện.</span>`;
  }
}

async function loadDealMetadataForCurrentCategory() {
  const items = dealsData?.[dealsState.category]?.items || [];
  const missingIds = items
    .filter((item) => !item.isGamerPower && !item.metadataLoaded)
    .map((item) => item.id)
    .filter(Number.isFinite)
    .slice(0, 30);
  if (!missingIds.length || dealsState.metadataLoading) return;
  dealsState.metadataLoading = true;
  try {
    const response = await fetch(`/api/deals/metadata?appids=${missingIds.join(",")}`);
    if (!response.ok) throw new Error("Metadata unavailable");
    const metadata = await response.json();
    const byId = new Map(metadata.items.map((item) => [Number(item.appId), item]));
    Object.values(dealsData).forEach((category) => {
      category?.items?.forEach((item) => {
        const extra = byId.get(Number(item.id));
        if (extra) Object.assign(item, extra, { metadataLoaded: true });
      });
    });
    renderDealsView();
  } catch (error) {
    console.warn("Deal metadata failed:", error);
  } finally {
    dealsState.metadataLoading = false;
  }
}

async function fetchTopDeals(force = false) {
  fetchSaleCalendar();
  if (dealsData && !force) {
    loadDealMetadataForCurrentCategory();
    return;
  }
  const loading = document.getElementById("dealsLoading");
  const grid = document.getElementById("dealsGrid");
  const spotlight = document.getElementById("dealsSpotlight");
  const empty = document.getElementById("dealsEmpty");
  
  if (!dealsData) {
    grid.innerHTML = "";
    spotlight.innerHTML = "";
    empty.classList.add("hidden");
    loading.style.display = "block";
  }
  
  try {
    const res = await fetch(`/api/deals?cc=${state.region}`);
    if (!res.ok) throw new Error("Failed to fetch deals");
    dealsData = await res.json();
    
    // Tự động tạo mảng deep_discounts cho tab "Giảm sâu nhất"
    let allItems = [];
    ['specials', 'top_sellers', 'new_releases', 'coming_soon'].forEach(cat => {
      if (dealsData[cat] && dealsData[cat].items) {
        allItems = allItems.concat(dealsData[cat].items);
      }
    });
    
    // Xóa trùng lặp theo id
    let uniqueItems = [];
    let seenIds = new Set();
    allItems.forEach(item => {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueItems.push(item);
      }
    });
    
    // Tự động tạo mảng deep_discounts
    dealsData.deep_discounts = {
      items: uniqueItems.filter(item => item.discount_percent >= 70).sort((a,b) => b.discount_percent - a.discount_percent)
    };
    
    // Tích hợp GamerPower API cho tab "Miễn Phí"
    try {
      const gpRes = await fetch("https://www.gamerpower.com/api/giveaways?platform=steam");
      if (gpRes.ok) {
        const gpData = await gpRes.json();
        dealsData.free = {
          items: gpData.map(g => ({
            id: g.id,
            name: g.title,
            header_image: g.thumbnail,
            original_price: parseFloat((g.worth || "0").replace(/[^0-9.]/g, "")) * 100,
            final_price: 0,
            discount_percent: 100,
            discount_expiration: g.end_date && g.end_date !== "N/A" ? Math.floor(new Date(g.end_date).getTime() / 1000) : null,
            currency: "USD",
            isGamerPower: true,
            gamerPowerUrl: g.open_giveaway,
            platforms: g.platforms
          }))
        };
      } else {
        throw new Error("GamerPower res not ok");
      }
    } catch(e) {
      console.warn("GamerPower API failed, fallback to steam data:", e);
      dealsData.free = {
        items: uniqueItems.filter(item => item.final_price === 0 || item.discount_percent === 100)
      };
    }
    
    loading.style.display = "none";
    
    const heroMeta = document.getElementById("dealsHeroMeta");
    if (heroMeta) {
      const timeString = new Date().toLocaleTimeString(state.lang === 'vi' ? 'vi-VN' : 'en-US', {hour: '2-digit', minute:'2-digit'});
      heroMeta.innerHTML = `<span class="status-dot" style="background: var(--success); width: 8px; height: 8px; border-radius: 50%; display: inline-block;"></span> Cập nhật lúc ${timeString}`;
    }
    
    // Initial Render
    renderDealsView(); 
    setupDealsEvents();
    loadDealMetadataForCurrentCategory();
  } catch (err) {
    loading.innerHTML = `<div style="color: var(--danger); font-weight: 500;">Không thể tải danh sách khuyến mãi lúc này. Hãy thử lại sau.</div>`;
    console.error(err);
  }
}

window.addEventListener('account:deals-invalidate', () => {
  if (dealsData) dealsData.personalized = null;
});

async function fetchPersonalizedDeals() {
  if (dealsData?.personalized) return renderDealsView();
  const loading = document.getElementById("dealsLoading");
  loading.style.display = "block";
  loading.innerHTML = '<div class="spin-icon" style="display:inline-block;animation:spin 1s linear infinite">Đang tạo deal dành cho bạn…</div>';
  try {
    const response = await fetch(`/api/account/deals?cc=${state.region}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Không thể tải deal cá nhân hóa.");
    dealsData = { ...(dealsData || {}), personalized: data.personalized };
    loading.style.display = "none";
    renderDealsView();
    loadDealMetadataForCurrentCategory();
  } catch (error) {
    loading.style.display = "none";
    if (dealsState.category === "personalized") {
      const empty = document.getElementById("dealsEmpty");
      empty.classList.remove("hidden");
      empty.querySelector("h3").textContent = "Đăng nhập Steam để xem deal dành cho bạn";
      empty.querySelector("p").textContent = "Đăng nhập Steam và đồng bộ Wishlist để nhận gợi ý phù hợp.";
      const action = document.getElementById("dealsResetFilterBtn");
      action.textContent = "Đăng nhập Steam";
      action.onclick = () => window.steamCloudAccount?.open();
    }
  }
}

function renderDealsView() {
  const grid = document.getElementById("dealsGrid");
  const spotlightContainer = document.getElementById("dealsSpotlight");
  const emptyState = document.getElementById("dealsEmpty");
  const resultCount = document.getElementById("dealsResultCount");
  
  if (!dealsData || !dealsData[dealsState.category] || !dealsData[dealsState.category].items) {
    grid.innerHTML = "";
    spotlightContainer.style.display = "none";
    if (dealsState.category === "personalized") {
      emptyState.classList.remove("hidden");
      emptyState.querySelector("h3").textContent = "Đăng nhập Steam để xem deal dành cho bạn";
      emptyState.querySelector("p").textContent = "Đăng nhập Steam và đồng bộ Wishlist để nhận gợi ý phù hợp.";
      const action = document.getElementById("dealsResetFilterBtn");
      action.textContent = "Đăng nhập Steam";
      action.onclick = () => window.steamCloudAccount?.open();
    } else {
      emptyState.classList.add("hidden");
    }
    return;
  }
  
  let items = [...dealsData[dealsState.category].items];
  
  // 1. FILTER: Search
  if (dealsState.search) {
    const q = dealsState.search.toLowerCase().trim();
    items = items.filter(d => d.name.toLowerCase().includes(q));
  }
  
  // 2. FILTER: Discount %
  const minDiscount = parseInt(dealsState.discountFilter) || 0;
  if (minDiscount > 0) {
    items = items.filter(d => d.discount_percent >= minDiscount);
  }

  const minReview = Number(dealsState.reviewFilter) || 0;
  if (minReview > 0) items = items.filter((deal) => Number(deal.reviewScore) >= minReview);
  if (dealsState.genreFilter !== "all") {
    const genre = dealsState.genreFilter.toLowerCase();
    items = items.filter((deal) => (deal.tags || []).some((tag) => tag.toLowerCase().includes(genre)));
  }
  const minCcu = Number(dealsState.ccuFilter) || 0;
  if (minCcu > 0) items = items.filter((deal) => Number(deal.ccu) >= minCcu);
  if (dealsState.contentFilter !== "all") {
    items = items.filter((deal) => dealsState.contentFilter === "dlc"
      ? deal.contentType === "dlc"
      : deal.contentType !== "dlc");
  }
  const maxBudget = Number(dealsState.budgetFilter) || 0;
  if (maxBudget > 0) {
    items = items.filter((deal) => Number(deal.final_price || deal.finalPrice || 0) <= maxBudget);
  }
  
  // 3. SORT
  if (dealsState.sort === "discount_desc") {
    items.sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0));
  } else if (dealsState.sort === "price_asc") {
    items.sort((a, b) => (a.final_price || 0) - (b.final_price || 0));
  } else if (dealsState.sort === "default") {
    // Keep API default order (usually top sellers/featured)
  }
  
  resultCount.textContent = `${items.length} kết quả`;
  
  // 4. SEPARATE FEATURED (Spotlight)
  spotlightContainer.style.display = "none";
  spotlightContainer.innerHTML = "";
  
  const isDefaultView = !dealsState.search && minDiscount === 0 && minReview === 0
    && dealsState.genreFilter === "all" && minCcu === 0
    && dealsState.contentFilter === "all" && dealsState.sort === "default";
  
  if (items.length >= 3 && isDefaultView && dealsState.category !== "deep_discounts") {
    // Extract top 3 deals for the 12-col spotlight (1 big 8-col, 2 small 4-col)
    let spotlightItems = items.slice(0, 3);
    items = items.slice(3); // Remove them from grid
    renderSpotlight(spotlightItems);
  }
  
  // Reset emptyState text back to standard filter empty state
  emptyState.querySelector("h3").textContent = "Không tìm thấy game phù hợp";
  emptyState.querySelector("p").textContent = "Hãy thử thay đổi từ khóa hoặc bỏ bớt bộ lọc.";
  const actionBtn = document.getElementById("dealsResetFilterBtn");
  if (actionBtn) {
    actionBtn.textContent = "Xóa tất cả bộ lọc";
    actionBtn.onclick = () => resetDealsFilters();
  }

  // 5. RENDER GRID/LIST
  if (items.length === 0 && !isDefaultView) {
    grid.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }
  
  emptyState.classList.add("hidden");
  
  grid.className = dealsState.view === "list" ? "deals-layout-grid list-view" : "deals-layout-grid";
  
  grid.innerHTML = items.map((deal, index) => generateDealCardHTML(deal, index)).join("");
  
  attachDealClickListeners(grid.querySelectorAll(dealsState.view === "list" ? ".deal-list-item" : ".deal-card"));
}

function renderSpotlight(deals) {
  const container = document.getElementById("dealsSpotlight");
  if (deals.length < 3) return;
  
  let html = `<div class="featured-grid animated-entry">`;
  
  // Main featured (8-col)
  html += generateFeaturedCardHTML(deals[0], true);
  
  // Sub featured col (4-col)
  html += `<div class="featured-sub-col">`;
  html += generateFeaturedCardHTML(deals[1], false);
  html += generateFeaturedCardHTML(deals[2], false);
  html += `</div>`;
  
  html += `</div>`;
  
  container.innerHTML = html;
  container.style.display = "block";
  attachDealClickListeners(container.querySelectorAll(".featured-main, .featured-sub"));
}

function generateFeaturedCardHTML(deal, isMain) {
  let { originalStr, finalStr } = formatDealPrice(deal);
  const imgUrl = isMain && deal.large_capsule_image ? deal.large_capsule_image : (deal.header_image || "");
  const className = isMain ? "featured-main" : "featured-sub";
  
  let regionsHtml = "";
  if (deal.region_info && deal.region_info.lowest_price) {
    regionsHtml = `
      <div class="f-region-info">
        Giá tốt nhất tại: <strong>${deal.region_info.lowest_region}</strong>
        <span class="r-diff">(${deal.region_info.lowest_price})</span>
      </div>
    `;
  }
  
  return `
    <div class="${className}" data-appid="${deal.id}" data-gamerpower="${deal.isGamerPower ? deal.gamerPowerUrl : ''}" style="cursor:pointer;">
      <div class="featured-img-wrapper">
        <img src="${imgUrl}" alt="${deal.name}" loading="lazy">
      </div>
      <div class="featured-overlay"></div>
      <div class="featured-content">
        ${isMain ? `<div class="f-badge">Deal Nổi Bật 🔥</div>` : ''}
        <h3 class="f-title">${deal.name}</h3>
        <div class="f-meta">
          <span>Khuyến mãi đặc biệt</span>
          ${deal.discount_expiration ? `
            <span class="deal-countdown" data-expires="${deal.discount_expiration}" style="color:var(--warning); margin-left:8px;">
              ⏳ <span class="countdown-text">Đang tính...</span>
            </span>
          ` : ''}
        </div>
        <div class="f-price-row">
          ${deal.discount_percent > 0 ? `<div class="f-discount">-${deal.discount_percent}%</div>` : ''}
          <div class="f-price-group">
            ${deal.discount_percent > 0 ? `<div class="f-price-orig">${originalStr}</div>` : ''}
            <div class="f-price-sale">${finalStr}</div>
          </div>
        </div>
        ${regionsHtml}
      </div>
    </div>
  `;
}

function generateDealCardHTML(deal, index) {
  let { originalStr, finalStr } = formatDealPrice(deal);
  const isList = dealsState.view === "list";
  
  let regionHtml = "";
  if (deal.isGamerPower) {
    regionHtml = `Hỗ trợ: <strong>${deal.platforms}</strong>`;
  } else if (deal.region_info && deal.region_info.lowest_price) {
    regionHtml = `Giá rẻ nhất: <strong>${deal.region_info.lowest_price}</strong> tại ${deal.region_info.lowest_region}`;
  }
  
  if (isList) {
    return `
      <div class="deal-list-item animated-entry" data-appid="${deal.id}" data-gamerpower="${deal.isGamerPower ? deal.gamerPowerUrl : ''}" style="animation-delay: ${(index % 12) * 0.03}s; cursor:pointer;">
        <div class="dl-img">
          <img src="${deal.header_image}" alt="${deal.name}" loading="lazy">
        </div>
        <div class="dl-content">
          <div class="dl-main">
            <h3 class="dl-title">${deal.name}</h3>
            <div class="dl-meta">
              ${deal.discount_expiration ? `
                <span class="deal-countdown" data-expires="${deal.discount_expiration}" style="color:var(--warning);">
                  ⏳ <span class="countdown-text">Đang tính...</span>
                </span>
              ` : 'Kết thúc: Không xác định'}
            </div>
          </div>
          ${regionHtml ? `<div class="dl-region">${regionHtml.replace('tại', '<br>tại')}</div>` : ''}
          <div class="dl-prices">
            ${deal.discount_percent > 0 ? `<div class="dl-badge">-${deal.discount_percent}%</div>` : ''}
            <div class="dl-price-group">
              ${deal.discount_percent > 0 ? `<del>${originalStr}</del>` : ''}
              <span>${finalStr}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="deal-card animated-entry" data-appid="${deal.id}" data-gamerpower="${deal.isGamerPower ? deal.gamerPowerUrl : ''}" style="animation-delay: ${(index % 12) * 0.03}s; cursor:pointer;">
      <div class="dc-img">
        <img src="${deal.header_image}" alt="${deal.name}" loading="lazy">
        <div class="dc-badges">
          ${deal.discount_percent >= 75 ? `<div class="dc-badge-lowest">DEAL KHỦNG</div>` : ''}
        </div>
      </div>
      <div class="dc-content">
        <h3 class="dc-title">${deal.name}</h3>
        <div class="dc-meta" style="display:flex; justify-content:space-between; align-items:center;">
          <span>Trò chơi</span>
          ${deal.discount_expiration ? `
            <span class="deal-countdown" data-expires="${deal.discount_expiration}" style="color:var(--warning); font-size:11px;">
              ⏳ <span class="countdown-text">Đang tính...</span>
            </span>
          ` : ''}
        </div>
        
        <div class="dc-prices">
          ${deal.discount_percent > 0 ? `<div class="dc-badge-sale">-${deal.discount_percent}%</div>` : ''}
          ${deal.discount_percent > 0 ? `<del>${originalStr}</del>` : ''}
          <span>${finalStr}</span>
        </div>
        
        ${regionHtml ? `<div class="dc-region">${regionHtml}</div>` : ''}
        ${deal.personalReasons?.length ? `<div class="deal-meta-row">${deal.personalReasons.map(reason => `<span class="deal-meta-pill">✨ ${reason}</span>`).join("")}</div>` : ''}
        ${deal.metadataLoaded ? `<div class="deal-meta-row">
          ${deal.reviewScoreDesc ? `<span class="deal-meta-pill">${deal.reviewScoreDesc}</span>` : ''}
          ${deal.ccu ? `<span class="deal-meta-pill">${Number(deal.ccu).toLocaleString("vi-VN")} CCU</span>` : ''}
          ${(deal.tags || []).slice(0, 2).map(tag => `<span class="deal-meta-pill">${tag}</span>`).join("")}
          ${deal.contentType === "dlc" ? `<span class="deal-meta-pill">DLC</span>` : ''}
        </div>` : ''}
      </div>
    </div>
  `;
}

function formatDealPrice(deal) {
  let prefix = deal.currency === "USD" ? "$" : (deal.currency === "VND" ? "₫" : "");
  let suffix = deal.currency === "EUR" ? "€" : (prefix ? "" : ` ${deal.currency}`);
  let divider = 100;
  
  let finalPriceNum = deal.final_price || 0;
  let originalPriceNum = deal.original_price || finalPriceNum;
  
  let originalStr = prefix + (originalPriceNum / divider).toLocaleString() + suffix;
  let finalStr = finalPriceNum === 0 ? "Miễn Phí" : prefix + (finalPriceNum / divider).toLocaleString() + suffix;
  return { originalStr, finalStr };
}

function attachDealClickListeners(elements) {
  elements.forEach(card => {
    card.addEventListener("click", () => {
      const gamerPowerUrl = card.dataset.gamerpower;
      if (gamerPowerUrl) {
        window.open(gamerPowerUrl, "_blank");
        return;
      }
      const appId = card.dataset.appid;
      document.getElementById("navCompareBtn").click();
      document.getElementById("searchInput").value = appId;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      state.selectedProductType = "app";
      fetchRealData(appId, "app");
    });
  });
}

function setupDealsEvents() {
  if (dealsEventsReady) return;
  dealsEventsReady = true;
  // Tabs
  document.querySelectorAll(".deal-tab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".deal-tab-btn").forEach(b => {
        b.classList.remove("active");
        b.style.background = "transparent";
        b.style.color = "var(--text-secondary)";
        b.style.borderColor = "transparent";
        b.style.fontWeight = "normal";
      });
      const t = e.target;
      t.classList.add("active");
      t.style.background = "var(--primary-soft)";
      t.style.color = "var(--primary)";
      t.style.borderColor = "var(--primary-soft)";
      t.style.fontWeight = "600";
      
      dealsState.category = t.dataset.category;
      dealsState.page = 1;
      if (dealsState.category === "personalized") fetchPersonalizedDeals();
      else {
        renderDealsView();
        loadDealMetadataForCurrentCategory();
      }
    });
  });
  
  // Search
  let searchTimeout;
  document.getElementById("dealSearchInput").addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      dealsState.search = e.target.value;
      renderDealsView();
    }, 300);
  });
  
  // Filters
  document.getElementById("dealDiscountFilter").addEventListener("change", (e) => {
    dealsState.discountFilter = e.target.value;
    renderDealsView();
  });

  [
    ["dealReviewFilter", "reviewFilter"],
    ["dealGenreFilter", "genreFilter"],
    ["dealCcuFilter", "ccuFilter"],
    ["dealContentFilter", "contentFilter"],
    ["dealBudgetFilter", "budgetFilter"]
  ].forEach(([id, key]) => {
    document.getElementById(id)?.addEventListener("change", (event) => {
      dealsState[key] = event.target.value;
      renderDealsView();
      loadDealMetadataForCurrentCategory();
    });
  });
  
  document.getElementById("dealSortSelect").addEventListener("change", (e) => {
    dealsState.sort = e.target.value;
    renderDealsView();
  });
  
  // View Switcher (Grid/List)
  document.querySelectorAll(".deals-view-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".deals-view-btn").forEach(b => {
        b.classList.remove("active");
        b.style.background = "transparent";
        b.style.color = "var(--text-muted)";
      });
      const t = e.currentTarget;
      t.classList.add("active");
      t.style.background = "var(--primary-soft)";
      t.style.color = "var(--primary)";
      
      dealsState.view = t.dataset.view;
      renderDealsView();
    });
  });
  
  // Reset Filter Button
  document.getElementById("dealsResetFilterBtn").addEventListener("click", () => {
    document.getElementById("dealSearchInput").value = "";
    document.getElementById("dealDiscountFilter").value = "0";
    document.getElementById("dealSortSelect").value = "default";
    document.getElementById("dealReviewFilter").value = "0";
    document.getElementById("dealGenreFilter").value = "all";
    document.getElementById("dealCcuFilter").value = "0";
    document.getElementById("dealContentFilter").value = "all";
    
    dealsState.search = "";
    dealsState.discountFilter = "0";
    dealsState.reviewFilter = "0";
    dealsState.genreFilter = "all";
    dealsState.ccuFilter = "0";
    dealsState.contentFilter = "all";
    dealsState.sort = "default";
    renderDealsView();
  });
}

function escapeMarkup(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderWatchlistDrawer() {
  const body = document.getElementById("watchlistDrawerBody");
  if (!body) return;
  const games = window._trackerRepo?.getAll?.() || [];
  if (!games.length) {
    body.innerHTML = `
      <div class="watchlist-empty">
        <span>◎</span>
        <h3>Radar đang trống</h3>
        <p>Thêm game từ kết quả so sánh để theo dõi giá và nhận cảnh báo.</p>
      </div>`;
    return;
  }
  body.innerHTML = games.slice(0, 8).map((game) => {
    const latest = game.latestPrice;
    const hasAlert = Boolean(game.targetPrice);
    return `
      <article class="watchlist-quick-card">
        <img src="${escapeMarkup(game.headerImage || `https://cdn.akamai.steamstatic.com/steam/apps/${game.appId}/header.jpg`)}" alt="" loading="lazy">
        <div class="watchlist-quick-info">
          <strong>${escapeMarkup(game.customName || game.name)}</strong>
          <span>${latest ? formatCurrency(latest.amount, latest.currency) : "Chưa có giá mới"}</span>
        </div>
        <label class="watchlist-alert-toggle" title="${hasAlert ? "Bật hoặc tạm dừng cảnh báo giá" : "Mở Tracker để đặt giá mục tiêu"}">
          <input type="checkbox" data-watch-alert="${escapeMarkup(game.id)}" ${hasAlert && game.alertEnabled !== false ? "checked" : ""} ${hasAlert ? "" : "disabled"} aria-label="${hasAlert ? "Bật cảnh báo giá" : "Chưa đặt giá mục tiêu"}">
          <i></i>
        </label>
      </article>`;
  }).join("");
  if (games.length > 8) body.insertAdjacentHTML("beforeend", `<p class="watchlist-more">+${games.length - 8} game khác trong Tracker</p>`);
  body.querySelectorAll("[data-watch-alert]").forEach((input) => {
    input.addEventListener("change", () => {
      window._trackerRepo?.update?.(input.dataset.watchAlert, { alertEnabled: input.checked });
      window.dispatchEvent(new CustomEvent("tracker:games-change"));
      showFeedback(input.checked ? "Đã bật cảnh báo giá cho game." : "Đã tạm dừng cảnh báo giá.");
    });
  });
}

function openWatchlistDrawer() {
  renderWatchlistDrawer();
  document.getElementById("watchlistDrawer")?.classList.add("open");
  document.getElementById("watchlistDrawerOverlay")?.classList.add("open");
  document.getElementById("watchlistDrawer")?.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
}

function closeWatchlistDrawer() {
  document.getElementById("watchlistDrawer")?.classList.remove("open");
  document.getElementById("watchlistDrawerOverlay")?.classList.remove("open");
  document.getElementById("watchlistDrawer")?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("drawer-open");
}

function switchView(viewName) {
  const heroSection = document.querySelector(".hero-section");
  const compareSetup = document.querySelector(".container:not(.hidden):not(#dealsView):not(.legal-warning)"); // The region selection container
  const resultsArea = document.getElementById("resultsArea");
  const emptyState = document.getElementById("emptyState");
  const errorState = document.getElementById("errorState");
  const loadingState = document.getElementById("loadingState");
  const dealsView = document.getElementById("dealsView");
  
  const trackerView = document.getElementById("trackerView");
  
  const navCompare = document.getElementById("navCompareBtn");
  const navDeals = document.getElementById("navDealsBtn");
  const navTracker = document.getElementById("navTrackerBtn");
  
  // Reset active classes
  if (navCompare) navCompare.classList.remove("active");
  if (navDeals) navDeals.classList.remove("active");
  if (navTracker) navTracker.classList.remove("active");
  if (dealsView) dealsView.classList.add("hidden");
  if (trackerView) trackerView.classList.add("hidden");
  
  if (viewName === "deals") {
    if (navDeals) navDeals.classList.add("active");
    
    heroSection.classList.add("hidden");
    document.querySelectorAll(".container").forEach(c => {
      if (c.id !== "dealsView" && !c.classList.contains("legal-warning")) c.classList.add("hidden");
    });
    dealsView.classList.remove("hidden");
    
    fetchTopDeals();
  } else if (viewName === "tracker") {
    if (navTracker) navTracker.classList.add("active");
    
    heroSection.classList.add("hidden");
    document.querySelectorAll(".container").forEach(c => {
      if (c.id !== "trackerView" && !c.classList.contains("legal-warning")) c.classList.add("hidden");
    });
    trackerView.classList.remove("hidden");
    
    renderTrackerDashboard();
  } else {
    if (navCompare) navCompare.classList.add("active");
    
    dealsView.classList.add("hidden");
    if (trackerView) trackerView.classList.add("hidden");
    heroSection.classList.remove("hidden");
    
    // Restore compare setup
    document.querySelectorAll(".container").forEach(c => {
      if (c.id !== "dealsView" && c.id !== "trackerView") c.classList.remove("hidden");
    });
    
    // Restore state
    if (state.currentData) {
      resultsArea.classList.remove("hidden");
    } else {
      emptyState.classList.remove("hidden");
    }
  }
}

function setupEvents() {
  const globalRegionSelect = document.getElementById("globalRegionSelect");
  if (globalRegionSelect) {
    globalRegionSelect.value = state.region.toUpperCase(); // Init
    globalRegionSelect.addEventListener("change", (e) => {
      state.region = e.target.value.toUpperCase();
      localStorage.setItem("steam_region", state.region);
      const selectedRegion = REGIONS_DATA.find((region) => region.code === state.region.toLowerCase());
      if (selectedRegion?.curr) changeCurrency(selectedRegion.curr);
      
      const dealsView = document.getElementById("dealsView");
      if (!dealsView.classList.contains("hidden")) {
        const dealsLoading = document.getElementById("dealsLoading");
        dealsLoading.innerHTML = `<div class="spin-icon" style="display: inline-block; animation: spin 1s linear infinite; margin-bottom: 8px;"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg></div><p>Đang tải danh sách game...</p>`;
        dealsLoading.classList.remove("hidden");
        document.getElementById("dealsGrid").innerHTML = "";
        document.getElementById("dealsSpotlight").style.display = "none";
        fetchTopDeals(true);
      } else {
        const currentAppId = state.currentData?.appId;
        const searchInput = document.getElementById("searchInput");
        if (currentAppId || searchInput?.value) {
          fetchRealData(String(currentAppId || searchInput.value), state.currentData?.productType);
        }
      }
    });
  }

  const navCompare = document.getElementById("navCompareBtn");
  const navDeals = document.getElementById("navDealsBtn");
  const navTracker = document.getElementById("navTrackerBtn");
  
  if (navCompare) navCompare.addEventListener("click", (e) => { e.preventDefault(); switchView("compare"); });
  if (navDeals) navDeals.addEventListener("click", (e) => { e.preventDefault(); switchView("deals"); });
  if (navTracker) navTracker.addEventListener("click", (e) => { e.preventDefault(); openWatchlistDrawer(); });

  const appHeader = document.getElementById("appHeader");
  const miniSearchForm = document.getElementById("headerMiniSearch");
  const miniSearchInput = document.getElementById("headerMiniSearchInput");
  const syncHeaderState = () => appHeader?.classList.toggle("is-scrolled", window.scrollY > 180);
  window.addEventListener("scroll", syncHeaderState, { passive: true });
  syncHeaderState();
  miniSearchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = String(miniSearchInput?.value || "").trim();
    if (!query) {
      switchView("compare");
      document.getElementById("searchInput")?.focus();
      return;
    }
    switchView("compare");
    const mainSearch = document.getElementById("searchInput");
    if (mainSearch) mainSearch.value = query;
    fetchRealData(query);
  });

  document.getElementById("watchlistDrawerClose")?.addEventListener("click", closeWatchlistDrawer);
  document.getElementById("watchlistDrawerOverlay")?.addEventListener("click", closeWatchlistDrawer);
  document.getElementById("openFullTrackerBtn")?.addEventListener("click", () => {
    closeWatchlistDrawer();
    switchView("tracker");
  });
  document.getElementById("openHistoryDiscoveryBtn")?.addEventListener("click", () => {
    document.getElementById("viewHistoryBtn")?.click();
  });
  window.addEventListener("tracker:games-change", () => {
    if (document.getElementById("watchlistDrawer")?.classList.contains("open")) renderWatchlistDrawer();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.getElementById("watchlistDrawer")?.classList.contains("open")) closeWatchlistDrawer();
  });
  
  const searchRegionInput = document.getElementById("regionSearchInput");
  if (searchRegionInput) searchRegionInput.addEventListener("input", e => renderRegions(e.target.value));
  
  document.querySelectorAll(".quick-action-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      if (action === "all") {
        selectedRegions = new Set(REGIONS_DATA.map(r => r.code));
      } else if (action === "none") {
        selectedRegions.clear();
      } else if (action === "popular") {
        selectedRegions = new Set(["vn", "us", "cn", "hk", "tw", "jp", "kr", "sg", "th", "my", "tr", "ar", "ua", "au"]);
      } else if (action === "asia") {
        selectedRegions = new Set(REGIONS_DATA.filter(r => r.group === "as").map(r => r.code));
      } else if (action === "sea") {
        selectedRegions = new Set(REGIONS_DATA.filter(r => r.group === "sea").map(r => r.code));
      }
      if (searchRegionInput) searchRegionInput.value = "";
      renderRegions();
      updateRegionSummary();
    });
  });
  
  const searchInput = document.getElementById("searchInput");
  const autocompleteDropdown = document.getElementById("autocompleteDropdown");
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  let searchTimeout;

  searchInput.addEventListener("input", (e) => {
    state.selectedProductType = "app";
    const val = e.target.value.trim();
    if (val) clearSearchBtn.classList.remove("hidden");
    else clearSearchBtn.classList.add("hidden");

    if (!val) {
      autocompleteDropdown.classList.add("hidden");
      return;
    }
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(val)}&lang=${state.lang}`);
        const data = await res.json();
        if (data && data.items && data.items.length > 0) {
          autocompleteDropdown.innerHTML = data.items.map(item => `
            <div class="autocomplete-item" data-id="${item.id}" data-type="${item.type === "sub" ? "sub" : "app"}">
              <img src="${item.tiny_image}" alt="" class="ac-img" />
              <div class="ac-info">
                <div class="ac-name">${item.name} <span class="ac-type">${item.type === "sub" ? "BUNDLE" : "APP"}</span></div>
                ${item.price ? `<div class="ac-price">${item.price.currency} ${(item.price.final/100).toFixed(2)}</div>` : ""}
              </div>
            </div>
          `).join("");
          autocompleteDropdown.classList.remove("hidden");
          
          autocompleteDropdown.querySelectorAll(".autocomplete-item").forEach(el => {
            el.addEventListener("click", () => {
              searchInput.value = el.dataset.id;
              state.selectedProductType = el.dataset.type || "app";
              clearInlineFieldError(searchInput);
              autocompleteDropdown.classList.add("hidden");
              fetchRealData(el.dataset.id, state.selectedProductType);
            });
          });
        } else {
          autocompleteDropdown.innerHTML = `<div class="ac-empty"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="20" y1="20" x2="16.5" y2="16.5"></line></svg><span>${t("search_empty")}</span></div>`;
          autocompleteDropdown.classList.remove("hidden");
        }
      } catch (err) {
        console.error("Autocomplete err:", err);
      }
    }, 300);
  });

  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
      autocompleteDropdown.classList.add("hidden");
    }
  });

  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearSearchBtn.classList.add("hidden");
    autocompleteDropdown.classList.add("hidden");
    searchInput.focus();
  });

  document.querySelectorAll(".chip-btn[data-appid]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedProductType = "app";
      searchInput.value = button.dataset.appid;
      clearSearchBtn.classList.remove("hidden");
      clearInlineFieldError(searchInput);
      fetchRealData(button.dataset.appid, "app");
    });
  });

  document.getElementById("pasteBtn").addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      searchInput.value = text;
      clearSearchBtn.classList.remove("hidden");
      if(text) fetchRealData(text);
    } catch (e) {
      setInlineFieldError(searchInput, t("paste_err"));
    }
  });

  document.getElementById("searchForm").addEventListener("submit", e => {
    e.preventDefault();
    const val = searchInput.value;
    if(val) {
      autocompleteDropdown.classList.add("hidden");
      fetchRealData(val);
    }
  });
  document.getElementById("triggerCompareBtn").addEventListener("click", () => {
    const val = document.getElementById("searchInput").value;
    fetchRealData(val);
  });
  
  document.getElementById("tableSearchInput").addEventListener("input", e => { state.countrySearch = e.target.value; renderData(); });
  document.getElementById("filterAvailToggle").addEventListener("change", e => { state.availableOnly = e.target.checked; renderData(); });
  document.getElementById("filterSaleToggle").addEventListener("change", e => { state.saleOnly = e.target.checked; renderData(); });
  document.getElementById("pinVNToggle").addEventListener("change", e => { state.pinnedVN = e.target.checked; renderData(); });
  
  document.querySelectorAll("th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const sortKey = th.dataset.sort;
      if (state.sort.by === sortKey) state.sort.desc = !state.sort.desc;
      else { state.sort.by = sortKey; state.sort.desc = false; }
      
      document.querySelectorAll("th.sortable .sort-indicator").forEach(ind => ind.textContent = "");
      th.querySelector(".sort-indicator").textContent = state.sort.desc ? "▼" : "▲";
      renderData();
    });
  });
  
  document.querySelectorAll(".switch-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".switch-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.view = btn.dataset.view;
      
      document.getElementById("tableView").classList.toggle("hidden", state.view !== "table");
      document.getElementById("cardView").classList.toggle("hidden", state.view !== "card");
      document.getElementById("chartView").classList.toggle("hidden", state.view !== "chart");
      
      if (state.view === "chart") setTimeout(renderChart, 50);
    });
  });
  
  document.getElementById("toolbarChangeCurrBtn").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById("currencyComboboxTrigger").click();
  });
  
  document.getElementById("exportCsvBtn").addEventListener("click", exportCurrentComparisonCsv);
  
  document.getElementById("copyResultLinkBtn").addEventListener("click", () => {
    copyText(window.location.href)
      .then(() => {
        showFeedback(t("copied"));
      })
      .catch(() => showFeedback(state.lang === "vi" ? "Không thể sao chép liên kết." : "Could not copy the link.", "error"));
  });
  
  document.getElementById("refreshFxBtn").addEventListener("click", () => {
    const icon = document.querySelector("#refreshFxBtn .spin-icon");
    if (icon) icon.style.animation = "spin 1s linear infinite";
    const val = document.getElementById("searchInput").value || "1245620";
    fetchRealData(val).then(() => {
      if (icon) icon.style.animation = "none";
    });
  });
  
  const langToggleBtn = document.getElementById("langToggleBtn");
  if(langToggleBtn) langToggleBtn.addEventListener("click", toggleLang);
  
  const viewHistoryBtn = document.getElementById("viewHistoryBtn");
  const historyModal = document.getElementById("historyModal");
  const historyModalOverlay = document.getElementById("historyModalOverlay");
  const closeHistoryBtn = document.getElementById("closeHistoryBtn");

  const closeHistoryModal = () => {
    if (!historyModal || !historyModalOverlay) return;
    historyModal.classList.remove("show");
    historyModalOverlay.classList.remove("show");
    historyModal.classList.add("hidden");
    historyModalOverlay.classList.add("hidden");
    historyModal.setAttribute("aria-hidden", "true");
    viewHistoryBtn?.focus();
  };
  
  if (viewHistoryBtn && historyModal && historyModalOverlay) {
    viewHistoryBtn.addEventListener("click", () => {
      historyModal.classList.remove("hidden");
      historyModalOverlay.classList.remove("hidden");
      historyModal.classList.add("show");
      historyModalOverlay.classList.add("show");
      historyModal.setAttribute("aria-hidden", "false");
      closeHistoryBtn?.focus();
      renderPriceHistoryChart();
      if (typeof setupGameExtraTools === "function" && state.currentData?.appId) {
        setupGameExtraTools(state.currentData.appId);
      }
    });
  }
  
  if (closeHistoryBtn) {
    closeHistoryBtn.addEventListener("click", closeHistoryModal);
  }
  
  if (historyModalOverlay) {
    historyModalOverlay.addEventListener("click", closeHistoryModal);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && historyModal?.classList.contains("show")) {
      closeHistoryModal();
    }
  });
  
  document.querySelectorAll(".chart-filters .filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".chart-filters .filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const range = parseInt(btn.dataset.range);
      renderPriceHistoryChart(range);
    });
  });

  document.querySelectorAll("[data-history-source]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeHistorySource = btn.dataset.historySource;
      document.querySelectorAll("[data-history-source]").forEach((item) => {
        const selected = item === btn;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-selected", String(selected));
      });
      const activeRange = Number(
        document.querySelector(".chart-filters .filter-btn.active")?.dataset.range
      ) || 12;
      renderPriceHistoryChart(activeRange);
    });
  });
}

function updateTimeAgo() {
  if (!state.checkedAt) return;
  const now = new Date();
  const diffMs = now - state.checkedAt;
  const diffMins = Math.floor(diffMs / 60000);
  
  let text = t("just_now");
  if (diffMins > 0) {
    if (diffMins < 60) text = `${diffMins} ${t("mins_ago")}`;
    else {
      const hours = Math.floor(diffMins / 60);
      text = `${hours} ${t("hours_ago")}`;
    }
  }
  
  const fxEl = document.getElementById("fxTime");
  const sFxEl = document.getElementById("summaryFxTime");
  if (fxEl) fxEl.textContent = text;
  if (sFxEl) sFxEl.textContent = text;
}

function updateDealsCountdowns() {
  document.querySelectorAll('.deal-countdown[data-expires]').forEach(el => {
    const expires = parseInt(el.dataset.expires, 10);
    const diffMs = (expires * 1000) - Date.now();
    const textSpan = el.querySelector('.countdown-text');
    
    if (diffMs <= 0) {
      if (textSpan) textSpan.innerText = "Đã kết thúc";
      el.style.background = "rgba(220, 38, 38, 0.8)";
      return;
    }
    
    const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const h = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diffMs / 1000 / 60) % 60);
    const s = Math.floor((diffMs / 1000) % 60);
    
    if (textSpan) {
      if (d > 0) {
        textSpan.innerText = `Còn ${d}d ${h}h ${m}m ${s}s`;
        el.style.background = ""; 
      } else {
        textSpan.innerText = `Còn ${h}h ${m}m ${s}s`;
        el.style.background = "rgba(220, 38, 38, 0.8)";
      }
    }
  });

  document.querySelectorAll('.sale-event[data-sale-target]').forEach((event) => {
    const target = new Date(event.dataset.saleTarget).getTime();
    const output = event.querySelector('.sale-countdown');
    if (!output || !Number.isFinite(target)) return;
    const active = event.querySelector('.sale-event-label')?.textContent === 'Đang diễn ra';
    output.textContent = `${active ? 'Kết thúc sau ' : 'Còn '}${formatCountdown(target - Date.now())}`;
  });
}

function normalizeComparisonPrice(price) {
  const dataRegion = REGIONS_DATA.find((region) => region.code === price.code);
  return {
    code: price.code,
    name: dataRegion ? (state.lang === "vi" ? dataRegion.name : dataRegion.en_name) : price.code.toUpperCase(),
    flag: getFlagHtml(price.code),
    curr: price.currency,
    available: Boolean(price.available),
    isFree: Boolean(price.isFree),
    initial: price.initial || 0,
    final: price.final || 0,
    discount: price.discountPercent || 0,
    backendConvertedValue: Number.isFinite(price.convertedValue) ? price.convertedValue : null
  };
}

function buildComparisonViewData(metadata, rawPrices, appId, productType) {
  const firstValue = (field) => rawPrices.find((price) => price[field])?.[field] || null;
  const gameName = metadata.gameName || firstValue("gameName");
  const developer = metadata.developer || firstValue("developer");
  const publisher = metadata.publisher || firstValue("publisher");
  const genres = metadata.genres || firstValue("genres");
  return {
    appId: Number(metadata.appId || appId),
    productType: metadata.productType || productType,
    name: gameName || "",
    image: metadata.image || firstValue("image") || "",
    developer: developer || publisher || t("unknown"),
    publisher: publisher || developer || t("unknown"),
    release: metadata.releaseDate || firstValue("releaseDate") || t("unknown"),
    tags: genres ? genres.split(", ").slice(0, 4) : ["Game"],
    description: metadata.shortDescription || firstValue("shortDescription") || (state.lang === "vi" ? "Không có thông tin giới thiệu." : "No description available."),
    reviewScoreDesc: metadata.reviewScoreDesc || null,
    reviewPercent: Number.isFinite(metadata.reviewPercent) ? metadata.reviewPercent : null,
    totalReviews: Number(metadata.totalReviews || 0),
    ccu: Number(metadata.ccu || 0),
    prices: rawPrices.map(normalizeComparisonPrice),
    steamVerified: Boolean(gameName)
  };
}

async function fetchComparisonStream(url, onProgress) {
  const response = await fetch(url);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Không thể tải dữ liệu giá.");
  }

  const rawPrices = [];
  let metadata = {};
  const consumeLine = (line) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === "error") throw new Error(event.error || "Không thể tải dữ liệu giá.");
    if (event.type === "price") {
      const existingIndex = rawPrices.findIndex((price) => price.code === event.price.code);
      if (existingIndex >= 0) rawPrices[existingIndex] = event.price;
      else rawPrices.push(event.price);
      onProgress?.({ metadata, rawPrices: [...rawPrices], completed: event.completed, total: event.total });
    }
    if (event.type === "complete") metadata = { ...metadata, ...event.data };
  };

  if (!response.body?.getReader) {
    (await response.text()).split("\n").forEach(consumeLine);
    return { ...metadata, prices: rawPrices };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    lines.forEach(consumeLine);
    if (done) break;
  }
  consumeLine(buffer);
  return { ...metadata, prices: rawPrices };
}

async function fetchRealData(query, requestedType = null) {
  const searchInput = document.getElementById("searchInput");
  let appId = String(query || "").trim();
  const steamUrlMatch = appId.match(/(?:^|\/)(app|sub)\/(\d+)/i);
  let productType = requestedType === "sub" ? "sub" : state.selectedProductType;
  if (steamUrlMatch) {
    productType = steamUrlMatch[1].toLowerCase() === "sub" ? "sub" : "app";
    appId = steamUrlMatch[2];
  }
  else if (!/^\d+$/.test(appId)) {
    setInlineFieldError(searchInput, state.lang === "vi" ? "Vui lòng nhập App ID hợp lệ" : "Please enter a valid App ID");
    return;
  }
  clearInlineFieldError(searchInput);
  searchInput.value = appId;
  state.selectedProductType = productType;
  
  if (selectedRegions.size === 0) {
    setInlineFieldError(document.getElementById("regionSearchInput"), "Vui lòng chọn ít nhất một khu vực");
    return;
  }
  
  const regionCodes = Array.from(selectedRegions).join(",");
  document.getElementById("emptyState").classList.add("hidden");
  document.getElementById("errorState").classList.add("hidden");
  document.getElementById("resultsArea").classList.add("hidden");
  const loadingState = document.getElementById("loadingState");
  const loadingProgressText = document.getElementById("loadingProgressText");
  const loadingProgressBar = document.getElementById("loadingProgressBar");
  const compareButtons = [document.querySelector("#searchForm .search-submit"), document.getElementById("triggerCompareBtn")].filter(Boolean);
  loadingProgressText.textContent = t("loading_progress").replace("{count}", "0").replace("{total}", selectedRegions.size);
  loadingProgressBar.style.width = "12%";
  loadingState.classList.remove("hidden");
  loadingState.setAttribute("aria-busy", "true");
  compareButtons.forEach(button => { button.disabled = true; });
  loadingState.scrollIntoView({ behavior: "smooth", block: "center" });
  
  try {
    const streamUrl = `/api/compare-stream/${appId}?currency=${state.currency}&regions=${regionCodes}&lang=${state.lang}&type=${productType}`;
    const data = await fetchComparisonStream(streamUrl, ({ metadata, rawPrices, completed, total }) => {
      const partial = buildComparisonViewData(metadata, rawPrices, appId, productType);
      loadingProgressText.textContent = t("loading_progress").replace("{count}", completed).replace("{total}", total);
      loadingProgressBar.style.width = `${Math.max(12, Math.round((completed / total) * 100))}%`;
      if (!partial.steamVerified) return;
      state.currentData = partial;
      state.checkedAt = new Date();
      processData();
      renderData();
      document.getElementById("resultsArea").classList.remove("hidden");
    });

    state.currentData = buildComparisonViewData(data, data.prices || [], appId, productType);
    if (!state.currentData.steamVerified) {
      throw new Error(productType === "sub"
        ? "Package ID không tồn tại trên Steam Store."
        : "App ID không tồn tại trên Steam Store.");
    }
    
    state.checkedAt = new Date(data.checkedAt);
    updateTimeAgo();
    
    processData();
    renderData();
    updateSpotlightIntelligence();
    loadingProgressText.textContent = t("loading_progress").replace("{count}", selectedRegions.size).replace("{total}", selectedRegions.size);
    loadingProgressBar.style.width = "100%";
    loadingState.classList.add("hidden");
    document.getElementById("resultsArea").classList.remove("hidden");
    
    // Update URL for sharing
    const url = new URL(window.location);
    if (productType === "app") {
      url.pathname = `/game/${appId}`;
      url.searchParams.delete('appId');
      url.searchParams.delete('type');
    } else {
      url.pathname = "/";
      url.searchParams.set('appId', appId);
      url.searchParams.set('type', 'sub');
    }
    window.history.pushState({}, '', url);
    
  } catch (error) {
    loadingState.classList.add("hidden");
    document.getElementById("resultsArea").classList.add("hidden");
    document.getElementById("errorState").classList.remove("hidden");
    const errorDescription = document.getElementById("errorDesc");
    if (errorDescription) errorDescription.textContent = error.message || t("err_desc");
    if (/không tồn tại|not exist/i.test(error.message || "")) {
      setInlineFieldError(searchInput, error.message);
    }
    if (/không tồn tại|not exist/i.test(error.message || "")) console.warn(error.message);
    else console.error(error);
  } finally {
    loadingState.removeAttribute("aria-busy");
    compareButtons.forEach(button => { button.disabled = false; });
  }
}

function processData() {
  const targetRate = LIVE_FX[state.currency] || 1; 
  state.currentData.prices.forEach(p => {
    if (p.available && p.curr) {
      const nativeRate = LIVE_FX[p.curr] || 1;
      p.convertedValue = LIVE_FX[p.curr] && LIVE_FX[state.currency]
        ? (p.final / nativeRate) * targetRate
        : (p.backendConvertedValue ?? p.final);
    } else {
      p.convertedValue = 0;
    }
  });
}

async function updateSpotlightIntelligence() {
  if (!state.currentData) return;
  const reviewBadge = document.getElementById("gameReviewBadge");
  const priceBadge = document.getElementById("gamePriceIntelBadge");
  if (reviewBadge) {
    const score = state.currentData.reviewPercent;
    const label = state.currentData.reviewScoreDesc;
    reviewBadge.textContent = score !== null
      ? `${score}% ${label || (state.lang === "vi" ? "đánh giá tích cực" : "positive reviews")}`
      : (state.lang === "vi" ? "Chưa có đủ đánh giá" : "Not enough reviews");
    reviewBadge.title = state.currentData.totalReviews
      ? `${state.currentData.totalReviews.toLocaleString()} Steam reviews`
      : "Steam community reviews";
  }
  if (!priceBadge || state.currentData.productType === "sub") return;
  priceBadge.textContent = state.lang === "vi" ? "Đang phân tích lịch sử giá…" : "Analyzing price history…";
  priceBadge.className = "spotlight-badge price-intel loading";
  try {
    const response = await fetch(`/api/purchase-advice/${state.currentData.appId}`);
    const advice = await response.json();
    if (!response.ok) throw new Error(advice.error || "Price history unavailable");
    const labels = {
      BUY_NOW: state.lang === "vi" ? "★ Giá chạm vùng nên mua" : "★ Buy-zone price",
      GOOD_DEAL: state.lang === "vi" ? "✓ Mức giá tốt" : "✓ Good deal",
      WAIT_FOR_SALE: state.lang === "vi" ? "◷ Nên đợi sale" : "◷ Wait for sale"
    };
    priceBadge.textContent = labels[advice.action] || advice.badge;
    priceBadge.title = advice.reason || "";
    priceBadge.className = `spotlight-badge price-intel ${String(advice.action || "").toLowerCase()}`;
  } catch {
    priceBadge.textContent = state.lang === "vi" ? "Lịch sử đang được thu thập" : "History is being collected";
    priceBadge.className = "spotlight-badge price-intel pending";
  }
}

function getFilteredSortedPrices() {
  let list = [...state.currentData.prices];
  const q = state.countrySearch.toLowerCase();
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q));
  if (state.availableOnly) list = list.filter(p => p.available);
  if (state.saleOnly) list = list.filter(p => p.discount > 0);
  
  const avail = list.filter(p => p.available);
  const minVal = avail.length ? Math.min(...avail.map(p => p.convertedValue)) : 0;
  
  list = list.map(p => ({
    ...p,
    isBest: p.available && p.convertedValue === minVal,
    diffValue: p.available ? p.convertedValue - minVal : 0
  }));
  
  list.sort((a, b) => {
    if (state.pinnedVN) {
      if (a.code === "vn" && b.code !== "vn") return -1;
      if (b.code === "vn" && a.code !== "vn") return 1;
    }
    
    let valA, valB;
    if (state.sort.by === "rank" || state.sort.by === "converted") {
      valA = a.available ? a.convertedValue : Infinity;
      valB = b.available ? b.convertedValue : Infinity;
    } else if (state.sort.by === "name") {
      valA = a.name; valB = b.name;
      return state.sort.desc ? valB.localeCompare(valA) : valA.localeCompare(valB);
    } else if (state.sort.by === "discount") {
      valA = a.discount || 0; valB = b.discount || 0;
    }
    
    return state.sort.desc ? valB - valA : valA - valB;
  });
  
  return list;
}

function updateTrackBtnUI(appId) {
  const trackBtn = document.getElementById("trackGameBtn");
  if (!trackBtn) return;
  
  let isTracked = false;
  if (window._trackerRepo) {
    isTracked = !!window._trackerRepo.getByAppId(appId);
  } else {
    try {
      const games = JSON.parse(localStorage.getItem('steam_pic_tracked_games') || '[]');
      isTracked = !!games.find(g => g.appId == appId);
    } catch(e) {}
  }

  if (isTracked) {
    trackBtn.classList.remove("btn-primary");
    trackBtn.classList.add("btn-outline");
    trackBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg> Đang theo dõi`;
  } else {
    trackBtn.classList.add("btn-primary");
    trackBtn.classList.remove("btn-outline");
    trackBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg> Đưa vào Radar`;
  }
}

function renderData() {
  if (!state.currentData) return;
  const prices = getFilteredSortedPrices();
  const avail = prices.filter(p => p.available);
  
  document.getElementById("gameTitleName").textContent = state.currentData.name;
  document.getElementById("gameCoverImg").src = state.currentData.image;
  const spotlightCard = document.querySelector(".game-result-card");
  if (spotlightCard && state.currentData.image) {
    spotlightCard.style.setProperty("--game-backdrop", `url("${String(state.currentData.image).replaceAll('"', '%22')}")`);
  }
  const reviewBadge = document.getElementById("gameReviewBadge");
  if (reviewBadge && state.currentData.reviewPercent !== null) {
    reviewBadge.textContent = `${state.currentData.reviewPercent}% ${state.currentData.reviewScoreDesc || "Positive"}`;
  }
  document.getElementById("gameDeveloper").textContent = state.currentData.developer;
  document.getElementById("gamePublisher").textContent = state.currentData.publisher;
  document.getElementById("gameRelease").textContent = state.currentData.release;
  document.getElementById("gameId").textContent = state.currentData.appId;
  document.getElementById("gameDescription").textContent = state.currentData.description;
  document.getElementById("gameTags").innerHTML = state.currentData.tags.map(t => `<span class="tag">${t}</span>`).join("");
  const storePath = state.currentData.productType === "sub" ? "sub" : "app";
  document.getElementById("gameSteamLinkBtn").href = `https://store.steampowered.com/${storePath}/${state.currentData.appId}`;
  
  // Track Game Logic
  updateTrackBtnUI(state.currentData.appId);
  const trackBtn = document.getElementById("trackGameBtn");
  if (trackBtn) {
    // Xoá sự kiện cũ để tránh lặp (bằng cách clone)
    const newTrackBtn = trackBtn.cloneNode(true);
    trackBtn.parentNode.replaceChild(newTrackBtn, trackBtn);
    const isPackage = state.currentData.productType === "sub";
    newTrackBtn.disabled = isPackage;
    newTrackBtn.title = isPackage ? "Theo dõi từng game/DLC trong gói" : "Đưa vào Radar Theo Dõi Giá";
    if (!isPackage) {
      newTrackBtn.addEventListener("click", () => {
        toggleTrackGame(state.currentData.appId, state.currentData.name, state.currentData.image);
      });
    }
  }
  const historyButton = document.getElementById("viewHistoryBtn");
  if (historyButton) {
    historyButton.disabled = state.currentData.productType === "sub";
    historyButton.title = historyButton.disabled ? "Lịch sử giá bundle chưa được ITAD hỗ trợ" : "Xem lịch sử giá";
  }
  
  if (avail.length > 0) {
    const sorted = [...avail].sort((a,b) => a.convertedValue - b.convertedValue);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    
    document.getElementById("summaryBestPrice").textContent = formatCurrency(best.convertedValue, state.currency);
    document.getElementById("summaryBestRegion").innerHTML = `${best.flag} ${best.name}`;
    document.getElementById("summaryWorstPrice").textContent = formatCurrency(worst.convertedValue, state.currency);
    
    const diffPct = worst.convertedValue > 0 ? ((worst.convertedValue - best.convertedValue) / worst.convertedValue * 100).toFixed(0) : 0;
    document.getElementById("summaryBestDiff").textContent = state.lang === "vi" ? `Rẻ hơn ${diffPct}% so với khu vực đắt nhất (${worst.name})` : `${diffPct}% cheaper than highest region (${worst.name})`;
    
    // Insight Bar
    const vn = avail.find(p => p.code === "vn");
    let insightHtml = "";
    if (vn) {
      if (vn.isBest) insightHtml = state.lang === "vi" ? `🎉 Tuyệt vời! Việt Nam hiện đang là khu vực có mức giá rẻ nhất trong danh sách đã chọn.` : `🎉 Great! Vietnam is currently the cheapest region.`;
      else {
        const vnDiff = vn.convertedValue - best.convertedValue;
        const vnDiffPct = (vnDiff / best.convertedValue * 100).toFixed(1);
        insightHtml = state.lang === "vi" ? `💡 Giá tại Việt Nam cao hơn khu vực rẻ nhất (${best.name}) khoảng ${formatCurrency(vnDiff, state.currency)}, tương đương ${vnDiffPct}%.` : `💡 Price in Vietnam is ${vnDiffPct}% higher than the cheapest region (${best.name}).`;
      }
    } else {
      const sales = avail.filter(p => p.discount > 0).length;
      if (sales > 0) insightHtml = state.lang === "vi" ? `🔥 Đang có ${sales} khu vực giảm giá tựa game này!` : `🔥 ${sales} regions are on sale!`;
      else insightHtml = state.lang === "vi" ? `ℹ️ Đã phân tích giá thành công tại ${avail.length} khu vực.` : `ℹ️ Successfully analyzed ${avail.length} regions.`;
    }
    const insightBar = document.getElementById("insightBar");
    if(insightBar) insightBar.innerHTML = `<span class="icon">💡</span> <span class="text">${insightHtml}</span>`;
  }
  
  const availCountEl = document.getElementById("statAvailCount");
  const discountCountEl = document.getElementById("statDiscountCount");
  if(availCountEl) availCountEl.textContent = avail.length;
  if(discountCountEl) discountCountEl.textContent = avail.filter(p => p.discount > 0).length;
  
  renderTable(prices);
  renderCardView(prices);
  if (state.view === "chart") renderChart();
}

function renderTable(prices) {
  let rank = 1;
  const tbody = document.getElementById("tableBody");
  
  tbody.innerHTML = prices.map((p, i) => {
    if (!p.available) {
      return `<tr class="unavailable">
        <td class="t-rank">—</td>
        <td class="country-cell"><div class="country-cell-inner">${p.flag} ${p.name}</div></td>
        <td colspan="6" style="color: var(--text-muted); font-style: italic; text-align: center;">${t("unavailable")}</td>
      </tr>`;
    }
    
    let trClass = "";
    let badgeHtml = "";
    if (p.isBest) { trClass = "row-best"; badgeHtml = `<span class="badge-best">${t("badge_best")}</span>`; }
    else if (p.code === "vn") { trClass = "row-pinned"; badgeHtml = `<span class="badge-you">${t("badge_you")}</span>`; }
    else if (i === prices.length - 1) { badgeHtml = `<span class="badge-worst">${t("badge_worst")}</span>`; }
    
    return `<tr class="${trClass}">
      <td class="t-rank">#${rank++}</td>
      <td class="country-cell"><div class="country-cell-inner">${p.flag} ${p.name} ${badgeHtml}</div></td>
      <td>
        <div class="t-steam-price-inner">
          ${p.discount > 0 ? `<span class="price-strike">${formatCurrency(p.initial, p.curr)}</span>` : ''}
          <span class="price-final">${formatCurrency(p.final, p.curr)}</span>
        </div>
      </td>
      <td>${p.discount > 0 ? `<span class="discount-badge">-${p.discount}%</span>` : "—"}</td>
      <td class="t-converted">${formatCurrency(p.convertedValue, state.currency)}</td>
      <td class="t-diff ${p.diffValue > 0 ? 'diff-plus' : ''}">${p.diffValue > 0 ? '+' + formatCurrency(p.diffValue, state.currency) : "—"}</td>
      <td><span class="status-label success-text">${state.lang === "vi" ? "Khả dụng" : "Available"}</span></td>
      <td><a href="https://store.steampowered.com/${state.currentData.productType === "sub" ? "sub" : "app"}/${state.currentData.appId}?cc=${p.code}" target="_blank" class="icon-btn" title="${t("open_steam")} (${p.name})"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a></td>
    </tr>`;
  }).join("");
}

function renderCardView(prices) {
  let rank = 1;
  document.getElementById("cardGrid").innerHTML = prices.map(p => {
    if (!p.available) return "";
    return `
      <div class="mobile-card ${p.isBest ? 'best' : ''}">
        <div class="m-header">
          <span class="m-rank">#${rank++}</span>
          ${p.isBest ? `<span class="badge-best">${t("badge_best")}</span>` : (p.code === "vn" ? `<span class="badge-you">${t("badge_you")}</span>` : '')}
        </div>
        <div class="m-country">${p.flag} ${p.name}</div>
        <div class="m-price-main">
          <div class="m-converted">${formatCurrency(p.convertedValue, state.currency)}</div>
          <div class="m-native">
            ${p.discount > 0 ? `<span class="discount-badge">-${p.discount}%</span>` : ''}
            <span class="m-native-val">${formatCurrency(p.final, p.curr)}</span>
          </div>
        </div>
        <div class="m-meta">
          <span>${t("t_diff")}: ${p.diffValue > 0 ? '+' + formatCurrency(p.diffValue, state.currency) : '0'}</span>
          <a href="https://store.steampowered.com/${state.currentData.productType === "sub" ? "sub" : "app"}/${state.currentData.appId}?cc=${p.code}" target="_blank" class="text-link small">${t("open_steam")}</a>
        </div>
      </div>
    `;
  }).join("");
}

function renderChart() {
  const wrapper = document.getElementById("barChartWrapper");
  const prices = getFilteredSortedPrices().filter(p => p.available);
  if (!prices.length) return;
  
  // Sort from min to max for chart specifically
  prices.sort((a,b) => a.convertedValue - b.convertedValue);
  
  const maxVal = prices[prices.length - 1].convertedValue;
  
  wrapper.innerHTML = prices.map(p => {
    const pct = maxVal > 0 ? (p.convertedValue / maxVal * 100) : 0;
    return `
      <div class="chart-row ${p.isBest ? 'best' : ''}">
        <div class="c-label">${p.name} ${p.flag}</div>
        <div class="c-track">
          <div class="c-fill" style="width: ${Math.max(pct, 1)}%">
            <span class="c-value">${formatCurrency(p.convertedValue, state.currency)}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

async function renderInternalHistoryChart(months = 12) {
  const canvas = document.getElementById("priceHistoryChart");
  const loading = document.getElementById("chartLoadingIndicator");
  const summary = document.getElementById("historyLowSummary");
  const noteReal = document.querySelector(".history-note-real");
  const noteSimulated = document.querySelector(".history-note-simulated");
  if (priceHistoryChartInstance) priceHistoryChartInstance.destroy();
  canvas.style.display = "none";
  summary?.classList.add("hidden");
  noteSimulated?.classList.add("hidden");
  if (noteReal) { noteReal.classList.remove("hidden"); noteReal.textContent = "* Snapshot nội bộ được ghi cho game đang theo dõi; dự đoán chỉ là heuristic theo chu kỳ sale."; }
  loading.classList.remove("hidden");
  loading.innerHTML = '<div class="spin-icon" style="display:inline-block;animation:spin 1s linear infinite">Đang tải snapshot nội bộ…</div>';
  try {
    const region = (state.currentData.prices.find((price) => price.code === state.region.toLowerCase())?.code || "vn").toLowerCase();
    const response = await fetch(`/api/history/internal/${state.currentData.appId}?region=${region}&type=${state.currentData.productType || "app"}&days=${months * 31}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Không thể tải lịch sử nội bộ.");
    if (!data.points?.length) throw new Error("Chưa có snapshot. Cron sẽ bắt đầu ghi khi game có giá mục tiêu.");
    const currency = data.points.at(-1).currency;
    const labels = data.points.map((point) => new Date(point.captured_at).toLocaleDateString(state.lang === "vi" ? "vi-VN" : "en-US"));
    const values = data.points.map((point) => Number(point.price_amount));
    const versus = data.stats.versusAverage90Percent;
    summary.innerHTML = `<span class="history-low-badge">NỘI BỘ · ${data.stats.samples} SNAPSHOT</span><span>Giá hiện tại ${versus == null ? "chưa đủ dữ liệu so với" : `${Math.abs(versus).toFixed(1)}% ${versus <= 0 ? "thấp hơn" : "cao hơn"}`} trung bình 90 ngày</span><strong>${data.prediction.label}${data.prediction.probability == null ? "" : ` · ${data.prediction.probability}%`}</strong><small>${data.prediction.basis}</small>`;
    summary.classList.remove("hidden");
    loading.classList.add("hidden");
    canvas.style.display = "block";
    const ctx = canvas.getContext("2d");
    priceHistoryChartInstance = new Chart(ctx, {
      type: "line",
      data: { labels, datasets: [{ label: `${region.toUpperCase()} · ${currency}`, data: values, borderColor: "#66c0f4", backgroundColor: "rgba(102,192,244,.14)", fill: true, stepped: true, tension: .15, pointRadius: values.length > 50 ? 0 : 3 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: (context) => new Intl.NumberFormat(state.lang === "vi" ? "vi-VN" : "en-US", { style: "currency", currency }).format(context.parsed.y) } } }, scales: { x: { ticks: { color: "#748196", maxTicksLimit: 10 } }, y: { ticks: { color: "#748196" }, grid: { color: "rgba(42,58,81,.45)" } } } }
    });
  } catch (error) {
    loading.innerHTML = `<div style="color:var(--danger)">${error.message}</div>`;
  }
}

async function renderRealHistoryChart(months = 12) {
  const canvas = document.getElementById("priceHistoryChart");
  const loadingIndicator = document.getElementById("chartLoadingIndicator");
  const note = document.querySelector(".history-note");
  const noteReal = document.querySelector(".history-note-real");
  const noteSimulated = document.querySelector(".history-note-simulated");
  const lowSummary = document.getElementById("historyLowSummary");
  
  canvas.style.display = "none";
  loadingIndicator.innerHTML = `
    <div class="spin-icon" style="display:inline-block;animation:spin 1s linear infinite;margin-bottom:8px">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
      </svg>
    </div>
    <div>${state.lang === "vi" ? "Đang tải dữ liệu thật từ máy chủ..." : "Loading real data from server..."}</div>
  `;
  loadingIndicator.classList.remove("hidden");
  if (note) note.style.display = "none";
  if (noteReal) {
    noteReal.classList.remove("hidden");
    noteReal.textContent = state.lang === "vi" ? "* Dữ liệu gốc bằng USD (từ ITAD) đã được quy đổi sang tỉ giá hiện tại." : "* Original USD data (from ITAD) converted to current exchange rates.";
  }
  if (noteSimulated) noteSimulated.classList.add("hidden");
  lowSummary?.classList.add("hidden");
  
  if (priceHistoryChartInstance) {
    priceHistoryChartInstance.destroy();
  }
  
  try {
    const res = await fetch(`/api/history/${state.currentData.appId}`);
    if (!res.ok) throw new Error("API failed");
    const data = await res.json();
    
    if (!data.history || data.history.length === 0) {
      throw new Error("No data");
    }
    
    // Identify Highest, Lowest, User Region
    const availablePrices = state.currentData.prices.filter(p => p.available && p.convertedValue > 0);
    availablePrices.sort((a, b) => a.convertedValue - b.convertedValue);
    
    const lowest = availablePrices.length > 0 ? availablePrices[0] : null;
    const highest = availablePrices.length > 0 ? availablePrices[availablePrices.length - 1] : null;
    const userRegion = availablePrices.find(p => p.code === "vn") || (availablePrices.length > 1 ? availablePrices[1] : null);

    const getBase = (p) => {
      if (!p) return 0;
      const discount = p.discount || 0;
      return discount > 0 ? p.convertedValue / (1 - discount/100) : p.convertedValue;
    };

    const lowestBase = getBase(lowest);
    const highestBase = getBase(highest);
    const userBase = getBase(userRegion);

    // Process ITAD data
    const historyData = data.history.reverse();
    const now = new Date();
    const cutoff = new Date();
    cutoff.setMonth(now.getMonth() - months);
    
    const labels = [];
    const pointsLowest = [];
    const pointsHighest = [];
    const pointsUser = [];
    
    let lastCut = null;
    let foundBeforeCut = null;

    historyData.forEach(h => {
      const d = new Date(h.timestamp);
      const cut = h.deal.cut || 0;
      
      if (d <= cutoff) {
        foundBeforeCut = cut;
      } else {
        if (labels.length === 0 && foundBeforeCut !== null) {
          labels.push(cutoff.toLocaleDateString(state.lang === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', year: 'numeric', day: 'numeric' }));
          pointsLowest.push(lowestBase * (1 - foundBeforeCut/100));
          pointsHighest.push(highestBase * (1 - foundBeforeCut/100));
          if(userRegion) pointsUser.push(userBase * (1 - foundBeforeCut/100));
        }
        labels.push(d.toLocaleDateString(state.lang === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', year: 'numeric', day: 'numeric' }));
        pointsLowest.push(lowestBase * (1 - cut/100));
        pointsHighest.push(highestBase * (1 - cut/100));
        if(userRegion) pointsUser.push(userBase * (1 - cut/100));
      }
      lastCut = cut;
    });
    
    if (labels.length === 0 && foundBeforeCut !== null) {
      labels.push(cutoff.toLocaleDateString(state.lang === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', year: 'numeric', day: 'numeric' }));
      pointsLowest.push(lowestBase * (1 - foundBeforeCut/100));
      pointsHighest.push(highestBase * (1 - foundBeforeCut/100));
      if(userRegion) pointsUser.push(userBase * (1 - foundBeforeCut/100));
      lastCut = foundBeforeCut;
    }
    
    if (lastCut !== null && labels.length > 0) {
      labels.push(now.toLocaleDateString(state.lang === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', year: 'numeric', day: 'numeric' }));
      pointsLowest.push(lowestBase * (1 - lastCut/100));
      pointsHighest.push(highestBase * (1 - lastCut/100));
      if(userRegion) pointsUser.push(userBase * (1 - lastCut/100));
    }

    const historicalLow = pointsLowest.length ? Math.min(...pointsLowest.filter(Number.isFinite)) : null;
    const historicalLowIndex = Number.isFinite(historicalLow) ? pointsLowest.indexOf(historicalLow) : -1;
    if (lowSummary && historicalLowIndex >= 0) {
      const current = lowest?.convertedValue || 0;
      const atLow = current > 0 && current <= historicalLow * 1.01;
      lowSummary.innerHTML = `<span class="history-low-badge">HISTORICAL LOW</span><span>Thấp nhất trong ${months} tháng · ${labels[historicalLowIndex]}</span><strong>${formatCurrency(historicalLow, state.currency)}${atLow ? " · Nên cân nhắc mua" : ""}</strong>`;
      lowSummary.classList.remove("hidden");
    }
    
    loadingIndicator.classList.add("hidden");
    canvas.style.display = "block";
    
    const ctx = canvas.getContext("2d");
    const isDark = document.body.classList.contains("dark-mode");
    const textColor = isDark ? "#A0AEC0" : "#4A5568";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
    
    const createGradient = (colorRGB) => {
      const g = ctx.createLinearGradient(0, 0, 0, 300);
      g.addColorStop(0, `rgba(${colorRGB}, 0.5)`);
      g.addColorStop(1, `rgba(${colorRGB}, 0.0)`);
      return g;
    };
    
    const datasets = [];
    
    if (highest) {
      datasets.push({
        label: highest.name,
        data: pointsHighest,
        borderColor: '#ef4444', // Red
        backgroundColor: createGradient('239, 68, 68'),
        borderWidth: 2, pointBackgroundColor: '#ef4444', pointBorderColor: isDark ? '#1a202c' : '#fff', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6, fill: true, stepped: true
      });
    }
    
    if (userRegion && userRegion.code !== lowest?.code && userRegion.code !== highest?.code) {
      datasets.push({
        label: userRegion.name,
        data: pointsUser,
        borderColor: '#3b82f6', // Blue
        backgroundColor: createGradient('59, 130, 246'),
        borderWidth: 2, pointBackgroundColor: '#3b82f6', pointBorderColor: isDark ? '#1a202c' : '#fff', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6, fill: true, stepped: true
      });
    }
    
    if (lowest) {
      datasets.push({
        label: lowest.name,
        data: pointsLowest,
        borderColor: '#8b5cf6', // Purple
        backgroundColor: createGradient('139, 92, 246'),
        borderWidth: 2, pointBackgroundColor: '#8b5cf6', pointBorderColor: isDark ? '#1a202c' : '#fff', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6, fill: true, stepped: true
      });
      if (historicalLowIndex >= 0) {
        datasets.push({
          label: state.lang === "vi" ? "Thấp nhất lịch sử" : "Historical Low",
          data: pointsLowest.map((value, index) => index === historicalLowIndex ? value : null),
          borderColor: '#5fd47a',
          backgroundColor: '#5fd47a',
          showLine: false,
          pointStyle: 'star',
          pointRadius: 8,
          pointHoverRadius: 10
        });
      }
    }
    
    priceHistoryChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: textColor, font: { family: "'Inter', sans-serif" } }
          },
          tooltip: {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: isDark ? '#fff' : '#0f172a',
            bodyColor: isDark ? '#cbd5e1' : '#334155',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                return context.dataset.label + ": " + new Intl.NumberFormat(state.lang === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: state.currency }).format(context.parsed.y);
              }
            }
          }
        },
        scales: {
          x: { ticks: { color: textColor } },
          y: { grid: { color: gridColor }, ticks: { color: textColor } }
        }
      }
    });
    
  } catch (err) {
    console.error("Real history ITAD error, falling back to simulated history:", err);
    return renderSimulatedHistoryChart(months);
  }
}

async function renderSimulatedHistoryChart(months = 12) {
  const canvas = document.getElementById("priceHistoryChart");
  const loadingIndicator = document.getElementById("chartLoadingIndicator");
  const noteReal = document.querySelector(".history-note-real");
  const noteSimulated = document.querySelector(".history-note-simulated");
  document.getElementById("historyLowSummary")?.classList.add("hidden");

  if (priceHistoryChartInstance) {
    priceHistoryChartInstance.destroy();
    priceHistoryChartInstance = null;
  }

  loadingIndicator.classList.add("hidden");
  canvas.style.display = "block";
  noteReal?.classList.add("hidden");
  noteSimulated?.classList.remove("hidden");

  try {
    const { buildSimulatedHistorySeries } = await import(
      "./modules/services/history-simulation.js?v=1"
    );
    const simulation = buildSimulatedHistorySeries({
      appId: state.currentData.appId,
      prices: state.currentData.prices,
      months,
      locale: state.lang === "vi" ? "vi-VN" : "en-US"
    });

    if (!simulation.series.length) {
      throw new Error("No prices available for simulation");
    }

    const colors = [
      { line: "#5fd47a", fill: "95, 212, 122" },
      { line: "#3aa8ff", fill: "58, 168, 255" },
      { line: "#ff7285", fill: "255, 114, 133" }
    ];
    const ctx = canvas.getContext("2d");
    const datasets = simulation.series.map((series, index) => {
      const color = colors[index % colors.length];
      const gradient = ctx.createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, `rgba(${color.fill}, 0.32)`);
      gradient.addColorStop(1, `rgba(${color.fill}, 0)`);
      return {
        label: series.label,
        data: series.values,
        borderColor: color.line,
        backgroundColor: gradient,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.25
      };
    });

    priceHistoryChartInstance = new Chart(ctx, {
      type: "line",
      data: { labels: simulation.labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: "#aab5c5", font: { family: "'Inter', sans-serif" } }
          },
          tooltip: {
            callbacks: {
              label(context) {
                const value = new Intl.NumberFormat(
                  state.lang === "vi" ? "vi-VN" : "en-US",
                  { style: "currency", currency: state.currency }
                ).format(context.parsed.y);
                return `${context.dataset.label}: ${value}`;
              }
            }
          }
        },
        scales: {
          x: { ticks: { color: "#748196" }, grid: { color: "rgba(42, 58, 81, 0.45)" } },
          y: { ticks: { color: "#748196" }, grid: { color: "rgba(42, 58, 81, 0.45)" } }
        }
      }
    });
  } catch (error) {
    canvas.style.display = "none";
    loadingIndicator.classList.remove("hidden");
    loadingIndicator.innerHTML = `<div style="color:var(--danger)">${state.lang === "vi" ? "Không đủ dữ liệu giá hiện tại để mô phỏng." : "Not enough current price data to simulate."}</div>`;
    console.error(error);
  }
}

// Start
document.addEventListener("DOMContentLoaded", init);

// --- TRACKER BRIDGE ---
// Called from Compare/Deals views when user clicks "Add to Radar"
function toggleTrackGame(appId, name, image) {
  if (!state.currentData?.steamVerified || Number(state.currentData.appId) !== Number(appId)) {
    showToast(t("err_invalid_appid") || "App ID không tồn tại trên Steam Store.", "error");
    return;
  }
  const repo = window._trackerRepo;
  if (!repo) {
    switchView('tracker');
    return;
  }

  const existing = repo.getByAppId(appId);
  if (existing) {
    repo.remove(existing.id);
    showToast(`Đã xoá ${name} khỏi Radar.`, "info");
  } else {
    repo.create({
      appId: parseInt(appId),
      name: name,
      headerImage: image,
      steamUrl: 'https://store.steampowered.com/app/' + appId,
    });
    showToast(`Đã thêm ${name} vào Radar!`, "success");
  }

  window.dispatchEvent(new CustomEvent('tracker:games-change'));
  updateTrackBtnUI(appId);
}

function renderTrackerDashboard() {
  if (window._trackerPage) window._trackerPage.refresh();
}

// Expose for compatibility
window.toggleTrackGame = toggleTrackGame;

// ==========================================
// 4 REALTIME ADVANCED FEATURES IMPLEMENTATION
// ==========================================

// GLOBAL DELEGATE EVENT LISTENER FOR FEATURE MODALS
document.addEventListener("click", (e) => {
  const budgetBtn = e.target.closest("#openBudgetComboBtn");
  if (budgetBtn) {
    e.preventDefault();
    const modal = document.getElementById("budgetComboModal");
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("show");
      const input = document.getElementById("budgetComboInput");
      if (input && !input.value) input.value = "150000";
      document.getElementById("runBudgetComboBtn")?.click();
    }
    return;
  }

  const coopBtn = e.target.closest("#openCoopWishlistBtn");
  if (coopBtn) {
    e.preventDefault();
    const modal = document.getElementById("coopWishlistModal");
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("show");
    }
    return;
  }

  const realCostBtn = e.target.closest("#openRealCostBtn");
  if (realCostBtn) {
    e.preventDefault();
    const modal = document.getElementById("realCostModal");
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("show");
      const baseInput = document.getElementById("realCostBasePrice");
      if (baseInput) baseInput.dispatchEvent(new Event("input"));
    }
    return;
  }

  if (e.target.closest("#closeBudgetComboModal") || e.target === document.getElementById("budgetComboModal")) {
    const modal = document.getElementById("budgetComboModal");
    if (modal) { modal.classList.add("hidden"); modal.classList.remove("show"); }
  }
  if (e.target.closest("#closeCoopWishlistModal") || e.target === document.getElementById("coopWishlistModal")) {
    const modal = document.getElementById("coopWishlistModal");
    if (modal) { modal.classList.add("hidden"); modal.classList.remove("show"); }
  }
  if (e.target.closest("#closeRealCostModal") || e.target === document.getElementById("realCostModal")) {
    const modal = document.getElementById("realCostModal");
    if (modal) { modal.classList.add("hidden"); modal.classList.remove("show"); }
  }
  if (e.target.closest("#closeEmbedModal") || e.target === document.getElementById("embedModal")) {
    const modal = document.getElementById("embedModal");
    if (modal) { modal.classList.add("hidden"); modal.classList.remove("show"); }
  }
});

// 1. BUDGET COMBO FINDER (Knapsack Subset Sum Algorithm)
function initBudgetComboModal() {
  const modal   = document.getElementById("budgetComboModal");
  const openBtn = document.getElementById("openBudgetComboBtn");
  const closeBtn = document.getElementById("closeBudgetComboModal");
  const runBtn  = document.getElementById("runBudgetComboBtn");
  const input   = document.getElementById("budgetComboInput");
  const results = document.getElementById("budgetComboResults");

  if (!modal) return;

  // ── Preset chips ─────────────────────────────────────────────────────────
  document.getElementById("budgetPresets")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".budget-preset");
    if (!btn) return;
    input.value = btn.dataset.value;
    document.querySelectorAll(".budget-preset").forEach(b => {
      b.style.background = "transparent"; b.style.color = "var(--text-secondary)"; b.style.borderColor = "var(--border)";
    });
    btn.style.background = "rgba(243,156,18,0.15)"; btn.style.color = "#f39c12"; btn.style.borderColor = "#f39c12";
    runBtn?.click();
  });

  openBtn?.addEventListener("click", () => {
    modal.classList.remove("hidden");
    if (input && !input.value) input.value = "150000";
    runBtn?.click();
  });
  closeBtn?.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });

  const genreInput = document.getElementById("budgetComboGenre");
  const genreDropdown = document.getElementById("genreCustomDropdown");
  const clearGenreBtn = document.getElementById("clearGenreBtn");
  const STEAM_TAGS = [
    "Indie","Action","Adventure","Casual","Singleplayer","Simulation","RPG","Strategy","2D","Early Access","3D","Free to Play","Atmospheric","Story Rich","Colorful","Exploration","Fantasy","Multiplayer","Cute","Pixel Graphics","Combat","First-Person","Puzzle","Relaxing","Action-Adventure","Stylized","Funny","Arcade","Controller","Anime","Horror","PvE","Sci-fi","Co-op","Sports","Massively Multiplayer","Third Person","Choices Matter","Violent","Retro","Top-Down","Family Friendly","Shooter","Female Protagonist","Sexual Content","Dark","PvP","Realistic","Racing","Mystery","Linear","Multiple Endings","Open World","Nudity","Online Co-Op","Survival","Character Customization","Comedy","Cartoony","Visual Novel","Physics","Psychological Horror","Gore","Platformer","Magic","Roguelike","2D Platformer","Roguelite","Sandbox","Management","Resource Management","Old School","Tactical","Medieval","FPS","Hand-drawn","Action RPG","Immersive Sim","Turn-Based Combat","Minimalist","Turn-Based Strategy","Crafting","Futuristic","Building","Point & Click","Emotional","Dark Fantasy","Action Roguelike","Cartoon","Procedural Generation","Space","Difficult","3D Platformer","Interactive Fiction","Romance","Choose Your Own Adventure","Nature","Logic","Survival Horror","Turn-Based Tactics","Utilities","Local Multiplayer","Hentai","1990's","Base Building","Surreal","Hack and Slash","Incremental","Dating Sim","Hidden Object","VR","Bullet Hell","Side Scroller","Strategy RPG","Post-apocalyptic","Puzzle Platformer","Education","Walking Simulator","Dungeon Crawler","Lore-Rich","Cinematic","Life Sim","Tabletop","Score Attack","Dialogue Heavy","Inventory Management","Card Game","Text-Based","War","Shoot 'Em Up","Economy","Psychological","Stealth","JRPG","LGBTQ+","Zombies","Great Soundtrack","Idler","1980s","Design & Illustration","Investigation","Local Co-Op","2.5D","Historical","Thriller","Party-Based RPG","Supernatural","Tutorial","Isometric","Deckbuilding","Dark Humor","Nonlinear","Time Management","Turn-Based","Artificial Intelligence","Military","Top-Down Shooter","Replay Value","Third-Person Shooter","Demons","Team-Based","Loot","Aliens","Tactical RPG","Cyberpunk","Collectathon","Detective","Robots","Modern","Software","Dystopian","Real Time Tactics","Perma Death","Abstract","Tower Defense","Driving","CRPG","Board Game","RTS","Precision Platformer","Card Battler","Arena Shooter","Cozy","Souls-like","Comic Book","Psychedelic","Automation","City Builder","Co-op Campaign","Memes","Cats","Capitalism","Mythology","Wargame","Alternate History","Dragons","4 Player Local","Game Development","Creature Collector","Grid-Based Movement","Crime","Short","Level Editor","Destruction","Class-Based","Parkour","Fast-Paced","Flight","Beat 'em up","Moddable","Metroidvania","Animation & Modeling","Runner","Philosophical","Dark Comedy","Music","Trading","2D Fighter","Farming Sim","Cooking","Automobile Sim","Gun Customization","Soundtrack","Party Game","Auto Battler","3D Fighter","Competitive","Rhythm","Fighting","Vehicular Combat","eSports","MMORPG","Quick-Time Events","Noir","Conspiracy","Lovecraftian","Swordplay","Science","Colony Sim","Word Game","Twin Stick Shooter","Satire","Space Sim","Gothic","Parody","Grand Strategy","Mining","Wholesome","Dynamic Narration","Experimental","Looter Shooter","Video Production","Underground","Classic","Battle Royale","Narrative","Audio Production","Mystery Dungeon","Agriculture","6DOF","Bullet Time","Split Screen","World War II","Fishing","Time Manipulation","Roguelike Deckbuilder","Martial Arts","Gambling","Spectacle fighter","Mechs","Beautiful","Match 3","Combat Racing","Hero Shooter","Dogs","Asynchronous Multiplayer","Transportation","Shop Keeper","Immersive","FMV","Action RTS","Voxel","Open World Survival Craft","Ninja","Time Travel","Vampires","Trading Card Game","God Game","Solitaire","Otome","Steampunk","Pirates","Underwater","Boomer Shooter","Hex Grid","Software Training","Hunting","Hacking","Political Sim","Trains","Faith","Tanks","Typing","4X","MOBA","Sokoban","Programming","Assassins","Animals","Superhero","Remake","Party","Diplomacy","Bullet Heaven","Character Action Game","Dinosaurs","Western","Minigames","Photo Editing","Heist","Mouse Only","Cold War","Traditional Roguelike","Job Simulator","Naval","Snow","Transhumanism","Naval Combat","Sailing","Escape Room","Archery","Addictive","Horses","Real-Time","Nostalgia","Farming","Episodic","Music-Based Procedural Generation","Football (Soccer)","Werewolves","Epic","Trivia","Villain Protagonist","Offroad","Sniper","Time Attack","Real-Time with Pause","On-Rails Shooter","Sequel","Spelling","Mars","Outbreak Sim","World War I","Dwarves","Desktop Companion","Boxing","Chess","Spaceships","Touch-Friendly","Mod","Extraction Shooter","Medical Sim","Basketball","Social Deduction","Golf","Submarine","Motorbike","Baseball","Jump Scare","Gaming","Dice","Pinball","Rome","360 Video","Bikes","Elves","Electronic Music","Decorating","Boss Rush","Organizing","Asymmetric VR","Wrestling","Skateboarding","Silent Protagonist","Instrumental Music","Football (American)","Cleaning","Vikings","Mini Golf","Billiards","Wuxia","Skating","Rock Music","Xianxia","Cycling","Cult","Birds","Espionage","Tennis","TrackIR","Motocross","Intentionally Awkward Controls","Mahjong","Samurai","Poker","Foxes","Hockey","Bowling","Based On A Novel","Voice Control","ATV","Falling Blocks","8-bit Music","Hardware","Snowboarding","Skiing","Lemmings","BMX","Musou","Language Learning","Benchmark","Hobby Sim","Capybaras","Wolves","Zoo","Volleyball","Cricket","Rugby","Snooker","Reboot"
  ];
  const selectedGenresContainer = document.getElementById("selectedGenresContainer");
  const selectedGenres = [];

  function renderSelectedGenres() {
    if (!selectedGenresContainer) return;
    selectedGenresContainer.innerHTML = selectedGenres.map(tag => `
      <div style="display:flex;align-items:center;background:rgba(243,156,18,0.15);color:#f39c12;border:1px solid #f39c12;border-radius:6px;padding:2px 6px;font-size:12px;font-weight:600;">
        ${tag}
        <span style="margin-left:4px;cursor:pointer;font-size:14px;line-height:1;" onclick="window.removeBudgetGenre('${tag.replace(/'/g, "\\'")}')">✕</span>
      </div>
    `).join("");
    if (selectedGenres.length > 0) clearGenreBtn?.classList.remove("hidden");
    else if (!genreInput.value) clearGenreBtn?.classList.add("hidden");
  }

  window.removeBudgetGenre = (tag) => {
    const idx = selectedGenres.indexOf(tag);
    if (idx > -1) {
      selectedGenres.splice(idx, 1);
      renderSelectedGenres();
      renderGenreDropdown(genreInput?.value || "");
    }
  };

  function renderGenreDropdown(filter = "") {
    if (!genreDropdown) return;
    const lowerFilter = filter.toLowerCase();
    // Exclude already selected genres
    const availableTags = STEAM_TAGS.filter(t => !selectedGenres.includes(t));
    const matches = availableTags.filter(t => t.toLowerCase().includes(lowerFilter)).slice(0, 50);
    
    if (matches.length === 0) {
      genreDropdown.innerHTML = `<div style="padding:10px 14px;color:var(--text-muted);font-size:13px;text-align:center;">Không tìm thấy thể loại phù hợp</div>`;
    } else {
      genreDropdown.innerHTML = matches.map(tag => `
        <div class="genre-option" data-tag="${tag.replace(/'/g, "&apos;")}" style="padding:10px 14px;border-radius:8px;font-size:13px;color:var(--text-primary);cursor:pointer;transition:all 0.15s;display:flex;align-items:center;"
             onmouseover="this.style.background='var(--surface-hover)';this.style.color='var(--primary)';this.style.transform='translateX(4px)'"
             onmouseout="this.style.background='';this.style.color='var(--text-primary)';this.style.transform=''">
          <span style="font-size:12px;margin-right:8px;opacity:0.6;">▪</span> ${tag}
        </div>
      `).join("");
    }
  }

  genreDropdown?.addEventListener("mousedown", (e) => {
    const opt = e.target.closest(".genre-option");
    if (!opt) return;
    e.preventDefault(); // prevent blur
    const tag = opt.dataset.tag.replace(/&apos;/g, "'");
    if (tag && !selectedGenres.includes(tag)) {
      selectedGenres.push(tag);
      renderSelectedGenres();
    }
    if (genreInput) genreInput.value = "";
    renderGenreDropdown("");
    genreInput?.focus();
  });

  if (genreInput) {
    genreInput.addEventListener("focus", () => {
      renderGenreDropdown(genreInput.value);
      genreDropdown?.classList.remove("hidden");
    });
    genreInput.addEventListener("input", (e) => {
      renderGenreDropdown(e.target.value);
      if (e.target.value || selectedGenres.length > 0) clearGenreBtn?.classList.remove("hidden");
      else clearGenreBtn?.classList.add("hidden");
    });
    genreInput.addEventListener("blur", () => {
      setTimeout(() => genreDropdown?.classList.add("hidden"), 150);
    });
    clearGenreBtn?.addEventListener("click", () => {
      genreInput.value = "";
      selectedGenres.length = 0;
      renderSelectedGenres();
      clearGenreBtn.classList.add("hidden");
      renderGenreDropdown("");
      genreInput.focus();
    });
  }

  runBtn?.addEventListener("click", async () => {
    const budget = Number(input?.value);
    if (!budget || budget <= 0) {
      results.innerHTML = `<div style="color:var(--error);text-align:center;padding:20px;">⚠️ Vui lòng nhập ngân sách hợp lệ.</div>`;
      return;
    }

    // Skeleton loader
    results.innerHTML = `
      <style>
        @keyframes budgetSlideIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
      </style>
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${[1,2,3].map(() => `
          <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:14px;overflow:hidden;padding:16px;">
            <div style="height:14px;width:40%;border-radius:4px;background:linear-gradient(90deg,var(--surface-hover) 25%,var(--border) 50%,var(--surface-hover) 75%);background-size:400px 100%;animation:shimmer 1.4s infinite;margin-bottom:12px;"></div>
            <div style="height:8px;border-radius:4px;background:linear-gradient(90deg,var(--surface-hover) 25%,var(--border) 50%,var(--surface-hover) 75%);background-size:400px 100%;animation:shimmer 1.4s infinite;margin-bottom:14px;"></div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
              ${[1,2,3].map(() => `<div style="height:60px;border-radius:8px;background:linear-gradient(90deg,var(--surface-hover) 25%,var(--border) 50%,var(--surface-hover) 75%);background-size:400px 100%;animation:shimmer 1.4s infinite;"></div>`).join("")}
            </div>
          </div>`).join("")}
      </div>
      <div style="text-align:center;color:var(--text-muted);font-size:12px;margin-top:4px;">⚙️ Đang chạy thuật toán Knapsack...</div>
    `;

    let rawPool = [];
    try {
      if (dealsData) {
        Object.values(dealsData).forEach(cat => {
          if (cat?.items && Array.isArray(cat.items)) rawPool = rawPool.concat(cat.items);
        });
      }
      if (!rawPool.length) {
        const res = await fetch(`/api/deals?cc=${state.region || 'vn'}`);
        const d = await res.json().catch(() => ({}));
        Object.values(d).forEach(cat => {
          if (cat?.items && Array.isArray(cat.items)) rawPool = rawPool.concat(cat.items);
        });
      }
    } catch (e) {}

    // Deduplicate and filter pool
    const discountFilter = document.getElementById("discountFilter")?.value || "discount_only";
    const seen = new Set();
    let pool = rawPool.filter(item => {
      const id = item.id || item.appId;
      const rawPrice = Number(item.final_price || item.finalPrice || (item.price && item.price.final) || 0);
      const price = rawPrice / 100;
      if (!id || seen.has(id) || price <= 0) return false;
      
      const discountPct = item.discount_percent || item.discountPercent || 0;
      if (discountFilter === "discount_only" && discountPct <= 0) return false;
      if (discountFilter === "full_only" && discountPct > 0) return false;
      
      item._calcPrice = price;
      item._discountPct = discountPct;
      seen.add(id);
      return true;
    });

    if (selectedGenres.length > 0 && pool.length > 0) {
      const loadingText = document.querySelector("#budgetComboResults > div:last-child");
      const genresStr = selectedGenres.join(", ");
      if (loadingText) loadingText.innerHTML = `🔄 Đang quét ${selectedGenres.length} thể loại <strong style="color:var(--text-primary)">${genresStr}</strong> cho ${pool.length} game...`;

      const allAppIds = pool.map(item => item.id || item.appId);
      const metadataMap = new Map();

      // Fetch in chunks of 30 to respect Steam/Backend limits
      for (let i = 0; i < allAppIds.length; i += 30) {
        const chunk = allAppIds.slice(i, i + 30);
        try {
          const res = await fetch(`/api/deals/metadata?appids=${chunk.join(",")}`);
          const d = await res.json();
          if (d.items) d.items.forEach(m => metadataMap.set(Number(m.appId), m));
        } catch(e) {}
      }

      pool = pool.filter(item => {
        const appId = Number(item.id || item.appId);
        const meta = metadataMap.get(appId);
        if (!meta || !meta.tags) return false;
        // Game only needs to contain AT LEAST ONE of the selected genres (OR logic)
        return selectedGenres.some(g => 
          meta.tags.some(t => t.toLowerCase().includes(g.toLowerCase()))
        );
      });
      
      if (loadingText) loadingText.innerHTML = `⚙️ Đang chạy thuật toán Knapsack trên ${pool.length} game (thể loại ${genresStr})...`;
    }

    if (pool.length < 2) {
      const filterText = discountFilter === "full_only" ? "nguyên giá" : discountFilter === "discount_only" ? "đang giảm giá" : "nào";
      if (selectedGenres.length > 0) {
        results.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:20px;background:var(--surface-hover);border-radius:12px;border:1px solid var(--border);">Chỉ tìm thấy <strong>${pool.length}</strong> game ${filterText} chứa đủ các thể loại <strong>${selectedGenres.join(", ")}</strong>. (Cần ít nhất 2 game để tạo combo). Thử bớt thể loại nhé!</div>`;
      } else {
        results.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:20px;background:var(--surface-hover);border-radius:12px;border:1px solid var(--border);">Chỉ tìm thấy <strong>${pool.length}</strong> game ${filterText} trong dữ liệu (Cần ít nhất 2 game để tạo combo). Thử đổi bộ lọc nhé!</div>`;
      }
      return;
    }

    // ── Smart Knapsack DFS ───────────────────────────────────────────────────
    const combos = [];
    let iterations = 0;
    const MAX_ITER = 30000; // per run to keep it fast

    function findCombos(currentPool, minPct, maxItems) {
      iterations = 0;
      function dfs(startIdx, cur, curSum) {
        if (++iterations > MAX_ITER || combos.length > 2000) return;
        if (cur.length >= 2 && cur.length <= maxItems && curSum <= budget && curSum >= budget * minPct) {
          combos.push({
            items: [...cur],
            totalPrice: curSum,
            avgDiscount: cur.reduce((s, it) => s + (it._discountPct || 0), 0) / cur.length,
            saved: cur.reduce((s, it) => {
              const orig = Number(it.original_price || it.originalPrice || (it.price && it.price.initial) || 0) / 100;
              return s + Math.max(0, orig - it._calcPrice);
            }, 0)
          });
        }
        if (cur.length >= maxItems) return;
        for (let i = startIdx; i < currentPool.length; i++) {
          if (curSum + currentPool[i]._calcPrice <= budget) {
            cur.push(currentPool[i]);
            dfs(i + 1, cur, curSum + currentPool[i]._calcPrice);
            cur.pop();
          }
        }
      }
      dfs(0, [], 0);
    }

    // Run DFS with different perspectives to maximize diversity
    const poolDesc = [...pool].sort((a, b) => b._calcPrice - a._calcPrice).slice(0, 100);
    const poolAsc = [...pool].sort((a, b) => a._calcPrice - b._calcPrice).slice(0, 100);
    const poolRand = [...pool].sort(() => Math.random() - 0.5).slice(0, 100);

    findCombos(poolDesc, 0.85, 5); // Find tight combos with expensive games
    findCombos(poolAsc, 0.70, 10); // Find massive quantity combos with cheap games
    findCombos(poolRand, 0.75, 6); // Find varied combos

    if (!combos.length) findCombos(poolDesc, 0.60, 4); // Fallback
    if (!combos.length) findCombos(poolDesc, 0.02, 10); // Extreme fallback for very large budgets
    if (!combos.length) findCombos(poolDesc, 0.0, 15); // Ultimate fallback: just find anything that fits


    // Dedup
    const uniqMap = new Map();
    combos.forEach(c => {
      const key = c.items.map(i => i.id || i.appId).sort().join('-');
      if (!uniqMap.has(key)) uniqMap.set(key, c);
    });
    let uniqueCombos = Array.from(uniqMap.values());

    // ── Smart Categorization ──────────────────────────────────────────────────
    const categories = [
      { id: "closest", title: "🎯 Sát Giá Nhất", color: "#f39c12", sortFn: (a, b) => b.totalPrice - a.totalPrice || b.avgDiscount - a.avgDiscount },
      { id: "discount", title: "🔥 Deal Sốc Nhất", color: "#e74c3c", sortFn: (a, b) => b.avgDiscount - a.avgDiscount || b.totalPrice - a.totalPrice },
      { id: "quantity", title: "📦 Số Lượng Áp Đảo", color: "#667eea", sortFn: (a, b) => b.items.length - a.items.length || b.totalPrice - a.totalPrice },
      { id: "saved", title: "💎 Siêu Tiết Kiệm", color: "#27ae60", sortFn: (a, b) => b.saved - a.saved || b.totalPrice - a.totalPrice },
      { id: "balanced", title: "⚖️ Cân Bằng Hoàn Hảo", color: "#9b59b6", sortFn: (a, b) => {
        const fitA = 1 - Math.abs(budget - a.totalPrice) / budget;
        const fitB = 1 - Math.abs(budget - b.totalPrice) / budget;
        const scoreA = fitA * 60 + (a.avgDiscount / 100) * 25 + (a.items.length / 5) * 15;
        const scoreB = fitB * 60 + (b.avgDiscount / 100) * 25 + (b.items.length / 5) * 15;
        return scoreB - scoreA;
      }}
    ];

    const finalCombos = [];
    const usedKeys = new Set();

    categories.forEach(cat => {
      const available = uniqueCombos.filter(c => {
        const key = c.items.map(i => i.id || i.appId).sort().join('-');
        return !usedKeys.has(key);
      });
      if (available.length > 0) {
        available.sort(cat.sortFn);
        const best = available[0];
        best.category = cat;
        finalCombos.push(best);
        usedKeys.add(best.items.map(i => i.id || i.appId).sort().join('-'));
      }
    });

    const topCombos = finalCombos;

    if (!topCombos.length) {
      const filterText = discountFilter === "full_only" ? "nguyên giá" : discountFilter === "discount_only" ? "đang giảm giá" : "";
      
      let explainText = `Ngân sách <strong>${budget.toLocaleString('vi-VN')}đ</strong> chưa đủ (hoặc quá lớn) để khớp với các game ${filterText} hiện có. Thử đổi ngân sách nhé!`;
      
      // Smart explanation
      const sortedPool = [...pool].sort((a, b) => a._calcPrice - b._calcPrice);
      if (sortedPool.length >= 2) {
        const cheapest2Sum = sortedPool[0]._calcPrice + sortedPool[1]._calcPrice;
        if (cheapest2Sum > budget) {
          explainText = `Dữ liệu hiện tại có <strong>${sortedPool.length}</strong> game ${filterText} trùng khớp thể loại.<br>Nhưng 2 game <strong>RẺ NHẤT</strong> là <strong>${sortedPool[0].name}</strong> (${sortedPool[0]._calcPrice.toLocaleString('vi-VN')}đ) và <strong>${sortedPool[1].name}</strong> (${sortedPool[1]._calcPrice.toLocaleString('vi-VN')}đ) cộng lại đã là <strong style="color:var(--error);">${cheapest2Sum.toLocaleString('vi-VN')}đ</strong>, <strong>VƯỢT QUÁ</strong> ngân sách của bạn!`;
        } else {
          explainText = `Dữ liệu hiện tại có <strong>${sortedPool.length}</strong> game ${filterText} trùng khớp thể loại.<br>Tuy nhiên thuật toán Knapsack không thể tìm được tổ hợp 2+ game nào vừa khít với ngân sách <strong>${budget.toLocaleString('vi-VN')}đ</strong> của bạn.`;
        }
      }

      results.innerHTML = `
        <div style="text-align:center;padding:30px;color:var(--text-muted);">
          <div style="font-size:40px;margin-bottom:10px;">🎯</div>
          <div style="font-size:15px;font-weight:600;margin-bottom:6px;">Không tìm được combo khít!</div>
          <div style="font-size:13px;line-height:1.6;background:var(--surface-hover);padding:14px;border-radius:12px;margin-top:12px;display:inline-block;text-align:left;max-width:460px;border:1px solid var(--border);">
            ${explainText}
            <div style="margin-top:10px;font-size:11px;color:var(--text-secondary);border-top:1px dashed var(--border);padding-top:8px;">
              💡 <strong>Xin lưu ý:</strong> Tính năng này chỉ quét các game <i>đang HOT / Featured</i> trên trang chủ Steam (khoảng ~150-200 game), <strong>KHÔNG</strong> quét toàn bộ 100.000+ game của Steam. Việc áp quá nhiều bộ lọc sẽ khiến danh sách không còn game nào.
            </div>
          </div>
        </div>`;
      return;
    }

    // ── Render combos ─────────────────────────────────────────────────────────
    const pctGradient = (pct) => {
      if (pct >= 90) return "linear-gradient(90deg,#27ae60,#2ecc71)";
      if (pct >= 75) return "linear-gradient(90deg,#f39c12,#f1c40f)";
      return "linear-gradient(90deg,#e74c3c,#e67e22)";
    };

    results.innerHTML = `
      <style>
        @keyframes budgetSlideIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
      </style>
      <div style="font-size:12px;color:var(--text-muted);text-align:center;padding:4px 0 8px;">
        🎮 Tìm thấy <strong style="color:var(--text-primary);">${topCombos.length}</strong> lựa chọn đỉnh nhất trong <strong style="color:var(--text-primary);">${uniqueCombos.length}</strong> combo
      </div>
      ${topCombos.map((combo, idx) => {
        const pct = Math.min(100, Math.round((combo.totalPrice / budget) * 100));
        const remaining = budget - combo.totalPrice;

        const gameCards = combo.items.map(item => {
          const appId = item.id || item.appId;
          const img = item.header_image || item.image || item.headerImage || `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
          const disc = item._discountPct;
          return `
            <a href="https://store.steampowered.com/app/${appId}" target="_blank" rel="noopener"
               style="text-decoration:none;background:var(--surface-elevated);border:1px solid var(--border);border-radius:10px;overflow:hidden;display:flex;flex-direction:column;transition:all 0.2s;"
               onmouseover="this.style.transform='translateY(-2px)';this.style.borderColor='rgba(243,156,18,0.4)'"
               onmouseout="this.style.transform='';this.style.borderColor='var(--border)'">
              <div style="position:relative;">
                <img src="${img}" style="width:100%;height:52px;object-fit:cover;display:block;" onerror="this.src='https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg'">
                ${disc > 0 ? `<div style="position:absolute;top:4px;left:4px;background:#e74c3c;color:#fff;font-size:10px;font-weight:800;padding:1px 5px;border-radius:4px;">-${disc}%</div>` : ''}
              </div>
              <div style="padding:6px 8px;">
                <div style="font-size:11px;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${item.name}">${item.name}</div>
                <div style="font-size:11px;font-weight:800;color:#f39c12;margin-top:2px;">${item._calcPrice.toLocaleString('vi-VN')}đ</div>
              </div>
            </a>`;
        }).join("");

        return `
          <div style="flex-shrink:0;background:var(--bg-primary);border:1px solid var(--border);border-radius:14px;overflow:hidden;animation:budgetSlideIn 0.4s ease both;animation-delay:${idx * 70}ms;"
               onmouseover="this.style.borderColor='rgba(243,156,18,0.35)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.35)'"
               onmouseout="this.style.borderColor='var(--border)';this.style.boxShadow=''">

            ${combo.category ? `<div style="background:${combo.category.color};height:4px;"></div>` : ''}

            <!-- Header row -->
            <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:12px 14px 8px;">
              <div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <strong style="color:${combo.category ? combo.category.color : 'var(--text-primary)'};font-size:14px;">${combo.category ? combo.category.title : `Combo #${idx+1}`}</strong>
                  <span style="font-size:11px;color:var(--text-muted);font-weight:600;padding:2px 8px;background:var(--surface-hover);border-radius:12px;">${combo.items.length} Game</span>
                </div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:3px;">
                  Tiết kiệm được <strong style="color:#27ae60;">${Math.round(combo.saved).toLocaleString('vi-VN')}đ</strong> so với giá gốc
                  · Còn thừa <strong style="color:var(--text-secondary);">${Math.max(0,remaining).toLocaleString('vi-VN')}đ</strong>
                </div>
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <div style="font-weight:800;font-size:17px;color:#f39c12;">${combo.totalPrice.toLocaleString('vi-VN')}đ</div>
                <div style="font-size:10px;color:var(--text-muted);">/ ${budget.toLocaleString('vi-VN')}đ</div>
              </div>
            </div>

            <!-- Progress bar -->
            <div style="padding:0 14px 10px;">
              <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-bottom:4px;">
                <span>Độ khít ngân sách</span><span style="font-weight:700;color:var(--text-primary);">${pct}%</span>
              </div>
              <div style="height:7px;background:var(--surface-hover);border-radius:6px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:${pctGradient(pct)};border-radius:6px;transition:width 0.8s ease;"></div>
              </div>
            </div>

            <!-- Game cards grid -->
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;padding:0 14px 12px;">
              ${gameCards}
            </div>

            <!-- Footer actions -->
            <div style="display:flex;gap:8px;padding:10px 14px;background:rgba(255,255,255,0.02);border-top:1px solid var(--border);">
              <button class="combo-share-btn" data-idx="${idx}"
                style="flex:1;background:transparent;border:1px solid var(--border);color:var(--text-secondary);font-size:11px;font-weight:600;padding:7px;border-radius:8px;cursor:pointer;transition:all 0.2s;"
                onmouseover="this.style.borderColor='var(--primary)';this.style.color='var(--primary)'"
                onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-secondary)'">📋 Copy Combo</button>
              <button class="combo-open-all-btn" data-idx="${idx}"
                style="flex:1;background:linear-gradient(135deg,#f39c12,#e74c3c);border:none;color:#fff;font-size:11px;font-weight:700;padding:7px;border-radius:8px;cursor:pointer;transition:opacity 0.2s;"
                onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">🛒 Chốt Combo</button>
            </div>
          </div>`;
      }).join("")}
    `;

    // ── Wire up Copy + Chốt Combo buttons ────────────────────────────────────
    results.querySelectorAll(".combo-share-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        const combo = topCombos[idx];
        const text = `🎯 Combo Khít Ngân Sách ${budget.toLocaleString('vi-VN')}đ:\n` +
          combo.items.map(i => `• ${i.name} — ${i._calcPrice.toLocaleString('vi-VN')}đ${i._discountPct > 0 ? ` (-${i._discountPct}%)` : ''}`).join('\n') +
          `\n💰 Tổng: ${combo.totalPrice.toLocaleString('vi-VN')}đ (${Math.round((combo.totalPrice/budget)*100)}% ngân sách)`;
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = "✅ Đã copy!";
          setTimeout(() => { btn.textContent = "📋 Copy Combo"; }, 2000);
        });
      });
    });

    results.querySelectorAll(".combo-open-all-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        topCombos[idx].items.forEach((item, i) => {
          const appId = item.id || item.appId;
          setTimeout(() => window.open(`https://store.steampowered.com/cart/addtocart/${appId}`, '_blank'), i * 350);
        });
      });
    });
  });
}
// 2. CO-OP WISHLIST MATCHER
function initCoopWishlistModal() {
  const modal = document.getElementById("coopWishlistModal");
  const openBtn = document.getElementById("openCoopWishlistBtn");
  const closeBtn = document.getElementById("closeCoopWishlistModal");
  const runBtn = document.getElementById("runCoopWishlistBtn");
  const input = document.getElementById("coopWishlistInput");
  const results = document.getElementById("coopWishlistResults");
  const sortBar = document.getElementById("coopSortBar");

  if (!modal || !openBtn) return;

  openBtn.addEventListener("click", () => modal.classList.remove("hidden"));
  closeBtn?.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });

  let _lastMatches = [];
  let _lastPlayers = [];
  let _lastStats = {};

  function getSmartScore(m) {
    let score = 0;
    score += (m.matchCount / (m.totalUsers || 1)) * 40;  // 40pts match ratio
    score += Math.min(m.discountPercent, 80) * 0.3;       // up to 24pts for discount
    if (m.isCoop) score += 20;                            // 20pts coop bonus
    if (m.isFree) score += 10;                            // 10pts free
    if (m.priceAmount && m.priceAmount > 0) {
      // Lower price gets more points (relative to 500k VND ceiling)
      score += Math.max(0, 16 - (m.priceAmount / 100000));
    }
    return score;
  }

  function sortMatches(matches, mode) {
    const copy = [...matches];
    switch (mode) {
      case "match":   return copy.sort((a, b) => b.matchCount - a.matchCount);
      case "discount": return copy.sort((a, b) => b.discountPercent - a.discountPercent);
      case "price":   return copy.sort((a, b) => (a.priceAmount || Infinity) - (b.priceAmount || Infinity));
      case "coop":    return copy.sort((a, b) => (b.isCoop ? 1 : 0) - (a.isCoop ? 1 : 0));
      default:        return copy.sort((a, b) => getSmartScore(b) - getSmartScore(a));
    }
  }

  function renderMatches(matches, players, stats) {
    const playerBadges = players && players.length
      ? players.map(p => `
          <div style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.05);padding:4px 10px;border-radius:20px;border:1px solid var(--border);">
            <img src="${p.avatar}" style="width:22px;height:22px;border-radius:50%;border:1px solid var(--border);" onerror="this.style.display='none'">
            <span style="font-size:12px;font-weight:600;color:var(--text-primary);">${p.personaname}</span>
          </div>`).join("")
      : `<span style="font-size:12px;color:var(--text-muted);">${stats.totalAnalyzed} thành viên</span>`;

    // ── review color mapping ──────────────────────────────────────────────────
    const reviewColorMap = {
      "Overwhelmingly Positive": "#1b9e6e", "Very Positive": "#4caf50",
      "Positive": "#8bc34a", "Mostly Positive": "#cddc39",
      "Mixed": "#ff9800", "Mostly Negative": "#ff5722",
      "Negative": "#f44336", "Very Negative": "#b71c1c",
      "Overwhelmingly Negative": "#7b0000"
    };

    const matchCards = matches.map((m, idx) => {
      const priceVND = m.priceAmount ? m.priceAmount / 100 : null;
      const origVND  = m.priceOriginal ? m.priceOriginal / 100 : null;
      const score = Math.round(getSmartScore(m));
      const scoreColor = score >= 60 ? '#27ae60' : score >= 40 ? '#f39c12' : '#888';
      const displayPrice = m.isFree ? '<span style="color:#27ae60;">Miễn Phí</span>'
        : priceVND ? `<span style="font-weight:800;font-size:16px;color:var(--success);">${priceVND.toLocaleString('vi-VN')}đ</span>${origVND && origVND > priceVND ? `<del style="font-size:12px;color:var(--text-muted);margin-left:6px;">${origVND.toLocaleString('vi-VN')}đ</del>` : ''}`
        : '<span style="color:var(--text-muted);">Chưa có giá</span>';
      const totalBill = priceVND && m.matchCount ? (priceVND * m.matchCount).toLocaleString('vi-VN') + 'đ' : null;
      const reviewColor = reviewColorMap[m.reviewDesc] || '#888';
      const wanterAvatars = (m.wanters || []).map(p =>
        `<img src="${p.avatar}" title="${p.personaname}" style="width:18px;height:18px;border-radius:50%;border:1.5px solid var(--border);" onerror="this.style.display='none'">`
      ).join("");
      const genrePills = (m.genres || []).map(g =>
        `<span style="font-size:9px;color:var(--text-muted);padding:1px 6px;border:1px solid var(--border);border-radius:8px;">${g}</span>`
      ).join("");

      return `
        <div style="flex-shrink:0;background:var(--bg-primary);border:1px solid var(--border);border-radius:14px;overflow:hidden;transition:transform 0.2s,box-shadow 0.2s;animation:slideInUp 0.4s ease both;animation-delay:${idx * 60}ms;"
             onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 28px rgba(0,0,0,0.5)';this.style.borderColor='rgba(102,126,234,0.4)'"
             onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor='var(--border)'">

          ${idx === 0 ? `<div style="background:linear-gradient(90deg,#667eea,#764ba2);height:3px;"></div>` : ''}

          <div style="display:flex;gap:0;">
            <a href="https://store.steampowered.com/app/${m.appId}" target="_blank" rel="noopener" style="text-decoration:none;flex-shrink:0;position:relative;">
              <img src="${m.banner}" style="width:150px;height:70px;object-fit:cover;display:block;"
                   onerror="this.src='https://cdn.akamai.steamstatic.com/steam/apps/${m.appId}/header.jpg'">
              ${m.discountPercent > 0 ? `<div style="position:absolute;bottom:4px;left:4px;background:#e74c3c;color:#fff;font-size:11px;font-weight:800;padding:1px 6px;border-radius:4px;">-${m.discountPercent}%</div>` : ''}
            </a>

            <div style="flex:1;padding:10px 12px;min-width:0;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-bottom:5px;">
                <a href="https://store.steampowered.com/app/${m.appId}" target="_blank" rel="noopener"
                   style="text-decoration:none;font-weight:700;font-size:14px;color:var(--text-primary);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px;"
                   title="${m.name}">${m.name}</a>
                <div style="flex-shrink:0;text-align:center;background:rgba(0,0,0,0.4);border-radius:8px;padding:2px 7px;border:1px solid ${scoreColor}50;min-width:42px;">
                  <div style="font-size:14px;font-weight:800;color:${scoreColor};">${score}</div>
                  <div style="font-size:8px;color:var(--text-muted);letter-spacing:0.5px;">SCORE</div>
                </div>
              </div>

              <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;">
                <span style="font-size:10px;background:var(--primary-soft);color:var(--primary);padding:2px 7px;border-radius:10px;font-weight:700;">👥 ${m.matchCount}/${m.totalUsers}</span>
                ${m.isCoop ? `<span style="font-size:10px;background:#27ae6018;color:#27ae60;padding:2px 7px;border-radius:10px;font-weight:700;border:1px solid #27ae6030;">🎮 Co-op</span>` : ''}
                ${idx === 0 ? `<span style="font-size:10px;background:linear-gradient(135deg,#f39c12,#e67e22);color:#fff;padding:2px 7px;border-radius:10px;font-weight:700;">⭐ #1</span>` : ''}
                ${m.reviewDesc ? `<span style="font-size:10px;color:${reviewColor};font-weight:600;" title="${m.reviewTotal ? m.reviewTotal.toLocaleString() + ' đánh giá' : ''}">● ${m.reviewDesc}</span>` : ''}
                ${genrePills}
                ${wanterAvatars ? `<div style="display:flex;gap:2px;align-items:center;margin-left:2px;">${wanterAvatars}</div>` : ''}
              </div>
            </div>
          </div>

          ${m.shortDesc ? `<div style="padding:6px 12px;font-size:11px;color:var(--text-muted);line-height:1.5;border-top:1px solid var(--border);background:rgba(0,0,0,0.1);">${m.shortDesc}</div>` : ''}

          <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:rgba(255,255,255,0.02);border-top:1px solid var(--border);">
            <div>
              ${displayPrice}
              ${totalBill ? `<div style="font-size:10px;color:var(--text-muted);margin-top:1px;">Tổng nhóm: <strong style="color:var(--text-secondary);">${totalBill}</strong></div>` : ''}
            </div>
            <div style="display:flex;gap:6px;">
              <a href="https://store.steampowered.com/app/${m.appId}" target="_blank" rel="noopener"
                 style="text-decoration:none;font-size:11px;padding:5px 10px;border-radius:7px;border:1px solid var(--border);color:var(--text-secondary);background:transparent;transition:all 0.2s;"
                 onmouseover="this.style.borderColor='var(--primary)';this.style.color='var(--primary)'"
                 onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-secondary)'">Chi tiết</a>
              <a href="https://store.steampowered.com/cart/addtocart/${m.appId}" target="_blank" rel="noopener"
                 style="text-decoration:none;background:linear-gradient(135deg,#1b2838,#2a475e);color:#c7d5e0;font-size:12px;font-weight:700;padding:5px 14px;border-radius:7px;border:1px solid #4b6a88;transition:all 0.2s;"
                 onmouseover="this.style.color='#fff';this.style.borderColor='#76a2c8'"
                 onmouseout="this.style.color='#c7d5e0';this.style.borderColor='#4b6a88'">🛒 Chốt</a>
            </div>
          </div>
        </div>`;
    }).join("");

    // Summary stats bar
    const coopCount = matches.filter(m => m.isCoop).length;
    const onSaleCount = matches.filter(m => m.discountPercent > 0).length;
    const totalGroupBill = matches.reduce((acc, m) => acc + (m.priceAmount ? m.priceAmount / 100 * m.matchCount : 0), 0);

    // "Chốt tất" URLs for top 5
    const topBuyLinks = matches.slice(0, 5).filter(m => m.priceAmount || m.isFree)
      .map(m => `https://store.steampowered.com/app/${m.appId}`);
    const shareSummary = `🎮 Party Game Finder\nTìm thấy ${matches.length} game trùng:\n` +
      matches.slice(0, 5).map((m, i) => `${i+1}. ${m.name} — ${m.priceAmount ? (m.priceAmount/100).toLocaleString('vi-VN')+'đ' : 'Miễn phí'}${m.discountPercent > 0 ? ` (-${m.discountPercent}%)` : ''}`).join('\n');

    results.innerHTML = `
      <!-- ── CSS for entrance animation ── -->
      <style>
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      </style>

      <!-- Player team bar -->
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;background:rgba(102,126,234,0.07);border:1px solid rgba(102,126,234,0.18);border-radius:12px;">
        <span style="font-size:11px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Tổ Đội</span>
        ${playerBadges}
      </div>

      <!-- Stats bar (4 cells) -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
        <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center;">
          <div style="font-size:20px;font-weight:800;color:var(--primary);">${matches.length}</div>
          <div style="font-size:10px;color:var(--text-muted);">Game trùng</div>
        </div>
        <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center;">
          <div style="font-size:20px;font-weight:800;color:#27ae60;">${coopCount}</div>
          <div style="font-size:10px;color:var(--text-muted);">Co-op</div>
        </div>
        <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center;">
          <div style="font-size:20px;font-weight:800;color:#e74c3c;">${onSaleCount}</div>
          <div style="font-size:10px;color:var(--text-muted);">Đang Sale</div>
        </div>
        <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center;">
          <div style="font-size:16px;font-weight:800;color:#f39c12;">${totalGroupBill > 0 ? Math.round(totalGroupBill / 1000) + 'K' : '--'}</div>
          <div style="font-size:10px;color:var(--text-muted);">Tổng bill (đ)</div>
        </div>
      </div>

      <!-- Action bar: share + chot tat -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="coopShareBtn"
          style="flex:1;background:transparent;border:1px solid var(--border);color:var(--text-secondary);font-size:12px;font-weight:600;padding:8px;border-radius:8px;cursor:pointer;transition:all 0.2s;"
          onmouseover="this.style.borderColor='var(--primary)';this.style.color='var(--primary)'"
          onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-secondary)'">📋 Chia sẻ kết quả</button>
        ${topBuyLinks.length ? `<button id="coopChotTatBtn"
          style="flex:1;background:linear-gradient(135deg,#667eea,#764ba2);border:none;color:#fff;font-size:12px;font-weight:700;padding:8px;border-radius:8px;cursor:pointer;transition:opacity 0.2s;"
          onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">🎯 Chốt Tất (Top ${topBuyLinks.length})</button>` : ''}
      </div>

      <!-- Game cards -->
      ${matchCards}
    `;

    // Wire up action buttons AFTER innerHTML is set
    const shareBtn = results.querySelector('#coopShareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(shareSummary).then(() => {
          shareBtn.textContent = '✅ Đã copy!';
          setTimeout(() => { shareBtn.textContent = '📋 Chia sẻ kết quả'; }, 2000);
        }).catch(() => {
          shareBtn.textContent = '❌ Lỗi copy';
          setTimeout(() => { shareBtn.textContent = '📋 Chia sẻ kết quả'; }, 2000);
        });
      });
    }

    const chotTatBtn = results.querySelector('#coopChotTatBtn');
    if (chotTatBtn) {
      chotTatBtn.addEventListener('click', () => {
        topBuyLinks.forEach((url, i) => setTimeout(() => window.open(url, '_blank'), i * 350));
      });
    }
  }

  // Sort bar interaction
  sortBar?.addEventListener("click", (e) => {
    const btn = e.target.closest(".coop-sort-btn");
    if (!btn || !_lastMatches.length) return;
    sortBar.querySelectorAll(".coop-sort-btn").forEach(b => {
      b.style.background = "transparent";
      b.style.color = "var(--text-secondary)";
      b.style.borderColor = "var(--border)";
    });
    btn.style.background = "var(--primary-soft)";
    btn.style.color = "var(--primary)";
    btn.style.borderColor = "var(--primary)";
    const sorted = sortMatches(_lastMatches, btn.dataset.sort);
    const cardContainer = results.querySelector("div:last-of-type");
    if (cardContainer) {
      const rerendered = sortMatches(_lastMatches, btn.dataset.sort).map((m, idx) => {
        // Re-render just the cards section
        return "";
      });
    }
    renderMatches(sortMatches(_lastMatches, btn.dataset.sort), _lastPlayers, _lastStats);
  });

  runBtn?.addEventListener("click", async () => {
    const rawVal = input?.value || "";
    if (!rawVal.trim()) {
      results.innerHTML = `<div style="color:var(--error);text-align:center;padding:20px;">⚠️ Vui lòng nhập ít nhất 2 Steam ID hoặc link profile.</div>`;
      return;
    }

    // Skeleton loader
    results.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;animation:pulse 1.5s ease-in-out infinite;">
        ${[1,2,3].map(() => `
          <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:14px;overflow:hidden;height:130px;">
            <div style="display:flex;gap:0;">
              <div style="width:140px;height:65px;background:var(--surface-hover);"></div>
              <div style="flex:1;padding:10px 14px;display:flex;flex-direction:column;gap:8px;">
                <div style="height:14px;background:var(--surface-hover);border-radius:4px;width:60%;"></div>
                <div style="height:10px;background:var(--surface-hover);border-radius:4px;width:40%;"></div>
              </div>
            </div>
            <div style="height:45px;background:rgba(255,255,255,0.02);border-top:1px solid var(--border);"></div>
          </div>
        `).join("")}
      </div>
      <div style="text-align:center;color:var(--text-muted);font-size:13px;margin-top:8px;">🔄 Đang quét Wishlist realtime từ Steam API...</div>
    `;
    if (sortBar) sortBar.style.display = "none";

    try {
      const res = await fetch(`/api/wishlist/compare?steamIds=${encodeURIComponent(rawVal)}`);
      const data = await res.json();

      if (!res.ok) {
        let errHtml = `<div style="color:var(--error);text-align:center;padding:16px;background:rgba(231,76,60,0.1);border-radius:10px;border:1px solid rgba(231,76,60,0.3);">❌ ${data.error || "Không thể so sánh Wishlist"}</div>`;
        if (data.details && data.details.length) {
          errHtml += `<div style="font-size:12px;color:var(--text-muted);margin-top:8px;background:var(--bg-primary);padding:10px;border-radius:8px;">`;
          data.details.forEach(d => {
            errHtml += `<div style="padding:4px 0;border-bottom:1px solid var(--border);">• <strong style="color:var(--primary)">${d.steamId}</strong>: ${d.error}</div>`;
          });
          errHtml += `</div>`;
        }
        results.innerHTML = errHtml;
        return;
      }

      if (!data.matches || !data.matches.length) {
        results.innerHTML = `
          <div style="text-align:center;padding:30px;color:var(--text-muted);">
            <div style="font-size:40px;margin-bottom:10px;">🎯</div>
            <div style="font-size:15px;font-weight:600;margin-bottom:6px;">Không tìm thấy game trùng nhau!</div>
            <div style="font-size:13px;">Mọi người có Wishlist khác nhau hoàn toàn. Hãy thêm game yêu thích vào Wishlist rồi thử lại!</div>
          </div>`;
        return;
      }

      _lastMatches = sortMatches(data.matches, "smart");
      _lastPlayers = data.players || [];
      _lastStats = { totalAnalyzed: data.totalAnalyzed };

      if (sortBar) sortBar.style.display = "flex";
      renderMatches(_lastMatches, _lastPlayers, _lastStats);

    } catch (err) {
      results.innerHTML = `<div style="color:var(--error);text-align:center;padding:16px;">⚠️ ${err.message}</div>`;
    }
  });
}


// 3. REAL-COST SAVINGS CALCULATOR
function initRealCostModal() {
  const modal = document.getElementById("realCostModal");
  const openBtn = document.getElementById("openRealCostBtn");
  const closeBtn = document.getElementById("closeRealCostModal");
  const baseInput = document.getElementById("realCostBasePrice");
  const bankFeeInput = document.getElementById("realCostBankFeePct");
  const fixedFeeInput = document.getElementById("realCostFixedFee");
  const fxBufferInput = document.getElementById("realCostFxBuffer");
  const results = document.getElementById("realCostResults");

  if (!modal || !openBtn) return;

  function calculate() {
    const base = Number(baseInput?.value || 0);
    const feePct = Number(bankFeeInput?.value || 0);
    const fixedFee = Number(fixedFeeInput?.value || 0);
    const bufferPct = Number(fxBufferInput?.value || 0);

    if (base <= 0) {
      results.innerHTML = `<div style="color:var(--text-muted); text-align:center;">Vui lòng nhập giá niêm yết hợp lệ.</div>`;
      return;
    }

    const feeAmount = base * (feePct / 100);
    const bufferAmount = base * (bufferPct / 100);
    const realTotal = base + feeAmount + fixedFee + bufferAmount;
    const extraTotal = feeAmount + fixedFee + bufferAmount;

    results.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-size:13px; color:var(--text-secondary);">Giá niêm yết ban đầu:</span>
        <strong style="font-size:14px; color:var(--text-primary);">${base.toLocaleString("vi-VN")}₫</strong>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font-size:12px; color:var(--text-muted);">
        <span>+ Phí thẻ quốc tế (${feePct}%):</span>
        <span>+${Math.round(feeAmount).toLocaleString("vi-VN")}₫</span>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font-size:12px; color:var(--text-muted);">
        <span>+ Phí cố định ngân hàng:</span>
        <span>+${fixedFee.toLocaleString("vi-VN")}₫</span>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; font-size:12px; color:var(--text-muted);">
        <span>+ Dự phòng biến động tỷ giá (${bufferPct}%):</span>
        <span>+${Math.round(bufferAmount).toLocaleString("vi-VN")}₫</span>
      </div>
      <div style="border-top:1px dashed var(--border); padding-top:12px; display:flex; justify-content:space-between; align-items:center;">
        <strong style="font-size:15px; color:#f59e0b;">TỔNG THỰC TRẢ TÍNH TOÁN:</strong>
        <strong style="font-size:18px; color:var(--primary);">${Math.round(realTotal).toLocaleString("vi-VN")}₫</strong>
      </div>
      <div style="font-size:11px; color:var(--text-muted); margin-top:8px; text-align:right;">
        (Phụ phí phát sinh ước tính: +${Math.round(extraTotal).toLocaleString("vi-VN")}₫)
      </div>
    `;
  }

  openBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
    calculate();
  });
  closeBtn?.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });

  [baseInput, bankFeeInput, fixedFeeInput, fxBufferInput].forEach(el => {
    el?.addEventListener("input", calculate);
  });
}

// 4. EMBED WIDGET MODAL & CODE GENERATOR
function initEmbedModal() {
  const modal = document.getElementById("embedModal");
  const closeBtn = document.getElementById("closeEmbedModal");
  const copyBtn = document.getElementById("copyEmbedCodeBtn");
  const textarea = document.getElementById("embedCodeSnippet");

  if (!modal) return;

  closeBtn?.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });

  copyBtn?.addEventListener("click", () => {
    if (!textarea?.value) return;
    navigator.clipboard.writeText(textarea.value);
    showToast("Đã copy mã nhúng widget vào bộ nhớ tạm!", "success");
  });
}

function openEmbedWidgetModal(appId) {
  const targetId = appId || state.currentData?.appId;
  const modal = document.getElementById("embedModal");
  const textarea = document.getElementById("embedCodeSnippet");

  if (!targetId || !modal || !textarea) return;

  const origin = window.location.origin;
  textarea.value = `<iframe src="${origin}/embed/${targetId}" width="100%" height="90" frameborder="0" loading="lazy" title="Steam Regional Price Embed"></iframe>`;
  modal.classList.remove("hidden");
}
window.openEmbedWidgetModal = openEmbedWidgetModal;

// SMART BUNDLE & DLC SAVINGS ANALYZER
function setupGameExtraTools(appId) {
  const targetId = appId || state.currentData?.appId;
  const bundleResult = document.getElementById("bundleSavingsResult");
  if (!bundleResult || !targetId) return;
  fetchBundleData(targetId);

  async function fetchBundleData(id) {
    bundleResult.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;color:var(--text-muted);padding:8px 0;">
        <span style="font-size:18px;animation:spin 1s linear infinite;display:inline-block;">⚙️</span>
        <span>Đang phân tích Bundle & DLC từ Steam Store...</span>
      </div>`;
    try {
      const res = await fetch(`/api/bundle/savings/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi API");

      const s = data.summary || {};
      const pkgs = data.packages || [];
      const dlcs = data.dlcs || [];
      const paidDlcs = dlcs.filter(d => d.price && !d.isFree);
      const freeDlcs = dlcs.filter(d => d.isFree || !d.price);

      // ---- HEADER: game + counts ----
      let html = `
        <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;">
          ${data.headerImage ? `<img src="${data.headerImage}" style="width:80px;border-radius:6px;flex-shrink:0;" loading="lazy">` : ''}
          <div>
            <div style="font-weight:700;font-size:14px;color:var(--text-primary);margin-bottom:4px;">${data.name || ''}</div>
            <div style="font-size:11px;color:var(--text-muted);display:flex;gap:10px;flex-wrap:wrap;">
              ${data.gamePrice ? `<span>🎮 Base: <b>${data.gamePrice.formatted}</b>${data.gamePrice.discountPct > 0 ? ` <span style="color:#22c55e;">-${data.gamePrice.discountPct}%</span>` : ''}</span>` : ''}
              <span>📦 ${data.packagesCount} gói Package</span>
              <span>🧩 ${data.dlcCount} DLC${data.dlcFetched < data.dlcCount ? ` (hiển thị ${data.dlcFetched})` : ''}</span>
            </div>
          </div>
        </div>`;

      // ---- SAVINGS BANNER ----
      if (s.savingsPct > 0 && s.savingsFormatted) {
        html += `
          <div style="background:linear-gradient(135deg,#16a34a22,#16a34a11);border:1px solid #22c55e55;border-radius:8px;padding:12px 14px;margin-bottom:12px;">
            <div style="font-size:13px;font-weight:700;color:#22c55e;margin-bottom:6px;">
              💰 Tiết kiệm ${s.savingsPct}% khi mua Bundle!
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;">
              <div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px;text-align:center;">
                <div style="color:var(--text-muted);font-size:10px;margin-bottom:2px;">Mua lẻ tất cả</div>
                <div style="font-weight:700;color:#ef4444;font-size:14px;text-decoration:line-through;">${s.buyAllSeparateFormatted}</div>
              </div>
              <div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:8px;text-align:center;">
                <div style="color:var(--text-muted);font-size:10px;margin-bottom:2px;">Mua Bundle tốt nhất</div>
                <div style="font-weight:700;color:#22c55e;font-size:14px;">${s.bestBundlePriceFormatted}</div>
              </div>
            </div>
            <div style="text-align:center;margin-top:8px;font-size:12px;color:var(--text-muted);">
              Tiết kiệm được: <b style="color:#22c55e;">${s.savingsFormatted}</b>
            </div>
          </div>`;
      } else if (s.buyAllSeparateFormatted && !s.bestBundlePriceFormatted) {
        html += `<div style="font-size:12px;color:var(--text-muted);padding:8px;background:var(--bg-primary);border-radius:6px;margin-bottom:12px;">
          ℹ️ Game này không có gói Bundle tích hợp. Mua lẻ từng DLC.
          ${s.dlcTotalFormatted ? `Tổng DLC: <b>${s.dlcTotalFormatted}</b>` : ''}
        </div>`;
      }

      // ---- PACKAGE OPTIONS ----
      if (pkgs.length) {
        html += `<div style="margin-bottom:12px;">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">📦 Các gói mua có sẵn</div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            ${pkgs.map(p => `
              <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-primary);border:1px solid var(--border);border-radius:6px;padding:8px 12px;">
                <span style="font-size:12px;font-weight:500;color:var(--text-primary);">${p.optionText || 'Gói đơn lẻ'}</span>
                <div style="display:flex;align-items:center;gap:8px;">
                  ${p.discountPercent > 0 ? `<span style="background:#22c55e;color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;">-${p.discountPercent}%</span>` : ''}
                  <span style="font-weight:700;font-size:13px;color:${p.discountPercent > 0 ? '#22c55e' : 'var(--text-primary)'};">${p.formattedPrice || '—'}</span>
                </div>
              </div>`).join('')}
          </div>
        </div>`;
      }

      // ---- DLC LIST ----
      if (paidDlcs.length) {
        html += `<div style="margin-bottom:10px;">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">
            🧩 ${paidDlcs.length} DLC trả phí${s.dlcTotalFormatted ? ` — tổng <b style="color:var(--text-primary);">${s.dlcTotalFormatted}</b>` : ''}
          </div>
          <div style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:3px;">
            ${paidDlcs.map(d => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:var(--bg-primary);border-radius:5px;font-size:11px;">
                <span style="color:var(--text-primary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:8px;">${d.name}</span>
                <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                  ${d.price.discountPct > 0 ? `
                    <span style="color:var(--text-muted);text-decoration:line-through;font-size:10px;">${d.price.originalFormatted}</span>
                    <span style="background:#22c55e;color:#fff;font-size:9px;padding:1px 4px;border-radius:3px;font-weight:700;">-${d.price.discountPct}%</span>
                    <span style="font-weight:700;color:#22c55e;">${d.price.formatted}</span>
                  ` : `<span style="font-weight:600;color:var(--text-primary);">${d.price.formatted}</span>`}
                </div>
              </div>`).join('')}
          </div>
        </div>`;
      }

      if (freeDlcs.length) {
        html += `<div style="font-size:11px;color:var(--text-muted);margin-top:4px;">🎁 ${freeDlcs.length} DLC miễn phí đi kèm (${freeDlcs.map(d=>d.name).slice(0,3).join(', ')}${freeDlcs.length > 3 ? '...' : ''})</div>`;
      }

      if (!pkgs.length && !dlcs.length) {
        html += `<div style="text-align:center;color:var(--text-muted);padding:16px;font-size:13px;">
          😔 Game này chưa có Bundle hay DLC nào trên Steam.
        </div>`;
      }

      bundleResult.innerHTML = html;
    } catch (e) {
      bundleResult.innerHTML = `<div style="color:var(--text-muted);font-size:12px;padding:8px;">
        ⚠️ Không thể tải dữ liệu Bundle & DLC: ${e.message}
      </div>`;
    }
  }
}

// GAME HELPER MODAL: PC Specs & Bundle Savings (separate dedicated modal)
function initGameHelperModal() {
  const openBtn = document.getElementById("openGameHelperBtn");
  const modal = document.getElementById("gameHelperModal");
  const closeBtn = document.getElementById("closeGameHelperModal");

  if (!openBtn || !modal) return;

  openBtn.addEventListener("click", () => {
    const appId = state.currentData?.appId;
    if (!appId) return;
    // Show modal
    modal.classList.remove("hidden");
    modal.style.display = "flex";
    // Wire up tools for this specific game
    setupGameExtraTools(appId);
  });

  closeBtn?.addEventListener("click", () => {
    modal.classList.add("hidden");
    modal.style.display = "none";
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
      modal.style.display = "none";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      modal.classList.add("hidden");
      modal.style.display = "none";
    }
  });
}
