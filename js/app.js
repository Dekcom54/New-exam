/**
 * ============================================================================
 * SOCRATIVE CLONE - MAIN APPLICATION LOGIC (js/app.js)
 * ============================================================================
 * รองรับ:
 * 1. หน้า Launch (Quiz, Team Challenge, Exit Ticket, Quick Question MC/TF/SA)
 * 2. หน้า Library + ปุ่ม Add Quiz ครบทั้ง 5 ฟังก์ชันตามรูปที่ 3:
 *    - Generate Questions with AI (Prompt + แนบไฟล์ Word/PDF/Excel)
 *    - Copy-Paste Questions
 *    - Extract Questions from Document (.docx, .pdf, .xlsx, .txt)
 *    - Import Questions from Code or Excel Template (พร้อมดาวน์โหลดแม่แบบ Excel)
 *    - Blank Quiz
 * 3. หน้า Live Results ของครู (ตามรูปที่ 1 เป๊ะ: Show Names, Show Responses, Show Results,
 *    Pause, Finish Activity, Invite Students, แถบสีเขียว/แดง และ Class Total %)
 * 4. หน้าทำข้อสอบผ่านมือถือของนักเรียนแบบ Real-time + ซิงค์ลง Google Sheets อัตโนมัติ
 */

const STORAGE_KEY = 'SOCRATIVE_APP_STATE_V1';
const SETTINGS_KEY = 'SOCRATIVE_APP_SETTINGS_V1';

// ตั้งค่า PDF.js worker
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ช่องทางสื่อสาร Real-time ระหว่างแท็บครูและแท็บนักเรียน
const liveChannel = ('BroadcastChannel' in window) ? new BroadcastChannel('socrative_realtime_channel') : null;

const DEFAULT_GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby3V0oPb2vz7qu2b-RXjCqjMYtdEiySGYcnDmh375IbJBfjS8DTJQ-4z0hOSO0gXL1B/exec';

let appSettings = {
  sheetDocUrl: 'https://docs.google.com/spreadsheets/u/0/',
  gasWebAppUrl: DEFAULT_GAS_WEB_APP_URL,
  geminiApiKey: '',
  roomCode: 'BASICCHANA'
};

// ข้อมูลเริ่มต้นจำลองเหมือนรูปที่ 1 เป๊ะ (Life Science Quiz) + ชุดข้อสอบภาษาไทยตัวอย่าง
function getInitialSeedState() {
  const defaultQuizId = 'QUIZ_LIFE_SCI_01';
  const thaiQuizId = 'QUIZ_THAI_ELEC_02';
  const defaultSessionId = 'SESS_LIVE_01';

  return {
    quizzes: [
      {
        id: defaultQuizId,
        title: 'Life Science Quiz',
        subject: 'Biology / Life Science',
        shareCode: 'SOC-104829',
        createdAt: '2026-11-16T08:00:00.000Z',
        updatedAt: '2026-11-16T08:00:00.000Z',
        questions: [
          {
            id: 'Q1',
            type: 'MC',
            text: 'Which organelle is primarily responsible for photosynthesis in plant cells? (ออร์แกเนลล์ใดทำหน้าที่หลักในการสังเคราะห์ด้วยแสงของพืช?)',
            options: ['A. Chloroplast (คลอโรพลาสต์)', 'B. Mitochondria (ไมโทคอนเดรีย)', 'C. Ribosome (ไรโบโซม)', 'D. Nucleus (นิวเคลียส)'],
            correctAnswer: 'A',
            explanation: 'Chloroplasts contain chlorophyll and carry out photosynthesis.',
            points: 1
          },
          {
            id: 'Q2',
            type: 'SA',
            text: 'What is the specific name of the primary photosynthetic pigment in plants? (สารสีหลักที่ใช้ในการสังเคราะห์ด้วยแสงของพืชมีชื่อจำเพาะว่าอะไร?)',
            options: [],
            correctAnswer: 'Chlorophyll',
            explanation: 'Chlorophyll is the primary green pigment in plants.',
            points: 1
          },
          {
            id: 'Q3',
            type: 'TF',
            text: 'Plants release carbon dioxide as the main byproduct of photosynthesis. (พืชปล่อยแก๊สคาร์บอนไดออกไซด์เป็นผลพลอยได้หลักของการสังเคราะห์ด้วยแสง ใช่หรือไม่?)',
            options: ['True', 'False'],
            correctAnswer: 'False',
            explanation: 'Plants release oxygen (O2) during photosynthesis.',
            points: 1
          },
          {
            id: 'Q4',
            type: 'MC',
            text: 'Which gas do plants absorb from the atmosphere during photosynthesis? (พืชดูดแก๊สใดจากบรรยากาศเพื่อใช้สังเคราะห์ด้วยแสง?)',
            options: ['A. Nitrogen', 'B. Oxygen', 'C. Carbon dioxide', 'D. Hydrogen'],
            correctAnswer: 'C',
            explanation: 'Carbon dioxide (CO2) is fixed during the Calvin cycle.',
            points: 1
          },
          {
            id: 'Q5',
            type: 'MC',
            text: 'Where do the light-dependent reactions of photosynthesis take place? (ปฏิกิริยาใช้แสงเกิดขึ้นที่ส่วนใดของคลอโรพลาสต์?)',
            options: ['A. Stroma', 'B. Thylakoid membrane', 'C. Cell wall', 'D. Cytoplasm'],
            correctAnswer: 'B',
            explanation: 'Light-dependent reactions occur in the thylakoid membrane.',
            points: 1
          }
        ]
      },
      {
        id: thaiQuizId,
        title: 'แบบทดสอบพื้นฐานอิเล็กทรอนิกส์ (Basic Electronics)',
        subject: 'วิศวกรรมไฟฟ้า / อิเล็กทรอนิกส์',
        shareCode: 'SOC-889201',
        createdAt: '2026-11-16T08:30:00.000Z',
        updatedAt: '2026-11-16T08:30:00.000Z',
        questions: [
          {
            id: 'TQ1',
            type: 'MC',
            text: 'ตามกฎของโอห์ม (Ohm\'s Law) ความสัมพันธ์ระหว่างแรงดัน (V) กระแส (I) และความต้านทาน (R) ข้อใดถูกต้อง?',
            options: ['A. V = I × R', 'B. V = I / R', 'C. R = V × I', 'D. I = V × R'],
            correctAnswer: 'A',
            explanation: 'แรงดันไฟฟ้า (V) เท่ากับ กระแสไฟฟ้า (I) คูณกับความต้านทาน (R)',
            points: 1
          },
          {
            id: 'TQ2',
            type: 'TF',
            text: 'ไดโอด (Diode) เป็นอุปกรณ์สารกึ่งตัวนำที่ยอมให้กระแสไฟฟ้าไหลผ่านได้ทิศทางเดียว',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'ไดโอดยอมให้กระแสไหลผ่านเมื่อไบอัสตรง (Forward Bias)',
            points: 1
          },
          {
            id: 'TQ3',
            type: 'SA',
            text: 'หน่วยวัดค่าความต้านทานไฟฟ้าคืออะไร?',
            options: [],
            correctAnswer: 'โอห์ม',
            explanation: 'หน่วยวัดความต้านทานไฟฟ้าคือ โอห์ม (Ohm, Ω)',
            points: 1
          }
        ]
      }
    ],
    activeSession: {
      id: defaultSessionId,
      roomCode: 'BASICCHANA',
      quizId: defaultQuizId,
      quizTitle: 'Life Science Quiz',
      activityType: 'quiz',
      status: 'active',
      settings: { instantFeedback: true, shuffle: false },
      startedAt: '2026-11-16T08:40:00.000Z'
    },
    // ข้อมูลนักเรียน 6 คนเริ่มต้นให้ตรงกับรูปที่ 1 เป๊ะ
    responses: [
      {
        id: 'R1',
        sessionId: defaultSessionId,
        roomCode: 'BASICCHANA',
        studentId: 'STU_ETHAN',
        studentName: 'Nguyen, Ethan',
        answers: {
          0: { value: 'A', isCorrect: true },
          1: { value: 'Chlorophyll', isCorrect: true }
        },
        score: 2,
        percent: 40,
        updatedAt: '2026-11-16T08:45:00.000Z'
      },
      {
        id: 'R2',
        sessionId: defaultSessionId,
        roomCode: 'BASICCHANA',
        studentId: 'STU_OLIVIA',
        studentName: 'Johnson, Olivia',
        answers: {
          0: { value: 'B', isCorrect: false }
        },
        score: 0,
        percent: 0,
        updatedAt: '2026-11-16T08:45:10.000Z'
      },
      {
        id: 'R3',
        sessionId: defaultSessionId,
        roomCode: 'BASICCHANA',
        studentId: 'STU_ADRIAN',
        studentName: 'Rodriguez, Adrian',
        answers: {
          0: { value: 'A', isCorrect: true }
        },
        score: 1,
        percent: 20,
        updatedAt: '2026-11-16T08:45:20.000Z'
      },
      {
        id: 'R4',
        sessionId: defaultSessionId,
        roomCode: 'BASICCHANA',
        studentId: 'STU_CHLOE',
        studentName: 'Kim, Chloe',
        answers: {
          0: { value: 'B', isCorrect: false },
          1: { value: 'Green pigment', isCorrect: false }
        },
        score: 0,
        percent: 0,
        updatedAt: '2026-11-16T08:45:30.000Z'
      },
      {
        id: 'R5',
        sessionId: defaultSessionId,
        roomCode: 'BASICCHANA',
        studentId: 'STU_JANA',
        studentName: 'Makhoul, Jana',
        answers: {},
        score: 0,
        percent: 0,
        updatedAt: '2026-11-16T08:45:40.000Z'
      },
      {
        id: 'R6',
        sessionId: defaultSessionId,
        roomCode: 'BASICCHANA',
        studentId: 'STU_MIA',
        studentName: 'Martinez, Mia',
        answers: {
          0: { value: 'B', isCorrect: false }
        },
        score: 0,
        percent: 0,
        updatedAt: '2026-11-16T08:45:50.000Z'
      }
    ]
  };
}

