const queryInput = document.getElementById('queryInput');
const searchButton = document.getElementById('searchButton');
const resultSection = document.getElementById('resultSection');
const resultTitle = document.getElementById('resultTitle');
const resultDescription = document.getElementById('resultDescription');
const resultContent = document.getElementById('resultContent');
const messageSection = document.getElementById('messageSection');

const sectionKeywords = [
  'Geography',
  'History',
  'Demographics',
  'Society',
  'Culture',
  'Economy',
  'Politics',
  'Environment',
  'Population',
  'Administration'
];

function showMessage(text) {
  messageSection.textContent = text;
  messageSection.classList.remove('hidden');
  resultSection.classList.add('hidden');
}

function hideMessage() {
  messageSection.classList.add('hidden');
  messageSection.textContent = '';
}

function showResult(title, description, blocks) {
  resultTitle.textContent = title;
  resultDescription.textContent = description || '以下內容為自動搜尋整理，涵蓋地理、歷史與社會現狀摘要。';
  resultContent.innerHTML = blocks.map(block => {
    return `<div class="section-block"><h3>${block.heading}</h3><p>${block.text}</p></div>`;
  }).join('');
  resultSection.classList.remove('hidden');
  messageSection.classList.add('hidden');
}

function extractSectionText(sections, keywords) {
  const blocks = [];
  const seen = new Set();

  for (const section of sections) {
    const heading = section.line || '';
    const normalized = heading.toLowerCase();
    if (!heading) continue;

    for (const keyword of keywords) {
      if (normalized.includes(keyword.toLowerCase()) && !seen.has(keyword)) {
        const text = section.text?.trim();
        if (text) {
          blocks.push({ heading: keyword, text });
          seen.add(keyword);
        }
      }
    }
  }

  return blocks;
}

function createFallbackBlocks(summary) {
  return [
    { heading: '摘要', text: summary || '無法取得詳細段落，請確認輸入內容是否正確並稍後再試。' }
  ];
}

async function fetchWikiSummary(title) {
  const endpoint = `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error('無法取得資料，請稍候再試。');
  }
  return response.json();
}

async function fetchWikiSections(title) {
  const endpoint = `https://zh.wikipedia.org/api/rest_v1/page/mobile-sections/${encodeURIComponent(title)}`;
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error('無法取得段落資料。');
  }
  return response.json();
}

async function searchWikiTitle(query) {
  const endpoint = `https://zh.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1`;
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error('搜尋失敗，請重新嘗試。');
  }
  const data = await response.json();
  const entry = data.query?.search?.[0];
  return entry?.title;
}

async function handleSearch() {
  const query = queryInput.value.trim();
  if (!query) {
    showMessage('請輸入一個地區或國家名稱。');
    return;
  }

  showMessage('搜尋中，請稍候…');

  try {
    const pageTitle = await searchWikiTitle(query);
    if (!pageTitle) {
      showMessage('找不到相關結果，請嘗試其他地區或關鍵字。');
      return;
    }

    const pageData = await fetchWikiSummary(pageTitle);
    let blocks = [];

    try {
      const sectionData = await fetchWikiSections(pageTitle);
      blocks = extractSectionText(sectionData.remaining?.sections || [], sectionKeywords);
    } catch (sectionError) {
      console.warn('Section fetch failed, using summary fallback.', sectionError);
    }

    if (blocks.length === 0) {
      blocks.push(...createFallbackBlocks(pageData.extract || pageData.description || '無法取得內容。'));
    }

    showResult(pageTitle, pageData.description || '', blocks);
  } catch (error) {
    console.error(error);
    showMessage(error.message || '發生錯誤，請稍後再試。');
  }
}

searchButton.addEventListener('click', handleSearch);
queryInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    handleSearch();
  }
});
