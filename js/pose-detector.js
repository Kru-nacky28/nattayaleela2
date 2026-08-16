/**
 * PoseDetector - MediaPipe Integration & Thai Natayasapt Gesture Evaluator.
 * Combines Body Pose (arm height elevation) & Hand Finger Landmarks.
 * Features body-proportional normalization to handle thin/fat body variations.
 */

class PoseDetector {
  constructor() {
    this.pose = null;
    this.hands = null;
    this.camera = null;
    this.latestPoseResults = null;
    this.latestHandResults = null;
    this.isReady = false;
    this.onFrameCallback = null;
  }

  // Initialize MediaPipe Pose and MediaPipe Hands
  async init(videoElement, onFrameCallback) {
    this.onFrameCallback = onFrameCallback;

    if (typeof window.Pose === 'undefined' || typeof window.Hands === 'undefined') {
      console.warn('MediaPipe CDN loading fallbacks active...');
    }

    try {
      // 1. Setup MediaPipe Pose
      if (window.Pose) {
        this.pose = new window.Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });
        this.pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        this.pose.onResults((results) => {
          this.latestPoseResults = results;
          this.triggerFrameUpdate();
        });
      }

      // 2. Setup MediaPipe Hands
      if (window.Hands) {
        this.hands = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        this.hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        this.hands.onResults((results) => {
          this.latestHandResults = results;
          this.triggerFrameUpdate();
        });
      }