let appState = loadAppState();
let builderEditingQuizId = null;
let builderQuestions = [];
let pendingLaunchType = 'quiz';

// Student state
let currentStudent = {
  id: '',
  name: '',
  roomCode: 'BASICCHANA',
  currentIndex: 0,
  selectedOption: '',
  answers: {}
};

// ================= INITIALIZATION =================
window.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  updateRoomBadges();
  renderQuizLibrary();
  renderLiveResultsTable();
  renderReportsList();

  // ปิดเมนู Add Quiz เมื่อคลิกข้างนอก
  document.addEventListener('click', (e) => {
    const pop = document.getElementById('addQuizPopover');
    const btn = document.getElementById('addQuizBtn');
    if (pop && pop.classList.contains('open')) {
      if (!pop.contains(e.target) && !btn.contains(e.target)) {
        pop.classList.remove('open');
      }
    }
  });

  // ตรวจสอบ URL พารามิเตอร์ว่าเปิดจากมือถือของนักเรียนหรือไม่ (?mode=student&room=...)
  const params = new URLSearchParams(window.location.search);
  if (params.get('room')) {
    appSettings.roomCode = params.get('room').toUpperCase();
    document.getElementById('stuRoomInput').value = appSettings.roomCode;
    updateRoomBadges();
  }
  if (params.get('mode') === 'student') {
    toggleStudentPortalMode(true);
  }

  // รับข้อมูล Real-time ข้ามแท็บ
  if (liveChannel) {
    liveChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'STATE_UPDATED') {
        appState = loadAppState();
        renderLiveResultsTable();
        renderQuizLibrary();
        renderReportsList();
      }
    };
  }

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      appState = loadAppState();
      renderLiveResultsTable();
      renderQuizLibrary();
    }
  });

  // ซิงค์ข้อมูลกับ Google Sheets อัตโนมัติทุก 4 วินาทีหากตั้งค่า URL ไว้
  setInterval(() => {
    if (appSettings.gasWebAppUrl) {
      pollLiveFromGoogleSheet();
    }
  }, 4000);
});

function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = getInitialSeedState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch (e) {
    return getInitialSeedState();
  }
}

function saveAppState(broadcast = true) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  if (broadcast && liveChannel) {
    liveChannel.postMessage({ type: 'STATE_UPDATED' });
  }
  renderLiveResultsTable();
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      appSettings = Object.assign(appSettings, saved);
    }
  } catch (e) {}
  if (!appSettings.gasWebAppUrl) {
    appSettings.gasWebAppUrl = DEFAULT_GAS_WEB_APP_URL;
  }
  document.getElementById('settingSheetDocUrl').value = appSettings.sheetDocUrl || 'https://docs.google.com/spreadsheets/u/0/';
  document.getElementById('settingGasWebAppUrl').value = appSettings.gasWebAppUrl || DEFAULT_GAS_WEB_APP_URL;
  document.getElementById('settingGeminiKey').value = appSettings.geminiApiKey || '';
  document.getElementById('roomCodeInput').value = appSettings.roomCode || 'BASICCHANA';
  updateDbStatusIndicator();

  // ซิงค์สร้างตารางฐานข้อมูลใน Google Sheets ให้อัตโนมัติเมื่อเปิดหน้าเว็บ
  if (appSettings.gasWebAppUrl) {
    callGoogleScript({ action: 'ping' });
  }
}

function saveAppSettings() {
  appSettings.sheetDocUrl = document.getElementById('settingSheetDocUrl').value.trim() || 'https://docs.google.com/spreadsheets/u/0/';
  appSettings.gasWebAppUrl = document.getElementById('settingGasWebAppUrl').value.trim();
  appSettings.geminiApiKey = document.getElementById('settingGeminiKey').value.trim();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
  updateDbStatusIndicator();
  closeModal('settingsModal');
  showToast('บันทึกการตั้งค่า Google Sheets & AI เรียบร้อยแล้ว');
  if (appSettings.gasWebAppUrl) {
    syncAllToGoogleSheets();
  }
}

function updateDbStatusIndicator() {
  const dot = document.getElementById('dbStatusDot');
  const txt = document.getElementById('dbStatusText');
  if (appSettings.gasWebAppUrl) {
    dot.style.background = '#22c55e';
    txt.textContent = 'Google Sheets: เชื่อมต่อแล้ว';
  } else {
    dot.style.background = '#f59e0b';
    txt.textContent = 'ตั้งค่า Google Sheet / AI';
  }
}

// ================= NAVIGATION & TABS =================
function switchTab(tabName) {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active');
  });
  const target = document.getElementById('view-' + tabName);
  if (target) target.classList.add('active');

  if (tabName === 'library') renderQuizLibrary();
  if (tabName === 'live') renderLiveResultsTable();
  if (tabName === 'reports') renderReportsList();
  if (tabName === 'rooms') updateRoomBadges();
}

function toggleStudentPortalMode(forceStudent) {
  const isCurrentlyStudent = document.getElementById('view-student').classList.contains('active');
  const goStudent = forceStudent !== undefined ? forceStudent : !isCurrentlyStudent;

  document.getElementById('teacherNavbar').style.display = goStudent ? 'none' : 'flex';
  document.getElementById('studentNavbar').style.display = goStudent ? 'flex' : 'none';

  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  if (goStudent) {
    document.getElementById('view-student').classList.add('active');
    document.getElementById('stuRoomInput').value = appSettings.roomCode;
    document.getElementById('studentRoomBadge').textContent = 'ROOM: ' + appSettings.roomCode;
  } else {
    switchTab('live');
  }
}

function updateRoomBadges() {
  const code = (appSettings.roomCode || 'BASICCHANA').toUpperCase();
  document.getElementById('navRoomName').textContent = code;
  document.getElementById('inviteRoomCodeBig').textContent = code;
  const baseUrl = window.location.origin + window.location.pathname;
  const inviteUrl = `${baseUrl}?mode=student&room=${encodeURIComponent(code)}`;
  const urlDisplay = document.getElementById('studentDirectUrlDisplay');
  if (urlDisplay) urlDisplay.textContent = inviteUrl;
  const inviteInput = document.getElementById('inviteUrlInput');
  if (inviteInput) inviteInput.value = inviteUrl;
}

