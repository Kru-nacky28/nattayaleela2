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

    // Quiz Controller State
    this.currentQuizType = 'pre'; // 'pre' หรือ 'post'
    this.currentQuizIndex = 0;
    this.quizAnswers = [];
    this.activeQuestions = [];
    this.questionTimer = null;
    this.questionTimeLeft = 15;
    this.isTTSEnabled = false;

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

    // Quiz Controls & Status
    this.btnStartPretest = document.getElementById('btn-start-pretest');
    this.btnStartPosttest = document.getElementById('btn-start-posttest');
    this.btnGotoPosttest = document.getElementById('btn-goto-posttest');
    this.studentQuizStatusBanner = document.getElementById('student-quiz-status-banner');
    this.studentStatusText = document.getElementById('student-status-text');

    // Quiz Modals
    this.modalQuiz = document.getElementById('modal-quiz');
    this.modalQuizResult = document.getElementById('modal-quiz-result');
    this.btnCloseQuizModal = document.getElementById('btn-close-quiz-modal');
    this.btnCloseQuizResult = document.getElementById('btn-close-quiz-result');
    this.btnQuizResultContinue = document.getElementById('btn-quiz-result-continue');

    // Quiz Inner Elements & TTS / Timer
    this.quizModalTitle = document.getElementById('quiz-modal-title');
    this.quizStudentSubtitle = document.getElementById('quiz-student-subtitle');
    this.quizCurrIdx = document.getElementById('quiz-curr-idx');
    this.quizTotalIdx = document.getElementById('quiz-total-idx');
    this.quizProgressBarFill = document.getElementById('quiz-progress-bar-fill');
    this.quizQuestionText = document.getElementById('quiz-question-text');
    this.quizOptionsContainer = document.getElementById('quiz-options-container');
    this.btnQuizPrev = document.getElementById('btn-quiz-prev');
    this.btnQuizNext = document.getElementById('btn-quiz-next');
    this.btnQuizTTS = document.getElementById('btn-quiz-tts');
    this.quizTimerPill = document.getElementById('quiz-timer-pill');
    this.quizTimerSec = document.getElementById('quiz-timer-sec');

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

    // Quiz Triggers
    if (this.btnStartPretest) {
      this.btnStartPretest.addEventListener('click', () => this.startQuiz('pre'));
    }
    if (this.btnStartPosttest) {
      this.btnStartPosttest.addEventListener('click', () => this.startQuiz('post'));
    }
    if (this.btnGotoPosttest) {
      this.btnGotoPosttest.addEventListener('click', () => this.startQuiz('post'));
    }

    // Student Name Input Events
    if (this.inputStudentName) {
      const updateBanner = () => this.updateStudentQuizStatusBanner();
      this.inputStudentName.addEventListener('input', updateBanner);
      this.inputStudentName.addEventListener('change', updateBanner);
      this.inputStudentName.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.startGame();
      });
    }

    // Quiz Navigation
    if (this.btnQuizPrev) {
      this.btnQuizPrev.addEventListener('click', () => this.prevQuizQuestion());
    }
    if (this.btnQuizNext) {
      this.btnQuizNext.addEventListener('click', () => this.nextQuizQuestion());
    }

    // AI TTS Voice Reader Button
    if (this.btnQuizTTS) {
      this.btnQuizTTS.addEventListener('click', () => {
        this.isTTSEnabled = !this.isTTSEnabled;
        if (this.isTTSEnabled) {
          this.btnQuizTTS.classList.add('active');
          this.btnQuizTTS.innerHTML = '🔊 กำลังอ่านโจทย์ด้วยเสียง AI';
          this.speakCurrentQuestion();
        } else {
          this.btnQuizTTS.classList.remove('active');
          this.btnQuizTTS.innerHTML = '🔊 อ่านโจทย์ด้วยเสียง AI';
          if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        }
      });
    }

    // Quiz Modal Close Actions
    if (this.btnCloseQuizModal) {
      this.btnCloseQuizModal.addEventListener('click', () => {
        this.stopQuestionTimer();
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (window.soundEngine) window.soundEngine.stopQuizBGM();
        if (this.modalQuiz) this.modalQuiz.classList.remove('active');
      });
    }
    if (this.btnCloseQuizResult) {
      this.btnCloseQuizResult.addEventListener('click', () => {
        if (this.modalQuizResult) this.modalQuizResult.classList.remove('active');
      });
    }
    if (this.btnQuizResultContinue) {
      this.btnQuizResultContinue.addEventListener('click', () => {
        if (this.modalQuizResult) this.modalQuizResult.classList.remove('active');
      });
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

      // Load saved Cloud URL into input
      const inputCloudUrl = document.getElementById('input-cloud-url');
      if (inputCloudUrl && window.teacherStore) {
        inputCloudUrl.value = window.teacherStore.getCloudUrl();
      }

      this.renderAnalyticsTable();
    }
  }

  // --- Quiz Methods (แบบทดสอบก่อนเรียน & หลังเรียน) ---

  async updateStudentQuizStatusBanner() {
    if (!this.inputStudentName || !this.studentQuizStatusBanner) return;
    const name = this.inputStudentName.value.trim();

    if (!name || !window.teacherStore) {
      this.studentQuizStatusBanner.style.display = 'none';
      return;
    }

    // ซิงค์สถิติจาก Cloud ก่อนแสดงผลแบนเนอร์ เพื่อให้คะแนนที่ทำจากมือถือ/ไอแพด/โน้ตบุ๊กเครื่องอื่นแสดงตรงกันทันที
    await window.teacherStore.fetchCloudStudentLogs();

    const qRes = window.teacherStore.getQuizResultForStudent(name);
    if (!qRes || (qRes.preScore === null && qRes.postScore === null)) {
      this.studentQuizStatusBanner.style.display = 'block';
      this.studentStatusText.innerHTML = `👤 นักเรียน: <strong>${name}</strong> | 📌 แนะนำ: ทำแบบทดสอบก่อนเรียน (Pre-Test) ก่อนเข้าสู่เกม AI`;
      return;
    }

    this.studentQuizStatusBanner.style.display = 'block';
    const preText = qRes.preScore !== null ? `<span style="color:#FFB74D;">ก่อนเรียน: ${qRes.preScore}/5</span>` : 'ก่อนเรียน: ยังไม่ได้ทำ';
    const postText = qRes.postScore !== null ? `<span style="color:#00E676;">หลังเรียน: ${qRes.postScore}/5</span>` : 'หลังเรียน: ยังไม่ได้ทำ';

    let impText = '';
    if (qRes.preScore !== null && qRes.postScore !== null) {
      const diff = qRes.postScore - qRes.preScore;
      const pct = Math.round((diff / 5) * 100);
      const sign = pct >= 0 ? '+' : '';
      impText = ` | 🏆 พัฒนาการ: <strong style="color:#FFD700;">${sign}${pct}%</strong>`;
    }

    this.studentStatusText.innerHTML = `👤 นักเรียน: <strong>${name}</strong> | ${preText} | ${postText}${impText}`;
  }

  shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  async startQuiz(type) {
    if (!this.inputStudentName) return;
    const sName = this.inputStudentName.value.trim();
    if (!sName) {
      alert('โปรดกรอก ชื่อ-นามสกุล ของนักเรียนก่อนทำแบบทดสอบ');
      this.inputStudentName.focus();
      return;
    }

    if (window.teacherStore) {
      await window.teacherStore.fetchCloudStudentLogs();
    }

    if (window.soundEngine) {
      window.soundEngine.playClick();
      window.soundEngine.startQuizBGM();
    }

    this.currentQuizType = type; // 'pre' หรือ 'post'
    this.currentQuizIndex = 0;

    // เตรียมข้อสอบ
    if (type === 'pre') {
      // Pre-Test: ลำดับปกติ
      this.activeQuestions = window.QUIZ_QUESTIONS.map((q, qIndex) => {
        const cleanQText = q.question.replace(/^[0-9]+\.\s*/, '').trim();
        return {
          ...q,
          question: `${qIndex + 1}. ${cleanQText}`,
          options: [...q.options],
          answerIndex: q.answerIndex
        };
      });
    } else {
      // Post-Test: เรียงลำดับข้อ 1, 2, 3, 4, 5 แต่สลับโจทย์ (นำโจทย์ข้อ 2 มาตั้งเป็นข้อ 1 ฯลฯ) และสลับตัวเลือก
      const masterLen = window.QUIZ_QUESTIONS.length;
      const shiftedQuestions = window.QUIZ_QUESTIONS.map((_, i) => window.QUIZ_QUESTIONS[(i + 1) % masterLen]);

      this.activeQuestions = shiftedQuestions.map((q, qIndex) => {
        const cleanQText = q.question.replace(/^[0-9]+\.\s*/, '').trim();
        const originalCorrectText = q.options[q.answerIndex].replace(/^[ก-ง]\.\s*/, '').trim();
        const cleanOpts = q.options.map(opt => opt.replace(/^[ก-ง]\.\s*/, '').trim());

        // สลับตัวเลือกแบบเลื่อนลำดับ (ก->ข, ข->ค, ค->ง, ง->ก)
        const shiftedCleanOpts = cleanOpts.map((_, i) => cleanOpts[(i + 1) % cleanOpts.length]);
        const newCorrectIndex = shiftedCleanOpts.findIndex(opt => opt === originalCorrectText);
        const prefixes = ['ก', 'ข', 'ค', 'ง'];
        const prefixedOpts = shiftedCleanOpts.map((opt, i) => `${prefixes[i]}. ${opt}`);

        return {
          ...q,
          question: `${qIndex + 1}. ${cleanQText}`,
          options: prefixedOpts,
          answerIndex: newCorrectIndex
        };
      });
    }

    this.quizAnswers = new Array(this.activeQuestions.length).fill(null);

    if (this.quizModalTitle) {
      this.quizModalTitle.innerHTML = type === 'pre' ? '📝 แบบทดสอบก่อนเรียน (Pre-Test)' : '📝 แบบทดสอบหลังเรียน (Post-Test)';
    }
    if (this.quizStudentSubtitle) {
      this.quizStudentSubtitle.innerHTML = `นักเรียน: <strong>${sName}</strong> (ม.1)`;
    }

    if (this.modalQuiz) this.modalQuiz.classList.add('active');
    this.renderQuizQuestion();
  }

  renderQuizQuestion() {
    const q = this.activeQuestions[this.currentQuizIndex];
    if (!q) return;

    if (this.quizCurrIdx) this.quizCurrIdx.innerText = this.currentQuizIndex + 1;
    if (this.quizTotalIdx) this.quizTotalIdx.innerText = this.activeQuestions.length;

    const pct = ((this.currentQuizIndex + 1) / this.activeQuestions.length) * 100;
    if (this.quizProgressBarFill) this.quizProgressBarFill.style.width = `${pct}%`;

    if (this.quizQuestionText) this.quizQuestionText.innerText = q.question;

    if (this.quizOptionsContainer) {
      const selectedOpt = this.quizAnswers[this.currentQuizIndex];
      this.quizOptionsContainer.innerHTML = q.options.map((optText, optIdx) => {
        const isSel = selectedOpt === optIdx ? 'selected' : '';
        return `
          <button type="button" class="quiz-option-btn ${isSel}" onclick="window.app.selectQuizOption(${optIdx})">
            ${optText}
          </button>
        `;
      }).join('');
    }

    if (this.btnQuizPrev) {
      this.btnQuizPrev.disabled = (this.currentQuizIndex === 0);
    }
    if (this.btnQuizNext) {
      this.btnQuizNext.innerHTML = (this.currentQuizIndex === this.activeQuestions.length - 1)
        ? '🚀 ส่งแบบทดสอบ (Submit)'
        : 'ข้อถัดไป ➡️';
    }

    // เริ่มนับถอยหลัง 30 วินาทีประจำข้อทันที
    this.startQuestionTimer();

    // หากเปิดโหมดอ่านเสียง AI ให้เริ่มอ่านโจทย์ควบคู่ไปพร้อมกัน
    if (this.isTTSEnabled) {
      this.speakCurrentQuestion();
    }
  }

  startQuestionTimer() {
    this.stopQuestionTimer();
    this.questionTimeLeft = 30; // 30 seconds per question

    if (this.quizTimerSec) this.quizTimerSec.innerText = this.questionTimeLeft;
    if (this.quizTimerPill) this.quizTimerPill.classList.remove('warning');

    this.questionTimer = setInterval(() => {
      this.questionTimeLeft--;
      if (this.quizTimerSec) this.quizTimerSec.innerText = this.questionTimeLeft;

      if (this.questionTimeLeft <= 5 && this.quizTimerPill) {
        this.quizTimerPill.classList.add('warning');
      }

      if (this.questionTimeLeft <= 0) {
        this.stopQuestionTimer();
        if (window.soundEngine) window.soundEngine.playClick();
        // หมดเวลา 30 วินาที -> บันทึก 0 คะแนนและเปลี่ยนไปข้อถัดไปอัตโนมัติ (ไม่วนกลับ)
        this.nextQuizQuestion(true);
      }
    }, 1000);
  }

  stopQuestionTimer() {
    if (this.questionTimer) {
      clearInterval(this.questionTimer);
      this.questionTimer = null;
    }
  }

  speakCurrentQuestion() {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // หยุดเสียงเดิมก่อน

    if (!this.isTTSEnabled) return;

    const q = this.activeQuestions[this.currentQuizIndex];
    if (!q) return;

    // เตรียมข้อความอ่านโจทย์ + ตัวเลือก ก, ข, ค, ง
    const cleanQuestion = q.question.replace(/^[0-9]+\.\s*/, '');
    const cleanOpts = q.options.map(opt => opt.replace(/^[ก-ง]\.\s*/, ''));
    const textToRead = `${cleanQuestion} ตัวเลือก ก. ${cleanOpts[0]} ตัวเลือก ข. ${cleanOpts[1]} ตัวเลือก ค. ${cleanOpts[2]} ตัวเลือก ง. ${cleanOpts[3]}`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'th-TH';
    utterance.rate = 1.2; // ความเร็ว 1.2x ชัดเจน กระชับ ฟังง่ายกำลังดีตามคำขอ

    window.speechSynthesis.speak(utterance);
  }

  selectQuizOption(optIndex) {
    if (window.soundEngine) window.soundEngine.playClick();
    this.quizAnswers[this.currentQuizIndex] = optIndex;

    // อัปเดตสถานะปุ่มเลือกตัวเลือกในหน้าจอโดยไม่ต้องเรียก renderQuizQuestion ใหม่ (เพื่อไม่ให้อ่านโจทย์ซ้ำ)
    if (this.quizOptionsContainer) {
      const btns = this.quizOptionsContainer.querySelectorAll('.quiz-option-btn');
      btns.forEach((btn, idx) => {
        if (idx === optIndex) btn.classList.add('selected');
        else btn.classList.remove('selected');
      });
    }
  }

  nextQuizQuestion(isAutoAdvance = false) {
    const selected = this.quizAnswers[this.currentQuizIndex];
    if (!isAutoAdvance && (selected === null || selected === undefined)) {
      alert('โปรดเลือกคำตอบก่อนไปยังข้อถัดไป');
      return;
    }

    this.stopQuestionTimer();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    if (window.soundEngine && !isAutoAdvance) window.soundEngine.playClick();

    if (this.currentQuizIndex < this.activeQuestions.length - 1) {
      this.currentQuizIndex++;
      this.renderQuizQuestion();
    } else {
      this.submitQuiz();
    }
  }

  prevQuizQuestion() {
    if (this.currentQuizIndex > 0) {
      this.stopQuestionTimer();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();

      if (window.soundEngine) window.soundEngine.playClick();
      this.currentQuizIndex--;
      this.renderQuizQuestion();
    }
  }

  submitQuiz() {
    this.stopQuestionTimer();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (window.soundEngine) window.soundEngine.stopQuizBGM(); // หยุดเสียงตื่นเต้นเมื่อส่งข้อสอบ

    const sName = this.inputStudentName.value.trim();
    let score = 0;

    this.activeQuestions.forEach((q, idx) => {
      if (this.quizAnswers[idx] === q.answerIndex) {
        score++;
      }
    });

    if (window.teacherStore) {
      window.teacherStore.saveQuizResult(sName, this.currentQuizType, score, this.activeQuestions.length, this.quizAnswers);
    }

    if (this.modalQuiz) this.modalQuiz.classList.remove('active');

    if (window.soundEngine) {
      if (score >= 4) window.soundEngine.playFanfare();
      else window.soundEngine.playBell();
    }

    this.renderQuizResult(this.currentQuizType, score, this.quizAnswers);
    this.updateStudentQuizStatusBanner();
  }

  renderQuizResult(type, score, answers) {
    const sName = this.inputStudentName ? this.inputStudentName.value.trim() : '';

    const resHeaderTitle = document.getElementById('quiz-result-header-title');
    if (resHeaderTitle) {
      resHeaderTitle.innerText = type === 'pre' ? '🏆 ผลการทำแบบทดสอบก่อนเรียน (Pre-Test)' : '🏆 ผลการทำแบบทดสอบหลังเรียน (Post-Test)';
    }

    const studentNameEl = document.getElementById('quiz-result-student-name');
    if (studentNameEl) {
      studentNameEl.innerHTML = `นักเรียน: <strong>${sName}</strong> (ม.1)`;
    }

    const scoreNumEl = document.getElementById('quiz-result-score-num');
    if (scoreNumEl) scoreNumEl.innerText = `${score} / 5`;

    const badgeEl = document.getElementById('quiz-result-badge');
    const msgEl = document.getElementById('quiz-result-message');

    let levelText = 'ควรปรับปรุง';
    let badgeColor = '#FF5252';
    if (score === 5) { levelText = 'ดีเยี่ยม (100%)'; badgeColor = '#00E676'; }
    else if (score >= 4) { levelText = 'ดีมาก (80%)'; badgeColor = '#00E676'; }
    else if (score >= 3) { levelText = 'ผ่านเกณฑ์ (60%)'; badgeColor = '#FFD700'; }

    if (badgeEl) {
      badgeEl.innerText = `ระดับผลการประเมิน: ${levelText}`;
      badgeEl.style.color = badgeColor;
      badgeEl.style.borderColor = badgeColor;
    }

    if (msgEl) {
      if (type === 'pre') {
        msgEl.innerText = 'บันทึกคะแนนทดสอบก่อนเรียนเรียบร้อยแล้ว! พร้อมฝึกปฏิบัตินาฏยศัพท์ด้วยเกม AI แล้วครับ';
      } else {
        msgEl.innerText = 'บันทึกคะแนนทดสอบหลังเรียนเรียบร้อยแล้ว! สามารถตรวจสอบพัฒนาการการเรียนรู้ของคุณด้านล่างนี้';
      }
    }

    // Comparison Progress Card
    const compCard = document.getElementById('quiz-comparison-card');
    const preScoreEl = document.getElementById('comp-pre-score');
    const postScoreEl = document.getElementById('comp-post-score');
    const diffScoreEl = document.getElementById('comp-diff-score');

    if (window.teacherStore && compCard) {
      const qRes = window.teacherStore.getQuizResultForStudent(sName);
      if (qRes && qRes.preScore !== null && qRes.postScore !== null) {
        compCard.style.display = 'block';
        if (preScoreEl) preScoreEl.innerText = `${qRes.preScore} / 5`;
        if (postScoreEl) postScoreEl.innerText = `${qRes.postScore} / 5`;

        const diff = qRes.postScore - qRes.preScore;
        const pct = Math.round((diff / 5) * 100);
        const sign = pct >= 0 ? '+' : '';
        if (diffScoreEl) {
          diffScoreEl.innerText = `${sign}${pct}% (${sign}${diff})`;
          diffScoreEl.style.color = pct >= 0 ? '#00E676' : '#FF5252';
        }
      } else {
        compCard.style.display = 'none';
      }
    }

    // Explanations List Header
    const expHeader = document.getElementById('quiz-explanations-header');
    if (expHeader) {
      expHeader.innerHTML = type === 'pre'
        ? '💡 สรุปการตอบคำถามก่อนเรียน (แจ้งตอบถูก/ผิด):'
        : '💡 เฉลยคำตอบและคำอธิบายอย่างละเอียด (Post-Test):';
    }

    // Explanations List: Pre-Test -> NO correct answer text, NO explanation box; Post-Test -> WITH correct answer & explanation!
    const expListEl = document.getElementById('quiz-explanations-list');
    if (expListEl) {
      expListEl.innerHTML = this.activeQuestions.map((q, idx) => {
        const userAnsIdx = answers[idx];
        const isCorrect = userAnsIdx === q.answerIndex;
        const userAnsText = (userAnsIdx !== null && userAnsIdx !== undefined) ? q.options[userAnsIdx] : 'ไม่ได้ตอบ (หมดเวลา 30 วินาที - 0 คะแนน)';
        const correctAnsText = q.options[q.answerIndex];

        let answerDetailHTML = '';
        if (type === 'pre') {
          // Pre-Test: แสดงเฉพาะสิ่งที่นักเรียนตอบ + ป้ายถูก/ผิด ไม่เฉลยข้อถูก
          answerDetailHTML = `<div style="font-size: 0.88rem; color: #DDD;">คำตอบของคุณ: <strong>${userAnsText}</strong></div>`;
        } else {
          // Post-Test: แสดงคำตอบของคุณ, เฉลยข้อที่ถูก และกล่องคำอธิบายละเอียด
          answerDetailHTML = `
            <div style="font-size: 0.88rem; color: #DDD;">
              คำตอบของคุณ: <strong>${userAnsText}</strong>
              ${!isCorrect ? `<br>คำตอบที่ถูกต้องคือ: <strong style="color:#00E676;">${correctAnsText}</strong>` : ''}
            </div>
            <div class="quiz-exp-text">
              💡 <strong>คำอธิบาย:</strong> ${q.explanation}
            </div>
            <div class="quiz-exp-indicator">
              🎯 ตัวชี้วัด: ${q.indicator}
            </div>
          `;
        }

        return `
          <div class="quiz-exp-item ${isCorrect ? 'correct' : 'incorrect'}">
            <div class="quiz-exp-question">${q.question}</div>
            <div class="quiz-exp-badge ${isCorrect ? 'correct' : 'incorrect'}">
              ${isCorrect ? '✅ ตอบถูกต้อง (+1 คะแนน)' : '❌ ตอบไม่ถูกต้อง (0 คะแนน)'}
            </div>
            ${answerDetailHTML}
          </div>
        `;
      }).join('');
    }

    if (this.modalQuizResult) this.modalQuizResult.classList.add('active');
  }

  async renderAnalyticsTable() {
    const quizTbody = document.getElementById('quiz-analytics-table-body');
    const gameTbody = document.getElementById('game-analytics-table-body');

    // Fetch latest online centralized cloud logs if cloud URL is connected
    if (window.teacherStore) {
      await window.teacherStore.fetchCloudStudentLogs();
    }

    // 1. Render Quiz Summary Table (ลบคอลัมน์วันที่ทำล่าสุดออก)
    if (quizTbody) {
      const quizStats = window.teacherStore.getQuizSummaryStats();
      if (quizStats.length === 0) {
        quizTbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: #BBB; padding: 18px;">
              ยังไม่มีประวัติแบบทดสอบก่อน-หลังเรียนของนักเรียนในขณะนี้
            </td>
          </tr>
        `;
      } else {
        quizTbody.innerHTML = quizStats.map((s, idx) => {
          const impColor = s.improvementVal > 0 ? '#00E676' : (s.improvementVal < 0 ? '#FF5252' : '#FFD700');
          return `
            <tr>
              <td>${idx + 1}</td>
              <td><strong>${s.name}</strong></td>
              <td style="color: #FFB74D; font-weight: 600;">${s.preScore !== '-' ? s.preScore + ' / 5' : '-'}</td>
              <td style="color: #00E676; font-weight: 600;">${s.postScore !== '-' ? s.postScore + ' / 5' : '-'}</td>
              <td style="color: ${impColor}; font-weight: 700;">${s.improvementText}</td>
              <td><span style="padding: 2px 8px; border-radius: 6px; background: rgba(0,230,118,0.15); color: #00E676; border: 1px solid #00E676; font-size: 0.8rem;">${s.result}</span></td>
            </tr>
          `;
        }).join('');
      }
    }

    // 2. Render AI Motion Game Summary Table (ลบคอลัมน์วันที่เล่นล่าสุดออก)
    if (gameTbody) {
      const gameStats = window.teacherStore.getGameSummaryStats();
      if (gameStats.length === 0) {
        gameTbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; color: #BBB; padding: 18px;">
              ยังไม่มีประวัติสถิติการฝึกปฏิบัติด้วยเกม AI ของนักเรียนในขณะนี้
            </td>
          </tr>
        `;
      } else {
        gameTbody.innerHTML = gameStats.map((s, idx) => {
          const impColor = s.gameImprovement > 0 ? '#00E676' : (s.gameImprovement < 0 ? '#FF5252' : '#FFD700');
          const impText = s.gameImprovement >= 0 ? `+${s.gameImprovement}%` : `${s.gameImprovement}%`;
          return `
            <tr>
              <td>${idx + 1}</td>
              <td><strong>${s.name}</strong></td>
              <td>${s.playCount} ครั้ง</td>
              <td style="color: #DDD;">${s.firstScore} คะแนน</td>
              <td style="color: #FFD700; font-weight: 700;">${s.latestScore} คะแนน</td>
              <td style="color: #00E676; font-weight: 700;">${s.bestScore} คะแนน</td>
              <td style="color: ${impColor}; font-weight: 700;">${impText}</td>
              <td><span style="padding: 2px 8px; border-radius: 6px; background: rgba(0,230,118,0.15); color: #00E676; border: 1px solid #00E676; font-size: 0.8rem;">${s.result}</span></td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  saveCloudConfig() {
    const inputCloudUrl = document.getElementById('input-cloud-url');
    if (!inputCloudUrl) return;

    const url = inputCloudUrl.value.trim();
    if (window.teacherStore) {
      window.teacherStore.saveCloudUrl(url);
      window.soundEngine.playBell();
      alert('บันทึกการเชื่อมต่อออนไลน์ส่วนกลาง (Google Sheet WebApp) เรียบร้อยแล้ว! สถิติจากนักเรียนทุกคนทุกเครื่องจะถูกรวบรวมไว้ที่นี่');
      this.renderAnalyticsTable();
    }
  }

  handleImportLogs(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const imported = JSON.parse(text);
        if (Array.isArray(imported)) {
          const current = window.teacherStore.getHistoryLogs();
          const existingIds = new Set(current.map(l => l.id));
          imported.forEach(log => {
            if (!existingIds.has(log.id)) {
              current.push(log);
            }
          });
          localStorage.setItem(window.teacherStore.STORAGE_KEY_HISTORY, JSON.stringify(current));
          this.renderAnalyticsTable();
          window.soundEngine.playBell();
          alert('นำเข้าและนำสถิตินักเรียนจากมือถือเครื่องอื่นมารวมเรียบร้อยแล้ว!');
        }
      } catch (err) {
        alert('รูปแบบไฟล์สถิติไม่ถูกต้อง');
      }
    };
    reader.readAsText(file);
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
window.addEventListener('DOMContentLoaded', async () => {
  window.app = new GameApp();
  if (window.teacherStore) {
    await window.teacherStore.loadServerCustomImages();
  }
  window.app.showScreen('start');
});
