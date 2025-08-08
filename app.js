const TOTAL_CHARS = 3926926;
const STORAGE_KEY = 'bibleProgress';

let books = [];
let currentBookIndex = 0;
let currentChapterIndex = 0;
let currentVerseIndex = 0;

const root = document.getElementById('root');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('chapter-progress');

const initSettings = getProgressData();
applyTheme(initSettings.theme || 'theme-white');
applyFontSize(initSettings.fontSize || '150%');
disableScroll();

function fadeInElement(el) {
  el.classList.add('fade', 'fade-out');
  requestAnimationFrame(() => el.classList.remove('fade-out'));
}

function setRootContent(html) {
  root.innerHTML = html;
  fadeInElement(root);
}

document.querySelectorAll('#menu button').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    if (page === 'leitura') {
      openBook(currentBookIndex);
    } else if (page === 'livros') {
      showBooks();
    } else if (page === 'numeros') {
      showNumbers();
    } else if (page === 'opcoes') {
      showOptions();
    } else {
      teardownNavigation();
      root.className = '';
      root.innerHTML = '';
    }
  });
});

showSplash();

function startApp() {
  fetch('bíblia sagrada.txt')
    .then(r => r.arrayBuffer())
    .then(buf => {
      const txt = new TextDecoder('iso-8859-1').decode(buf);
      books = parseBible(txt);
      const data = getProgressData();
      if (!data.daysPerWeek || !data.minutesPerDay || !data.speed) {
        showWelcome();
      } else {
        document.getElementById('menu').style.display = 'flex';
        if (Object.keys(data.books).length > 0) {
          currentBookIndex = parseInt(Object.keys(data.books)[0], 10);
          openBook(currentBookIndex);
        } else {
          showBooks();
        }
      }
    });
}

function showSplash() {
  document.getElementById('menu').style.display = 'none';
  root.className = '';
  setRootContent(`<div id="splash"><div id="splash-title">Plano Leitura Bíblica</div><div id="splash-sub">Deslise ou toque para avançar</div></div>`);
  const proceed = () => {
    root.removeEventListener('click', proceed);
    root.removeEventListener('touchstart', proceed);
    startApp();
  };
  root.addEventListener('click', proceed);
  root.addEventListener('touchstart', proceed);
}

function showBooks() {
  document.body.style.paddingTop = '70px';
  teardownNavigation();
  enableScroll();
  root.className = '';
  root.innerHTML = '';
  hideProgressBar();
  const list = document.createElement('div');
  list.className = 'books';
  books.forEach((book, idx) => {
    const percent = getBookProgress(idx).toFixed(0);
    const item = document.createElement('div');
    item.className = 'book-item';
    item.innerHTML = `<span class="book-title">${formatBookName(book.name)}</span><span class="book-percent">${percent}%</span>`;
    item.onclick = () => openBook(idx);
    list.appendChild(item);
  });
  root.appendChild(list);
  fadeInElement(root);
}

function openBook(idx) {
  document.body.style.paddingTop = '70px';
  currentBookIndex = idx;
  const prog = getProgressData().books[idx];
  currentChapterIndex = prog ? prog.chapter - 1 : 0;
  currentVerseIndex = prog ? prog.verse - 1 : 0;
  showCurrentVerse();
  saveProgress();
}

function showCurrentVerse() {
  disableScroll();
  root.className = 'reading';
  const book = books[currentBookIndex];
  const chapter = book.chapters[currentChapterIndex];
  const verse = chapter.verses[currentVerseIndex];
  setRootContent(`
    <div id="chapter-swipe"><div id="chapter-title" class="fade fade-out"><strong>${formatBookName(book.name)} ${chapter.number}</strong></div></div>
    <div id="verse-container"><span id="verse" class="fade fade-out">${verse.text}</span></div>
    <div id="verse-number">${verse.number}</div>`);
  progressContainer.style.display = 'block';
  updateProgressBar();
  requestAnimationFrame(() => {
    root.querySelectorAll('.fade').forEach(el => el.classList.remove('fade-out'));
  });
  setupReadingControls();
}

function teardownNavigation() {
  root.onclick = null;
  document.onkeydown = null;
  root.ontouchstart = null;
  root.ontouchend = null;
}

