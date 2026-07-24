export function renderEmptyState(type = 'empty') {
  if (type === 'no-results') {
    return `
      <section class="tp-state tp-state-no-results" aria-labelledby="tpNoResultsTitle">
        <div class="tp-state-mark" aria-hidden="true">⌕</div>
        <h2 id="tpNoResultsTitle">Không tìm thấy game phù hợp</h2>
        <p>Hãy thử đổi từ khóa hoặc bỏ bớt bộ lọc.</p>
        <button type="button" class="tp-state-primary" data-action="reset-filters">Xóa bộ lọc</button>
      </section>
    `;
  }

  return `
    <section class="tp-state tp-state-empty" aria-labelledby="tpEmptyTitle">
      <div class="tp-empty-illustration" aria-hidden="true">
        <span class="tp-empty-disc"></span>
        <span class="tp-empty-line is-one"></span>
        <span class="tp-empty-line is-two"></span>
        <span class="tp-empty-dot"></span>
      </div>
      <p class="tp-eyebrow">DANH SÁCH CỦA BẠN</p>
      <h2 id="tpEmptyTitle">Bắt đầu danh sách theo dõi giá</h2>
      <p>Lưu game, đặt mức giá mong muốn và kiểm tra giá Steam theo nhiều khu vực.</p>
      <div class="tp-state-actions">
        <button type="button" class="tp-state-primary" data-action="add">Thêm game đầu tiên</button>
        <button type="button" class="tp-state-secondary" data-action="open-deals">Khám phá game đang giảm</button>
      </div>
      <ol class="tp-empty-steps">
        <li><span>1</span><strong>Chọn game</strong><small>Tìm bằng tên, App ID hoặc URL.</small></li>
        <li><span>2</span><strong>Đặt giá mục tiêu</strong><small>Chọn vùng và mức giá bạn muốn.</small></li>
        <li><span>3</span><strong>Kiểm tra khi quay lại</strong><small>Giá mới được lưu ngay trên thiết bị.</small></li>
      </ol>
    </section>
  `;
}

export default renderEmptyState;