function saveRoomCode() {
  const val = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  if (!val) return showToast('กรุณาระบุชื่อห้องสอบ');
  appSettings.roomCode = val;
  if (appState.activeSession) {
    appState.activeSession.roomCode = val;
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
  saveAppState();
  updateRoomBadges();
  showToast('เปลี่ยนชื่อห้องสอบเป็น ' + val + ' เรียบร้อยแล้ว');
}

function copyStudentLink() {
  const baseUrl = window.location.origin + window.location.pathname;
  const inviteUrl = `${baseUrl}?mode=student&room=${encodeURIComponent(appSettings.roomCode)}`;
  navigator.clipboard.writeText(inviteUrl).then(() => {
    showToast('คัดลอกลิงก์เข้าสอบสำหรับมือถือเรียบร้อยแล้ว!');
  });
}

// ================= LIBRARY & ADD QUIZ MENU (IMAGE 3) =================
function toggleAddQuizMenu(e) {
  e.stopPropagation();
  const pop = document.getElementById('addQuizPopover');
  pop.classList.toggle('open');
}

function renderQuizLibrary() {
  const container = document.getElementById('quizListContainer');
  if (!container) return;
  const keyword = (document.getElementById('quizSearchInput')?.value || '').toLowerCase().trim();
  const quizzes = (appState.quizzes || []).filter(q =>
    q.title.toLowerCase().includes(keyword) ||
    (q.subject || '').toLowerCase().includes(keyword) ||
    (q.shareCode || '').toLowerCase().includes(keyword)
  );

  if (quizzes.length === 0) {
    container.innerHTML = `
      <div style="padding:42px;text-align:center;color:#6b7280;">
        ยังไม่มีชุดข้อสอบที่ตรงกับการค้นหา คลิกปุ่ม <b>+ Add Quiz</b> ด้านบนเพื่อสร้างข้อสอบใหม่
      </div>`;
    return;
  }

  container.innerHTML = quizzes.map(q => {
    const qCount = (q.questions || []).length;
    const dateStr = q.updatedAt ? new Date(q.updatedAt).toLocaleDateString('th-TH') : '-';
    return `
      <div class="quiz-row">
        <div class="quiz-info-main">
          <div class="quiz-doc-icon">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
          <div>
            <div class="quiz-name" onclick="editExistingQuiz('${q.id}')">${escapeHtml(q.title)}</div>
            <div class="quiz-meta">
              <span>${qCount} ข้อ</span>
              <span>•</span>
              <span>วิชา: ${escapeHtml(q.subject || 'ทั่วไป')}</span>
              <span>•</span>
              <span class="soc-code-pill">${escapeHtml(q.shareCode || 'SOC-100000')}</span>
              <span>•</span>
              <span>อัปเดต ${dateStr}</span>
            </div>
          </div>
        </div>
        <div class="quiz-row-actions">
          <button class="btn-primary-blue" style="padding:7px 12px;font-size:0.82rem;" onclick="quickStartQuizFromLibrary('${q.id}')">
            ▶ เปิดสอบ (Launch)
          </button>
          <button class="btn-outline" style="padding:7px 12px;font-size:0.82rem;" onclick="editExistingQuiz('${q.id}')">
            ✏️ แก้ไข
          </button>
          <button class="btn-outline" style="padding:7px 12px;font-size:0.82rem;" onclick="duplicateQuiz('${q.id}')">
            📋 คัดลอก
          </button>
          <button class="btn-outline" style="padding:7px 10px;font-size:0.82rem;color:#dc2626;" onclick="deleteQuizById('${q.id}')">
            🗑
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// เปิดหน้าต่างสร้างข้อสอบตามโหมดทั้ง 5 ของรูปที่ 3
function openCreateQuizFeature(mode, existingQuiz = null) {
  const pop = document.getElementById('addQuizPopover');
  if (pop) pop.classList.remove('open');

  if (!existingQuiz && !document.getElementById('createQuizModal').classList.contains('open')) {
    builderEditingQuizId = null;
    document.getElementById('builderQuizTitle').value = '';
    document.getElementById('builderQuizSubject').value = 'วิทยาศาสตร์ / ทั่วไป';
    builderQuestions = [];
    if (mode === 'blank') {
      addBlankQuestionToBuilder('MC', false);
    }
  }

  // Highlight active mode pill
  document.querySelectorAll('.mode-pill').forEach(btn => {
    btn.style.borderColor = '#d1d5db';
    btn.style.background = '#ffffff';
    btn.style.color = '#374151';
  });
  const activePill = document.getElementById('tabMode-' + mode);
  if (activePill) {
    activePill.style.borderColor = '#1a9bd7';
    activePill.style.background = '#f0f9ff';
    activePill.style.color = '#0284c7';
  }

  document.querySelectorAll('.create-feature-panel').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('panel-' + mode);
  if (panel) panel.style.display = 'block';

  const titles = {
    ai: '✨ Generate Questions with AI (สร้างข้อสอบด้วย AI หรือจากไฟล์)',
    extract: '📄 Extract Questions from Document (ดึงข้อสอบจากไฟล์ Word / PDF / Excel)',
    copypaste: '📋 Copy-Paste Questions (วางข้อความข้อสอบเพื่อแยกอัตโนมัติ)',
    excelcode: '📊 Import Questions from Code or Excel Template',
    blank: '✏️ สร้าง / แก้ไขชุดข้อสอบ (Blank Quiz Builder)'
  };
  document.getElementById('createModalTitle').textContent = titles[mode] || 'สร้างชุดข้อสอบ';

  renderBuilderQuestions();
  openModal('createQuizModal');
}

function editExistingQuiz(quizId) {
  const quiz = appState.quizzes.find(q => q.id === quizId);
  if (!quiz) return;
  builderEditingQuizId = quiz.id;
  document.getElementById('builderQuizTitle').value = quiz.title;
  document.getElementById('builderQuizSubject').value = quiz.subject || 'ทั่วไป';
  builderQuestions = JSON.parse(JSON.stringify(quiz.questions || []));
  openCreateQuizFeature('blank', quiz);
}

function duplicateQuiz(quizId) {
  const quiz = appState.quizzes.find(q => q.id === quizId);
  if (!quiz) return;
  const copy = JSON.parse(JSON.stringify(quiz));
  copy.id = 'QUIZ_' + Date.now();
  copy.title = quiz.title + ' (Copy)';
  copy.shareCode = 'SOC-' + Math.floor(100000 + Math.random() * 900000);
  copy.updatedAt = new Date().toISOString();
  appState.quizzes.unshift(copy);
  saveAppState();
  renderQuizLibrary();
  syncQuizToGoogleSheet(copy);
  showToast('คัดลอกชุดข้อสอบเรียบร้อยแล้ว');
}

function deleteQuizById(quizId) {
  if (!confirm('ต้องการลบชุดข้อสอบนี้ใช่หรือไม่?')) return;
  appState.quizzes = appState.quizzes.filter(q => q.id !== quizId);
  saveAppState();
  renderQuizLibrary();
  if (appSettings.gasWebAppUrl) {
    callGoogleScript({ action: 'deleteQuiz', quiz_id: quizId });
  }
  showToast('ลบชุดข้อสอบเรียบร้อยแล้ว');
}

// ================= QUESTION BUILDER UI =================
function addBlankQuestionToBuilder(type = 'MC', shouldRender = true) {
  const newQ = {
    id: 'Q_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    type: type,
    text: '',
    options: type === 'MC' ? ['A. ตัวเลือกที่ 1', 'B. ตัวเลือกที่ 2', 'C. ตัวเลือกที่ 3', 'D. ตัวเลือกที่ 4']
      : (type === 'TF' ? ['True', 'False'] : []),
    correctAnswer: type === 'MC' ? 'A' : (type === 'TF' ? 'True' : ''),
    explanation: '',
    points: 1
  };
  builderQuestions.push(newQ);
  if (shouldRender) renderBuilderQuestions();
}

function renderBuilderQuestions() {
  const listEl = document.getElementById('builderQuestionsList');
  const countEl = document.getElementById('builderQuestionCount');
  countEl.textContent = builderQuestions.length;

  if (builderQuestions.length === 0) {
    listEl.innerHTML = `
      <div style="padding:24px;text-align:center;color:#64748b;background:#f8fafc;border-radius:10px;border:1px dashed #cbd5e1;">
        ยังไม่มีข้อสอบในรายการ สามารถอัปโหลดไฟล์ Word / PDF / Excel, ใช้ AI สร้าง หรือกดปุ่ม <b>+ เพิ่มข้อปรนัย (MC)</b> ด้านบนได้เลย
      </div>`;
    return;
  }

  listEl.innerHTML = builderQuestions.map((q, idx) => {
    let optionsHtml = '';
    if (q.type === 'MC') {
      const letters = ['A', 'B', 'C', 'D', 'E'];
      optionsHtml = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
          ${(q.options || ['', '', '', '']).map((opt, oIdx) => {
            const letter = letters[oIdx] || String.fromCharCode(65 + oIdx);
            const isChecked = String(q.correctAnswer).toUpperCase() === letter;
            return `
              <div style="display:flex;align-items:center;gap:6px;">
                <input type="radio" name="correct_${idx}" ${isChecked ? 'checked' : ''}
                  onchange="updateBuilderQuestion(${idx}, 'correctAnswer', '${letter}')" title="ตั้งเป็นข้อที่ถูกต้อง" />
                <span style="font-weight:700;font-size:0.84rem;width:18px;">${letter}.</span>
                <input type="text" class="form-input" style="padding:7px 10px;font-size:0.86rem;"
                  value="${escapeHtml(opt.replace(/^[A-Eก-ง][\.\)\s]+/i, ''))}"
                  oninput="updateBuilderOption(${idx}, ${oIdx}, this.value)" />
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else if (q.type === 'TF') {
      optionsHtml = `
        <div style="display:flex;gap:16px;margin-top:10px;">
          <label style="display:flex;align-items:center;gap:6px;font-weight:600;font-size:0.9rem;">
            <input type="radio" name="correct_${idx}" ${String(q.correctAnswer).toLowerCase() === 'true' ? 'checked' : ''}
              onchange="updateBuilderQuestion(${idx}, 'correctAnswer', 'True')" /> True (ถูก)
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-weight:600;font-size:0.9rem;">
            <input type="radio" name="correct_${idx}" ${String(q.correctAnswer).toLowerCase() === 'false' ? 'checked' : ''}
              onchange="updateBuilderQuestion(${idx}, 'correctAnswer', 'False')" /> False (ผิด)
          </label>
        </div>
      `;
    } else {
      optionsHtml = `
        <div style="margin-top:10px;">
          <label style="font-size:0.8rem;font-weight:600;color:#166534;">คำตอบที่ถูกต้อง (Short Answer Key):</label>
          <input type="text" class="form-input" style="padding:7px 10px;font-size:0.88rem;margin-top:4px;"
            placeholder="เช่น Chlorophyll หรือ คลอโรฟิลล์"
            value="${escapeHtml(q.correctAnswer || '')}"
            oninput="updateBuilderQuestion(${idx}, 'correctAnswer', this.value)" />
        </div>
      `;
    }

    return `
      <div class="q-builder-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="soc-code-pill" style="background:#0284c7;color:#fff;">ข้อที่ ${idx + 1}</span>
            <select class="form-select" style="width:auto;padding:4px 10px;font-size:0.82rem;"
              onchange="changeBuilderQuestionType(${idx}, this.value)">
              <option value="MC" ${q.type === 'MC' ? 'selected' : ''}>Multiple Choice (ปรนัย)</option>
              <option value="TF" ${q.type === 'TF' ? 'selected' : ''}>True / False (ถูก-ผิด)</option>
              <option value="SA" ${q.type === 'SA' ? 'selected' : ''}>Short Answer (เติมคำ)</option>
            </select>
          </div>
          <button class="btn-outline" style="padding:4px 8px;font-size:0.78rem;color:#dc2626;" onclick="removeBuilderQuestion(${idx})">
            ลบข้อนี้
          </button>
        </div>
        <input type="text" class="form-input" placeholder="พิมพ์โจทย์คำถามข้อที่ ${idx + 1}..."
          value="${escapeHtml(q.text)}"
          oninput="updateBuilderQuestion(${idx}, 'text', this.value)" />
        ${optionsHtml}
      </div>
    `;
  }).join('');
}

function updateBuilderQuestion(idx, field, val) {
  if (!builderQuestions[idx]) return;
  builderQuestions[idx][field] = val;
}

function updateBuilderOption(qIdx, optIdx, val) {
  if (!builderQuestions[qIdx]) return;
  const letter = String.fromCharCode(65 + optIdx);
  builderQuestions[qIdx].options[optIdx] = `${letter}. ${val}`;
}

function changeBuilderQuestionType(idx, newType) {
  const q = builderQuestions[idx];
  if (!q) return;
  q.type = newType;
  if (newType === 'MC') {
    q.options = ['A. ตัวเลือก 1', 'B. ตัวเลือก 2', 'C. ตัวเลือก 3', 'D. ตัวเลือก 4'];
    q.correctAnswer = 'A';
  } else if (newType === 'TF') {
    q.options = ['True', 'False'];
    q.correctAnswer = 'True';
  } else {
    q.options = [];
    q.correctAnswer = '';
  }
  renderBuilderQuestions();
}

function removeBuilderQuestion(idx) {
  builderQuestions.splice(idx, 1);
  renderBuilderQuestions();
}

function saveBuilderQuiz() {
  const title = document.getElementById('builderQuizTitle').value.trim() || 'ชุดข้อสอบใหม่ (' + new Date().toLocaleDateString('th-TH') + ')';
  const subject = document.getElementById('builderQuizSubject').value.trim() || 'ทั่วไป';

  if (builderQuestions.length === 0) {
    return showToast('กรุณาเพิ่มคำถามอย่างน้อย 1 ข้อก่อนบันทึก');
  }

  const now = new Date().toISOString();
  let savedQuiz = null;

  if (builderEditingQuizId) {
    const idx = appState.quizzes.findIndex(q => q.id === builderEditingQuizId);
    if (idx !== -1) {
      appState.quizzes[idx].title = title;
      appState.quizzes[idx].subject = subject;
      appState.quizzes[idx].questions = builderQuestions;
      appState.quizzes[idx].updatedAt = now;
      savedQuiz = appState.quizzes[idx];
    }
  }

  if (!savedQuiz) {
    savedQuiz = {
      id: 'QUIZ_' + Date.now(),
      title: title,
      subject: subject,
      shareCode: 'SOC-' + Math.floor(100000 + Math.random() * 900000),
      createdAt: now,
      updatedAt: now,
      questions: builderQuestions
    };
    appState.quizzes.unshift(savedQuiz);
  }

  saveAppState();
  renderQuizLibrary();
  closeModal('createQuizModal');
  syncQuizToGoogleSheet(savedQuiz);
  showToast(`บันทึกชุดข้อสอบ "${title}" (${builderQuestions.length} ข้อ) เรียบร้อยแล้ว!`);
}

// ================= WORD (.docx), PDF (.pdf), EXCEL (.xlsx) PARSER =================
async function handleDocumentUpload(event, sourceMode) {
  const file = event.target.files[0];
  if (!file) return;

  const statusBox = document.getElementById('extractStatusBox');
  if (statusBox) statusBox.textContent = `⏳ กำลังอ่านไฟล์ "${file.name}" ...`;
  showToast(`กำลังสกัดข้อสอบจากไฟล์ ${file.name}...`);

  if (!document.getElementById('builderQuizTitle').value) {
    document.getElementById('builderQuizTitle').value = file.name.replace(/\.[^/.]+$/, '');
  }

  const ext = file.name.split('.').pop().toLowerCase();

  try {
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
      const parsed = parseExcelRowsToQuestions(rows);
      if (parsed.length > 0) {
        builderQuestions = builderQuestions.concat(parsed);
        renderBuilderQuestions();
        if (statusBox) statusBox.textContent = `✅ ดึงข้อสอบจากไฟล์ Excel สำเร็จ ${parsed.length} ข้อ!`;
        showToast(`ดึงข้อสอบจาก Excel สำเร็จ ${parsed.length} ข้อ!`);
        return;
      }
      // Fallback: convert sheet to text and parse
      const rawText = XLSX.utils.sheet_to_txt(workbook.Sheets[sheetName]);
      await extractQuestionsFromRawText(rawText, file.name);
    } else if (ext === 'docx') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
      await extractQuestionsFromRawText(result.value, file.name);
    } else if (ext === 'pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map(item => item.str);
        fullText += strings.join(' ') + '\n';
      }
      await extractQuestionsFromRawText(fullText, file.name);
    } else {
      const text = await file.text();
      await extractQuestionsFromRawText(text, file.name);
    }
  } catch (err) {
    console.error(err);
    if (statusBox) statusBox.textContent = `⚠️ เกิดข้อผิดพลาดในการอ่านไฟล์: ${err.message}`;
    showToast('ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบรูปแบบไฟล์');
  }
}

