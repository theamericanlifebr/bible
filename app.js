const TOTAL_CHARS = 3926926;
const STORAGE_KEY = 'bibleProgress';

let books = [];
let currentBookIndex = 0;
let currentChapterIndex = 0;
let currentVerseIndex = 0;

const root = document.getElementById('root');

document.querySelectorAll('#menu button').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    if (page === 'leitura') {
      openBook(currentBookIndex);
    } else if (page === 'livros') {
      showBooks();
    } else if (page === 'numeros') {
      showNumbers();
    } else {
      teardownNavigation();
      root.className = '';
      root.innerHTML = '';
    }
  });
});

fetch('bíblia sagrada.txt')
  .then(r => r.arrayBuffer())
  .then(buf => {
    const txt = new TextDecoder('iso-8859-1').decode(buf);
    books = parseBible(txt);
    const data = getProgressData();
    if (!data.dailyGoal) {
      showPlan();
    } else if (Object.keys(data.books).length > 0) {
      currentBookIndex = parseInt(Object.keys(data.books)[0], 10);
      openBook(currentBookIndex);
    } else {
      showBooks();
    }
  });

function showPlan() {
  teardownNavigation();
  root.className = '';
  root.innerHTML = `<div id="plan-form"><label for="daily-goal">Meta diária de caracteres:</label><input type="number" id="daily-goal"><button id="save-plan">Salvar</button></div>`;
  document.getElementById('save-plan').onclick = () => {
    const goal = parseInt(document.getElementById('daily-goal').value, 10);
    const data = getProgressData();
    data.dailyGoal = goal;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    showBooks();
  };
}

function showBooks() {
  teardownNavigation();
  root.className = '';
  root.innerHTML = '';
  const list = document.createElement('div');
  books.forEach((book, idx) => {
    const percent = getBookProgress(idx).toFixed(0);
    const item = document.createElement('div');
    item.className = 'book-item';
    item.textContent = `${formatBookName(book.name)} - ${percent}%`;
    item.onclick = () => openBook(idx);
    list.appendChild(item);
  });
  root.appendChild(list);
}

function openBook(idx) {
  const data = getProgressData();
  const prog = data.books[idx];
  currentBookIndex = idx;
  if (prog) {
    currentChapterIndex = prog.chapter - 1;
    currentVerseIndex = prog.verse - 1;
  } else {
    currentChapterIndex = 0;
    currentVerseIndex = 0;
  }
  showCurrentVerse();
  saveProgress();
}

function showCurrentVerse() {
  root.className = 'reading';
  const book = books[currentBookIndex];
  const chapter = book.chapters[currentChapterIndex];
  const verse = chapter.verses[currentVerseIndex];
  root.innerHTML = `<div id="chapter-title" class="fade fade-out"><strong>${formatBookName(book.name)} ${chapter.number}</strong></div><div id="verse" class="fade fade-out">${verse.number} ${verse.text}</div>`;
  requestAnimationFrame(() => {
    root.querySelectorAll('.fade').forEach(el => el.classList.remove('fade-out'));
  });
  root.onclick = nextVerse;
  document.onkeydown = e => {
    if (e.key === 'ArrowRight') nextVerse();
    if (e.key === 'ArrowLeft') prevVerse();
  };
}

function teardownNavigation() {
  root.onclick = null;
  document.onkeydown = null;
}

function nextVerse() {
  const book = books[currentBookIndex];
  const chapter = book.chapters[currentChapterIndex];
  const verse = chapter.verses[currentVerseIndex];
  fadeOut(() => {
    updateDaily(verse.length);
    currentVerseIndex++;
    if (currentVerseIndex >= chapter.verses.length) {
      currentChapterIndex++;
      currentVerseIndex = 0;
      if (currentChapterIndex >= book.chapters.length) {
        currentChapterIndex = book.chapters.length - 1;
        currentVerseIndex = book.chapters[currentChapterIndex].verses.length - 1;
      }
    }
    saveProgress();
    showCurrentVerse();
  });
}

function prevVerse() {
  fadeOut(() => {
    currentVerseIndex--;
    if (currentVerseIndex < 0) {
      currentChapterIndex--;
      if (currentChapterIndex < 0) {
        currentChapterIndex = 0;
        currentVerseIndex = 0;
      } else {
        currentVerseIndex = books[currentBookIndex].chapters[currentChapterIndex].verses.length - 1;
      }
    }
    saveProgress();
    showCurrentVerse();
  });
}

function fadeOut(callback) {
  const els = root.querySelectorAll('#chapter-title, #verse');
  els.forEach(el => el.classList.add('fade-out'));
  setTimeout(callback, 1000);
}

function saveProgress() {
  const data = getProgressData();
  data.books[currentBookIndex] = { chapter: currentChapterIndex + 1, verse: currentVerseIndex + 1 };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function updateDaily(chars) {
  const data = getProgressData();
  const today = new Date().toISOString().slice(0, 10);
  if (!data.daily) data.daily = {};
  data.daily[today] = (data.daily[today] || 0) + chars;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getProgressData() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"books":{},"daily":{},"dailyGoal":null}');
}

function getBookProgress(idx) {
  const data = getProgressData();
  const prog = data.books[idx];
  const book = books[idx];
  if (!prog) return 0;
  let chars = 0;
  for (let c = 0; c < prog.chapter - 1; c++) chars += book.chapters[c].totalChars;
  const ch = book.chapters[prog.chapter - 1];
  for (let v = 0; v < prog.verse - 1 && v < ch.verses.length; v++) chars += ch.verses[v].length;
  return (chars / book.totalChars) * 100;
}