function updateProgressBar() {
  const book = books[currentBookIndex];
  const chapter = book.chapters[currentChapterIndex];
  const progress = (currentVerseIndex + 1) / chapter.verses.length;
  progressBar.style.width = (progress * 100) + '%';
  if (document.body.dataset.theme === 'theme-read') {
    progressBar.style.backgroundColor = '#DECCC0';
  } else {
    const r = Math.round(255 * (1 - progress));
    const g = Math.round(165 * (1 - progress));
    const b = Math.round(255 * progress);
    progressBar.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
  }
}

function setupReadingControls() {
  root.onclick = () => nextVerse();
  root.ontouchend = e => {
    if (!e.target.closest('#chapter-swipe')) nextVerse();
  };

  const chapterSwipe = document.getElementById('chapter-swipe');
  chapterSwipe.onclick = e => e.stopPropagation();
  let startX = 0;
  let lastTap = 0;
  chapterSwipe.ontouchstart = e => { startX = e.changedTouches[0].clientX; };
  chapterSwipe.ontouchend = e => {
    const diff = startX - e.changedTouches[0].clientX;
    const now = Date.now();
    if (Math.abs(diff) > 30) {
      nextChapter(1);
    } else if (now - lastTap < 300) {
      nextChapter(10);
    }
    lastTap = now;
    e.stopPropagation();
  };

  document.onkeydown = e => {
    if (e.key === 'ArrowRight') {
      nextVerse();
    } else if (e.key === 'ArrowLeft') {
      prevVerse();
    }
  };
}

function renderVerse(verse) {
  const container = document.getElementById('verse-container');
  container.innerHTML = '';
  const span = document.createElement('span');
  span.id = 'verse';
  span.textContent = verse.text;
  container.appendChild(span);
  fadeInElement(span);
  document.getElementById('verse-number').textContent = verse.number;
  const chapter = books[currentBookIndex].chapters[currentChapterIndex];
  document.querySelector('#chapter-title strong').textContent = `${formatBookName(books[currentBookIndex].name)} ${chapter.number}`;
  updateProgressBar();
  saveProgress();
}

function nextVerse() {
  const book = books[currentBookIndex];
  let chapter = book.chapters[currentChapterIndex];
  if (currentVerseIndex < chapter.verses.length - 1) {
    currentVerseIndex++;
  } else {
    if (currentChapterIndex < book.chapters.length - 1) {
      currentChapterIndex++;
      currentVerseIndex = 0;
      chapter = book.chapters[currentChapterIndex];
    } else {
      flashChapterLimit();
      return;
    }
  }
  renderVerse(chapter.verses[currentVerseIndex]);
}

function prevVerse() {
  const book = books[currentBookIndex];
  let chapter = book.chapters[currentChapterIndex];
  if (currentVerseIndex > 0) {
    currentVerseIndex--;
  } else {
    if (currentChapterIndex > 0) {
      currentChapterIndex--;
      chapter = book.chapters[currentChapterIndex];
      currentVerseIndex = chapter.verses.length - 1;
    } else {
      return;
    }
  }
  renderVerse(chapter.verses[currentVerseIndex]);
}

function nextChapter(step) {
  const book = books[currentBookIndex];
  let target = currentChapterIndex + step;
  if (target >= book.chapters.length) {
    if (currentChapterIndex < book.chapters.length - 1) {
      target = currentChapterIndex + 1;
    } else {
      flashChapterLimit();
      return;
    }
  }
  currentChapterIndex = target;
  currentVerseIndex = 0;
  showCurrentVerse();
  saveProgress();
}

function flashChapterLimit() {
  const title = document.getElementById('chapter-title');
  if (!title) return;
  title.style.transition = 'opacity 0.375s';
  title.style.opacity = '0.5';
  setTimeout(() => {
    title.style.opacity = '1';
  }, 375);
}

function hideProgressBar() {
  progressContainer.style.display = 'none';
}

function saveProgress() {
  const data = getProgressData();
  data.books[currentBookIndex] = { chapter: currentChapterIndex + 1, verse: currentVerseIndex + 1 };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getProgressData() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"books":{},"daily":{},"daysPerWeek":null,"minutesPerDay":null,"speed":null,"theme":null,"fontSize":null}');
}