function parseExcelRowsToQuestions(rows) {
  const result = [];
  rows.forEach((row, idx) => {
    const keys = Object.keys(row);
    if (keys.length === 0) return;

    // รองรับทั้งหัวตารางภาษาไทยและอังกฤษ
    const qText = row['Question'] || row['question'] || row['โจทย์'] || row['คำถาม'] || row[keys[0]] || '';
    if (!String(qText).trim() || String(qText).toLowerCase() === 'question') return;

    const rawType = String(row['Type'] || row['type'] || row['ประเภท'] || 'MC').toUpperCase();
    const optA = row['Option A'] || row['A'] || row['ก'] || row['ตัวเลือก A'] || row[keys[1]] || '';
    const optB = row['Option B'] || row['B'] || row['ข'] || row['ตัวเลือก B'] || row[keys[2]] || '';
    const optC = row['Option C'] || row['C'] || row['ค'] || row['ตัวเลือก C'] || row[keys[3]] || '';
    const optD = row['Option D'] || row['D'] || row['ง'] || row['ตัวเลือก D'] || row[keys[4]] || '';
    let ans = String(row['Answer'] || row['Correct'] || row['เฉลย'] || row['คำตอบ'] || row[keys[5]] || 'A').trim();

    const mapThaiToEng = { 'ก': 'A', 'ข': 'B', 'ค': 'C', 'ง': 'D' };
    if (mapThaiToEng[ans]) ans = mapThaiToEng[ans];

    let type = 'MC';
    if (rawType.includes('TF') || rawType.includes('TRUE')) type = 'TF';
    else if (rawType.includes('SA') || rawType.includes('SHORT')) type = 'SA';
    else if (!optA && !optB) type = 'SA';

    result.push({
      id: 'Q_XLS_' + Date.now() + '_' + idx,
      type: type,
      text: String(qText).trim(),
      options: type === 'MC'
        ? [`A. ${optA}`, `B. ${optB}`, `C. ${optC}`, `D. ${optD}`]
        : (type === 'TF' ? ['True', 'False'] : []),
      correctAnswer: type === 'MC' ? ans.toUpperCase().charAt(0) : ans,
      explanation: String(row['Explanation'] || row['คำอธิบาย'] || ''),
      points: 1
    });
  });
  return result;
}

async function extractQuestionsFromRawText(rawText, sourceName = '') {
  const statusBox = document.getElementById('extractStatusBox');

  // หากผู้ใช้ใส่ Gemini API Key ไว้ ให้ใช้ Gemini สกัดข้อสอบจากข้อความเอกสารได้แม่นยำสูงสุด
  if (appSettings.geminiApiKey && rawText.trim().length > 20) {
    try {
      if (statusBox) statusBox.textContent = '✨ กำลังใช้ Gemini AI วิเคราะห์และแยกข้อสอบจากเอกสาร...';
      const aiQuestions = await callGeminiToExtractQuestions(rawText);
      if (aiQuestions && aiQuestions.length > 0) {
        builderQuestions = builderQuestions.concat(aiQuestions);
        renderBuilderQuestions();
        if (statusBox) statusBox.textContent = `✅ สกัดข้อสอบด้วย AI สำเร็จ ${aiQuestions.length} ข้อ จาก "${sourceName}"`;
        showToast(`สกัดข้อสอบสำเร็จ ${aiQuestions.length} ข้อ!`);
        return;
      }
    } catch (e) {
      console.warn('Gemini fallback to local regex parser:', e);
    }
  }

  // ระบบ Smart Regex Parser (ทำงานได้ทันทีแม้ไม่ใส่ API Key รองรับทั้ง ก/ข/ค/ง และ A/B/C/D)
  const parsed = smartParseTextToQuestions(rawText);
  if (parsed.length > 0) {
    builderQuestions = builderQuestions.concat(parsed);
    renderBuilderQuestions();
    if (statusBox) statusBox.textContent = `✅ ดึงข้อสอบสำเร็จ ${parsed.length} ข้อ จาก "${sourceName}"`;
    showToast(`ดึงข้อสอบสำเร็จ ${parsed.length} ข้อ!`);
  } else {
    if (statusBox) statusBox.textContent = '⚠️ ไม่พบรูปแบบข้อสอบชัดเจน ระบบได้นำข้อความใส่ในช่อง Copy-Paste ให้ปรับแต่งต่อได้ทันที';
    document.getElementById('copyPasteTextarea').value = rawText;
    openCreateQuizFeature('copypaste');
  }
}

function smartParseTextToQuestions(text) {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return [];

  const blocks = clean.split(/\n(?=\s*(?:ข้อที่\s*\d+|ข้อ\s*\d+|\d+[\.\)\:]))/g);
  const questions = [];
  const thaiToEng = { 'ก': 'A', 'ข': 'B', 'ค': 'C', 'ง': 'D', 'จ': 'E' };

  blocks.forEach((block, bIdx) => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    let qLine = lines[0].replace(/^(?:ข้อที่\s*\d+|ข้อ\s*\d+|\d+)[\.\)\:\s]+/, '').trim();
    if (!qLine) return;

    const options = [];
    let correctAns = '';

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // ตรวจหาบรรทัดเฉลย เช่น "เฉลย: ข" หรือ "Answer: B"
      const ansMatch = line.match(/^(?:เฉลย|คำตอบ|Answer|Correct|Key)[\s\:\=\-]+([A-Eก-ง]|True|False|.+)$/i);
      if (ansMatch) {
        let rawAns = ansMatch[1].trim().replace(/[\.\)]$/, '');
        if (thaiToEng[rawAns]) rawAns = thaiToEng[rawAns];
        correctAns = rawAns;
        continue;
      }

      // ตรวจหาตัวเลือก A. B. C. D. หรือ ก. ข. ค. ง.
      const optMatch = line.match(/^([A-Dก-ง])[\.\)\s]+(.+)$/i);
      if (optMatch) {
        let keyChar = optMatch[1].toUpperCase();
        if (thaiToEng[keyChar]) keyChar = thaiToEng[keyChar];
        let optText = optMatch[2].trim();
        if (optText.endsWith('*')) {
          correctAns = keyChar;
          optText = optText.replace(/\*+$/, '').trim();
        }
        options.push(`${keyChar}. ${optText}`);
      }
    }

    let type = 'MC';
    if (options.length === 0) {
      if (/true\s*\/\s*false|ถูก\s*หรือ\s*ผิด|ใช่หรือไม่/i.test(block)) {
        type = 'TF';
      } else {
        type = 'SA';
      }
    }

    questions.push({
      id: 'Q_PARSE_' + Date.now() + '_' + bIdx,
      type: type,
      text: qLine,
      options: type === 'MC'
        ? (options.length >= 2 ? options : ['A. ตัวเลือก 1', 'B. ตัวเลือก 2', 'C. ตัวเลือก 3', 'D. ตัวเลือก 4'])
        : (type === 'TF' ? ['True', 'False'] : []),
      correctAnswer: correctAns || (type === 'MC' ? 'A' : (type === 'TF' ? 'True' : '')),
      explanation: '',
      points: 1
    });
  });

  return questions;
}