function getTotalCharsRead() {
  const data = getProgressData();
  let total = 0;
  for (const idx in data.books) {
    const book = books[idx];
    const prog = data.books[idx];
    let chars = 0;
    for (let c = 0; c < prog.chapter - 1; c++) chars += book.chapters[c].totalChars;
    const ch = book.chapters[prog.chapter - 1];
    for (let v = 0; v < prog.verse - 1 && v < ch.verses.length; v++) chars += ch.verses[v].length;
    total += chars;
  }
  return total;
}

function showNumbers() {
  teardownNavigation();
  const totalCharsRead = getTotalCharsRead();
  const totalPercent = (totalCharsRead / TOTAL_CHARS) * 100;
  const data = getProgressData();
  const today = new Date().toISOString().slice(0, 10);
  const dailyGoal = data.dailyGoal || 3000;
  const dailyChars = (data.daily && data.daily[today]) || 0;
  const dailyPercent = (dailyChars / dailyGoal) * 100;
  let weekChars = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    weekChars += (data.daily && data.daily[key]) || 0;
  }
  const weeklyPercent = (weekChars / (dailyGoal * 7)) * 100;
  root.className = '';
  root.innerHTML = `<div>Progresso total: ${totalPercent.toFixed(2)}%<br>Progresso diário: ${dailyPercent.toFixed(2)}%<br>Progresso semanal: ${weeklyPercent.toFixed(2)}%</div>`;
}

function parseBible(text) {
  const books = [];
  const normalized = text.replace(/\r/g, '').replace(/\n(?!\d|»)/g, ' ');
  const lines = normalized.split('\n');
  let currentBook = null;
  let currentChapter = null;
  for (const line of lines) {
    const chapMatch = line.match(/»?([^\[]+)\[(\d+)\]/);
    if (chapMatch) {
      const name = chapMatch[1].trim();
      const num = parseInt(chapMatch[2], 10);
      if (!currentBook || currentBook.name !== name) {
        currentBook = { name, chapters: [], totalChars: 0 };
        books.push(currentBook);
      }
      currentChapter = { number: num, verses: [], totalChars: 0 };
      currentBook.chapters.push(currentChapter);
    } else {
      const verseMatch = line.match(/^\s*(\d+)\s+(.*)/);
      if (verseMatch && currentChapter) {
        const text = verseMatch[2].trim();
        const len = text.length;
        currentChapter.verses.push({ number: parseInt(verseMatch[1], 10), text, length: len });
        currentChapter.totalChars += len;
        currentBook.totalChars += len;
      }
    }
  }
  return books;
}

function formatBookName(str) {
  const key = normalize(str);
  return bookMap[key] || (str.charAt(0) + str.slice(1).toLowerCase());
}

function normalize(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const bookMap = {
  'GNESIS': 'Gênesis',
  'GENESIS': 'Gênesis',
  'EXODO': 'Êxodo',
  'LEVITICO': 'Levítico',
  'NUMEROS': 'Números',
  'DEUTERONOMIO': 'Deuteronômio',
  'JOSUE': 'Josué',
  'JUIZES': 'Juízes',
  'RUTE': 'Rute',
  '1SAMUEL': '1 Samuel',
  '2SAMUEL': '2 Samuel',
  '1REIS': '1 Reis',
  '2REIS': '2 Reis',
  '1CRONICAS': '1 Crônicas',
  '2CRONICAS': '2 Crônicas',
  'ESDRAS': 'Esdras',
  'NEEMIAS': 'Neemias',
  'ESTER': 'Ester',
  'JO': 'Jó',
  'SALMOS': 'Salmos',
  'PROVERBIOS': 'Provérbios',
  'ECLESIASTES': 'Eclesiastes',
  'CANTICOS': 'Cânticos',
  'ISAIAS': 'Isaías',
  'JEREMIAS': 'Jeremias',
  'LAMENTACOES': 'Lamentações',
  'EZEQUIEL': 'Ezequiel',
  'DANIEL': 'Daniel',
  'OSEIAS': 'Oséias',
  'JOEL': 'Joel',
  'AMOS': 'Amós',
  'OBADIAS': 'Obadias',
  'JONAS': 'Jonas',
  'MIQUEIAS': 'Miquéias',
  'NAUM': 'Naum',
  'HABACUQUE': 'Habacuque',
  'SOFONIAS': 'Sofonias',
  'AGEU': 'Ageu',
  'ZACARIAS': 'Zacarias',
  'MALAQUIAS': 'Malaquias',
  'MATEUS': 'Mateus',
  'MARCOS': 'Marcos',
  'LUCAS': 'Lucas',
  'JOAO': 'João',
  'ATOS': 'Atos',
  'ROMANOS': 'Romanos',
  '1CORINTIOS': '1 Coríntios',
  '2CORINTIOS': '2 Coríntios',
  'GALATAS': 'Gálatas',
  'EFESIOS': 'Efésios',
  'FILIPENSES': 'Filipenses',
  'COLOSSENSES': 'Colossenses',
  '1TESSALONICENSES': '1 Tessalonicenses',
  '2TESSALONICENSES': '2 Tessalonicenses',
  '1TIMOTEO': '1 Timóteo',
  '2TIMOTEO': '2 Timóteo',
  'TITO': 'Tito',
  'FILEMOM': 'Filemom',
  'HEBREUS': 'Hebreus',
  'TIAGO': 'Tiago',
  '1PEDRO': '1 Pedro',
  '2PEDRO': '2 Pedro',
  '1JOAO': '1 João',
  '2JOAO': '2 João',
  '3JOAO': '3 João',
  'JUDAS': 'Judas',
  'APOCALIPSE': 'Apocalipse'
};