function getBookProgress(idx) {
  const data = getProgressData();
  const prog = data.books[idx];
  const book = books[idx];
  if (!prog) return 0;
  let chars = 0;
  for (let c = 0; c < prog.chapter - 1; c++) chars += book.chapters[c].totalChars;
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
  document.body.style.paddingTop = '70px';
  teardownNavigation();
  disableScroll();
  hideProgressBar();
  const totalCharsRead = getTotalCharsRead();
  const totalPercent = (totalCharsRead / TOTAL_CHARS) * 100;
  const data = getProgressData();
  const today = new Date().toISOString().slice(0, 10);
  const dailyGoal = (data.minutesPerDay || 0) * 60 * (data.speed || 1);
  const dailyChars = (data.daily && data.daily[today]) || 0;
  const dailyPercent = dailyGoal ? (dailyChars / dailyGoal) * 100 : 0;
  root.className = '';
  const size = 120;
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(dailyPercent, 100) / 100);
  setRootContent(`
    <div id="daily-circle">
      <svg width="${size}" height="${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="rgba(0,0,0,0.1)" stroke-width="10" fill="none" stroke-linecap="butt"></circle>
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" stroke="#000" stroke-width="10" fill="none" stroke-linecap="butt" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
      </svg>
      <span>${Math.round(dailyPercent)}%</span>
    </div>
    <div id="total-progress">Progresso total: ${Math.round(totalPercent)}%</div>
  `);
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

function showWelcome() {
  teardownNavigation();
  disableScroll();
  hideProgressBar();
  document.getElementById('menu').style.display = 'none';
  root.className = 'welcome';
  document.body.style.paddingTop = '30px';
  const state = {};
  screen1();

  function screen1() {
    setRootContent(`<div><p class="welcome-question">Quantos dias por semana<br>pretende ler?</p><input type="number" id="days" class="welcome-input" max="7"><button id="next1" class="next-button">Próximo</button></div>`);
    document.getElementById('next1').onclick = () => {
      let days = parseInt(document.getElementById('days').value, 10) || 0;
      if (days > 7) days = 7;
      state.daysPerWeek = days;
      screen2();
    };
  }

  function screen2() {
    setRootContent(`<div><p class="welcome-question">Quantos minutos quer investir<br>por dia?</p><input type="number" id="minutes" class="welcome-input"><button id="next2" class="next-button">Próximo</button></div>`);
    document.getElementById('next2').onclick = () => {
      state.minutesPerDay = parseInt(document.getElementById('minutes').value, 10) || 0;
      screen3();
    };
  }

  function screen3() {
    const msgs = [
      'vamos medir seu tempo médio de leitura',
      'leia tranquilamente o texto bíblico',
      'como você faz naturalmente',
      'toque em "próximo" quando terminar'
    ];
    let idx = 0;
    setRootContent(`<div id="msg"></div>`);
    const el = document.getElementById('msg');
    const show = () => {
      if (idx < msgs.length) {
        el.textContent = msgs[idx++];
        el.style.opacity = 0;
        requestAnimationFrame(() => {
          el.style.transition = 'opacity 2.5s';
          el.style.opacity = 1;
        });
        setTimeout(show, 2500);
      } else {
        countdown(3);
      }
    };
    show();
  }

  function countdown(n) {
    if (n === 0) return screen4();
    setRootContent(`<div>${n}</div>`);
    setTimeout(() => countdown(n - 1), 1000);
  }

  function screen4() {
    const sample = `No princípio criou \nDeus os céus e a terra. \nA terra era sem forma \ne vazia; e havia trevas \nsobre a face do abismo.`;
    state.sampleLen = sample.length;
    setRootContent(`<div style="white-space: pre-wrap;">${sample}</div><button id="finish" class="next-button">Próximo</button>`);
    const start = Date.now();
    document.getElementById('finish').onclick = () => {
      const seconds = (Date.now() - start) / 1000;
      state.readTime = seconds;
      showResults();
    };
  }

  function showResults() {
    const speed = state.sampleLen / state.readTime;
    const totalSeconds = TOTAL_CHARS / speed;
    const weeklySeconds = state.daysPerWeek * state.minutesPerDay * 60;
    const weeks = totalSeconds / weeklySeconds;
    const end = new Date();
    end.setDate(end.getDate() + Math.ceil(weeks * 7));
    const data = getProgressData();
    data.daysPerWeek = state.daysPerWeek;
    data.minutesPerDay = state.minutesPerDay;
    data.speed = speed;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    const endText = formatDateWritten(end);
    setRootContent(`<div>Ótimo, seu plano de leitura vai durar ${Math.ceil(weeks)} semanas, a previsão é que você conclua no dia ${endText}.</div><button id="start" class="next-button">Iniciar leitura</button>`);
    document.getElementById('start').onclick = () => {
      document.getElementById('menu').style.display = 'flex';
      openBook(currentBookIndex);
    };
  }
}