function parseCopyPasteText() {
  const raw = document.getElementById('copyPasteTextarea').value;
  if (!raw.trim()) return showToast('กรุณาวางข้อความข้อสอบก่อน');
  const parsed = smartParseTextToQuestions(raw);
  if (parsed.length === 0) {
    return showToast('ไม่พบรูปแบบข้อสอบ กรุณาขึ้นต้นข้อด้วยตัวเลข เช่น 1. โจทย์...');
  }
  builderQuestions = builderQuestions.concat(parsed);
  renderBuilderQuestions();
  showToast(`แปลงข้อความเป็นข้อสอบสำเร็จ ${parsed.length} ข้อ!`);
}

// ================= AI QUESTION GENERATOR (GEMINI + BUILT-IN FALLBACK) =================
async function generateQuestionsWithAI() {
  const promptText = document.getElementById('aiPromptInput').value.trim();
  const count = Number(document.getElementById('aiQuestionCount').value || 5);
  const qType = document.getElementById('aiQuestionType').value || 'MIXED';

  if (!promptText) {
    return showToast('กรุณาพิมพ์หัวข้อหรือเนื้อหาที่ต้องการให้สร้างข้อสอบ');
  }

  if (!document.getElementById('builderQuizTitle').value) {
    document.getElementById('builderQuizTitle').value = promptText.substring(0, 45);
  }

  showToast('✨ กำลังสร้างข้อสอบอัตโนมัติ...');

  if (appSettings.geminiApiKey) {
    try {
      const prompt = `สร้างข้อสอบจำนวน ${count} ข้อ ในหัวข้อ: "${promptText}" รูปแบบคำถาม: ${qType} (MC=ปรนัย 4 ตัวเลือก A-D, TF=True/False, SA=เติมคำตอบสั้นๆ) ตอบกลับเป็น JSON Array เท่านั้น ตามโครงสร้าง: [{"type":"MC","text":"โจทย์","options":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"A","explanation":"..."}]`;
      const generated = await callGeminiToExtractQuestions(prompt);
      if (generated && generated.length > 0) {
        builderQuestions = builderQuestions.concat(generated);
        renderBuilderQuestions();
        showToast(`✨ สร้างข้อสอบด้วย Gemini AI สำเร็จ ${generated.length} ข้อ!`);
        return;
      }
    } catch (err) {
      console.warn('Gemini API error, using smart built-in generator:', err);
    }
  }

  // Built-in Smart Topic Question Generator (ทำงานได้ทันทีแม้ไม่มี API Key)
  const generated = generateBuiltInQuestions(promptText, count, qType);
  builderQuestions = builderQuestions.concat(generated);
  renderBuilderQuestions();
  showToast(`✨ สร้างข้อสอบสำเร็จ ${generated.length} ข้อ!`);
}

async function callGeminiToExtractQuestions(contentOrPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(appSettings.geminiApiKey)}`;
  const systemInstruction = `คุณคือระบบสกัดและสร้างข้อสอบอัจฉริยะ ให้แปลงข้อมูลที่ได้รับเป็น JSON Array ของข้อสอบเท่านั้น ห้ามมี Markdown คั่น โครงสร้างแต่ละข้อคือ: {"type": "MC" หรือ "TF" หรือ "SA", "text": "โจทย์คำถาม", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctAnswer": "A หรือ True หรือ คำตอบสั้น", "explanation": "คำอธิบายเฉลย"}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemInstruction + '\n\nเนื้อหา:\n' + contentOrPrompt }] }]
    })
  });
  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Invalid JSON from AI');
  const arr = JSON.parse(jsonMatch[0]);
  return arr.map((item, idx) => ({
    id: 'Q_AI_' + Date.now() + '_' + idx,
    type: item.type || 'MC',
    text: item.text || '',
    options: item.options || [],
    correctAnswer: item.correctAnswer || 'A',
    explanation: item.explanation || '',
    points: 1
  }));
}

function generateBuiltInQuestions(topic, count, prefType) {
  const templates = [
    {
      type: 'MC',
      text: `ข้อใดอธิบายหลักการสำคัญของ "${topic}" ได้ถูกต้องที่สุด?`,
      options: [
        `A. เป็นกระบวนการหลักที่ช่วยให้ระบบของ ${topic} ทำงานได้อย่างสมดุลและมีประสิทธิภาพ`,
        `B. เป็นส่วนประกอบรองที่ไม่มีผลต่อการทำงานหลัก`,
        `C. เกิดขึ้นเฉพาะในสภาวะสุญญากาศเท่านั้น`,
        `D. ไม่มีข้อใดกล่าวถูกต้อง`
      ],
      correctAnswer: 'A'
    },
    {
      type: 'TF',
      text: `การศึกษาและทำความเข้าใจเรื่อง "${topic}" สามารถนำไปประยุกต์ใช้แก้ปัญหาในสถานการณ์จริงได้ ใช่หรือไม่?`,
      options: ['True', 'False'],
      correctAnswer: 'True'
    },
    {
      type: 'SA',
      text: `จงระบุคำสำคัญ (Keyword) หรือหัวใจหลักของเรื่อง "${topic}" มา 1 คำ`,
      options: [],
      correctAnswer: topic.split(' ')[0] || topic
    },
    {
      type: 'MC',
      text: `ปัจจัยในข้อใดส่งผลโดยตรงต่อประสิทธิภาพของ "${topic}" มากที่สุด?`,
      options: [
        `A. ความเข้าใจในโครงสร้างและองค์ประกอบพื้นฐาน`,
        `B. การสุ่มค่าพารามิเตอร์โดยไม่วัดผล`,
        `C. การตัดขั้นตอนการตรวจสอบออกทั้งหมด`,
        `D. การใช้ข้อมูลที่ไม่เกี่ยวข้องมาวิเคราะห์`
      ],
      correctAnswer: 'A'
    },
    {
      type: 'MC',
      text: `ข้อใดคือผลลัพธ์ที่ได้จากการประยุกต์ใช้ "${topic}" อย่างถูกต้อง?`,
      options: [
        `A. ได้ผลลัพธ์ที่แม่นยำ ตรวจสอบได้ และตรงตามวัตถุประสงค์`,
        `B. ทำให้ขั้นตอนซับซ้อนขึ้นโดยไม่เกิดผลลัพธ์`,
        `C. ไม่สามารถวัดผลการทำงานได้`,
        `D. เกิดความคลาดเคลื่อนสูงกว่ามาตรฐาน`
      ],
      correctAnswer: 'A'
    }
  ];

  const out = [];
  for (let i = 0; i < count; i++) {
    const base = templates[i % templates.length];
    const finalType = prefType === 'MIXED' ? base.type : prefType;
    out.push({
      id: 'Q_GEN_' + Date.now() + '_' + i,
      type: finalType,
      text: `(${i + 1}) ` + base.text,
      options: finalType === 'MC'
        ? base.options
        : (finalType === 'TF' ? ['True', 'False'] : []),
      correctAnswer: finalType === 'MC' ? 'A' : (finalType === 'TF' ? 'True' : (topic.split(' ')[0] || 'ถูกต้อง')),
      explanation: `คำอธิบายเพิ่มเติมเกี่ยวกับ ${topic}`,
      points: 1
    });
  }
  return out;
}

