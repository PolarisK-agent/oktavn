const state = {
  data: null,
  filteredDirectory: []
};

const selectors = {
  fallbackBanner: document.getElementById('fallback-banner'),
  ticker: document.getElementById('ticker-grid'),
  kotraNews: document.getElementById('kotra-news'),
  localNews: document.getElementById('local-news'),
  events: document.getElementById('events-list'),
  trends: document.getElementById('trend-list'),
  dailyReport: document.getElementById('daily-report'),
  directory: document.getElementById('directory-body'),
  directorySearch: document.getElementById('directory-search'),
  opsMode: document.getElementById('ops-mode'),
  opsSnapshot: document.getElementById('ops-snapshot'),
  opsLinkHealth: document.getElementById('ops-link-health'),
  modeButtons: Array.from(document.querySelectorAll('.mode-btn'))
};

function trendClass(trend) {
  return trend === 'up' ? 'is-up' : 'is-down';
}

function safeText(value, fallback = '-') {
  if (value === undefined || value === null || value === '') return fallback;
  return escapeHtml(String(value));
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeUrl(value) {
  if (!value) return null;
  try {
    const parsed = new URL(String(value));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function safeEmail(value) {
  const email = String(value || '').trim();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : '';
}

function formatSnapshot(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(String(value));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function extractKeywords(url) {
  try {
    const parsed = new URL(url);
    const q = parsed.searchParams.get('q');
    if (!q) return [];
    return q
      .split(/[,+]/)
      .map((word) => word.trim())
      .filter(Boolean)
      .slice(0, 3);
  } catch {
    return [];
  }
}

function renderMeta(meta) {
  const mode = safeText((meta && meta.mode) || 'snapshot');
  const snapshot = formatSnapshot(meta && meta.snapshotAt);
  const audit = (meta && meta.linkAudit) || {};
  const healthy = Number(audit.healthy || 0);
  const total = Number(audit.total || 0);
  const ratio = total > 0 ? `${healthy}/${total}` : '-';

  selectors.opsMode.textContent = mode.replaceAll('-', ' ');
  selectors.opsSnapshot.textContent = snapshot;
  selectors.opsLinkHealth.textContent = ratio;
}

function renderTicker(items) {
  selectors.ticker.innerHTML = items
    .map((item) => {
      const href = safeUrl(item.sourceUrl);
      const body = `
        <p class="kpi-label">${safeText(item.label)}</p>
        <p class="kpi-value">${safeText(item.value)}</p>
        <p class="kpi-change ${trendClass(item.trend)}">${safeText(item.change)}</p>
      `;

      if (!href) {
        return `<div class="kpi-card is-disabled" aria-disabled="true">${body}</div>`;
      }

      return `
      <a class="kpi-card" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${safeText(item.label)} 원문 소스 보기">
        ${body}
      </a>
    `;
    })
    .join('');
}

function renderNews(target, list) {
  target.innerHTML = list
    .map((item) => {
      const href = safeUrl(item.sourceUrl);
      const title = safeText(item.title);
      const summary = safeText(item.summary);

      if (!href) {
        return `
      <li class="news-item is-disabled" aria-disabled="true">
        <div class="news-link">
          <h4>${title}</h4>
          <p>${summary}</p>
        </div>
        <div class="news-meta">
          <span>${safeText(item.source)}</span>
          <time>${safeText(item.publishedAt)}</time>
        </div>
      </li>
    `;
      }

      return `
      <li class="news-item">
        <a class="news-link" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="뉴스 원문 보기">
          <h4>${title}</h4>
          <p>${summary}</p>
        </a>
        <div class="news-meta">
          <span>${safeText(item.source)}</span>
          <time>${safeText(item.publishedAt)}</time>
        </div>
      </li>
    `
    })
    .join('');
}

function renderEvents(items) {
  selectors.events.innerHTML = items
    .map((event) => {
      const href = safeUrl(event.sourceUrl);

      if (!href) {
        return `
      <li class="event-item is-disabled" aria-disabled="true">
        <div class="event-link">
          <time datetime="${safeText(event.date)}">${safeText(event.date)}</time>
          <div>
            <strong>${safeText(event.title)}</strong>
            <p>${safeText(event.location)}</p>
          </div>
        </div>
      </li>
    `;
      }

      return `
      <li class="event-item">
        <a class="event-link" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="행사 상세 보기">
          <time datetime="${safeText(event.date)}">${safeText(event.date)}</time>
          <div>
            <strong>${safeText(event.title)}</strong>
            <p>${safeText(event.location)}</p>
          </div>
        </a>
      </li>
    `
    })
    .join('');
}

function renderTrends(items) {
  if (!Array.isArray(items) || items.length === 0) {
    selectors.trends.innerHTML = `
      <li class="trend-card trend-empty">
        <p class="trend-title">오늘 표시할 Market Insight가 없습니다.</p>
        <p class="trend-why">데이터 수집이 지연된 경우 마지막 성공 스냅샷으로 복구됩니다.</p>
      </li>
    `;
    return;
  }

  selectors.trends.innerHTML = items
    .map((trend) => {
      const href = safeUrl(trend.sourceUrl);
      const keywords = href
        ? extractKeywords(href)
            .map((word) => `<span class="keyword-chip">${safeText(word)}</span>`)
            .join('')
        : '<span class="keyword-chip is-muted">source unavailable</span>';

      return `
      <li class="trend-card">
        <p class="trend-title">${safeText(trend.title)}</p>
        <p class="trend-why">왜 중요한가: ${safeText(trend.why)}</p>
        <p class="trend-action">활용 방법: ${safeText(trend.action)}</p>
        <div class="keyword-row">${keywords}</div>
        ${
          href
            ? `<a class="trend-chip" href="${href}" target="_blank" rel="noopener noreferrer">원문/지표 보기</a>`
            : '<span class="trend-chip is-disabled" aria-disabled="true">원문 링크 점검 필요</span>'
        }
      </li>
    `
    })
    .join('');
}

function renderDirectory(items) {
  if (!Array.isArray(items) || items.length === 0) {
    selectors.directory.innerHTML = `
      <tr>
        <td colspan="3">검색 결과가 없습니다.</td>
      </tr>
    `;
    return;
  }

  selectors.directory.innerHTML = items
    .map((row) => {
      const href = safeUrl(row.sourceUrl);
      const email = safeEmail(row.contact);

      return `
      <tr>
        <td>${href ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${safeText(row.company)}</a>` : `<span>${safeText(row.company)}</span>`}</td>
        <td>${safeText(row.sector)}</td>
        <td>${email ? `<a href="mailto:${email}">${safeText(email)}</a>` : safeText(row.contact)}</td>
      </tr>
    `
    })
    .join('');
}

function applyDirectoryFilter(keyword) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    renderDirectory(state.filteredDirectory);
    return;
  }

  const filtered = state.filteredDirectory.filter((row) => {
    return [row.company, row.sector, row.contact].some((field) =>
      String(field).toLowerCase().includes(normalized)
    );
  });

  renderDirectory(filtered);
}

function bindEvents() {
  selectors.directorySearch.addEventListener('input', (event) => {
    applyDirectoryFilter(event.target.value);
  });

  selectors.modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.mode;
      document.body.setAttribute('data-theme', mode);
      selectors.modeButtons.forEach((el) => el.classList.remove('is-active'));
      button.classList.add('is-active');
    });
  });
}

async function loadData() {
  try {
    const response = await fetch('./data/dashboard.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Failed to fetch data snapshot');

    const data = await response.json();
    state.data = data;
    state.filteredDirectory = data.directory || [];
    renderMeta(data.meta || {});

    if (data.fallback && data.fallback.status !== 'normal') {
      selectors.fallbackBanner.hidden = false;
      selectors.fallbackBanner.textContent = safeText(data.fallback.message);
    } else {
      selectors.fallbackBanner.hidden = true;
      selectors.fallbackBanner.textContent = '';
    }

    renderTicker(data.ticker || []);
    renderNews(selectors.kotraNews, data.kotraNews || []);
    renderNews(selectors.localNews, data.localHeadlines || []);
    renderEvents(data.events || []);
    selectors.dailyReport.textContent = safeText(
      (data.marketInsight && data.marketInsight.dailyReport) ||
        '오늘자 리포트 데이터가 아직 집계되지 않았습니다.'
    );
    renderTrends((data.marketInsight && data.marketInsight.trends) || []);
    renderDirectory(state.filteredDirectory);
  } catch (error) {
    selectors.fallbackBanner.hidden = false;
    selectors.fallbackBanner.textContent =
      '데이터를 불러오지 못했습니다. 마지막 성공 데이터 스냅샷을 확인해 주세요.';
    console.error(error);
  }
}

bindEvents();
loadData();