function showOptions() {
  document.body.style.paddingTop = '70px';
  teardownNavigation();
  disableScroll();
  root.className = '';
  hideProgressBar();
  const data = getProgressData();
  setRootContent(`
    <div class="option-group">
      <div class="option-label">Tema:</div>
      <select id="theme-select" class="welcome-input">
        <option value="theme-white">White</option>
        <option value="theme-black">Black</option>
        <option value="theme-dark">Preto degradê</option>
        <option value="theme-blue">Blue</option>
        <option value="theme-read">Read</option>
      </select>
    </div>
    <div class="option-group">
      <div class="option-label">Tamanho do texto:</div>
      <select id="opt-font-size" class="welcome-input">
        <option value="120">Pequeno</option>
        <option value="150">Médio</option>
        <option value="180">Grande</option>
      </select>
    </div>
    <div class="option-group">
      <div class="option-label">Dias por semana:</div>
      <input type="number" id="opt-days" class="welcome-input" max="7" value="${data.daysPerWeek || ''}">
    </div>
    <div class="option-group">
      <div class="option-label">Minutos por dia:</div>
      <input type="number" id="opt-minutes" class="welcome-input" value="${data.minutesPerDay || ''}">
    </div>
    <button id="save-options" class="next-button">Salvar</button>
    <div id="opt-result"></div>
  `);
  document.getElementById('theme-select').value = document.body.dataset.theme || 'theme-white';
  document.getElementById('opt-font-size').value = (parseInt(document.body.dataset.fontSize) || 150).toString();
  document.getElementById('save-options').onclick = () => {
    const theme = document.getElementById('theme-select').value;
    const fontSize = document.getElementById('opt-font-size').value;
    const days = parseInt(document.getElementById('opt-days').value, 10) || 0;
    const mins = parseInt(document.getElementById('opt-minutes').value, 10) || 0;
    const data = getProgressData();
    data.daysPerWeek = days;
    data.minutesPerDay = mins;
    data.theme = theme;
    data.fontSize = fontSize + '%';
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    applyTheme(theme);
    applyFontSize(data.fontSize);
    const remaining = TOTAL_CHARS - getTotalCharsRead();
    const speed = data.speed || 1;
    const totalSeconds = remaining / speed;
    const weeklySeconds = days * mins * 60;
    const weeks = totalSeconds / weeklySeconds;
    const end = new Date();
    end.setDate(end.getDate() + Math.ceil(weeks * 7));
    document.getElementById('opt-result').innerHTML = `Semanas restantes: ${Math.ceil(weeks)}<br>Previsão: ${end.toLocaleDateString('pt-BR')}`;
  };
}

function applyFont(font) {
  document.body.style.fontFamily = font;
  document.body.dataset.font = font;
}

function applyTheme(theme) {
  document.body.classList.remove('theme-white', 'theme-black', 'theme-dark', 'theme-blue', 'theme-read');
  document.body.classList.add(theme);
  document.body.dataset.theme = theme;
  const themeFonts = {
    'theme-white': 'Bookerly',
    'theme-black': 'Helvetica',
    'theme-dark': 'Helvetica',
    'theme-blue': 'Trebuchet MS',
    'theme-read': 'Bookerly'
  };
  applyFont(themeFonts[theme] || 'Bookerly');
}

function applyFontSize(size) {
  document.body.style.fontSize = size;
  document.body.dataset.fontSize = size;
}

function disableScroll() {
  document.body.style.overflow = 'hidden';
}

function enableScroll() {
  document.body.style.overflowY = 'auto';
}

function formatDateWritten(date) {
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
}

