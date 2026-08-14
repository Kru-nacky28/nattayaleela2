/**
 * GameController - Main Application Logic, State Management, Timers & UI Flow.
 * Manages 180s Game Countdown, 3s Hold Delay Check, Skip Queue, Teacher Auth ('2569').
 */

class GameApp {
  constructor() {
    this.studentName = '';
    this.postureQueue = [];
    this.completedCount = 0;
    this.skippedCount = 0;
    this.currentPosture = null;

    // Timers
    this.gameTimer = null;
    this.timeLeft = 180; // 180 seconds game countdown
    this.holdTimer = null;
    this.holdProgress = 0; // 0 to 100%
    this.REQUIRED_HOLD_MS = 3000; // 3 seconds stability hold delay
    this.holdStartTime = null;
    this.isEvaluating = false;
    this.isSuccessState = false;

    this.initDOMReferences();
    this.bindEvents();
  }

  initDOMReferences() {
    // Screens
    this.screenStart = document.getElementById('screen-start');
    this.screenGame = document.getElementById('screen-game');
    this.screenSummary = document.getElementById('screen-summary');

    // Controls & Inputs
    this.inputStudentName = document.getElementById('input-student-name');
    this.btnStartGame = document.getElementById('btn-start-game');
    this.btnTeacherMode = document.getElementById('btn-teacher-mode');
    this.btnToggleSound = document.getElementById('btn-toggle-sound');
    this.btnSwitchCamera = document.getElementById('btn-switch-camera');
    this.btnSkip = document.getElementById('btn-skip');
    this.btnPlayAgain = document.getElementById('btn-play-again');

    // Game Elements
    this.videoElement = document.getElementById('webcam-video');
    this.canvasElement = document.getElementById('skeleton-canvas');
    this.canvasCtx = this.canvasElement ? this.canvasElement.getContext('2d') : null;
    this.silhouetteOverlayImg = document.getElementById('silhouette-overlay-img');
    this.sidebarRefImg = document.getElementById('sidebar-ref-img');

    // Status Texts
    this.timerText = document.getElementById('timer-text');
    this.scoreText = document.getElementById('score-text');
    this.progressText = document.getElementById('progress-text');
    this.targetNameText = document.getElementById('target-name-text');
    this.targetLevelText = document.getElementById('target-level-text');
    this.targetDescText = document.getElementById('target-desc-text');
    this.holdProgressBar = document.getElementById('hold-progress-bar');
    this.holdText = document.getElementById('hold-text');
    this.successPopModal = document.getElementById('success-pop-modal');
    this.coinRainContainer = document.getElementById('coin-rain-container');
    this.scanLaserLine = document.getElementById('scan-laser-line');

    // Summary Score Elements
    this.summaryTotalScore = document.getElementById('summary-total-score');
    this.summaryBaseScore = document.getElementById('summary-base-score');
    this.summaryBonusScore = document.getElementById('summary-bonus-score');

    // Teacher Modal
    this.modalTeacherPass = document.getElementById('modal-teacher-pass');
    this.modalTeacherDashboard = document.getElementById('modal-teacher-dashboard');
    this.inputTeacherPass = document.getElementById('input-teacher-pass');
    this.btnSubmitPass = document.getElementById('btn-submit-pass');
    this.btnClosePassModal = document.getElementById('btn-close-pass-modal');
    this.btnCloseDashboardModal = document.getElementById('btn-close-dashboard-modal');
    this.teacherPostureListContainer = document.getElementById('teacher-posture-list');
  }