      // 3. Setup Camera Stream
      await this.startCamera(videoElement);
    } catch (err) {
      console.error('Error starting MediaPipe Camera:', err);
    }
  }

  async startCamera(videoElement) {
    if (!videoElement) return;

    const settings = window.teacherStore ? window.teacherStore.getSettings() : { facingMode: 'user' };
    const mode = settings.facingMode || 'user';

    // Apply proper mirroring for front camera vs rear camera
    videoElement.style.transform = mode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';

    try {
      // 1. Try MediaPipe Camera utils wrapper
      if (window.Camera) {
        if (this.camera) {
          try { await this.camera.stop(); } catch(e){}
        }

        this.camera = new window.Camera(videoElement, {
          onFrame: async () => {
            if (this.pose) await this.pose.send({ image: videoElement });
            if (this.hands) await this.hands.send({ image: videoElement });
          },
          width: 640,
          height: 480,
          facingMode: mode
        });
        await this.camera.start();
        this.isReady = true;
        return true;
      }
    } catch (e) {
      console.warn('MediaPipe camera wrapper failed, using native getUserMedia fallback...', e);
    }

    // 2. Native getUserMedia fallback
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });
        videoElement.srcObject = stream;
        await videoElement.play();

        const processFrame = async () => {
          if (videoElement.readyState >= 2) {
            if (this.pose) await this.pose.send({ image: videoElement });
            if (this.hands) await this.hands.send({ image: videoElement });
          }
          if (this.isReady) requestAnimationFrame(processFrame);
        };
        this.isReady = true;
        processFrame();
        return true;
      }
    } catch (err) {
      console.error('Camera permission error:', err);
      const ua = navigator.userAgent || '';
      const isInApp = /Line|FB_IAB|FBAN|FBAV|Messenger|Instagram|TikTok/i.test(ua);

      if (isInApp) {
        alert('⚠️ แอป LINE / Facebook บล็อกการเปิดกล้อง!\n\n💡 กรุณากดปุ่ม 3 จุด (⋮) หรือขีดสามขีด ที่มุมบนขวา แล้วเลือก "เปิดด้วยเบราว์เซอร์อื่น" (Open in Chrome / Safari) เพื่อเปิดใช้งานกล้อง');
      } else {
        alert('⚠️ สิทธิ์การใช้งานกล้องถูกปฏิเสธ (Permission Denied)\n\n💡 วิธีแก้ไข:\n1. กดที่ไอคอนแม่กุญแจ 🔒 หรือ (i) หน้าชื่อเว็บด้านบน\n2. เลือก "สิทธิ์การตั้งค่าเว็บไซต์" -> เปลี่ยน "กล้อง" เป็น "อนุญาต (Allow)"');
      }
      return false;
    }
  }

  triggerFrameUpdate() {
    if (this.onFrameCallback) {
      const evaluation = this.evaluateCurrentPose(this.targetPostureId);
      this.onFrameCallback({
        poseResults: this.latestPoseResults,
        handResults: this.latestHandResults,
        evaluation: evaluation
      });
    }
  }

  setTargetPosture(postureId) {
    this.targetPostureId = Number(postureId);
  }

  /**
   * Core Posture Matcher
   * Evaluates if current player's skeleton & hands match the target Natayasapt posture.
   * Uses body-normalized height ratios to ensure compatibility with all body sizes (fat/thin).
   */
  evaluateCurrentPose(postureId) {
    if (!this.latestPoseResults || !this.latestPoseResults.poseLandmarks) {
      return { isMatched: false, message: 'กรุณายืนให้ตรงกล้อง ให้เห็นส่วนบนของร่างกาย', accuracyScore: 0 };
    }

    const lm = this.latestPoseResults.poseLandmarks;
    const handLmList = this.latestHandResults ? this.latestHandResults.multiHandLandmarks : [];

    // Body Keypoints
    const nose = lm[0];
    const leftEye = lm[2];
    const rightEye = lm[5];
    const leftShoulder = lm[11];
    const rightShoulder = lm[12];
    const leftElbow = lm[13];
    const rightElbow = lm[14];
    const leftWrist = lm[15];
    const rightWrist = lm[16];
    const leftHip = lm[23];
    const rightHip = lm[24];

    // Reference Body Scale (Shoulder to Hip height ratio for body size normalization)
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipMidY = (leftHip.y + rightHip.y) / 2;
    const torsoHeight = Math.max(0.15, Math.abs(hipMidY - shoulderMidY));
    const headLevelY = (nose.y + leftEye.y + rightEye.y) / 3;

    // Relative height of wrists (negative = above shoulder towards head, positive = below shoulder)
    const leftWristRelY = (leftWrist.y - shoulderMidY) / torsoHeight;
    const rightWristRelY = (rightWrist.y - shoulderMidY) / torsoHeight;

    // Detect Hand Pinch / Gestures from MediaPipe Hands if available
    let hasJeebPinch = false;
    let hasLorKaewPinch = false;
    let handsUpward = false;

    if (handLmList && handLmList.length > 0) {
      for (const hLm of handLmList) {
        const thumbTip = hLm[4];
        const indexTip = hLm[8];
        const middleTip = hLm[12];
        const wristPoint = hLm[0];

        // Hand scale distance (Wrist to Middle Finger MCP)
        const handScale = Math.hypot(hLm[9].x - wristPoint.x, hLm[9].y - wristPoint.y) || 0.1;

        // Jeeb pinch distance (Thumb tip to Index tip)
        const thumbIndexDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y) / handScale;

        // Lor Kaew pinch distance (Thumb tip to Middle tip)
        const thumbMiddleDist = Math.hypot(thumbTip.x - middleTip.x, thumbTip.y - middleTip.y) / handScale;

        if (thumbIndexDist < 0.45) {
          hasJeebPinch = true;
        }
        if (thumbMiddleDist < 0.45 && thumbIndexDist > 0.3) {
          hasLorKaewPinch = true;
        }
        if (indexTip.y < wristPoint.y) {
          handsUpward = true;
        }
      }
    }

    let isMatched = false;
    let message = 'กอดอกหรือปรับท่าทางให้ตรงกับเงา';
    let accuracyScore = 0;

    switch (postureId) {
      case 1: // 1. ตั้งวงบน (Tang Wong Bon) - Must elevate wrists to eyebrow / top head level
        const isHighLeft = leftWristRelY < -0.18 || (leftWrist.y <= nose.y + 0.05);
        const isHighRight = rightWristRelY < -0.18 || (rightWrist.y <= nose.y + 0.05);
        if (isHighLeft || isHighRight) {
          isMatched = true;
          accuracyScore = 95;
          message = 'แสกนตรงเงาแล้ว! ท่าตั้งวงบน';
        } else {
          message = 'ยกแขนวงให้สูงขึ้น ทาบระดับคิ้วหรือศีรษะ';
        }
        break;

      case 2: // 2. ตั้งวงกลาง (Tang Wong Klang) - Must extend arm out at shoulder level
        const isMidLeftHeight = Math.abs(leftWristRelY) <= 0.35;
        const isMidRightHeight = Math.abs(rightWristRelY) <= 0.35;
        const isArmExtendedLeft = Math.abs(leftWrist.x - leftShoulder.x) > 0.08;
        const isArmExtendedRight = Math.abs(rightWrist.x - rightShoulder.x) > 0.08;

        if ((isMidLeftHeight && isArmExtendedLeft) || (isMidRightHeight && isArmExtendedRight)) {
          isMatched = true;
          accuracyScore = 92;
          message = 'แสกนตรงเงาแล้ว! ท่าตั้งวงกลาง';
        } else {
          message = 'กางแขนออกข้างลำตัว ทาบให้ตรงระดับไหล่';
        }
        break;

      case 3: // 3. ตั้งวงล่าง (Tang Wong Lang) - Must lower wrists to abdomen / navel level
        const isLowLeft = leftWristRelY > 0.18 || (leftWrist.y > shoulderMidY + 0.08);
        const isLowRight = rightWristRelY > 0.18 || (rightWrist.y > shoulderMidY + 0.08);
        if (isLowLeft || isLowRight) {
          isMatched = true;
          accuracyScore = 90;
          message = 'แสกนตรงเงาแล้ว! ท่าตั้งวงล่าง';
        } else {
          message = 'ทอดวงแขนลงด้านล่าง ทาบระดับชายพก/หน้าท้อง';
        }
        break;

      case 4: // 4. จีบคว่ำ (Jeeb Khwam) - Arm MUST be at chest height AND wrist/fingers turned down
        const isArmAtChestLevel4 = (leftWristRelY >= -0.4 && leftWristRelY <= 0.35) || (rightWristRelY >= -0.4 && rightWristRelY <= 0.35);
        const isWristTurnedDown = !handsUpward || hasJeebPinch;

        if (isArmAtChestLevel4 && isWristTurnedDown) {
          isMatched = true;
          accuracyScore = 93;
          message = 'แสกนตรงเงาแล้ว! ท่าจีบคว่ำ';
        } else {
          message = 'ยกแขนทาบระดับอก/เอว แล้วพลิกข้อมือคว่ำลง';
        }
        break;

      case 5: // 5. จีบหงาย (Jeeb Ngai) - Arm MUST be at chest height AND wrist/fingers turned up
        const isArmAtChestLevel5 = (leftWristRelY >= -0.4 && leftWristRelY <= 0.35) || (rightWristRelY >= -0.4 && rightWristRelY <= 0.35);
        const isWristTurnedUp = handsUpward || hasJeebPinch;

        if (isArmAtChestLevel5 && isWristTurnedUp) {
          isMatched = true;
          accuracyScore = 94;
          message = 'แสกนตรงเงาแล้ว! ท่าจีบหงาย';
        } else {
          message = 'ยกแขนทาบระดับอก/เอว หงายจีบพลิกข้อมือขึ้น';
        }
        break;

      case 6: // 6. จีบปรกข้าง (Jeeb Prok Khang) - Wrist MUST be raised to side of head (temple/ear)
        const isProkSideLeft = (leftWristRelY < -0.12) && (Math.abs(leftWrist.x - nose.x) < 0.38);
        const isProkSideRight = (rightWristRelY < -0.12) && (Math.abs(rightWrist.x - nose.x) < 0.38);
        if (isProkSideLeft || isProkSideRight) {
          isMatched = true;
          accuracyScore = 96;
          message = 'แสกนตรงเงาแล้ว! ท่าจีบปรกข้าง';
        } else {
          message = 'ยกจีบขึ้นทาบข้างศีรษะ บริเวณขมับหรือข้างหู';
        }
        break;

      case 7: // 7. จีบส่งหลัง (Jeeb Song Lang) - Arm MUST be extended straight behind torso
        const isArmBackLeft = (leftWrist.x < leftShoulder.x - 0.05);
        const isArmBackRight = (rightWrist.x > rightShoulder.x + 0.05);
        if (isArmBackLeft || isArmBackRight) {
          isMatched = true;
          accuracyScore = 91;
          message = 'แสกนตรงเงาแล้ว! ท่าจีบส่งหลัง';
        } else {
          message = 'ส่งแขนตึงไปด้านหลังลำตัว ทาบจีบส่งไปข้างหลัง';
        }
        break;

      case 8: // 8. จีบล่อแก้ว (Jeeb LOR Kaew) - Hand MUST be at chest height holding Lor Kaew gesture
        const isArmAtChestLevel8 = Math.abs(leftWristRelY) <= 0.4 || Math.abs(rightWristRelY) <= 0.4;
        if (isArmAtChestLevel8 && (hasLorKaewPinch || hasJeebPinch)) {
          isMatched = true;
          accuracyScore = 95;
          message = 'แสกนตรงเงาแล้ว! ท่าจีบล่อแก้ว';
        } else {
          message = 'ยกมือทาบระดับอก นิ้วหัวแม่มือกดทับเล็บนิ้วกลาง';
        }
        break;

      default:
        isMatched = false;
    }

    return { isMatched, message, accuracyScore };
  }

  // Draw Skeleton Overlay on Canvas
  drawSkeleton(canvasCtx, canvasElement) {
    if (!this.latestPoseResults || !this.latestPoseResults.poseLandmarks || !canvasCtx) return;

    const width = canvasElement.width;
    const height = canvasElement.height;
    const landmarks = this.latestPoseResults.poseLandmarks;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, width, height);

    // Draw Skeleton Lines in Golden Crimson Aesthetic
    const connections = [
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Upper body & arms
      [11, 23], [12, 24], [23, 24] // Torso
    ];

    canvasCtx.strokeStyle = '#D4AF37'; // Royal Gold
    canvasCtx.lineWidth = 4;
    canvasCtx.shadowColor = '#FFD700';
    canvasCtx.shadowBlur = 8;

    for (const [i, j] of connections) {
      if (landmarks[i] && landmarks[j]) {
        canvasCtx.beginPath();
        canvasCtx.moveTo(landmarks[i].x * width, landmarks[i].y * height);
        canvasCtx.lineTo(landmarks[j].x * width, landmarks[j].y * height);
        canvasCtx.stroke();
      }
    }

    // Draw Joint Dots
    for (const idx of [0, 11, 12, 13, 14, 15, 16, 23, 24]) {
      if (landmarks[idx]) {
        const x = landmarks[idx].x * width;
        const y = landmarks[idx].y * height;

        canvasCtx.beginPath();
        canvasCtx.arc(x, y, 7, 0, 2 * Math.PI);
        canvasCtx.fillStyle = idx === 15 || idx === 16 ? '#00FF88' : '#FFD700';
        canvasCtx.fill();
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = '#FFFFFF';
        canvasCtx.stroke();
      }
    }

    // Draw Hand Landmarks if available
    if (this.latestHandResults && this.latestHandResults.multiHandLandmarks) {
      canvasCtx.strokeStyle = '#00FF88';
      canvasCtx.lineWidth = 2;
      for (const hLm of this.latestHandResults.multiHandLandmarks) {
        for (let i = 0; i < hLm.length; i++) {
          const pt = hLm[i];
          canvasCtx.beginPath();
          canvasCtx.arc(pt.x * width, pt.y * height, 3, 0, 2 * Math.PI);
          canvasCtx.fillStyle = '#00FF88';
          canvasCtx.fill();
        }
      }
    }

    canvasCtx.restore();
  }
}

window.poseDetector = new PoseDetector();
