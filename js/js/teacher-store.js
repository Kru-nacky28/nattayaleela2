/**
 * TeacherStore - Manages Teacher Mode Data, Password Auth ('2569'),
 * Baseline Custom Image Storage, Camera Configurations, and Posture Catalog.
 */

// 8 Required Thai Natayasapt Postures
const DEFAULT_POSTURES = [
  {
    id: 1,
    name: 'ตั้งวงบน',
    enName: 'Tang Wong Bon',
    level: 'ระดับสูง (คิ้ว/ศีรษะ)',
    desc: 'ยกแขนตั้งวง ให้ปลายนิ้วมืออยู่ระดับคิ้ว หรือระดับส่วนบนของศีรษะ วงแขนโค้งสวยงาม',
    icon: '👑',
    svgType: 'tang_wong_bon'
  },
  {
    id: 2,
    name: 'ตั้งวงกลาง',
    enName: 'Tang Wong Klang',
    level: 'ระดับกลาง (ไหล่)',
    desc: 'ยกแขนตั้งวง ให้ปลายนิ้วมืออยู่ระดับไหล่ ลำแขนโค้งออกข้างลำตัว',
    icon: '✨',
    svgType: 'tang_wong_klang'
  },
  {
    id: 3,
    name: 'ตั้งวงล่าง',
    enName: 'Tang Wong Lang',
    level: 'ระดับต่ำ (ชายพก/หน้าท้อง)',
    desc: 'ทอดวงแขนลงด้านล่าง ให้ปลายนิ้วมืออยู่ระดับชายพกหรือหน้าท้อง วงแขนโค้งพองาม',
    icon: '🌟',
    svgType: 'tang_wong_lang'
  },
  {
    id: 4,
    name: 'จีบคว่ำ',
    enName: 'Jeeb Khwam',
    level: 'ระดับแขนคว่ำมือ',
    desc: 'ใช้นิ้วหัวแม่มือจรดข้อแรกของนิ้วชี้ นิ้วที่เหลือคลี่ออก พลิกข้อมือคว่ำลง',
    icon: '👇',
    svgType: 'jeeb_khwam'
  },
  {
    id: 5,
    name: 'จีบหงาย',
    enName: 'Jeeb Ngai',
    level: 'ระดับแขนหงายมือ',
    desc: 'นิ้วหัวแม่มือจรดข้อแรกของนิ้วชี้ นิ้วที่เหลือคลี่ออก พลิกข้อมือหงายขึ้นด้านบน',
    icon: '👆',
    svgType: 'jeeb_ngai'
  },
  {
    id: 6,
    name: 'จีบปรกข้าง',
    enName: 'Jeeb Prok Khang',
    level: 'ระดับข้างศีรษะ/ขมับ',
    desc: 'ตั้งมือจีบขึ้นข้างศีรษะ ให้หันจีบเข้าหาศีรษะบริเวณขมับหรือข้างหู',
    icon: '🌸',
    svgType: 'jeeb_prok_khang'
  },
  {
    id: 7,
    name: 'จีบส่งหลัง',
    enName: 'Jeeb Song Lang',
    level: 'ระดับหลังลำตัว',
    desc: 'ส่งแขนตึงไปด้านหลังลำตัว พลิกข้อมือจีบหงายขึ้น นิ้วคลี่ส่งไปด้านหลัง',
    icon: '💫',
    svgType: 'jeeb_song_lang'
  },
  {
    id: 8,
    name: 'จีบล่อแก้ว',
    enName: 'Jeeb LOR Kaew',
    level: 'ระดับดัดนิ้วล่อแก้ว',
    desc: 'ใช้นิ้วหัวแม่มือกดทับบนเล็บนิ้วกลางเป็นวงกลม นิ้วชี้ดัดงอนขึ้นดั่งทรงแก้ว',
    icon: '🔮',
    svgType: 'jeeb_lor_kaew'
  }
];

class TeacherStore {
  constructor() {
    this.STORAGE_KEY_IMAGES = 'natayasapt_custom_images';
    this.STORAGE_KEY_SETTINGS = 'natayasapt_settings';
    this.STORAGE_KEY_HISTORY = 'natayasapt_student_history';
    this.STORAGE_KEY_QUIZ = 'natayasapt_quiz_results';
    this.STORAGE_KEY_CLOUD_URL = 'natayasapt_cloud_url';
    this.TEACHER_PASSCODE = '2569';
    // Public Cloud Analytics Backup Endpoint for seamless multi-device centralization
    this.DEFAULT_CLOUD_ENDPOINT = 'https://jsonbin.org/natayasapt/scores';
  }