// ================= EXCEL TEMPLATE DOWNLOAD & SHARE CODE IMPORT =================
function downloadExcelQuizTemplate() {
  const sampleRows = [
    {
      'Type': 'MC',
      'Question': 'สารสีเขียวในใบพืชที่ทำหน้าที่ดูดกลืนแสงคืออะไร?',
      'Option A': 'Chlorophyll',
      'Option B': 'Carotenoid',
      'Option C': 'Hemoglobin',
      'Option D': 'Melanin',
      'Answer': 'A',
      'Explanation': 'คลอโรฟิลล์ (Chlorophyll) เป็นสารสีหลักในการสังเคราะห์ด้วยแสง'
    },
    {
      'Type': 'TF',
      'Question': 'พืชใช้แก๊สคาร์บอนไดออกไซด์ในกระบวนการสังเคราะห์ด้วยแสง',
      'Option A': 'True',
      'Option B': 'False',
      'Option C': '',
      'Option D': '',
      'Answer': 'True',
      'Explanation': ''
    },
    {
      'Type': 'SA',
      'Question': 'ออร์แกเนลล์ใดในเซลล์พืชที่เกิดกระบวนการสังเคราะห์ด้วยแสง?',
      'Option A': '',
      'Option B': '',
      'Option C': '',
      'Option D': '',
      'Answer': 'Chloroplast',
      'Explanation': ''
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Quiz_Template');
  XLSX.writeFile(wb, 'Socrative_Quiz_Template.xlsx');
  showToast('ดาวน์โหลดไฟล์ Socrative_Quiz_Template.xlsx เรียบร้อยแล้ว');
}

function handleExcelTemplateUpload(event) {
  handleDocumentUpload(event, 'excelcode');
}

function importQuizByShareCode() {
  const code = document.getElementById('importShareCodeInput').value.trim().toUpperCase();
  if (!code) return showToast('กรุณากรอกรหัสชุดข้อสอบ เช่น SOC-104829');
  const found = appState.quizzes.find(q => String(q.shareCode).toUpperCase() === code);
  if (found) {
    builderQuestions = builderQuestions.concat(JSON.parse(JSON.stringify(found.questions)));
    document.getElementById('builderQuizTitle').value = found.title + ' (Imported)';
    renderBuilderQuestions();
    showToast(`นำเข้าข้อสอบจากรหัส ${code} สำเร็จ ${found.questions.length} ข้อ!`);
  } else {
    showToast(`ไม่พบรหัสชุดข้อสอบ ${code} ในคลังปัจจุบัน`);
  }
}

// ================= LAUNCH ACTIVITIES (IMAGE 2) =================
function openLaunchQuizModal(activityType = 'quiz') {
  pendingLaunchType = activityType;
  const sel = document.getElementById('launchSelectQuizId');
  sel.innerHTML = appState.quizzes.map(q =>
    `<option value="${q.id}">${escapeHtml(q.title)} (${q.questions.length} ข้อ)</option>`
  ).join('');
  document.getElementById('launchModalTitle').textContent =
    activityType === 'team' ? '🚀 เริ่มกิจกรรมแข่งขันเป็นทีม (Team Challenge)' : '📝 เลือกชุดข้อสอบเพื่อเริ่มสอบ (Launch Quiz)';
  openModal('launchQuizModal');
}

function confirmLaunchSelectedQuiz() {
  const quizId = document.getElementById('launchSelectQuizId').value;
  if (!quizId) return showToast('กรุณาเลือกชุดข้อสอบก่อน');
  closeModal('launchQuizModal');
  startNewLiveSession(quizId, pendingLaunchType);
}

function quickStartQuizFromLibrary(quizId) {
  startNewLiveSession(quizId, 'quiz');
}

function startNewLiveSession(quizId, activityType = 'quiz') {
  const quiz = appState.quizzes.find(q => q.id === quizId);
  if (!quiz) return;

  const newSession = {
    id: 'SESS_' + Date.now(),
    roomCode: appSettings.roomCode || 'BASICCHANA',
    quizId: quiz.id,
    quizTitle: quiz.title,
    activityType: activityType,
    status: 'active',
    settings: {
      instantFeedback: document.getElementById('launchSettingInstantFeedback')?.checked ?? true,
      shuffle: document.getElementById('launchSettingShuffle')?.checked ?? false
    },
    startedAt: new Date().toISOString()
  };

  appState.activeSession = newSession;
  saveAppState();

  if (appSettings.gasWebAppUrl) {
    callGoogleScript({ action: 'startSession', session: newSession });
  }

  switchTab('live');
  showToast(`🚀 เปิดห้องสอบ "${quiz.title}" ในห้อง ${newSession.roomCode} เรียบร้อยแล้ว!`);
}

function launchExitTicket() {
  const exitQuizId = 'QUIZ_EXIT_TICKET';
  let exitQuiz = appState.quizzes.find(q => q.id === exitQuizId);
  if (!exitQuiz) {
    exitQuiz = {
      id: exitQuizId,
      title: 'Exit Ticket (ประเมินความเข้าใจท้ายคาบ)',
      subject: 'ประเมินผลท้ายคาบ',
      shareCode: 'SOC-EXIT01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questions: [
        {
          id: 'EX1',
          type: 'MC',
          text: 'วันนี้คุณเข้าใจเนื้อหาที่เรียนมากน้อยเพียงใด?',
          options: ['A. เข้าใจดีมาก', 'B. เข้าใจพอสมควร', 'C. ยังสงสัยบางจุด', 'D. ไม่เข้าใจเลย'],
          correctAnswer: 'A',
          points: 1
        },
        {
          id: 'EX2',
          type: 'SA',
          text: 'สิ่งที่ได้เรียนรู้ในวันนี้คืออะไร?',
          options: [],
          correctAnswer: '',
          points: 1
        },
        {
          id: 'EX3',
          type: 'SA',
          text: 'คำตอบสำหรับโจทย์ที่ครูตั้งไว้บนกระดานคืออะไร?',
          options: [],
          correctAnswer: '',
          points: 1
        }
      ]
    };
    appState.quizzes.push(exitQuiz);
  }
  startNewLiveSession(exitQuizId, 'exit_ticket');
}

function launchQuickQuestion(qType) {
  const typeLabel = qType === 'MC' ? 'Multiple Choice' : (qType === 'TF' ? 'True / False' : 'Short Answer');
  const customAnswer = prompt(`เริ่มคำถามด่วน (${typeLabel}) - ระบุเฉลย (เว้นว่างได้):`, qType === 'MC' ? 'A' : (qType === 'TF' ? 'True' : ''));
  if (customAnswer === null) return;

  const quickQuiz = {
    id: 'QUIZ_QUICK_' + Date.now(),
    title: `Quick Question (${typeLabel})`,
    subject: 'Quick Question',
    shareCode: 'SOC-QUICK',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: [
      {
        id: 'QQ_1',
        type: qType,
        text: `คำถามด่วนจากครูผู้สอน (${typeLabel})`,
        options: qType === 'MC' ? ['A', 'B', 'C', 'D'] : (qType === 'TF' ? ['True', 'False'] : []),
        correctAnswer: customAnswer.trim() || (qType === 'MC' ? 'A' : 'True'),
        points: 1
      }
    ]
  };
  appState.quizzes.unshift(quickQuiz);
  startNewLiveSession(quickQuiz.id, 'quick');
}

// ================= LIVE RESULTS VIEW (IMAGE 1 EXACT REPLICA) =================
function renderLiveResultsTable() {
  const session = appState.activeSession;
  if (!session) return;

  const quiz = appState.quizzes.find(q => q.id === session.quizId) || appState.quizzes[0];
  if (!quiz) return;

  document.getElementById('liveQuizTitle').textContent = quiz.title;
  const statusPill = document.getElementById('liveStatusPill');
  const pauseText = document.getElementById('pauseBtnText');

  if (session.status === 'paused') {
    statusPill.textContent = '⏸ PAUSED';
    statusPill.style.background = '#fef3c7';
    statusPill.style.color = '#92400e';
    pauseText.textContent = 'Resume';
  } else if (session.status === 'finished') {
    statusPill.textContent = '☑ FINISHED';
    statusPill.style.background = '#e2e8f0';
    statusPill.style.color = '#334155';
    pauseText.textContent = 'Pause';
  } else {
    statusPill.textContent = '● LIVE';
    statusPill.style.background = '#dcfce7';
    statusPill.style.color = '#166534';
    pauseText.textContent = 'Pause';
  }

  const showNames = document.getElementById('toggleShowNames')?.checked ?? true;
  const showResponses = document.getElementById('toggleShowResponses')?.checked ?? true;
  const showResults = document.getElementById('toggleShowResults')?.checked ?? true;

  const questions = quiz.questions || [];
  const responses = (appState.responses || []).filter(r => r.sessionId === session.id);

  // Update top navbar student counter
  const navCounter = document.getElementById('navOnlineCount');
  if (navCounter) navCounter.textContent = responses.length;

  // Render Table Head
  const thead = document.getElementById('liveTableHead');
  const qHeadersHtml = questions.map((q, idx) =>
    `<th class="q-col-header color-${idx % 5}" title="${escapeHtml(q.text)}">${idx + 1}</th>`
  ).join('');

  thead.innerHTML = `
    <tr>
      <th class="col-name">NAME ↓</th>
      <th class="col-score">SCORE ∨</th>
      ${qHeadersHtml}
    </tr>
  `;

  // Render Student Rows
  const tbody = document.getElementById('liveTableBody');
  const rowsHtml = responses.map((resp, rIdx) => {
    const displayName = showNames ? escapeHtml(resp.studentName) : `Student #${rIdx + 1}`;
    const displayScore = showResults ? `${resp.percent || 0}%` : '—';

    const cellsHtml = questions.map((q, qIdx) => {
      const ansObj = resp.answers ? resp.answers[qIdx] : null;
      if (!ansObj || ansObj.value === undefined || ansObj.value === '') {
        return `<td class="ans-cell empty"></td>`;
      }

      if (!showResponses) {
        return `<td class="ans-cell answered-neutral">•••</td>`;
      }

      const valText = escapeHtml(String(ansObj.value));
      if (!showResults) {
        return `<td class="ans-cell answered-neutral">${valText}</td>`;
      }

      const isCorrect = Boolean(ansObj.isCorrect);
      const cellClass = isCorrect ? 'correct' : 'wrong';
      const icon = isCorrect ? '✓' : '✕';
      return `<td class="ans-cell ${cellClass}">${icon} ${valText}</td>`;
    }).join('');

    return `
      <tr>
        <td>
          <div class="student-name-cell">
            <span class="online-dot-green"></span>
            <span>${displayName}</span>
          </div>
        </td>
        <td class="student-score-cell">${displayScore}</td>
        ${cellsHtml}
      </tr>
    `;
  }).join('');

  // Calculate Class Total per question (like bottom row in Image 1: 6 Class Total | 33% | 17% | 0% | 0% | 0%)
  const totalStudents = responses.length;
  const classTotalCells = questions.map((q, qIdx) => {
    if (totalStudents === 0 || !showResults) return `<td>—</td>`;
    let correctCount = 0;
    responses.forEach(r => {
      if (r.answers && r.answers[qIdx] && r.answers[qIdx].isCorrect) {
        correctCount++;
      }
    });
    const pct = Math.round((correctCount / totalStudents) * 100);
    return `<td>${pct}%</td>`;
  }).join('');

  tbody.innerHTML = rowsHtml + `
    <tr class="class-total-row">
      <td colspan="2">${totalStudents} &nbsp; Class Total</td>
      ${classTotalCells}
    </tr>
  `;
}

function togglePauseActivity() {
  if (!appState.activeSession) return;
  appState.activeSession.status = appState.activeSession.status === 'paused' ? 'active' : 'paused';
  saveAppState();
  if (appSettings.gasWebAppUrl) {
    callGoogleScript({
      action: 'updateSessionStatus',
      session_id: appState.activeSession.id,
      status: appState.activeSession.status
    });
  }
  showToast(appState.activeSession.status === 'paused' ? 'หยุดรับคำตอบชั่วคราว (Paused)' : 'เปิดรับคำตอบต่อแล้ว (Resumed)');
}

function finishCurrentActivity() {
  if (!appState.activeSession) return;
  appState.activeSession.status = 'finished';
  saveAppState();
  if (appSettings.gasWebAppUrl) {
    callGoogleScript({
      action: 'updateSessionStatus',
      session_id: appState.activeSession.id,
      status: 'finished'
    });
  }
  showToast('จบการทำข้อสอบเรียบร้อยแล้ว สามารถดูสรุปผลและดาวน์โหลด Excel ได้ที่เมนู Reports');
}

function openInviteStudentsModal() {
  updateRoomBadges();
  openModal('inviteModal');
}

// ปุ่มจำลองนักเรียนส่งข้อสอบจากมือถือแบบ Real-time เพื่อให้ครูเห็นตารางขยับสดๆ
function simulateStudentSubmission() {
  const session = appState.activeSession;
  if (!session) return;
  const quiz = appState.quizzes.find(q => q.id === session.quizId) || appState.quizzes[0];
  if (!quiz) return;

  const sampleNames = [
    'กิตติพงศ์ ใจดี (ม.3/1)',
    'พิมพ์ชนก รักเรียน (ม.3/1)',
    'ธนกร เก่งมาก (ม.3/2)',
    'ณัฐธิดา สดใส (ม.3/2)',
    'Wilson, Lucas',
    'Anderson, Emma'
  ];

  // หาคนที่ยังตอบไม่ครบ หรือเพิ่มนักเรียนใหม่
  let targetResp = appState.responses.find(r =>
    r.sessionId === session.id &&
    Object.keys(r.answers || {}).length < quiz.questions.length
  );

  if (!targetResp) {
    const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)] + ' #' + (appState.responses.length + 1);
    targetResp = {
      id: 'RESP_' + Date.now(),
      sessionId: session.id,
      roomCode: session.roomCode,
      studentId: 'STU_' + Date.now(),
      studentName: randomName,
      answers: {},
      score: 0,
      percent: 0,
      updatedAt: new Date().toISOString()
    };
    appState.responses.push(targetResp);
  }

  // ตอบข้อถัดไป
  const nextQIdx = Object.keys(targetResp.answers).length;
  const q = quiz.questions[nextQIdx];
  if (q) {
    const isLuckyCorrect = Math.random() > 0.3;
    let chosenVal = '';
    if (q.type === 'MC') {
      chosenVal = isLuckyCorrect ? String(q.correctAnswer || 'A') : (q.correctAnswer === 'A' ? 'B' : 'A');
    } else if (q.type === 'TF') {
      chosenVal = isLuckyCorrect ? String(q.correctAnswer || 'True') : (q.correctAnswer === 'True' ? 'False' : 'True');
    } else {
      chosenVal = isLuckyCorrect ? String(q.correctAnswer || 'Chlorophyll') : 'Green pigment';
    }

    const correct = checkAnswerCorrectness(q, chosenVal);
    targetResp.answers[nextQIdx] = { value: chosenVal, isCorrect: correct };
    recalculateStudentScore(targetResp, quiz);
    targetResp.updatedAt = new Date().toISOString();
    saveAppState();
    syncStudentResponseToGoogleSheet(targetResp, quiz);
    showToast(`📱 ${targetResp.studentName} ส่งคำตอบข้อที่ ${nextQIdx + 1} แล้ว!`);
  }
}