  bindEvents() {
    // Start Game
    if (this.btnStartGame) {
      this.btnStartGame.addEventListener('click', () => this.startGame());
    }

    // Switch Camera Front/Back
    if (this.btnSwitchCamera) {
      this.btnSwitchCamera.addEventListener('click', async () => {
        window.soundEngine.playClick();
        const settings = window.teacherStore.getSettings();
        const newMode = settings.facingMode === 'user' ? 'environment' : 'user';
        window.teacherStore.saveSettings({ facingMode: newMode });

        if (window.poseDetector && this.videoElement) {
          await window.poseDetector.startCamera(this.videoElement);
        }
      });
    }

    // Enter Key on Student Input
    if (this.inputStudentName) {
      this.inputStudentName.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.startGame();
      });
    }

    // Toggle Sound
    if (this.btnToggleSound) {
      this.btnToggleSound.addEventListener('click', () => {
        const isMuted = window.soundEngine.toggleMute();
        this.btnToggleSound.innerHTML = isMuted ? '🔇' : '🔊';
      });
    }

    // Skip Posture
    if (this.btnSkip) {
      this.btnSkip.addEventListener('click', () => this.skipCurrentPosture());
    }

    // Play Again
    if (this.btnPlayAgain) {
      this.btnPlayAgain.addEventListener('click', () => this.showScreen('start'));
    }

    // Teacher Mode Trigger
    if (this.btnTeacherMode) {
      const openModal = (e) => {
        if (e) e.preventDefault();
        this.modalTeacherPass.classList.add('active');
        this.inputTeacherPass.value = '';
        setTimeout(() => this.inputTeacherPass.focus(), 150);
      };
      this.btnTeacherMode.addEventListener('click', openModal);
    }

    // Submit Passcode
    if (this.btnSubmitPass) {
      this.btnSubmitPass.addEventListener('click', (e) => {
        e.preventDefault();
        this.verifyTeacherPassword();
      });
    }

    // Close Modals
    if (this.btnClosePassModal) {
      this.btnClosePassModal.addEventListener('click', (e) => {
        e.preventDefault();
        this.modalTeacherPass.classList.remove('active');
      });
    }
    if (this.btnCloseDashboardModal) {
      this.btnCloseDashboardModal.addEventListener('click', (e) => {
        e.preventDefault();
        this.modalTeacherDashboard.classList.remove('active');
      });
    }
  }

  showScreen(screenName) {
    [this.screenStart, this.screenGame, this.screenSummary].forEach(s => {
      if (s) s.classList.remove('active');
    });

    if (screenName === 'start') {
      this.screenStart.classList.add('active');
      window.soundEngine.stopBGM();
    } else if (screenName === 'game') {
      this.screenGame.classList.add('active');
      window.soundEngine.startBGM();
    } else if (screenName === 'summary') {
      this.screenSummary.classList.add('active');
      window.soundEngine.stopBGM();
      window.soundEngine.playFanfare();
    }
  }

  // --- Game Flow Methods ---

  async startGame() {
    const name = this.inputStudentName.value.trim();
    if (!name) {
      alert('กรุณาพิมพ์ชื่อนักเรียนก่อนเข้าระบบเล่นเกม');
      this.inputStudentName.focus();
      return;
    }

    window.soundEngine.playClick();
    this.studentName = name;
    this.completedCount = 0;
    this.skippedCount = 0;
    this.currentScore = 0; // Initialize score to 0
    this.timeLeft = 180;
    this.isSuccessState = false;

    if (this.scoreText) this.scoreText.textContent = '0';

    // Build Queue of 8 Natayasapt postures
    const allPostures = window.teacherStore.getPostures();
    this.postureQueue = [...allPostures];

    this.showScreen('game');
    this.loadNextPostureInQueue();
    this.start180sCountdown();

    // Start AI Pose Detector with Video
    if (window.poseDetector) {
      await window.poseDetector.init(this.videoElement, (data) => this.onAIFrameUpdate(data));
    }
  }

  loadNextPostureInQueue() {
    if (this.postureQueue.length === 0) {
      this.endGame();
      return;
    }

    this.currentPosture = this.postureQueue[0];
    this.resetHoldProgress();
    this.isSuccessState = false;

    // Update UI elements
    if (this.targetNameText) this.targetNameText.textContent = `${this.currentPosture.id}. ${this.currentPosture.name}`;
    if (this.targetLevelText) this.targetLevelText.textContent = this.currentPosture.level;
    if (this.targetDescText) this.targetDescText.textContent = this.currentPosture.desc;
    if (this.progressText) this.progressText.textContent = `ทำสำเร็จ ${this.completedCount} / 8 ท่า`;

    if (this.silhouetteOverlayImg) this.silhouetteOverlayImg.src = this.currentPosture.imageSrc;
    if (this.sidebarRefImg) this.sidebarRefImg.src = this.currentPosture.imageSrc;

    if (window.poseDetector) {
      window.poseDetector.setTargetPosture(this.currentPosture.id);
    }
  }

  skipCurrentPosture() {
    if (this.isSuccessState || this.postureQueue.length <= 1) return;

    window.soundEngine.playSkip();
    this.skippedCount++;

    // Move current posture from front to back of queue
    const skipped = this.postureQueue.shift();
    this.postureQueue.push(skipped);

    this.loadNextPostureInQueue();
  }

  // --- Real-Time AI Frame Callback ---
  onAIFrameUpdate({ poseResults, handResults, evaluation }) {
    if (!this.canvasElement || !this.videoElement) return;

    // Match canvas dimensions to video feed
    if (this.canvasElement.width !== this.videoElement.videoWidth && this.videoElement.videoWidth > 0) {
      this.canvasElement.width = this.videoElement.videoWidth;
      this.canvasElement.height = this.videoElement.videoHeight;
    }

    // Draw Skeleton Lines
    if (window.poseDetector && this.canvasCtx) {
      window.poseDetector.drawSkeleton(this.canvasCtx, this.canvasElement);
    }

    if (this.isSuccessState) return;

    // Evaluate Posture Hold Progress (3 Seconds Delay System)
    if (evaluation && evaluation.isMatched) {
      if (this.scanLaserLine) this.scanLaserLine.classList.add('scanning-active');

      if (!this.holdStartTime) {
        this.holdStartTime = Date.now();
      }

      const elapsed = Date.now() - this.holdStartTime;
      this.holdProgress = Math.min(100, (elapsed / this.REQUIRED_HOLD_MS) * 100);

      // Play soft tick every ~1 second during hold
      if (Math.floor(elapsed / 1000) > Math.floor((elapsed - 100) / 1000)) {
        window.soundEngine.playTick(1 + (elapsed / 3000));
      }

      this.updateHoldUI(this.holdProgress, evaluation.message);

      // Check if held for full 3 seconds delay
      if (elapsed >= this.REQUIRED_HOLD_MS) {
        this.triggerPostureSuccess();
      }
    } else {
      // Pose lost or inaccurate - reset hold timer
      if (this.scanLaserLine) this.scanLaserLine.classList.remove('scanning-active');
      this.resetHoldProgress();
      if (evaluation && evaluation.message) {
        if (this.holdText) this.holdText.textContent = evaluation.message;
      }
    }
  }

  resetHoldProgress() {
    this.holdStartTime = null;
    this.holdProgress = 0;
    if (this.scanLaserLine) this.scanLaserLine.classList.remove('scanning-active');
    this.updateHoldUI(0, 'จัดเงาลางๆ ของตนเอง ทาบกับเงาลางๆ ต้นฉบับ');
  }

  updateHoldUI(percent, text) {
    if (this.holdProgressBar) {
      this.holdProgressBar.style.width = `${percent}%`;
    }
    if (this.holdText) {
      if (percent > 0) {
        const secondsRemaining = Math.ceil((this.REQUIRED_HOLD_MS - (percent / 100 * this.REQUIRED_HOLD_MS)) / 1000);
        this.holdText.textContent = `แสกนทาบเงาถูกต้อง... ถือค้างไว้อีก ${secondsRemaining} วินาที`;
      } else {
        this.holdText.textContent = text || 'จัดเงาลางๆ ของตนเอง ทาบกับเงาลางๆ ต้นฉบับ';
      }
    }
  }

  // Triggered when 3s stability hold succeeds
  triggerPostureSuccess() {
    if (this.isSuccessState) return;
    this.isSuccessState = true;

    // Add +10 points per posture
    this.currentScore += 10;
    if (this.scoreText) this.scoreText.textContent = String(this.currentScore);

    // Sound effect bell chime & 5-baht coin sound
    window.soundEngine.playBell();
    window.soundEngine.playCoinSound();

    // Spawn 5-Baht Coins Rain animation
    this.spawn5BahtCoinsRain();

    // Show big green checkmark pop-up modal
    if (this.successPopModal) {
      this.successPopModal.classList.add('show');
    }

    this.completedCount++;

    // Wait 1.2 seconds so student can see success animation, then move to next posture
    setTimeout(() => {
      if (this.successPopModal) {
        this.successPopModal.classList.remove('show');
      }
      this.postureQueue.shift(); // Remove completed posture from queue
      this.loadNextPostureInQueue();
    }, 1200);
  }

  // Spawns ~16 falling 5-Baht coins across the video viewport
  spawn5BahtCoinsRain() {
    if (!this.coinRainContainer) return;
    this.coinRainContainer.innerHTML = '';

    const coinCount = 16;
    for (let i = 0; i < coinCount; i++) {
      const coin = document.createElement('div');
      coin.className = 'coin-particle';
      coin.textContent = '5฿';

      const leftPos = Math.random() * 92 + 4; // 4% to 96% width
      const delay = Math.random() * 0.8; // 0 to 0.8s stagger
      const duration = 1.2 + Math.random() * 0.8; // 1.2s to 2s fall speed

      coin.style.left = `${leftPos}%`;
      coin.style.animationDelay = `${delay}s`;
      coin.style.animationDuration = `${duration}s`;

      this.coinRainContainer.appendChild(coin);
    }

    // Clean up coin elements after animation completes
    setTimeout(() => {
      if (this.coinRainContainer) this.coinRainContainer.innerHTML = '';
    }, 2800);
  }

  // --- 180 Seconds Game Countdown ---
  start180sCountdown() {
    if (this.gameTimer) clearInterval(this.gameTimer);

    this.gameTimer = setInterval(() => {
      this.timeLeft--;

      const mins = Math.floor(this.timeLeft / 60);
      const secs = this.timeLeft % 60;
      const formattedTime = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

      if (this.timerText) {
        this.timerText.textContent = formattedTime;
      }

      if (this.timeLeft <= 0) {
        clearInterval(this.gameTimer);
        this.endGame();
      }
    }, 1000);
  }

  endGame() {
    if (this.gameTimer) clearInterval(this.gameTimer);

    const timeUsed = 180 - this.timeLeft;
    const minutesUsed = Math.floor(timeUsed / 60);
    const secondsUsed = timeUsed % 60;

    // Base score: 10 points per completed posture
    const baseScore = this.completedCount * 10;

    // Speed Bonus Score Calculation:
    // All 8 postures completed <= 60s -> +20 bonus points
    // All 8 postures completed <= 120s -> +10 bonus points
    let bonusScore = 0;
    let bonusText = '+0 คะแนน';

    if (this.completedCount === 8) {
      if (timeUsed <= 60) {
        bonusScore = 20;
        bonusText = '+20 คะแนน (โบนัสพิเศษ: ทำเสร็จเร็วภายใน 60 วินาที! 🚀)';
      } else if (timeUsed <= 120) {
        bonusScore = 10;
        bonusText = '+10 คะแนน (โบนัสพิเศษ: ทำเสร็จเร็วภายใน 120 วินาที! ⚡)';
      }
    }

    const totalNetScore = baseScore + bonusScore;

    // Save Log automatically to Teacher Analytics Store
    if (window.teacherStore) {
      window.teacherStore.saveStudentLog(
        this.studentName,
        totalNetScore,
        baseScore,
        bonusScore,
        this.completedCount,
        timeUsed
      );
    }

    // Update Summary Screen UI
    const summaryName = document.getElementById('summary-student-name');
    const summaryCompleted = document.getElementById('summary-completed');
    const summaryTime = document.getElementById('summary-time');
    const summaryBadge = document.getElementById('summary-badge');

    if (summaryName) summaryName.textContent = `นักเรียน: ${this.studentName}`;
    if (summaryCompleted) summaryCompleted.textContent = `${this.completedCount} / 8 ท่า`;
    if (summaryTime) summaryTime.textContent = `${minutesUsed} นาที ${secondsUsed} วินาที`;

    if (this.summaryTotalScore) this.summaryTotalScore.textContent = String(totalNetScore);
    if (this.summaryBaseScore) this.summaryBaseScore.textContent = `${baseScore} คะแนน (${this.completedCount} ท่า x 10 คะแนน)`;
    if (this.summaryBonusScore) this.summaryBonusScore.textContent = bonusText;
    if (this.summaryBonusScore) this.summaryBonusScore.textContent = bonusText;

    if (summaryBadge) {
      if (this.completedCount === 8 && bonusScore === 20) {
        summaryBadge.textContent = '🏆 ระดับผลการประเมิน: ยอดเยี่ยมระดับเหรียญทองดิบ (ผ่านเกณฑ์ PA 100% + โบนัสความเร็ว 20 คะแนน!)';
        summaryBadge.style.color = '#00E676';
      } else if (this.completedCount === 8) {
        summaryBadge.textContent = '🏆 ระดับผลการประเมิน: ดีเยี่ยม (ผ่านเกณฑ์ PA 100%)';
        summaryBadge.style.color = '#00E676';
      } else if (this.completedCount >= 5) {
        summaryBadge.textContent = '🌟 ระดับผลการประเมิน: ดี (ผ่านเกณฑ์)';
        summaryBadge.style.color = '#FFD700';
      } else {
        summaryBadge.textContent = '👍 ระดับผลการประเมิน: ควรปรับปรุงเพิ่มเติม';
        summaryBadge.style.color = '#FF9800';
      }
    }

    this.showScreen('summary');
  }

  // --- Teacher Mode Authentication ('2569') ---
  verifyTeacherPassword() {
    const code = this.inputTeacherPass.value.trim();
    if (window.teacherStore.checkPassword(code)) {
      window.soundEngine.playClick();
      this.modalTeacherPass.classList.remove('active');
      this.openTeacherDashboard();
    } else {
      alert('รหัสผ่านไม่ถูกต้อง! (รหัสผ่านครูคือตัวเลข 2569)');
      this.inputTeacherPass.value = '';
      this.inputTeacherPass.focus();
    }
  }

  openTeacherDashboard() {
    this.modalTeacherDashboard.classList.add('active');
    this.renderTeacherPostureList();
  }

  renderTeacherPostureList() {
    if (!this.teacherPostureListContainer) return;

    const postures = window.teacherStore.getPostures();
    this.teacherPostureListContainer.innerHTML = postures.map(p => `
      <div class="teacher-card">
        <div style="font-weight: 700; color: var(--thai-gold-light); font-size: 1rem;">
          ${p.id}. ${p.name}
        </div>
        <div class="teacher-card-thumb">
          <img src="${p.imageSrc}" alt="${p.name}" id="teacher-img-preview-${p.id}" />
        </div>
        <div style="font-size: 0.8rem; color: #CCC;">
          ${p.level}
        </div>
        <div style="display: flex; gap: 8px; margin-top: 6px;">
          <label class="btn-gold" style="padding: 8px 14px; font-size: 0.82rem; cursor: pointer;">
            📷 อัปโหลดภาพ
            <input type="file" accept="image/*" style="display: none;" onchange="window.app.handleTeacherImageUpload(${p.id}, this)" />
          </label>
          <button type="button" class="btn-icon" style="width: 34px; height: 34px; font-size: 0.9rem;" title="คืนค่าเดิม" onclick="window.app.handleTeacherResetImage(${p.id})">
            🔄
          </button>
        </div>
      </div>
    `).join('');
  }

  handleTeacherImageUpload(postureId, inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawBase64 = e.target.result;
      const success = await window.teacherStore.saveCustomImage(postureId, rawBase64);
      if (success) {
        this.renderTeacherPostureList();
        window.soundEngine.playBell();
        alert(`บันทึกภาพต้นฉบับสำหรับ "${window.teacherStore.getPostureById(postureId).name}" เรียบร้อยแล้ว (ย่อขนาดภาพให้อัตโนมัติ)`);
      }
    };
    reader.readAsDataURL(file);
  }

  handleTeacherResetImage(postureId) {
    if (confirm('คุณต้องการรีเซ็ตภาพท่านี้กลับเป็นภาพมาตรฐานเดิมหรือไม่?')) {
      window.teacherStore.resetCustomImage(postureId);
      this.renderTeacherPostureList();
    }
  }

  handleTeacherResetAllImages() {
    if (confirm('คุณต้องการล้างไฟล์ภาพที่อัปโหลดทั้งหมดกลับเป็นภาพมาตรฐานเดิมหรือไม่?')) {
      window.teacherStore.clearAllCustomImages();
      this.renderTeacherPostureList();
      alert('ล้างไฟล์ภาพทั้งหมดเรียบร้อยแล้ว');
    }
  }

  // --- Teacher Dashboard Tabs & Student Analytics Backend ---

  switchTeacherTab(tabName) {
    const tabBtnImages = document.getElementById('tab-btn-images');
    const tabBtnAnalytics = document.getElementById('tab-btn-analytics');
    const tabContentImages = document.getElementById('teacher-tab-images');
    const tabContentAnalytics = document.getElementById('teacher-tab-analytics');

    if (tabName === 'images') {
      if (tabBtnImages) tabBtnImages.classList.add('active');
      if (tabBtnAnalytics) tabBtnAnalytics.classList.remove('active');
      if (tabContentImages) tabContentImages.style.display = 'block';
      if (tabContentAnalytics) tabContentAnalytics.style.display = 'none';
      this.renderTeacherPostureList();
    } else if (tabName === 'analytics') {
      if (tabBtnAnalytics) tabBtnAnalytics.classList.add('active');
      if (tabBtnImages) tabBtnImages.classList.remove('active');
      if (tabContentAnalytics) tabContentAnalytics.style.display = 'block';
      if (tabContentImages) tabContentImages.style.display = 'none';
      this.renderAnalyticsTable();
    }
  }

  renderAnalyticsTable() {
    const tbody = document.getElementById('analytics-table-body');
    if (!tbody) return;

    const stats = window.teacherStore.getStudentSummaryStats();
    if (stats.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: #BBB; padding: 24px;">
            ยังไม่มีประวัติสถิติการเล่นของนักเรียนในขณะนี้
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = stats.map((s, idx) => {
      const impColor = s.improvement > 0 ? '#00E676' : (s.improvement < 0 ? '#FF5252' : '#FFD700');
      const impSign = s.improvement > 0 ? '+' : '';
      return `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${s.name}</strong></td>
          <td>${s.playCount} ครั้ง</td>
          <td>${s.firstScore} คะแนน</td>
          <td>${s.latestScore} คะแนน</td>
          <td style="color: #FFD700; font-weight: 700;">${s.bestScore} คะแนน</td>
          <td style="color: ${impColor}; font-weight: 700;">${impSign}${s.improvement}% (เก่งขึ้น)</td>
          <td><span style="padding: 2px 8px; border-radius: 6px; background: rgba(0,230,118,0.15); color: #00E676; border: 1px solid #00E676; font-size: 0.8rem;">${s.paResult}</span></td>
          <td style="font-size: 0.82rem; color: #BBB;">${s.lastPlayDate}</td>
        </tr>
      `;
    }).join('');
  }

  handleTeacherImportPack(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const jsonStr = e.target.result;
      const success = window.teacherStore.importCustomPack(jsonStr);
      if (success) {
        window.soundEngine.playBell();
        this.renderTeacherPostureList();
        alert('นำเข้าไฟล์ภาพตั้งค่าข้ามเครื่อง (JSON Pack) เรียบร้อยแล้ว!');
      } else {
        alert('รูปแบบไฟล์ JSON ไม่ถูกต้อง');
      }
    };
    reader.readAsText(file);
  }

  printAnalyticsReport() {
    window.print();
  }

  clearStudentHistoryLogs() {
    if (confirm('คุณต้องการล้างประวัติสถิติการเล่นทั้งหมดของนักเรียนหรือไม่?')) {
      window.teacherStore.clearHistory();
      this.renderAnalyticsTable();
      alert('ล้างประวัติสถิติเรียบร้อยแล้ว');
    }
  }
}

// Initialize Global Application
window.addEventListener('DOMContentLoaded', () => {
  window.app = new GameApp();
  window.app.showScreen('start');
});
