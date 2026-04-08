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
  directory: document.getElementById('directory-body'),
  directorySearch: document.getElementById('directory-search'),
  modeButtons: Array.from(document.querySelectorAll('.mode-btn'))
};

function trendClass(trend) {
  return trend === 'up' ? 'is-up' : 'is-down';
}

function safeText(value, fallback = '-') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}

function safeUrl(value, fallback = '#') {
  if (!value) return fallback;
  return String(value);
}

function renderTicker(items) {
  selectors.ticker.innerHTML = items
    .map(
      (item) => `
      <a class="kpi-card" href="${safeUrl(item.sourceUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${safeText(item.label)} 원문 소스 보기">
        <p class="kpi-label">${safeText(item.label)}</p>
        <p class="kpi-value">${safeText(item.value)}</p>
        <p class="kpi-change ${trendClass(item.trend)}">${safeText(item.change)}</p>
      </a>
    `
    )
    .join('');
}

function renderNews(target, list) {
  target.innerHTML = list
    .map(
      (item) => `
      <li class="news-item">
        <a class="news-link" href="${safeUrl(item.sourceUrl)}" target="_blank" rel="noopener noreferrer" aria-label="뉴스 원문 보기">
          <h4>${safeText(item.title)}</h4>
          <p>${safeText(item.summary)}</p>
        </a>
        <div class="news-meta">
          <span>${safeText(item.source)}</span>
          <time>${safeText(item.publishedAt)}</time>
        </div>
      </li>
    `
    )
    .join('');
}

function renderEvents(items) {
  selectors.events.innerHTML = items
    .map(
      (event) => `
      <li class="event-item">
        <a class="event-link" href="${safeUrl(event.sourceUrl)}" target="_blank" rel="noopener noreferrer" aria-label="행사 상세 보기">
          <time datetime="${safeText(event.date)}">${safeText(event.date)}</time>
          <div>
            <strong>${safeText(event.title)}</strong>
            <p>${safeText(event.location)}</p>
          </div>
        </a>
      </li>
    `
    )
    .join('');
}

function renderTrends(items) {
  selectors.trends.innerHTML = items
    .map(
      (trend) => `
      <li class="trend-card">
        <p class="trend-title">${safeText(trend.title)}</p>
        <p class="trend-why">왜 중요한가: ${safeText(trend.why)}</p>
        <p class="trend-action">활용 방법: ${safeText(trend.action)}</p>
        <a class="trend-chip" href="${safeUrl(trend.sourceUrl)}" target="_blank" rel="noopener noreferrer">원문/지표 보기</a>
      </li>
    `
    )
    .join('');
}

function renderDirectory(items) {
  selectors.directory.innerHTML = items
    .map(
      (row) => `
      <tr>
        <td><a href="${safeUrl(row.sourceUrl)}" target="_blank" rel="noopener noreferrer">${safeText(row.company)}</a></td>
        <td>${safeText(row.sector)}</td>
        <td><a href="mailto:${safeText(row.contact, '')}">${safeText(row.contact)}</a></td>
      </tr>
    `
    )
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