// ================= STUDENT MOBILE QUIZ FLOW =================
function studentEnterRoom() {
  const room = document.getElementById('stuRoomInput').value.trim().toUpperCase();
  const name = document.getElementById('stuNameInput').value.trim();

  if (!room) return showToast('กรุณากรอกรหัสห้องสอบ (Room Name)');
  if (!name) return showToast('กรุณากรอกชื่อ-นามสกุลของคุณ');

  const session = appState.activeSession;
  if (!session || session.status === 'finished') {
    return showToast('ขณะนี้ครูยังไม่ได้เปิดห้องสอบ หรือการสอบสิ้นสุดแล้ว');
  }
  if (session.status === 'paused') {
    return showToast('ครูหยุดการทำข้อสอบชั่วคราว กรุณารอสักครู่');
  }

  currentStudent = {
    id: 'STU_' + name.replace(/\s+/g, '_').toUpperCase(),
    name: name,
    roomCode: room,
    currentIndex: 0,
    selectedOption: '',
    answers: {}
  };

  // สร้างหรือดึงแถวนักเรียนใน Live Results ทันทีที่กดเข้าห้องสอบ (ขึ้นจุดเขียวบนหน้าจอครูทันที)
  let existing = appState.responses.find(r => r.sessionId === session.id && r.studentId === currentStudent.id);
  if (!existing) {
    existing = {
      id: 'RESP_' + Date.now(),
      sessionId: session.id,
      roomCode: room,
      studentId: currentStudent.id,
      studentName: name,
      answers: {},
      score: 0,
      percent: 0,
      updatedAt: new Date().toISOString()
    };
    appState.responses.push(existing);
    saveAppState();
  } else {
    currentStudent.answers = existing.answers || {};
  }

  document.getElementById('studentLoginStep').style.display = 'none';
  document.getElementById('studentDoneStep').style.display = 'none';
  document.getElementById('studentQuizStep').style.display = 'block';

  renderStudentCurrentQuestion();
}

function renderStudentCurrentQuestion() {
  const session = appState.activeSession;
  const quiz = appState.quizzes.find(q => q.id === session.quizId) || appState.quizzes[0];
  const questions = quiz.questions || [];
  const qIdx = currentStudent.currentIndex;
  const q = questions[qIdx];

  document.getElementById('stuQuizTitleDisplay').textContent = quiz.title;
  document.getElementById('stuDisplayName').textContent = `ผู้เข้าสอบ: ${currentStudent.name}`;
  document.getElementById('stuProgressBadge').textContent = `ข้อ ${qIdx + 1} / ${questions.length}`;
  document.getElementById('stuPrevBtn').style.visibility = qIdx > 0 ? 'visible' : 'hidden';

  const prevAns = currentStudent.answers[qIdx]?.value || '';
  currentStudent.selectedOption = prevAns;

  const container = document.getElementById('stuQuestionContainer');

  let inputHtml = '';
  if (q.type === 'MC') {
    const letters = ['A', 'B', 'C', 'D', 'E'];
    inputHtml = (q.options || []).map((opt, idx) => {
      const letter = letters[idx] || 'A';
      const cleanOpt = String(opt).replace(/^[A-E][\.\)\s]+/i, '');
      const selectedClass = currentStudent.selectedOption === letter ? 'selected' : '';
      return `
        <button class="student-option-btn ${selectedClass}" onclick="studentSelectOption('${letter}')">
          <span class="option-letter-badge">${letter}</span>
          <span>${escapeHtml(cleanOpt)}</span>
        </button>
      `;
    }).join('');
  } else if (q.type === 'TF') {
    inputHtml = ['True', 'False'].map(val => {
      const selectedClass = currentStudent.selectedOption === val ? 'selected' : '';
      return `
        <button class="student-option-btn ${selectedClass}" onclick="studentSelectOption('${val}')">
          <span class="option-letter-badge">${val.charAt(0)}</span>
          <span>${val === 'True' ? 'True (ถูก / ใช่)' : 'False (ผิด / ไม่ใช่)'}</span>
        </button>
      `;
    }).join('');
  } else {
    inputHtml = `
      <div class="form-group" style="margin-top:12px;">
        <label>พิมพ์คำตอบของคุณ:</label>
        <input type="text" id="stuShortAnswerInput" class="form-input" placeholder="พิมพ์คำตอบที่นี่..."
          value="${escapeHtml(prevAns)}"
          oninput="currentStudent.selectedOption = this.value" />
      </div>
    `;
  }

  container.innerHTML = `
    <div style="font-size:1.08rem;font-weight:600;color:#1e293b;margin-bottom:16px;line-height:1.5;">
      ${qIdx + 1}. ${escapeHtml(q.text)}
    </div>
    <div>${inputHtml}</div>
  `;
}

function studentSelectOption(val) {
  currentStudent.selectedOption = val;
  renderStudentCurrentQuestion();
}

function studentNavQuestion(delta) {
  const session = appState.activeSession;
  const quiz = appState.quizzes.find(q => q.id === session.quizId) || appState.quizzes[0];
  const next = currentStudent.currentIndex + delta;
  if (next >= 0 && next < quiz.questions.length) {
    currentStudent.currentIndex = next;
    renderStudentCurrentQuestion();
  }
}