  // Verify Passcode
  checkPassword(inputCode) {
    return String(inputCode).trim() === this.TEACHER_PASSCODE;
  }

  // --- Student History & Analytics Store (ระบบหลังบ้านส่วนกลาง) ---

  getHistoryLogs() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  // --- Pre-test / Post-test Quiz Store ---
  getQuizResults() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_QUIZ);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveQuizResult(studentName, type, score, totalQuestions = 5, answers = []) {
    const newQuizEntry = {
      id: Date.now(),
      name: studentName.trim(),
      type, // 'pre' หรือ 'post'
      score,
      totalQuestions,
      answers,
      logCategory: 'QUIZ',
      timestamp: new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
      device: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'PC'
    };

    try {
      const quizLogs = this.getQuizResults();
      quizLogs.push(newQuizEntry);
      localStorage.setItem(this.STORAGE_KEY_QUIZ, JSON.stringify(quizLogs));
    } catch (e) {
      console.error('Failed quiz log save', e);
    }

    // Cloud Sync Immediate Push
    try {
      this.sendCloudStudentLog(newQuizEntry);
    } catch (err) {
      console.warn('Cloud sync offline fallback for quiz', err);
    }

    return newQuizEntry;
  }

  getQuizResultForStudent(studentName) {
    const sName = studentName.trim();
    const logs = this.getQuizResults().filter(q => q.name === sName);
    const preLog = logs.filter(q => q.type === 'pre').pop();
    const postLog = logs.filter(q => q.type === 'post').pop();
    return {
      preScore: preLog ? preLog.score : null,
      postScore: postLog ? postLog.score : null,
      preDate: preLog ? preLog.timestamp : '',
      postDate: postLog ? postLog.timestamp : ''
    };
  }

  getCloudUrl() {
    const userSaved = localStorage.getItem(this.STORAGE_KEY_CLOUD_URL);
    if (userSaved && userSaved.trim()) return userSaved.trim();
    if (typeof window !== 'undefined' && window.DEFAULT_CLOUD_URL && window.DEFAULT_CLOUD_URL.trim()) {
      return window.DEFAULT_CLOUD_URL.trim();
    }
    return 'https://script.google.com/macros/s/AKfycbwiGDYpHP-31I68vTwq03VMeX-6y89XocONreRGWPOn5inBEWoMnHlKbUolLt_r4gdm/exec';
  }

  saveCloudUrl(url) {
    localStorage.setItem(this.STORAGE_KEY_CLOUD_URL, url.trim());
  }

  async saveStudentLog(name, totalScore, baseScore, bonusScore, completedCount, timeUsed) {
    const newLog = {
      id: Date.now(),
      name: name.trim(),
      totalScore,
      baseScore,
      bonusScore,
      completedCount,
      timeUsed,
      logCategory: 'GAME',
      timestamp: new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
      device: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'PC'
    };

    // 1. Save locally in device storage
    try {
      const logs = this.getHistoryLogs();
      logs.push(newLog);
      localStorage.setItem(this.STORAGE_KEY_HISTORY, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed local log save', e);
    }

    // 2. Sync to Central Online Cloud Analytics Server
    try {
      await this.sendCloudStudentLog(newLog);
    } catch (err) {
      console.warn('Cloud sync offline fallback', err);
    }

    return newLog;
  }

  // Send Student Log to Online Cloud Database / Google Sheet Endpoint (รองรับ 100% บน iPad, มือถือ iOS/Android และโน้ตบุ๊ก)
  async sendCloudStudentLog(logEntry) {
    const cloudUrl = this.getCloudUrl();
    if (!cloudUrl) return;

    const payload = JSON.stringify(logEntry);

    // 1. ลองส่งผ่าน navigator.sendBeacon หากเบราว์เซอร์มือถือรองรับ
    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
        const success = navigator.sendBeacon(cloudUrl, blob);
        if (success) return;
      } catch (e) {
        // Fallback to fetch below
      }
    }

    // 2. ส่งผ่าน fetch ด้วย mode: 'no-cors' และ text/plain ป้องกัน iOS Safari บล็อก POST
    try {
      await fetch(cloudUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        mode: 'no-cors',
        body: payload
      });
    } catch (e) {
      console.warn('Failed cloud post on mobile/PC', e);
    }
  }

  // Fetch & Synchronize Centralized Logs across Notebook, iPad, Mobile Phone (Brave & Safari JSONP Compatible)
  async fetchCloudStudentLogs() {
    const cloudUrl = this.getCloudUrl();
    if (!cloudUrl) return;

    // Helper process to merge raw data into local storage
    const processData = (cloudData) => {
      if (!Array.isArray(cloudData) || cloudData.length === 0) return;

      const localGameLogs = this.getHistoryLogs();
      const localQuizLogs = this.getQuizResults();

      const gameIds = new Set(localGameLogs.map(l => String(l.id)));
      const quizIds = new Set(localQuizLogs.map(q => String(q.id)));

      cloudData.forEach(item => {
        let log = item;

        // Handle Apps Script 2D array row or JSON string column fallback
        if (Array.isArray(item)) {
          try {
            const jsonStr = item[item.length - 1];
            if (typeof jsonStr === 'string' && jsonStr.startsWith('{')) {
              log = JSON.parse(jsonStr);
            }
          } catch (err) {
            log = null;
          }
        }

        if (!log || !log.id) return;

        const strId = String(log.id);

        // Separate into Quiz vs Game Logs
        if (log.logCategory === 'QUIZ' || log.type === 'pre' || log.type === 'post') {
          if (!quizIds.has(strId)) {
            localQuizLogs.push(log);
            quizIds.add(strId);
          }
        } else if (log.logCategory === 'GAME' || log.totalScore !== undefined) {
          if (!gameIds.has(strId)) {
            localGameLogs.push(log);
            gameIds.add(strId);
          }
        }
      });

      localStorage.setItem(this.STORAGE_KEY_HISTORY, JSON.stringify(localGameLogs));
      localStorage.setItem(this.STORAGE_KEY_QUIZ, JSON.stringify(localQuizLogs));
    };

    // Method 1: Standard fetch
    try {
      const res = await fetch(cloudUrl, { method: 'GET', cache: 'no-cache' });
      if (res.ok) {
        const cloudData = await res.json();
        processData(cloudData);
        return;
      }
    } catch (e) {
      console.warn('Fetch blocked by browser shields, trying JSONP fallback...', e);
    }

    // Method 2: JSONP Fallback for Brave Browser Shields & iOS Safari Strict CORS
    return new Promise((resolve) => {
      const callbackName = 'cb_cloud_sync_' + Date.now();
      window[callbackName] = (data) => {
        try {
          processData(data);
        } catch (err) {}
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
        resolve();
      };

      const script = document.createElement('script');
      const sep = cloudUrl.includes('?') ? '&' : '?';
      script.src = `${cloudUrl}${sep}callback=${callbackName}&_t=${Date.now()}`;
      script.onerror = () => {
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
        resolve();
      };
      document.body.appendChild(script);
    });
  }

  clearHistory() {
    try {
      localStorage.removeItem(this.STORAGE_KEY_HISTORY);
      localStorage.removeItem(this.STORAGE_KEY_QUIZ);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 1. สถิติแบบทดสอบทฤษฎี (ก่อนเรียน - หลังเรียน) แยกอิสระ
   */
  getQuizSummaryStats() {
    const quizLogs = this.getQuizResults();
    const studentNames = [...new Set(quizLogs.map(q => q.name))];
    const list = [];

    studentNames.forEach(name => {
      const pQuiz = quizLogs.filter(q => q.name === name);
      const preLog = pQuiz.filter(q => q.type === 'pre').pop();
      const postLog = pQuiz.filter(q => q.type === 'post').pop();

      const preScore = preLog ? preLog.score : '-';
      const postScore = postLog ? postLog.score : '-';

      let improvementText = '-';
      let improvementVal = 0;

      if (preLog && postLog) {
        const diff = postLog.score - preLog.score;
        const pct = Math.round((diff / 5) * 100);
        improvementVal = pct;
        improvementText = pct >= 0 ? `+${pct}% (${diff >= 0 ? '+' : ''}${diff})` : `${pct}% (${diff})`;
      } else if (postLog) {
        improvementText = `${postLog.score}/5`;
      }

      let result = 'ผ่านเกณฑ์';
      if (postLog && postLog.score >= 4) result = 'ดีเยี่ยม (100%)';
      else if (postLog && postLog.score >= 3) result = 'ดี (ผ่านเกณฑ์)';
      else if (postLog) result = 'ควรปรับปรุง';
      else result = 'กำลังเรียนรู้';

      const lastDate = postLog ? postLog.timestamp : (preLog ? preLog.timestamp : '-');

      list.push({
        name,
        preScore,
        postScore,
        improvementText,
        improvementVal,
        result,
        lastDate
      });
    });

    return list;
  }

  /**
   * 2. สถิติการปฏิบัติเกม AI (AI Motion Detection Game) แยกอิสระ
   */
  getGameSummaryStats() {
    const gameLogs = this.getHistoryLogs();
    const studentNames = [...new Set(gameLogs.map(l => l.name))];
    const list = [];

    studentNames.forEach(name => {
      const pLogs = gameLogs.filter(l => l.name === name);
      const playCount = pLogs.length;
      const firstLog = pLogs[0];
      const latestLog = pLogs[pLogs.length - 1];
      const bestScore = Math.max(...pLogs.map(l => l.totalScore));
      const latestScore = latestLog.totalScore;

      let gameImprovement = 0;
      if (firstLog && firstLog.totalScore > 0 && latestLog) {
        gameImprovement = Math.round(((latestLog.totalScore - firstLog.totalScore) / firstLog.totalScore) * 100);
      } else if (latestLog && latestLog.totalScore > 0) {
        gameImprovement = 100;
      }

      let result = 'ผ่านเกณฑ์การประเมิน';
      if (latestScore >= 80) result = 'ดีเยี่ยม (100%)';
      else if (latestScore >= 50) result = 'ดี (ผ่านเกณฑ์)';
      else result = 'ควรปรับปรุง';

      list.push({
        name,
        playCount,
        firstScore: firstLog.totalScore,
        latestScore,
        bestScore,
        gameImprovement,
        result,
        lastDate: latestLog.timestamp
      });
    });

    return list;
  }

  // Combined Summary Stats for Backward Compatibility
  getStudentSummaryStats() {
    return {
      quizStats: this.getQuizSummaryStats(),
      gameStats: this.getGameSummaryStats()
    };
  }

  // Export Quiz CSV File
  exportQuizCSV() {
    const stats = this.getQuizSummaryStats();
    if (stats.length === 0) {
      alert('ยังไม่มีข้อมูลสถิติแบบทดสอบก่อน-หลังเรียนให้ส่งออก');
      return;
    }

    let csvContent = '\uFEFF';
    csvContent += 'ชื่อ - นามสกุล นักเรียน,คะแนนก่อนเรียน (Pre-test /5),คะแนนหลังเรียน (Post-test /5),พัฒนาการทฤษฎี (%),ผลการประเมิน\n';

    stats.forEach(s => {
      csvContent += `"${s.name}","${s.preScore}","${s.postScore}","${s.improvementText}","${s.result}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `รายงานสถิติแบบทดสอบทฤษฎี_ก่อนหลังเรียน_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export AI Game Practice CSV File
  exportGameCSV() {
    const stats = this.getGameSummaryStats();
    if (stats.length === 0) {
      alert('ยังไม่มีข้อมูลสถิติการเล่นเกม AI ให้ส่งออก');
      return;
    }

    let csvContent = '\uFEFF';
    csvContent += 'ชื่อ - นามสกุล นักเรียน,จำนวนครั้งที่เล่น,คะแนนครั้งแรก,คะแนนล่าสุด,คะแนนสูงสุด,พัฒนาการปฏิบัติ (%),ผลการประเมิน\n';

    stats.forEach(s => {
      const impText = s.gameImprovement >= 0 ? `+${s.gameImprovement}%` : `${s.gameImprovement}%`;
      csvContent += `"${s.name}",${s.playCount},${s.firstScore},${s.latestScore},${s.bestScore},"${impText}","${s.result}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `รายงานสถิติการปฏิบัติเกมAI_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportCSV() {
    this.exportQuizCSV();
    setTimeout(() => this.exportGameCSV(), 500);
  }

  // Export Custom Images JSON Data Pack (สำหรับนำไปใช้งานข้ามเครื่อง/GitHub)
  exportCustomPack() {
    const customImages = this.getCustomImages();
    const jsonStr = JSON.stringify(customImages, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `custom-images-pack.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Import Custom Images JSON Data Pack
  importCustomPack(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (typeof parsed === 'object' && parsed !== null) {
        localStorage.setItem(this.STORAGE_KEY_IMAGES, JSON.stringify(parsed));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to import pack', e);
      return false;
    }
  }

  // Get list of all postures merged with custom teacher uploads
  getPostures() {
    const customImages = this.getCustomImages();
    return DEFAULT_POSTURES.map(p => {
      const customImg = customImages[p.id];
      return {
        ...p,
        imageSrc: customImg || this.generateDefaultSVG(p.svgType)
      };
    });
  }

  getPostureById(id) {
    const postures = this.getPostures();
    return postures.find(p => p.id === Number(id)) || postures[0];
  }

  // Automatically fetch shared custom images from server repository (data/custom-images.json)
  async loadServerCustomImages() {
    try {
      const res = await fetch('data/custom-images.json');
      if (res.ok) {
        const serverData = await res.json();
        if (serverData && typeof serverData === 'object' && Object.keys(serverData).length > 0) {
          const current = this.getCustomImages();
          const merged = { ...serverData, ...current };
          localStorage.setItem(this.STORAGE_KEY_IMAGES, JSON.stringify(merged));
          return true;
        }
      }
    } catch (e) {
      console.log('No server custom images pack found or fetch error', e);
    }
    return false;
  }

  // Get custom images stored in LocalStorage
  getCustomImages() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_IMAGES);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.warn('LocalStorage access error', e);
      return {};
    }
  }

  /**
   * Automatic Image Compressor
   * Resizes large camera photos (3-8MB) down to max 500px width/height and 0.7 JPEG quality (~35KB).
   * Prevents LocalStorage QuotaExceededError completely!
   */
  compressImage(base64Data, maxWidth = 500, maxHeight = 500, quality = 0.7) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => resolve(base64Data); // Fallback to raw if fail
      img.src = base64Data;
    });
  }

  // Save custom baseline image uploaded by teacher with auto-compression
  async saveCustomImage(postureId, rawBase64Data) {
    try {
      // Compress image before saving
      const compressedData = await this.compressImage(rawBase64Data);
      const customImages = this.getCustomImages();
      customImages[postureId] = compressedData;
      localStorage.setItem(this.STORAGE_KEY_IMAGES, JSON.stringify(customImages));
      return true;
    } catch (e) {
      console.error('Failed to save compressed image', e);
      // Emergency recovery: clear old images if needed
      try {
        localStorage.removeItem(this.STORAGE_KEY_IMAGES);
        const customImages = {};
        const compressedData = await this.compressImage(rawBase64Data, 400, 400, 0.5);
        customImages[postureId] = compressedData;
        localStorage.setItem(this.STORAGE_KEY_IMAGES, JSON.stringify(customImages));
        return true;
      } catch (err2) {
        alert('พื้นที่เก็บบันทึกในเบราว์เซอร์เต็ม กรุณากดรีเซ็ตไฟล์ภาพเก่าก่อนอัปโหลดใหม่');
        return false;
      }
    }
  }

  // Clear all custom uploaded images
  clearAllCustomImages() {
    try {
      localStorage.removeItem(this.STORAGE_KEY_IMAGES);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Reset posture image back to baseline default
  resetCustomImage(postureId) {
    try {
      const customImages = this.getCustomImages();
      delete customImages[postureId];
      localStorage.setItem(this.STORAGE_KEY_IMAGES, JSON.stringify(customImages));
    } catch (e) {
      console.error('Failed to reset image', e);
    }
  }

  // Settings management (facingMode, tolerance level)
  getSettings() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_SETTINGS);
      return data ? JSON.parse(data) : { facingMode: 'user', tolerance: 'medium' };
    } catch (e) {
      return { facingMode: 'user', tolerance: 'medium' };
    }
  }

  saveSettings(settingsObj) {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...settingsObj };
      localStorage.setItem(this.STORAGE_KEY_SETTINGS, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  // Generate elegant Thai Classical Dance Silhouette SVG Data URIs as default reference images (Solid Black Silhouette)
  generateDefaultSVG(type) {
    let path = '';
    const goldColor = '#FFD700';
    const bodyColor = '#000000'; // Pure Solid Black Shadow Silhouette

    switch(type) {
      case 'tang_wong_bon':
        // High Circle: Arms curved up, hands near head top/eyebrow level
        path = `
          <!-- Head -->
          <circle cx="200" cy="110" r="35" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <!-- Crown/Chada -->
          <polygon points="200,45 185,90 215,90" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <!-- Torso -->
          <path d="M 165 150 L 235 150 L 220 280 L 180 280 Z" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <!-- Arms Tang Wong Bon -->
          <path d="M 165 155 C 100 130 90 70 160 70" stroke="${bodyColor}" stroke-width="22" fill="none" stroke-linecap="round"/>
          <path d="M 165 155 C 100 130 90 70 160 70" stroke="${goldColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M 235 155 C 300 130 310 70 240 70" stroke="${bodyColor}" stroke-width="22" fill="none" stroke-linecap="round"/>
          <path d="M 235 155 C 300 130 310 70 240 70" stroke="${goldColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <!-- Hands fanned up -->
          <circle cx="160" cy="68" r="14" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <circle cx="240" cy="68" r="14" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
        `;
        break;

      case 'tang_wong_klang':
        // Middle Circle: Arms curved out at shoulder level
        path = `
          <circle cx="200" cy="110" r="35" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <polygon points="200,45 185,90 215,90" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <path d="M 165 150 L 235 150 L 220 280 L 180 280 Z" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <!-- Arms Tang Wong Klang -->
          <path d="M 165 160 C 80 160 70 120 110 120" stroke="${bodyColor}" stroke-width="22" fill="none" stroke-linecap="round"/>
          <path d="M 165 160 C 80 160 70 120 110 120" stroke="${goldColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M 235 160 C 320 160 330 120 290 120" stroke="${bodyColor}" stroke-width="22" fill="none" stroke-linecap="round"/>
          <path d="M 235 160 C 320 160 330 120 290 120" stroke="${goldColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <circle cx="110" cy="118" r="14" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <circle cx="290" cy="118" r="14" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
        `;
        break;

      case 'tang_wong_lang':
        // Low Circle: Arms curved down in front of abdomen
        path = `
          <circle cx="200" cy="110" r="35" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <polygon points="200,45 185,90 215,90" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <path d="M 165 150 L 235 150 L 220 280 L 180 280 Z" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <!-- Arms Tang Wong Lang -->
          <path d="M 165 160 C 110 210 150 250 180 240" stroke="${bodyColor}" stroke-width="22" fill="none" stroke-linecap="round"/>
          <path d="M 165 160 C 110 210 150 250 180 240" stroke="${goldColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M 235 160 C 290 210 250 250 220 240" stroke="${bodyColor}" stroke-width="22" fill="none" stroke-linecap="round"/>
          <path d="M 235 160 C 290 210 250 250 220 240" stroke="${goldColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <circle cx="180" cy="240" r="13" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <circle cx="220" cy="240" r="13" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
        `;
        break;

      case 'jeeb_khwam':
        // Jeeb Khwam: Pinch gesture turned downwards
        path = `
          <circle cx="200" cy="110" r="35" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <polygon points="200,45 185,90 215,90" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <path d="M 165 150 L 235 150 L 220 280 L 180 280 Z" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <path d="M 165 160 L 110 180 L 140 210" stroke="${bodyColor}" stroke-width="22" fill="none" stroke-linecap="round"/>
          <path d="M 165 160 L 110 180 L 140 210" stroke="${goldColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M 235 160 L 290 180 L 260 210" stroke="${bodyColor}" stroke-width="22" fill="none" stroke-linecap="round"/>
          <path d="M 235 160 L 290 180 L 260 210" stroke="${goldColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <polygon points="140,210 130,230 150,225" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <polygon points="260,210 270,230 250,225" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
        `;
        break;

      case 'jeeb_ngai':
        // Jeeb Ngai: Pinch gesture turned upwards
        path = `
          <circle cx="200" cy="110" r="35" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <polygon points="200,45 185,90 215,90" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <path d="M 165 150 L 235 150 L 220 280 L 180 280 Z" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <path d="M 165 160 L 120 180 L 130 140" stroke="${bodyColor}" stroke-width="22" fill="none" stroke-linecap="round"/>
          <path d="M 165 160 L 120 180 L 130 140" stroke="${goldColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M 235 160 L 280 180 L 270 140" stroke="${bodyColor}" stroke-width="22" fill="none" stroke-linecap="round"/>
          <path d="M 235 160 L 280 180 L 270 140" stroke="${goldColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <polygon points="130,140 120,120 142,125" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <polygon points="270,140 280,120 258,125" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
        `;
        break;

      case 'jeeb_prok_khang':
        // Jeeb Prok Khang: Jeeb at side of head/temple
        path = `
          <circle cx="200" cy="110" r="35" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <polygon points="200,45 185,90 215,90" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <path d="M 165 150 L 235 150 L 220 280 L 180 280 Z" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <path d="M 165 155 C 100 140 110 90 140 100" stroke="${bodyColor}" stroke-width="22" fill="none" stroke-linecap="round"/>
          <path d="M 165 155 C 100 140 110 90 140 100" stroke="${goldColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M 235 155 C 300 140 290 90 260 100" stroke="${bodyColor}" stroke-width="22" fill="none" stroke-linecap="round"/>
          <path d="M 235 155 C 300 140 290 90 260 100" stroke="${goldColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <polygon points="140,100 152,95 145,115" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <polygon points="260,100 248,95 255,115" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
        `;
        break;

      case 'jeeb_song_lang':
        // Jeeb Song Lang: Arm extended back behind body
        path = `
          <circle cx="200" cy="110" r="35" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <polygon points="200,45 185,90 215,90" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <path d="M 165 150 L 235 150 L 220 280 L 180 280 Z" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <path d="M 165 160 L 100 220 L 70 240" stroke="${bodyColor}" stroke-width="22" fill="none" stroke-linecap="round"/>
          <path d="M 165 160 L 100 220 L 70 240" stroke="${goldColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M 235 160 L 300 220 L 330 240" stroke="${bodyColor}" stroke-width="22" fill="none" stroke-linecap="round"/>
          <path d="M 235 160 L 300 220 L 330 240" stroke="${goldColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <polygon points="70,240 55,250 80,255" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <polygon points="330,240 345,250 320,255" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
        `;
        break;

      case 'jeeb_lor_kaew':
        // Jeeb LOR Kaew: Thumb on middle nail, index gracefully curved
        path = `
          <circle cx="200" cy="110" r="35" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <polygon points="200,45 185,90 215,90" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <path d="M 165 150 L 235 150 L 220 280 L 180 280 Z" fill="${bodyColor}" stroke="${goldColor}" stroke-width="2"/>
          <path d="M 165 160 C 100 150 120 120 150 140" stroke="${bodyColor}" stroke-width="22" fill="none" stroke-linecap="round"/>
          <path d="M 165 160 C 100 150 120 120 150 140" stroke="${goldColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M 235 160 C 300 150 280 120 250 140" stroke="${bodyColor}" stroke-width="22" fill="none" stroke-linecap="round"/>
          <path d="M 235 160 C 300 150 280 120 250 140" stroke="${goldColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <circle cx="150" cy="140" r="14" fill="${bodyColor}" stroke="${goldColor}" stroke-width="3"/>
          <path d="M 150 126 Q 160 115 165 125" stroke="${goldColor}" stroke-width="4" fill="none"/>
          <circle cx="250" cy="140" r="14" fill="${bodyColor}" stroke="${goldColor}" stroke-width="3"/>
          <path d="M 250 126 Q 240 115 235 125" stroke="${goldColor}" stroke-width="4" fill="none"/>
        `;
        break;

      default:
        path = `<circle cx="200" cy="150" r="50" fill="${bodyColor}"/>`;
    }

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" width="100%" height="100%">
        <rect width="400" height="320" rx="16" fill="rgba(0,0,0,0.6)"/>
        <!-- Background Decorative Motif -->
        <circle cx="200" cy="160" r="140" fill="none" stroke="rgba(212, 175, 55, 0.2)" stroke-width="3" stroke-dasharray="8 8"/>
        ${path}
      </svg>
    `;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }
}

window.teacherStore = new TeacherStore();
