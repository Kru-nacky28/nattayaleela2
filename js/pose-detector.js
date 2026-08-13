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
      if (window.Camera && videoElement) {
        const settings = window.teacherStore ? window.teacherStore.getSettings() : { facingMode: 'user' };
        this.camera = new window.Camera(videoElement, {
          onFrame: async () => {
            if (this.pose) await this.pose.send({ image: videoElement });
            if (this.hands) await this.hands.send({ image: videoElement });
          },
          width: 640,
          height: 480,
          facingMode: settings.facingMode || 'user'
        });
        await this.camera.start();
        this.isReady = true;
      }
    } catch (err) {
      console.error('Error starting MediaPipe Camera:', err);
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
      case 1: // ตั้งวงบน (Tang Wong Bon) - Wrists elevated near eyebrow/head level
        const isHighLeft = leftWristRelY < -0.25 || leftWrist.y < headLevelY + 0.08;
        const isHighRight = rightWristRelY < -0.25 || rightWrist.y < headLevelY + 0.08;
        if (isHighLeft || isHighRight) {
          isMatched = true;
          accuracyScore = 95;
          message = 'ยอดเยี่ยม! ท่าตั้งวงบนถูกต้อง';
        } else {
          message = 'ยกแขนวงให้สูงขึ้น ระดับคิ้วหรือศีรษะ';
        }
        break;

      case 2: // ตั้งวงกลาง (Tang Wong Klang) - Wrists near shoulder level
        const isMidLeft = Math.abs(leftWristRelY) <= 0.35;
        const isMidRight = Math.abs(rightWristRelY) <= 0.35;
        const isArmOut = Math.abs(leftWrist.x - leftShoulder.x) > 0.1 || Math.abs(rightWrist.x - rightShoulder.x) > 0.1;
        if ((isMidLeft || isMidRight) && isArmOut) {
          isMatched = true;
          accuracyScore = 92;
          message = 'ยอดเยี่ยม! ท่าตั้งวงกลางถูกต้อง';
        } else {
          message = 'กางแขนออกข้างลำตัว ให้ปลายนิ้วอยู่ระดับไหล่';
        }
        break;

      case 3: // ตั้งวงล่าง (Tang Wong Lang) - Wrists low around abdomen/navel
        const isLowLeft = leftWristRelY > 0.25 || leftWrist.y > shoulderMidY + 0.12;
        const isLowRight = rightWristRelY > 0.25 || rightWrist.y > shoulderMidY + 0.12;
        if (isLowLeft || isLowRight) {
          isMatched = true;
          accuracyScore = 90;
          message = 'ยอดเยี่ยม! ท่าตั้งวงล่างถูกต้อง';
        } else {
          message = 'ทอดวงแขนลงด้านล่าง ระดับชายพกหรือหน้าท้อง';
        }
        break;

      case 4: // จีบคว่ำ (Jeeb Khwam) - Jeeb gesture with wrist turned down
        const isJeebHand4 = hasJeebPinch || (leftWristRelY > -0.2 || rightWristRelY > -0.2);
        if (isJeebHand4 && !handsUpward) {
          isMatched = true;
          accuracyScore = 93;
          message = 'ยอดเยี่ยม! ท่าจีบคว่ำถูกต้อง';
        } else {
          message = 'ใช้นิ้วชี้แตะหัวแม่มือ แล้วพลิกข้อมือคว่ำลง';
        }
        break;

      case 5: // จีบหงาย (Jeeb Ngai) - Jeeb gesture with wrist turned up
        const isJeebHand5 = hasJeebPinch || handsUpward;
        if (isJeebHand5) {
          isMatched = true;
          accuracyScore = 94;
          message = 'ยอดเยี่ยม! ท่าจีบหงายถูกต้อง';
        } else {
          message = 'จีบนิ้วหงายขึ้นด้านบน พลิกข้อมือหงายขึ้น';
        }
        break;

      case 6: // จีบปรกข้าง (Jeeb Prok Khang) - Jeeb near side of head
        const isProkSideLeft = (leftWristRelY < -0.15) && (Math.abs(leftWrist.x - nose.x) < 0.35);
        const isProkSideRight = (rightWristRelY < -0.15) && (Math.abs(rightWrist.x - nose.x) < 0.35);
        if (isProkSideLeft || isProkSideRight || (hasJeebPinch && (leftWristRelY < -0.1 || rightWristRelY < -0.1))) {
          isMatched = true;
          accuracyScore = 96;
          message = 'ยอดเยี่ยม! ท่าจีบปรกข้างถูกต้อง';
        } else {
          message = 'ยกจีบขึ้นข้างศีรษะ บริเวณขมับหรือข้างหู';
        }
        break;

      case 7: // จีบส่งหลัง (Jeeb Song Lang) - Arm pushed behind body
        const isArmBackLeft = (leftWrist.x < leftShoulder.x - 0.1) || (leftWristRelY > 0.1);
        const isArmBackRight = (rightWrist.x > rightShoulder.x + 0.1) || (rightWristRelY > 0.1);
        if (isArmBackLeft || isArmBackRight) {
          isMatched = true;
          accuracyScore = 91;
          message = 'ยอดเยี่ยม! ท่าจีบส่งหลังถูกต้อง';
        } else {
          message = 'ส่งแขนตึงไปด้านหลังลำตัว พลิกจีบส่งไปข้างหลัง';
        }
        break;

      case 8: // จีบล่อแก้ว (Jeeb LOR Kaew) - Thumb on middle nail
        if (hasLorKaewPinch || hasJeebPinch || (leftWristRelY < 0.3 || rightWristRelY < 0.3)) {
          isMatched = true;
          accuracyScore = 95;
          message = 'ยอดเยี่ยม! ท่าจีบล่อแก้วถูกต้อง';
        } else {
          message = 'ใช้นิ้วหัวแม่มือกดทับเล็บนิ้วกลาง นิ้วชี้ดัดงอนขึ้น';
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