function studentSubmitCurrentAnswer() {
  const session = appState.activeSession;
  if (session.status === 'paused') {
    return showToast('ครูหยุดรับคำตอบชั่วคราว กรุณารอสักครู่');
  }
  const quiz = appState.quizzes.find(q => q.id === session.quizId) || appState.quizzes[0];
  const qIdx = currentStudent.currentIndex;
  const q = quiz.questions[qIdx];

  const val = String(currentStudent.selectedOption || '').trim();
  if (!val) return showToast('กรุณาเลือกหรือพิมพ์คำตอบก่อนกดส่ง');

  const isCorrect = checkAnswerCorrectness(q, val);
  currentStudent.answers[qIdx] = { value: val, isCorrect: isCorrect };

  // บันทึกลง State ทันทีเพื่อให้หน้าครูอัปเดต Real-time
  let resp = appState.responses.find(r => r.sessionId === session.id && r.studentId === currentStudent.id);
  if (!resp) {
    resp = {
      id: 'RESP_' + Date.now(),
      sessionId: session.id,
      roomCode: currentStudent.roomCode,
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      answers: {},
      score: 0,
      percent: 0
    };
    appState.responses.push(resp);
  }
  resp.answers = currentStudent.answers;
  recalculateStudentScore(resp, quiz);
  resp.updatedAt = new Date().toISOString();

  saveAppState();
  syncStudentResponseToGoogleSheet(resp, quiz);

  if (session.settings?.instantFeedback) {
    showToast(isCorrect ? '✅ คำตอบถูกต้อง!' : `❌ คำตอบยังไม่ถูก (เฉลย: ${q.correctAnswer})`);
  }

  // ไปข้อถัดไป หรือจบการทำข้อสอบ
  if (qIdx + 1 < quiz.questions.length) {
    currentStudent.currentIndex++;
    renderStudentCurrentQuestion();
  } else {
    document.getElementById('studentQuizStep').style.display = 'none';
    document.getElementById('studentDoneStep').style.display = 'block';
    document.getElementById('stuFinalScoreText').textContent =
      `คะแนนของคุณ: ${resp.score} / ${quiz.questions.length} ข้อ (${resp.percent}%)`;
  }
}

function studentResetToLogin() {
  document.getElementById('stuNameInput').value = '';
  document.getElementById('studentDoneStep').style.display = 'none';
  document.getElementById('studentQuizStep').style.display = 'none';
  document.getElementById('studentLoginStep').style.display = 'block';
}

function checkAnswerCorrectness(question, givenValue) {
  const expected = String(question.correctAnswer || '').trim().toLowerCase();
  const actual = String(givenValue || '').trim().toLowerCase();
  if (!expected) return true;
  if (question.type === 'MC') {
    return expected.charAt(0) === actual.charAt(0);
  }
  return expected === actual;
}

function recalculateStudentScore(resp, quiz) {
  const totalQ = (quiz.questions || []).length || 1;
  let score = 0;
  Object.values(resp.answers || {}).forEach(a => {
    if (a && a.isCorrect) score++;
  });
  resp.score = score;
  resp.percent = Math.round((score / totalQ) * 100);
}

// ================= GOOGLE SHEETS SYNC & REPORTS =================
async function callGoogleScript(payload) {
  if (!appSettings.gasWebAppUrl) return null;
  try {
    const res = await fetch(appSettings.gasWebAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.warn('Google Script Sync warning:', err);
    return null;
  }
}

async function testGoogleSheetConnection() {
  const url = document.getElementById('settingGasWebAppUrl').value.trim();
  const statusEl = document.getElementById('settingsTestStatus');
  if (!url) {
    statusEl.innerHTML = `<span style="color:#d97706;">ยังไม่ได้กรอก Web App URL — ระบบจะเก็บข้อมูลในเบราว์เซอร์อัตโนมัติ (สามารถนำโค้ดจากไฟล์ <code>google-apps-script/Code.gs</code> ไปวางใน Google Sheet ของคุณได้ทุกเมื่อ)</span>`;
    return;
  }
  statusEl.textContent = '⏳ กำลังทดสอบเชื่อมต่อและสร้างตารางฐานข้อมูลใน Google Sheets...';
  appSettings.gasWebAppUrl = url;
  const res = await callGoogleScript({ action: 'ping' });
  if (res && res.status === 'ok') {
    statusEl.innerHTML = `<span style="color:#16a34a;font-weight:700;">✅ เชื่อมต่อสำเร็จ! สร้างตาราง Quizzes, Questions, Sessions, Responses ใน Google Sheets เรียบร้อยแล้ว</span>`;
    showToast('เชื่อมต่อ Google Sheets สำเร็จ!');
  } else {
    statusEl.innerHTML = `<span style="color:#dc2626;">⚠️ ไม่สามารถเชื่อมต่อ URL นี้ได้ กรุณาตรวจสอบว่ากด Deploy เป็น Web App (Anyone) แล้ว</span>`;
  }
}

async function syncQuizToGoogleSheet(quiz) {
  if (!appSettings.gasWebAppUrl) return;
  await callGoogleScript({ action: 'saveQuiz', quiz: quiz });
}

async function syncStudentResponseToGoogleSheet(resp, quiz) {
  if (!appSettings.gasWebAppUrl) return;
  const orderedLabels = (quiz.questions || []).map((q, idx) => {
    const a = resp.answers?.[idx];
    if (!a) return '-';
    return `${a.isCorrect ? '✓' : '✕'} ${a.value}`;
  });
  await callGoogleScript({
    action: 'submitAnswer',
    payload: Object.assign({}, resp, {
      quizTitle: quiz.title,
      orderedAnswerLabels: orderedLabels
    })
  });
}

async function manualSyncFromGoogleSheet() {
  if (!appSettings.gasWebAppUrl) {
    openModal('settingsModal');
    return showToast('กรุณาใส่ Google Apps Script Web App URL เพื่อซิงค์กับ Google Sheets');
  }
  showToast('🔄 กำลังดึงข้อมูลล่าสุดจาก Google Sheets...');
  await pollLiveFromGoogleSheet(true);
}

async function pollLiveFromGoogleSheet(notify = false) {
  if (!appSettings.gasWebAppUrl || !appState.activeSession) return;
  const data = await callGoogleScript({
    action: 'getLiveSessionData',
    session_id: appState.activeSession.id,
    room_code: appSettings.roomCode
  });
  if (data && data.status === 'ok' && Array.isArray(data.responses)) {
    const otherResponses = appState.responses.filter(r => r.sessionId !== appState.activeSession.id);
    appState.responses = otherResponses.concat(data.responses);
    saveAppState(false);
    if (notify) showToast('✅ ซิงค์ข้อมูลจาก Google Sheets เรียบร้อยแล้ว!');
  }
}

async function syncAllToGoogleSheets() {
  if (!appSettings.gasWebAppUrl) {
    openModal('settingsModal');
    return showToast('กรุณาตั้งค่า Google Apps Script Web App URL ก่อนซิงค์ขึ้นคลาวด์');
  }
  showToast('☁️ กำลังส่งทุกชุดข้อสอบและผลคะแนนขึ้น Google Sheets...');
  for (const quiz of appState.quizzes) {
    await syncQuizToGoogleSheet(quiz);
  }
  const activeQuiz = appState.quizzes.find(q => q.id === appState.activeSession?.quizId) || appState.quizzes[0];
  for (const r of appState.responses) {
    if (activeQuiz) await syncStudentResponseToGoogleSheet(r, activeQuiz);
  }
  showToast('✅ บันทึกทุกชุดข้อสอบและคะแนนลง Google Sheets เรียบร้อยแล้ว!');
}

function renderReportsList() {
  const container = document.getElementById('reportsListContainer');
  if (!container) return;
  const session = appState.activeSession;
  const quiz = appState.quizzes.find(q => q.id === session?.quizId) || appState.quizzes[0];
  const responses = appState.responses.filter(r => r.sessionId === session?.id);

  container.innerHTML = `
    <div class="quiz-row">
      <div class="quiz-info-main">
        <div class="quiz-doc-icon" style="background:#dcfce7;color:#166534;">📊</div>
        <div>
          <div class="quiz-name">${escapeHtml(quiz?.title || 'Life Science Quiz')} (ห้อง ${escapeHtml(session?.roomCode || 'BASICCHANA')})</div>
          <div class="quiz-meta">
            <span>ผู้เข้าสอบทั้งหมด ${responses.length} คน</span>
            <span>•</span>
            <span>จำนวนข้อสอบ ${(quiz?.questions || []).length} ข้อ</span>
          </div>
        </div>
      </div>
      <div class="quiz-row-actions">
        <button class="btn-outline" onclick="switchTab('live')">ดูตารางสด (Live Results)</button>
        <button class="btn-primary-blue" onclick="exportCurrentReportToExcel()">⬇ ดาวน์โหลด Excel (.xlsx)</button>
      </div>
    </div>
  `;
}

function exportCurrentReportToExcel() {
  const session = appState.activeSession;
  const quiz = appState.quizzes.find(q => q.id === session?.quizId) || appState.quizzes[0];
  if (!quiz) return;
  const responses = appState.responses.filter(r => r.sessionId === session?.id);

  const rows = responses.map((r, idx) => {
    const rowObj = {
      'ลำดับ': idx + 1,
      'ชื่อ-นามสกุล (Student Name)': r.studentName,
      'ห้องสอบ (Room)': r.roomCode || appSettings.roomCode,
      'คะแนนที่ได้': r.score,
      'คิดเป็น % (Score %)': `${r.percent}%`
    };
    (quiz.questions || []).forEach((q, qIdx) => {
      const ans = r.answers?.[qIdx];
      rowObj[`ข้อ ${qIdx + 1}`] = ans ? `${ans.isCorrect ? '✓' : '✕'} ${ans.value}` : '-';
    });
    return rowObj;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Live_Results');
  XLSX.writeFile(wb, `${quiz.title.replace(/\s+/g, '_')}_Results.xlsx`);
  showToast('ดาวน์โหลดไฟล์ผลคะแนน Excel เรียบร้อยแล้ว');
}

// ================= MODAL & UI HELPERS =================
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function showToast(msg) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'toast-msg';
  div.textContent = msg;
  container.appendChild(div);
  setTimeout(() => {
    div.style.opacity = '0';
    div.style.transition = 'opacity 0.3s';
    setTimeout(() => div.remove(), 300);
  }, 3200);
}

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
