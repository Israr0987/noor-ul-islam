// =========================================================
  // 4. QURAN PAK (114 SURAHS, 30 PARAS, URDU & AUDIO)
  // =========================================================
  function applyQuranFontScale() {
    const container = document.getElementById('ayahsContainer');
    if (container) {
      container.style.setProperty('--quran-scale', String(state.fontScale));
    }
    safeSetStorage(KEYS.fontScale, String(state.fontScale));
  }

  function pauseQuranAudio() {
    state.isQuranPlaying = false;
    try {
      state.quranAudio.pause();
    } catch {}
    const playBtn = document.getElementById('playPauseSurahBtn');
    if (playBtn) playBtn.textContent = '▶ Play Audio';
    updateActiveAyahHighlight(-1);
  }

  function updateActiveAyahHighlight(idx) {
    state.currentAyahIdx = idx;
    document.querySelectorAll('.ayah-card').forEach((card, i) => {
      card.classList.toggle('playing', i === idx);
    });
    const counterEl = document.getElementById('quranAyahCounter');
    if (counterEl) {
      const total = state.readerItems.length;
      const currentNum = idx >= 0 ? idx + 1 : 0;
      counterEl.textContent = `${currentNum} / ${total}`;
    }
    if (idx >= 0) {
      const activeEl = document.querySelector(`.ayah-card[data-idx="${idx}"]`);
      if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function playAyahAt(idx) {
    if (!state.readerItems.length) return;
    if (idx < 0 || idx >= state.readerItems.length) {
      pauseQuranAudio();
      document.getElementById('quranAudioStatus').textContent = 'Completed';
      return;
    }

    stopAzanAudio(true);
    const item = state.readerItems[idx];
    if (!item.audio) {
      playAyahAt(idx + 1);
      return;
    }

    state.isQuranPlaying = true;
    updateActiveAyahHighlight(idx);
    document.getElementById('playPauseSurahBtn').textContent = '⏸ Pause';
    document.getElementById('quranAudioStatus').textContent = `Playing Ayah ${item.numberInSurah || idx + 1}...`;

    state.quranAudio.src = item.audio;
    state.quranAudio.play().catch(() => {
      document.getElementById('quranAudioStatus').textContent = 'Audio unavailable — tap Play to retry';
      pauseQuranAudio();
    });
  }

  function initQuranAudioPlayer() {
    state.quranAudio.addEventListener('ended', () => {
      if (state.isQuranPlaying) {
        playAyahAt(state.currentAyahIdx + 1);
      }
    });

    state.quranAudio.addEventListener('error', () => {
      if (state.isQuranPlaying) {
        playAyahAt(state.currentAyahIdx + 1);
      }
    });

    document.getElementById('playPauseSurahBtn').addEventListener('click', () => {
      if (state.isQuranPlaying) {
        pauseQuranAudio();
        document.getElementById('quranAudioStatus').textContent = 'Paused';
      } else {
        const startIdx = state.currentAyahIdx >= 0 ? state.currentAyahIdx : 0;
        playAyahAt(startIdx);
      }
    });

    document.getElementById('prevAyahBtn').addEventListener('click', () => {
      const prevIdx = state.currentAyahIdx > 0 ? state.currentAyahIdx - 1 : 0;
      playAyahAt(prevIdx);
    });

    document.getElementById('nextAyahBtn').addEventListener('click', () => {
      const nextIdx = state.currentAyahIdx + 1 < state.readerItems.length ? state.currentAyahIdx + 1 : 0;
      playAyahAt(nextIdx);
    });
  }

  async function loadSurahsList() {
    const cached = safeJsonParse(localStorage.getItem(KEYS.surahsList), null);
    if (Array.isArray(cached) && cached.length === 114) {
      state.surahs = cached;
      renderQuranBrowserList();
      return;
    }

    try {
      const res = await fetch('https://api.alquran.cloud/v1/surah');
      if (!res.ok) throw new Error('Network error');
      const json = await res.json();
      if (json.code === 200 && Array.isArray(json.data)) {
        state.surahs = json.data;
        safeSetStorage(KEYS.surahsList, json.data);
        renderQuranBrowserList();
      }
    } catch {
      document.getElementById('quranItemsList').innerHTML = `
        <div class="loading-box">Could not load Surahs list. Check internet connection and try again.</div>`;
    }
  }

  function renderQuranBrowserList() {
    const listEl = document.getElementById('quranItemsList');
    const query = (document.getElementById('quranSearchInput').value || '').trim().toLowerCase();

    if (state.quranMode === 'surah') {
      if (!state.surahs.length) {
        listEl.innerHTML = '<div class="loading-box">Loading 114 Surahs...</div>';
        return;
      }
      const filtered = state.surahs.filter((s) => {
        if (!query) return true;
        return (
          String(s.number).includes(query) ||
          (s.englishName && s.englishName.toLowerCase().includes(query)) ||
          (s.englishNameTranslation && s.englishNameTranslation.toLowerCase().includes(query)) ||
          (s.name && s.name.includes(query))
        );
      });

      if (!filtered.length) {
        listEl.innerHTML = '<div class="loading-box">No Surah matched your search.</div>';
        return;
      }

      listEl.innerHTML = filtered.map((s) => `
        <button type="button" class="quran-item-card" data-open-surah="${s.number}">
          <div class="quran-num-badge">${s.number}</div>
          <div class="quran-item-meta">
            <div class="quran-item-en">${s.englishName}</div>
            <div class="quran-item-sub">${s.revelationType} • ${s.numberOfAyahs} Ayahs</div>
          </div>
          <div class="quran-item-ar" lang="ar" dir="rtl">${s.name}</div>
        </button>
      `).join('');

      listEl.querySelectorAll('[data-open-surah]').forEach((btn) => {
        btn.addEventListener('click', () => openSurahReader(parseInt(btn.dataset.openSurah, 10)));
      });
    } else {
      const paras = Array.isArray(DATA.parasList) ? DATA.parasList : Array.from({ length: 30 }, (_, i) => ({
        number: i + 1,
        english: `Para ${i + 1}`,
        arabic: `پارہ ${i + 1}`
      }));

      const filteredParas = paras.filter((p) => {
        if (!query) return true;
        return (
          String(p.number).includes(query) ||
          (p.english && p.english.toLowerCase().includes(query)) ||
          (p.arabic && p.arabic.includes(query))
        );
      });

      listEl.innerHTML = filteredParas.map((p) => `
        <button type="button" class="quran-item-card" data-open-para="${p.number}">
          <div class="quran-num-badge">${p.number}</div>
          <div class="quran-item-meta">
            <div class="quran-item-en">${p.english}</div>
            <div class="quran-item-sub">Juz ${p.number} of 30</div>
          </div>
          <div class="quran-item-ar" lang="ar" dir="rtl">${p.arabic}</div>
        </button>
      `).join('');

      listEl.querySelectorAll('[data-open-para]').forEach((btn) => {
        btn.addEventListener('click', () => openParaReader(parseInt(btn.dataset.openPara, 10)));
      });
    }
  }

  function renderReaderVerses() {
    const container = document.getElementById('ayahsContainer');
    document.getElementById('readerTitleEn').textContent = state.readerTitleEn;
    document.getElementById('readerTitleUr').textContent = state.readerTitleUr;
    document.getElementById('quranAyahCounter').textContent = `0 / ${state.readerItems.length}`;
    document.getElementById('quranAudioStatus').textContent = 'Tap Play to listen with translation';

    if (!state.readerItems.length) {
      container.innerHTML = '<div class="loading-box">No verses found.</div>';
      return;
    }

    container.innerHTML = state.readerItems.map((item, idx) => `
      <article class="ayah-card" data-idx="${idx}">
        <div class="ayah-top-meta">
          <span class="ayah-badge">${item.surahName ? `${item.surahName} • ` : ''}Ayah ${item.numberInSurah}</span>
          <button type="button" class="btn-ayah-play" data-play-ayah="${idx}">▶</button>
        </div>
        <div class="ayah-arabic" lang="ar" dir="rtl">${item.text}</div>
        <div class="ayah-urdu" lang="ur" dir="rtl">${item.urdu}</div>
      </article>
    `).join('');

    container.querySelectorAll('[data-play-ayah]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.playAyah, 10);
        if (state.isQuranPlaying && state.currentAyahIdx === idx) {
          pauseQuranAudio();
        } else {
          playAyahAt(idx);
        }
      });
    });

    applyQuranFontScale();
  }

  async function openSurahReader(surahNum) {
    pauseQuranAudio();
    document.getElementById('quranListView').classList.add('hidden');
    document.getElementById('quranReaderView').classList.remove('hidden');
    updateAdVisibility();

    const meta = state.surahs.find((s) => s.number === surahNum) || {
      number: surahNum,
      englishName: `Surah ${surahNum}`,
      name: ''
    };
    state.readerTitleEn = `${meta.number}. ${meta.englishName}`;
    state.readerTitleUr = meta.name || '';
    document.getElementById('readerTitleEn').textContent = state.readerTitleEn;
    document.getElementById('readerTitleUr').textContent = state.readerTitleUr;
    document.getElementById('ayahsContainer').innerHTML = '<div class="loading-box">Loading verses & Urdu translation...</div>';

    try {
      const [arRes, urRes, auRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/quran-uthmani`),
        fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/ur.jalandhry`),
        fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/ar.alafasy`)
      ]);

      const [arJson, urJson, auJson] = await Promise.all([arRes.json(), urRes.json(), auRes.json()]);
      const arAyahs = (arJson.data && arJson.data.ayahs) || [];
      const urAyahs = (urJson.data && urJson.data.ayahs) || [];
      const auAyahs = (auJson.data && auJson.data.ayahs) || [];

      state.readerItems = arAyahs.map((a, i) => ({
        number: a.number,
        numberInSurah: a.numberInSurah,
        text: a.text,
        urdu: (urAyahs[i] && urAyahs[i].text) || '',
        audio: (auAyahs[i] && auAyahs[i].audio) || ''
      }));

      renderReaderVerses();
    } catch {
      document.getElementById('ayahsContainer').innerHTML =
        '<div class="loading-box">Could not load Surah verses. Please check your connection.</div>';
    }
  }

  async function openParaReader(paraNum) {
    pauseQuranAudio();
    document.getElementById('quranListView').classList.add('hidden');
    document.getElementById('quranReaderView').classList.remove('hidden');
    updateAdVisibility();

    const pMeta = (DATA.parasList || []).find((p) => p.number === paraNum) || {
      number: paraNum,
      english: `Para ${paraNum}`,
      arabic: `پارہ ${paraNum}`
    };
    state.readerTitleEn = pMeta.english;
    state.readerTitleUr = pMeta.arabic;
    document.getElementById('readerTitleEn').textContent = state.readerTitleEn;
    document.getElementById('readerTitleUr').textContent = state.readerTitleUr;
    document.getElementById('ayahsContainer').innerHTML = '<div class="loading-box">Loading Para verses & Urdu translation...</div>';

    try {
      const [arRes, urRes, auRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/juz/${paraNum}/quran-uthmani`),
        fetch(`https://api.alquran.cloud/v1/juz/${paraNum}/ur.jalandhry`),
        fetch(`https://api.alquran.cloud/v1/juz/${paraNum}/ar.alafasy`)
      ]);

      const [arJson, urJson, auJson] = await Promise.all([arRes.json(), urRes.json(), auRes.json()]);
      const arAyahs = (arJson.data && arJson.data.ayahs) || [];
      const urAyahs = (urJson.data && urJson.data.ayahs) || [];
      const auAyahs = (auJson.data && auJson.data.ayahs) || [];

      state.readerItems = arAyahs.map((a, i) => ({
        number: a.number,
        numberInSurah: a.numberInSurah,
        text: a.text,
        urdu: (urAyahs[i] && urAyahs[i].text) || '',
        audio: (auAyahs[i] && auAyahs[i].audio) || '',
        surahName: (a.surah && a.surah.englishName) || ''
      }));

      renderReaderVerses();
    } catch {
      document.getElementById('ayahsContainer').innerHTML =
        '<div class="loading-box">Could not load Para verses. Please check your connection.</div>';
    }
  }

  function initQuranModule() {
    initQuranAudioPlayer();
    loadSurahsList();

    document.querySelectorAll('#quranListView .sub-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#quranListView .sub-toggle-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.quranMode = btn.dataset.quranMode;
        renderQuranBrowserList();
      });
    });

    document.getElementById('quranSearchInput').addEventListener('input', renderQuranBrowserList);

    document.getElementById('quranBackBtn').addEventListener('click', () => {
      pauseQuranAudio();
      document.getElementById('quranReaderView').classList.add('hidden');
      document.getElementById('quranListView').classList.remove('hidden');
      updateAdVisibility();
    });

    document.getElementById('fontDecreaseBtn').addEventListener('click', () => {
      state.fontScale = Math.max(0.85, Number((state.fontScale - 0.1).toFixed(2)));
      applyQuranFontScale();
    });

    document.getElementById('fontIncreaseBtn').addEventListener('click', () => {
      state.fontScale = Math.min(1.5, Number((state.fontScale + 0.1).toFixed(2)));
      applyQuranFontScale();
    });
  }

  // =========================================================
  // 5. HADEES
  // =========================================================
  function renderHadeesList() {
    const listEl = document.getElementById('hadeesList');
    const items = Array.isArray(DATA.hadeesList) ? DATA.hadeesList : [];
    const filtered = state.hadeesBookFilter === 'all'
      ? items
      : items.filter((h) => h.book === state.hadeesBookFilter);

    if (!filtered.length) {
      listEl.innerHTML = '<div class="loading-box">No Ahadees available for this filter.</div>';
      return;
    }

    listEl.innerHTML = filtered.map((h) => `
      <article class="hadees-card">
        <div class="hadees-book-row">
          <span class="hadees-book-badge">${h.book}</span>
          <span class="hadees-ref">${h.reference || ''}</span>
        </div>
        <div class="hadees-arabic" lang="ar" dir="rtl">${h.arabic || ''}</div>
        <div class="hadees-urdu" lang="ur" dir="rtl">${h.urdu || ''}</div>
        ${h.english ? `<p class="hadees-en">${h.english}</p>` : ''}
      </article>
    `).join('');
  }

  function initHadeesModule() {
    renderHadeesList();
    document.querySelectorAll('#hadeesFilterRow .chip-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#hadeesFilterRow .chip-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.hadeesBookFilter = btn.dataset.hadeesBook;
        renderHadeesList();
      });
    });
  }

  // =========================================================
  // 6. TASBEEH & MASNOON DUAS
  // =========================================================
  function saveTasbeehState() {
    safeSetStorage(KEYS.tasbeeh, state.tasbeeh);
  }

  function renderTasbeehUI() {
    const presets = Array.isArray(DATA.tasbeehPresets) ? DATA.tasbeehPresets : [];
    const currentPreset = presets.find((p) => p.id === state.tasbeeh.zikrId) || presets[0] || {
      id: 'subhanallah',
      arabic: 'سُبْحَانَ اللّٰهِ',
      roman: 'SubhanAllah',
      urdu: 'اللہ پاک ہے'
    };

    const chipRow = document.getElementById('zikrPresetRow');
    if (chipRow && presets.length) {
      chipRow.innerHTML = presets.map((p) => `
        <button type="button" class="chip-btn ${p.id === currentPreset.id ? 'active' : ''}" data-zikr-id="${p.id}">
          ${p.roman}
        </button>
      `).join('');

      chipRow.querySelectorAll('[data-zikr-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.tasbeeh.zikrId = btn.dataset.zikrId;
          state.tasbeeh.count = 0;
          saveTasbeehState();
          renderTasbeehUI();
        });
      });
    }

    document.getElementById('zikrArabic').textContent = currentPreset.arabic;
    document.getElementById('zikrRoman').textContent = currentPreset.roman;
    document.getElementById('zikrUrdu').textContent = currentPreset.urdu;
    document.getElementById('tasbeehCountNum').textContent = String(state.tasbeeh.count);
    document.getElementById('tasbeehTotalSaved').textContent = String(state.tasbeeh.total);

    const target = Number(state.tasbeeh.target) || 0;
    document.getElementById('tasbeehTargetLabel').textContent = target > 0 ? `of ${target}` : 'Open Count';

    document.querySelectorAll('.target-chip').forEach((chip) => {
      chip.classList.toggle('active', Number(chip.dataset.target) === target);
    });
  }

  function renderDuasList() {
    const listEl = document.getElementById('duasList');
    const items = Array.isArray(DATA.duasList) ? DATA.duasList : [];
    const filtered = state.duaCatFilter === 'all'
      ? items
      : items.filter((d) => d.category === state.duaCatFilter);

    if (!filtered.length) {
      listEl.innerHTML = '<div class="loading-box">No Duas in this category.</div>';
      return;
    }

    listEl.innerHTML = filtered.map((d) => `
      <article class="dua-card">
        <div class="dua-title">${d.title}</div>
        <div class="dua-arabic" lang="ar" dir="rtl">${d.arabic || ''}</div>
        <div class="dua-urdu" lang="ur" dir="rtl">${d.urdu || ''}</div>
        ${d.english ? `<p class="dua-en">${d.english}</p>` : ''}
      </article>
    `).join('');
  }

  function initTasbeehAndDuasModule() {
    renderTasbeehUI();
    renderDuasList();

    document.querySelectorAll('#tab-tasbeeh .sub-toggle-bar .sub-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#tab-tasbeeh .sub-toggle-bar .sub-toggle-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.tdMode;
        document.getElementById('tasbeehSubpanel').classList.toggle('hidden', mode !== 'tasbeeh');
        document.getElementById('duasSubpanel').classList.toggle('hidden', mode !== 'duas');
      });
    });

    document.getElementById('tasbeehTapBtn').addEventListener('click', () => {
      unlockAudioContext();
      state.tasbeeh.count += 1;
      state.tasbeeh.total += 1;

      const target = Number(state.tasbeeh.target) || 0;
      if (target > 0 && state.tasbeeh.count >= target) {
        if (navigator.vibrate) {
          try { navigator.vibrate([120, 60, 120]); } catch {}
        }
        showToast(`Completed ${target}!`);
        state.tasbeeh.count = 0;
      } else if (navigator.vibrate) {
        try { navigator.vibrate(25); } catch {}
      }

      saveTasbeehState();
      renderTasbeehUI();
    });

    document.querySelectorAll('.target-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        state.tasbeeh.target = Number(chip.dataset.target) || 0;
        state.tasbeeh.count = 0;
        saveTasbeehState();
        renderTasbeehUI();
      });
    });

    const resetBtn = document.getElementById('resetTasbeehBtn');
    resetBtn.addEventListener('click', () => {
      if (!state.resetConfirmArmed) {
        state.resetConfirmArmed = true;
        resetBtn.textContent = 'Tap Again to Reset';
        setTimeout(() => {
          state.resetConfirmArmed = false;
          resetBtn.textContent = `↺ ${t('resetCount')}`;
        }, 2500);
        return;
      }
      state.resetConfirmArmed = false;
      state.tasbeeh.count = 0;
      saveTasbeehState();
      renderTasbeehUI();
      showToast('Count reset');
    });

    document.querySelectorAll('#duasFilterRow .chip-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#duasFilterRow .chip-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.duaCatFilter = btn.dataset.duaCat;
        renderDuasList();
      });
    });
  }

  // =========================================================
  // 7. APP INITIALIZATION
  // =========================================================
  function initApp() {
    initPWA();
    initNavigationAndModals();
    ensureLanguageControls();
    initNamazModule();
    initQuranModule();
    initHadeesModule();
    initTasbeehAndDuasModule();
    applyLanguage(state.lang);
    updateAdVisibility();

    setInterval(updateCountdownAndCheckAzan, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();