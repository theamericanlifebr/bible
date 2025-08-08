const TOTAL_CHARS = 3926926;
const SAMPLE_TEXT = `No princípio criou Deus os céus e a terra.
A terra era sem forma e vazia; e havia trevas sobre a face do abismo, mas o Espírito de Deus pairava sobre a face das águas.
Disse Deus: haja luz. E houve luz.
Viu Deus que a luz era boa; e fez separação entre a luz e as trevas.
E Deus chamou à luz dia`;

let dailyMinutes = 0;
let daysPerWeek = 0;
let chapters = [];
let currentChapterIndex = 0;
let currentVerseIndex = 0;
const root = document.getElementById('root');

function showInput() {
  root.innerHTML = `<div>
    <label>Quantos minutos por dia?</label><br>
    <input id="minutos" type="number" min="1"><br>
    <label>Quantos dias na semana?</label><br>
    <input id="dias" type="number" min="1" max="7"><br>
    <button id="go">Continuar</button>
  </div>`;
  document.getElementById('go').onclick = () => {
    dailyMinutes = parseInt(document.getElementById('minutos').value, 10);
    daysPerWeek = parseInt(document.getElementById('dias').value, 10);
    showMessages();
  };
}

function showMessages() {
  const messages = [
    'vamos medir seu tempo médio de leitura',
    'leia tranquilamente o texto bíblico',
    'como você faz naturalmente',
    'toque na tela ao terminar'
  ];
  let index = 0;
  const msgDiv = document.createElement('div');
  msgDiv.className = 'fade';
  root.innerHTML = '';
  root.appendChild(msgDiv);

  function next() {
    if (index < messages.length) {
      msgDiv.style.opacity = 0;
      setTimeout(() => {
        msgDiv.textContent = messages[index++];
        msgDiv.style.opacity = 1;
        setTimeout(next, 3000);
      }, 1000);
    } else {
      setTimeout(startCountdown, 3000);
    }
  }
  next();
}

function startCountdown() {
  let count = 3;
  root.innerHTML = `<div id="count">${count}</div>`;
  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      root.innerHTML = `<div id="count">${count}</div>`;
    } else {
      clearInterval(interval);
      showSampleText();
    }
  }, 1000);
}

let startTime = 0;
function showSampleText() {
  root.innerHTML = `<div id="sample">${SAMPLE_TEXT.replace(/\n/g, '<br>')}</div>`;
  startTime = Date.now();
  function finish() {
    const elapsed = (Date.now() - startTime) / 1000;
    root.removeEventListener('dblclick', finish);
    document.removeEventListener('touchend', touchHandler);
    showResults(elapsed);
  }
  root.addEventListener('dblclick', finish);
  let lastTap = 0;
  function touchHandler(e) {
    const now = Date.now();
    if (now - lastTap < 300) finish();
    lastTap = now;
  }
  document.addEventListener('touchend', touchHandler);
}

function showResults(elapsed) {
  const speed = 300 / elapsed; // caracteres por segundo
  const totalSeconds = TOTAL_CHARS / speed;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const dailySeconds = dailyMinutes * 60;
  const weeklySeconds = dailySeconds * daysPerWeek;
  const weeks = Math.ceil(totalSeconds / weeklySeconds);
  const finish = new Date();
  finish.setDate(finish.getDate() + weeks * 7);
  root.innerHTML = `<div>
    Velocidade: ${speed.toFixed(2)} caracteres/segundo<br>
    Tempo total de leitura: ${hours}h ${minutes}m<br>
    Semanas necessárias: ${weeks}<br>
    Previsão de término: ${finish.toLocaleDateString('pt-BR')}<br><br>
    <div id="start-reading">Dois cliques para começar</div>
  </div>`;
  const startDiv = document.getElementById('start-reading');
  function start() {
    startDiv.removeEventListener('dblclick', start);
    startDiv.removeEventListener('touchend', touchStart);
    startReading();
  }
  startDiv.addEventListener('dblclick', start);
  let lastTap = 0;
  function touchStart(e) {
    const now = Date.now();
    if (now - lastTap < 300) start();
    lastTap = now;
  }
  startDiv.addEventListener('touchend', touchStart);
}

function startReading() {
  fetch('bíblia sagrada.txt')
    .then(r => r.text())
    .then(txt => {
      chapters = parseBible(txt);
      currentChapterIndex = 0;
      currentVerseIndex = 0;
      showCurrentVerse();
      setupNavigation();
    });
}

function showCurrentVerse() {
  const ch = chapters[currentChapterIndex];
  const verse = ch.verses[currentVerseIndex];
  root.innerHTML = `<div id="chapter-title">${formatBookName(ch.book)} ${ch.chapter}</div>
    <div id="verse">${verse.number} ${verse.text}</div>`;
}

function setupNavigation() {
  document.addEventListener('click', nextVerse);
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') nextVerse();
    if (e.key === 'ArrowLeft') prevVerse();
  });
  let touchStartX = 0;
  document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].clientX;
  });
  document.addEventListener('touchend', e => {
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (diff < -30) nextVerse();
    else if (diff > 30) prevVerse();
    else nextVerse();
  });
}

function nextVerse() {
  const ch = chapters[currentChapterIndex];
  currentVerseIndex++;
  if (currentVerseIndex >= ch.verses.length) {
    currentChapterIndex++;
    currentVerseIndex = 0;
    if (currentChapterIndex >= chapters.length) currentChapterIndex = chapters.length - 1;
  }
  showCurrentVerse();
}

function prevVerse() {
  currentVerseIndex--;
  if (currentVerseIndex < 0) {
    currentChapterIndex--;
    if (currentChapterIndex < 0) {
      currentChapterIndex = 0;
      currentVerseIndex = 0;
    } else {
      currentVerseIndex = chapters[currentChapterIndex].verses.length - 1;
    }
  }
  showCurrentVerse();
}

function parseBible(text) {
  const list = [];
  const normalized = text.replace(/\r/g, '').replace(/\n(?!\d|»)/g, ' ');
  const lines = normalized.split('\n');
  let book = '', chapter = '', verses = [];
  for (const line of lines) {
    const chapMatch = line.match(/»?([^\[]+)\[(\d+)\]/);
    if (chapMatch) {
      if (book) list.push({ book, chapter, verses });
      book = chapMatch[1].trim();
      chapter = chapMatch[2];
      verses = [];
    } else {
      const verseMatch = line.match(/^\s*(\d+)\s+(.*)/);
      if (verseMatch) {
        verses.push({ number: verseMatch[1], text: verseMatch[2].trim() });
      }
    }
  }
  if (book) list.push({ book, chapter, verses });
  return list;
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

showInput();
