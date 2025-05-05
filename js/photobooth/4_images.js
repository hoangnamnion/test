// Lấy tham chiếu các phần tử DOM
const video = document.getElementById("video");
const captureBtn = document.getElementById("captureBtn");
const uploadBtn = document.getElementById("uploadBtn");
const uploadInput = document.getElementById("uploadInput");
const exportBtn = document.getElementById("exportBtn");
const exportVideoBtn = document.getElementById("exportVideoBtn");
const previewImagesContainer = document.getElementById("previewImages");
const countdownEl = document.getElementById("countdown");
const spinner = document.getElementById("spinner");
const captureSound = document.getElementById("captureSound");
const captureCountSelect = document.getElementById("captureCount");
const captureTimeSelect = document.getElementById("captureTime");
const flipCamBtn = document.getElementById("flipCamBtn");
const switchCamBtn = document.getElementById("switchCamBtn");
const layoutTypeSelect = document.getElementById("layoutType");

// Tham chiếu chọn frame
const frameOptions = document.querySelectorAll("#frameOptions img");

// Modal elements
const videoExportModal = document.getElementById("videoExportModal");
const currentBalanceEl = document.getElementById("currentBalance");
const youtubeSignupBtn = document.getElementById("youtubeSignupBtn");
const hihiBtn = document.getElementById("hihiBtn");
const rechargeBtn = document.getElementById("rechargeBtn");
const confirmExportBtn = document.getElementById("confirmExportBtn");
const cancelExportBtn = document.getElementById("cancelExportBtn");

// Canvas preview
const templatePreviewCanvas = document.getElementById("templatePreview");
const previewCtx = templatePreviewCanvas.getContext("2d");

let userBalance = Number(document.getElementById('h1Balance').getAttribute("data-balance"));

// Mảng lưu ảnh và video; đối với ảnh upload, videoSegments sẽ chứa giá trị null
let photoData = [];
let videoSegments = [];

let mediaRecorder;
let recordedChunks = [];

// Quản lý flip và facing mode
let isFlipped = true;
let currentFacingMode = "user";

// Frame được chọn
let selectedFrameUrl = document.querySelector("#frameOptions img.selected").getAttribute("data-frame-url");

// Thay đổi biến selectedStickerUrl thành mảng stickers
let stickers = [];
let isDragging = false;
let currentSticker = null;
let dragOffset = { x: 0, y: 0 };

// Thêm biến cho việc scale sticker
let isScaling = false;
let scaleStartDistance = 0;
let scaleStartSize = 0;

// Thêm biến để theo dõi sticker đang được chọn
let selectedSticker = null;

// Thêm biến cho việc xoay sticker
let stickerRotation = 0;

// Thêm biến cho touch events
let touchStartX = 0;
let touchStartY = 0;
let lastTouchX = 0;
let lastTouchY = 0;
let isPinching = false;
let initialPinchDistance = 0;
let initialStickerSize = 0;
let initialStickerRotation = 0;

// Hàm load stickers
function loadStickers() {
  const stickerOptions = document.getElementById("stickerOptions");
  stickerOptions.innerHTML = ""; // Clear existing stickers
  
  const stickerFiles = [
    '1.png', '2.png', '3.png', '4.png', '5.png',
    '6.png', '7.png', '8.png', '9.png', '10.png',
    '11.png', '12.png', '13.png', '14.png', '15.png',
    '16.png', '17.png', '18.png', '19.png', '20.png',
    '21.png'
  ];
  
  stickerFiles.forEach(sticker => {
    const img = document.createElement("img");
    img.src = `/images/stick/${sticker}`;
    img.alt = "Sticker";
    img.className = "sticker-option";
    img.addEventListener("click", () => {
      // Thêm sticker mới vào mảng
      const newSticker = {
        url: img.src,
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        id: Date.now(), // Thêm ID để xác định sticker
        rotation: 0 // Thêm thuộc tính rotation
      };
      stickers.push(newSticker);
      updateTemplatePreview();
    });
    stickerOptions.appendChild(img);
  });
}

// Thêm event listeners cho canvas
templatePreviewCanvas.addEventListener('mousedown', handleMouseDown);
templatePreviewCanvas.addEventListener('mousemove', handleMouseMove);
templatePreviewCanvas.addEventListener('mouseup', handleMouseUp);
templatePreviewCanvas.addEventListener('wheel', handleWheel);

// Thêm event listeners cho touch events
templatePreviewCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
templatePreviewCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
templatePreviewCanvas.addEventListener('touchend', handleTouchEnd, { passive: false });

function handleMouseDown(e) {
  const rect = templatePreviewCanvas.getBoundingClientRect();
  const scale = templatePreviewCanvas.width / rect.width;
  const x = (e.clientX - rect.left) * scale;
  const y = (e.clientY - rect.top) * scale;

  // Kiểm tra xem có click vào nút xóa không
  if (selectedSticker) {
    const deleteButtonX = selectedSticker.x + selectedSticker.width - 10;
    const deleteButtonY = selectedSticker.y + 10;
    const distance = Math.sqrt(
      Math.pow(x - deleteButtonX, 2) + 
      Math.pow(y - deleteButtonY, 2)
    );
    
    if (distance <= 10) {
      // Xóa sticker
      const index = stickers.indexOf(selectedSticker);
      if (index > -1) {
        stickers.splice(index, 1);
        selectedSticker = null;
        currentSticker = null;
        updateTemplatePreview();
        return;
      }
    }
  }

  // Kiểm tra xem có click vào sticker nào không
  for (let i = stickers.length - 1; i >= 0; i--) {
    const sticker = stickers[i];
    if (x >= sticker.x && x <= sticker.x + sticker.width &&
        y >= sticker.y && y <= sticker.y + sticker.height) {
      isDragging = true;
      currentSticker = sticker;
      selectedSticker = sticker;
      dragOffset = {
        x: x - sticker.x,
        y: y - sticker.y
      };
      break;
    }
  }
  
  updateTemplatePreview();
}

function handleMouseMove(e) {
  if (!isDragging || !currentSticker) return;

  const rect = templatePreviewCanvas.getBoundingClientRect();
  const scale = templatePreviewCanvas.width / rect.width;
  const x = (e.clientX - rect.left) * scale;
  const y = (e.clientY - rect.top) * scale;

  currentSticker.x = x - dragOffset.x;
  currentSticker.y = y - dragOffset.y;

  updateTemplatePreview();
}

function handleMouseUp() {
  isDragging = false;
  currentSticker = null;
}

// Thêm hàm xử lý wheel để scale sticker
function handleWheel(e) {
  if (!currentSticker) return;
  
  e.preventDefault();
  
  // Nếu đang giữ Shift, xoay sticker
  if (e.shiftKey) {
    const delta = e.deltaY > 0 ? -5 : 5; // Xoay 5 độ mỗi lần
    currentSticker.rotation = (currentSticker.rotation + delta) % 360;
  } else {
    // Nếu không giữ Shift, scale sticker
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    
    // Giới hạn kích thước tối thiểu và tối đa
    const newWidth = Math.max(20, Math.min(300, currentSticker.width * (1 + delta)));
    const newHeight = Math.max(20, Math.min(300, currentSticker.height * (1 + delta)));
    
    currentSticker.width = newWidth;
    currentSticker.height = newHeight;
  }
  
  updateTemplatePreview();
}

// Xử lý chọn frame
frameOptions.forEach(frameEl => {
  frameEl.addEventListener("click", () => {
    frameOptions.forEach(el => el.classList.remove("selected"));
    frameEl.classList.add("selected");
    selectedFrameUrl = frameEl.getAttribute("data-frame-url");
    
    // Kiểm tra nếu là frame trống
    const isEmptyFrame = frameEl.getAttribute("data-empty") === "true";
    const stickerContainer = document.getElementById("stickerOptionsContainer");
    
    if (isEmptyFrame) {
      stickerContainer.style.display = "block";
      loadStickers();
    } else {
      stickerContainer.style.display = "none";
      stickers = []; // Xóa tất cả stickers khi chọn frame khác
    }
    
    updateTemplatePreview();
  });
});

// Thêm hàm kiểm tra hỗ trợ trình duyệt
function checkBrowserSupport() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Trình duyệt của bạn không hỗ trợ truy cập camera. Vui lòng sử dụng trình duyệt hiện đại hơn.');
    return false;
  }
  return true;
}

// Thêm hàm kiểm tra kích thước video
function validateVideoSize(video) {
  return new Promise((resolve, reject) => {
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      reject(new Error('Video không hợp lệ'));
      return;
    }
    resolve();
  });
}

// Cập nhật hàm startStream
async function startStream() {
  if (!checkBrowserSupport()) return;

  // 1. Tắt stream cũ
  if (window.stream) window.stream.getTracks().forEach(t => t.stop());

  // 2. Độ phân giải từ cao → thấp
  const RES_LEVELS = [
    { w: 4096, h: 2160 },  // 4K DCI
    { w: 3840, h: 2160 },  // 4K UHD
    { w: 2560, h: 1440 },  // QHD
    { w: 1920, h: 1080 },  // Full‑HD
    { w: 1280, h: 720  },  // HD
    { w: 640 , h: 480  }   // VGA
  ];

  let stream  = null;
  let lastErr = null;

  for (const { w, h } of RES_LEVELS) {
    const constraints = {
      video: {
        width :  { ideal: w },
        height:  { ideal: h },
        facingMode: currentFacingMode       // "user" | "environment"
      },
      audio: false
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log(`> Đã mở camera ở ${w}×${h}`);
      
      // Kiểm tra stream
      if (!stream.active) {
        throw new Error('Stream không hoạt động');
      }
      
      window.stream = stream;
      video.srcObject = stream;
      video.style.transform = isFlipped ? 'scaleX(-1)' : 'scaleX(1)';

      // Đợi video sẵn sàng
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
      });

      // Khởi tạo MediaRecorder
      let options = { mimeType: 'video/webm' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = MediaRecorder.isTypeSupported('video/mp4') ? { mimeType: 'video/mp4' } : {};
      }
      
      try {
        mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorder.ondataavailable = e => {
          if (e.data && e.data.size) recordedChunks.push(e.data);
        };
      } catch (e) {
        console.error('Lỗi tạo MediaRecorder:', e);
        throw new Error('Không thể khởi tạo MediaRecorder');
      }
    } catch (err) {
      console.error('Lỗi truy cập camera:', err);
      alert('Không truy cập được camera. Vui lòng kiểm tra:\n'
          + '• Quyền truy cập camera (biểu tượng ổ khóa trên thanh địa chỉ)\n'
          + '• Đảm bảo camera không bị ứng dụng khác sử dụng.');
      return;
    }
  }
}

startStream();   // gọi lần đầu

// Nút Lật Cam
flipCamBtn.addEventListener("click", () => {
  isFlipped = !isFlipped;
  video.style.transform = isFlipped ? "scaleX(-1)" : "scaleX(1)";
});

// Nút Đổi Cam
switchCamBtn.addEventListener("click", () => {
  currentFacingMode = (currentFacingMode === "user") ? "environment" : "user";
  startStream();
});

// Xử lý upload ảnh
uploadBtn.addEventListener("click", () => {
  uploadInput.click();
});

uploadInput.addEventListener("change", event => {
  const files = event.target.files;
  if (files.length) {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const dataURL = e.target.result;
        // Lưu ảnh vào photoData và thêm null vào videoSegments
        photoData.push(dataURL);
        videoSegments.push(null); // Không có video cho ảnh upload
        // Tạo preview với flag upload
        const wrapper = document.createElement("div");
        wrapper.classList.add("preview-wrapper");
        const imgPreview = document.createElement("img");
        imgPreview.src = dataURL;
        // Gán data-upload="true"
        imgPreview.setAttribute("data-upload", "true");
        // Tạo marker upload
        const marker = document.createElement("div");
        marker.classList.add("upload-marker");
        marker.textContent = "UPLOAD";
        wrapper.appendChild(imgPreview);
        wrapper.appendChild(marker);
        // Gán sự kiện click cho wrapper để chọn/deselect
        wrapper.addEventListener("click", function () {
          wrapper.classList.toggle("selected");
          // Lưu ý: các ảnh upload không cần xuất video nên khi updateTemplatePreview chỉ cần dùng src
          updateTemplatePreview();
        });
        previewImagesContainer.appendChild(wrapper);
      };
      reader.readAsDataURL(file);
    });
    // Reset input sau khi đọc xong
    uploadInput.value = "";
  }
});

// Cập nhật hàm capturePhotoCover
function capturePhotoCover() {
  return new Promise(async (resolve, reject) => {
    try {
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        reject(new Error("Video chưa sẵn sàng, hãy thử lại sau vài giây."));
        return;
      }

      await validateVideoSize(video);

      const desiredWidth = 500, desiredHeight = 350;
      const desiredAspect = desiredWidth / desiredHeight;
      const videoWidth = video.videoWidth, videoHeight = video.videoHeight;
      const videoAspect = videoWidth / videoHeight;
      let sx, sy, sWidth, sHeight;

      if (videoAspect > desiredAspect) {
        sHeight = videoHeight;
        sWidth = videoHeight * desiredAspect;
        sx = (videoWidth - sWidth) / 2;
        sy = 0;
      } else {
        sWidth = videoWidth;
        sHeight = videoWidth / desiredAspect;
        sx = 0;
        sy = (videoHeight - sHeight) / 2;
      }

      const canvas = document.createElement("canvas");
      canvas.width = desiredWidth;
      canvas.height = desiredHeight;
      const ctx = canvas.getContext("2d");

      if (isFlipped) {
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, desiredWidth, desiredHeight);
        ctx.restore();
      } else {
        ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, desiredWidth, desiredHeight);
      }

      resolve(canvas.toDataURL("image/png"));
    } catch (error) {
      reject(error);
    }
  });
}

// PHẦN quay video từ camera
let videoRecorderController = null;
function startVideoSegmentRecording() {
  return new Promise(async (resolve, reject) => {
    try {
      const desiredWidth = 500, desiredHeight = 350;
      const canvas = document.createElement("canvas");
      canvas.width = desiredWidth;
      canvas.height = desiredHeight;
      const ctx = canvas.getContext("2d");
      let animationFrameId;

      // Đợi video sẵn sàng
      await validateVideoSize(video);

      function drawFrame() {
        const videoWidth = video.videoWidth, videoHeight = video.videoHeight;
        if (videoWidth && videoHeight) {
          const desiredAspect = desiredWidth / desiredHeight;
          const videoAspect = videoWidth / videoHeight;
          let sx, sy, sWidth, sHeight;
          if (videoAspect > desiredAspect) {
            sHeight = videoHeight;
            sWidth = videoHeight * desiredAspect;
            sx = (videoWidth - sWidth) / 2;
            sy = 0;
          } else {
            sWidth = videoWidth;
            sHeight = videoWidth / desiredAspect;
            sx = 0;
            sy = (videoHeight - sHeight) / 2;
          }
          if (isFlipped) {
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, desiredWidth, desiredHeight);
            ctx.restore();
          } else {
            ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, desiredWidth, desiredHeight);
          }
        }
        animationFrameId = requestAnimationFrame(drawFrame);
      }

      drawFrame();
      const stream = canvas.captureStream(30);
      let recorder, chunks = [];

      // Kiểm tra codec được hỗ trợ
      let options = { mimeType: "video/webm;codecs=vp8", videoBitsPerSecond: 2500000 };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "video/webm", videoBitsPerSecond: 2500000 };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: "video/mp4;codecs=h264", videoBitsPerSecond: 2500000 };
          if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: "video/mp4", videoBitsPerSecond: 2500000 };
          }
        }
      }

      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        cancelAnimationFrame(animationFrameId);
        reject(new Error("Không thể tạo MediaRecorder cho video segment"));
        return;
      }

      recorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      const stopPromise = new Promise((resolve, reject) => {
        recorder.onstop = () => {
          cancelAnimationFrame(animationFrameId);
          const blob = new Blob(chunks, { type: recorder.mimeType || "video/mp4" });
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        };
        recorder.onerror = reject;
      });

      recorder.start();
      videoRecorderController = { recorder, stopPromise };
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

async function stopVideoSegmentRecording() {
  if (videoRecorderController && videoRecorderController.recorder.state === "recording") {
    videoRecorderController.recorder.stop();
    const videoData = await videoRecorderController.stopPromise;
    videoRecorderController = null;
    return videoData;
  }
  return null;
}

// HIỆU ỨNG FLASH VÀ COUNTDOWN
function flashScreen() {
  const flashDiv = document.createElement("div");
  flashDiv.style.position = "absolute";
  flashDiv.style.top = "0";
  flashDiv.style.left = "0";
  flashDiv.style.width = "100%";
  flashDiv.style.height = "100%";
  flashDiv.style.backgroundColor = "white";
  flashDiv.style.opacity = "1";
  flashDiv.style.zIndex = "10";
  flashDiv.style.pointerEvents = "none";
  video.parentNode.appendChild(flashDiv);
  setTimeout(() => flashDiv.remove(), 200);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Đếm ngược sử dụng hiệu ứng .countdown-circle
async function runCountdown(seconds) {
  for (let i = seconds; i > 0; i--) {
    const circle = document.createElement("div");
    circle.classList.add("countdown-circle");
    circle.textContent = i;
    countdownEl.innerHTML = "";
    countdownEl.appendChild(circle);
    await sleep(1000);
  }
  countdownEl.innerHTML = "";
  flashScreen();
  captureSound.currentTime = 0;
  captureSound.play();
}

function showSpinner(message) {
  spinner.textContent = message;
  spinner.style.display = "flex";
}
function hideSpinner() {
  spinner.style.display = "none";
}
function updateModal() {
  currentBalanceEl.textContent = userBalance;
  confirmExportBtn.disabled = (userBalance < 2000);
}
function hideModal() {
  videoExportModal.style.display = "none";
}
async function refreshBalance() {
  try {
    const response = await fetch("/photobooth/4-images/balance");
    const data = await response.json();
    userBalance = data.balance;
    updateModal();
  } catch (err) {
    console.error("Lỗi cập nhật số dư:", err);
  }
}
setInterval(refreshBalance, 60000);

// Cập nhật canvas preview (chỉ dùng cho xuất ảnh)
function updateTemplatePreview() {
  const selectedImgElems = previewImagesContainer
        .querySelectorAll(".preview-wrapper.selected img, .preview-wrapper.selected > img");

  const layoutType = layoutTypeSelect.value;
  const requiredImages = layoutType === '1x4' ? 4 : 
                        layoutType === '1x3' ? 3 :
                        layoutType === '1x2' ? 2 : 6;

  if (selectedImgElems.length !== requiredImages) {
    previewCtx.clearRect(0, 0, templatePreviewCanvas.width, templatePreviewCanvas.height);
    return;
  }

  const scale = 0.5;
  const templateWidth = layoutType === '2x3' ? 1400 * scale : 600 * scale;
  const templateHeight = layoutType === '1x4' ? 1800 * scale :
                        layoutType === '1x3' ? 1350 * scale :
                        layoutType === '1x2' ? 900 * scale : 1350 * scale;
  const padding = 50 * scale;
  const gap = 50 * scale;
  const targetW = 500 * scale;
  const targetH = 350 * scale;

  templatePreviewCanvas.width = templateWidth;
  templatePreviewCanvas.height = templateHeight;
  previewCtx.clearRect(0, 0, templateWidth, templateHeight);

  // Vẽ ảnh theo bố cục đã chọn
  selectedImgElems.forEach((img, idx) => {
    let x, y;
    
    if (layoutType === '2x3') {
      // Bố cục 2x3: xếp 2 layout 1x3 cạnh nhau
      if (idx < 3) {
        // Layout 1x3 bên trái
        x = padding;
        y = padding + idx * (targetH + gap);
      } else {
        // Layout 1x3 bên phải, cách layout bên trái 50px
        x = padding + targetW + gap;
        y = padding + (idx - 3) * (targetH + gap);
      }
    } else {
      // Bố cục dọc (1x2, 1x3, 1x4)
      x = padding;
      y = padding + idx * (targetH + gap);
    }

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const iAsp = iw / ih;
    const tAsp = targetW / targetH;
    let sx, sy, sW, sH;

    if (iAsp > tAsp) { // ảnh quá rộng
      sH = ih;
      sW = ih * tAsp;
      sx = (iw - sW) / 2;
      sy = 0;
    } else {           // ảnh quá cao
      sW = iw;
      sH = iw / tAsp;
      sx = 0;
      sy = (ih - sH) / 2;
    }
    previewCtx.drawImage(img, sx, sy, sW, sH, x, y, targetW, targetH);
  });

  /* ---------- 2. VẼ FRAME ĐÈ LÊN ----------- */
  if (selectedFrameUrl) {
    const frameImg = new Image();
    frameImg.onload = () => {
      // Vẽ frame với kích thước phù hợp với template
      previewCtx.drawImage(frameImg, 0, 0, templateWidth, templateHeight);
      
      // Vẽ tất cả stickers
      stickers.forEach(sticker => {
        const stickerImg = new Image();
        stickerImg.onload = () => {
          // Lưu trạng thái canvas hiện tại
          previewCtx.save();
          
          // Tính toán điểm trung tâm của sticker
          const centerX = sticker.x + sticker.width / 2;
          const centerY = sticker.y + sticker.height / 2;
          
          // Di chuyển đến điểm trung tâm và xoay
          previewCtx.translate(centerX, centerY);
          previewCtx.rotate((sticker.rotation * Math.PI) / 180);
          
          // Vẽ sticker với điểm tham chiếu là trung tâm
          previewCtx.drawImage(
            stickerImg,
            -sticker.width / 2,
            -sticker.height / 2,
            sticker.width,
            sticker.height
          );
          
          // Vẽ nút xóa nếu là sticker đang được chọn
          if (selectedSticker === sticker) {
            // Vẽ nút xóa
            previewCtx.fillStyle = 'red';
            previewCtx.beginPath();
            previewCtx.arc(
              sticker.width / 2 - 10,
              -sticker.height / 2 + 10,
              10,
              0,
              Math.PI * 2
            );
            previewCtx.fill();
            
            // Vẽ dấu X
            previewCtx.strokeStyle = 'white';
            previewCtx.lineWidth = 2;
            previewCtx.beginPath();
            previewCtx.moveTo(sticker.width / 2 - 15, -sticker.height / 2 + 5);
            previewCtx.lineTo(sticker.width / 2 - 5, -sticker.height / 2 + 15);
            previewCtx.moveTo(sticker.width / 2 - 5, -sticker.height / 2 + 5);
            previewCtx.lineTo(sticker.width / 2 - 15, -sticker.height / 2 + 15);
            previewCtx.stroke();
          }
          
          // Khôi phục trạng thái canvas
          previewCtx.restore();
        };
        stickerImg.src = sticker.url;
      });

      // Add date and time
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const dateStr = now.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const datetimeStr = `${timeStr}, ${dateStr}`;
      
      // Set text style
      previewCtx.font = 'bold 16px Arial';
      previewCtx.fillStyle = 'white';
      previewCtx.textAlign = 'right';
      previewCtx.textBaseline = 'bottom';
      
      // Add text shadow for better visibility
      previewCtx.shadowColor = 'black';
      previewCtx.shadowBlur = 3;
      previewCtx.shadowOffsetX = 1;
      previewCtx.shadowOffsetY = 1;
      
      // Draw text in bottom right corner với padding riêng cho 2x3
      let textX = templateWidth - 20;
      let textY = templateHeight - 20;
      if (layoutType === '2x3') {
        textX = templateWidth - 40;
        textY = templateHeight - 40;
      }
      previewCtx.fillText(datetimeStr, textX, textY);
      
      // Reset shadow
      previewCtx.shadowColor = 'transparent';
      previewCtx.shadowBlur = 0;
      previewCtx.shadowOffsetX = 0;
      previewCtx.shadowOffsetY = 0;
    };
    frameImg.src = selectedFrameUrl;
  }
}

// Thêm event listener cho click vào canvas để bỏ chọn sticker
templatePreviewCanvas.addEventListener('click', (e) => {
  const rect = templatePreviewCanvas.getBoundingClientRect();
  const scale = templatePreviewCanvas.width / rect.width;
  const x = (e.clientX - rect.left) * scale;
  const y = (e.clientY - rect.top) * scale;

  // Kiểm tra xem có click vào sticker nào không
  let clickedOnSticker = false;
  for (const sticker of stickers) {
    if (x >= sticker.x && x <= sticker.x + sticker.width &&
        y >= sticker.y && y <= sticker.y + sticker.height) {
      clickedOnSticker = true;
      break;
    }
  }

  // Nếu click ra ngoài sticker, bỏ chọn sticker hiện tại
  if (!clickedOnSticker) {
    selectedSticker = null;
    updateTemplatePreview();
  }
});

// Thêm sự kiện khi thay đổi số lượng ảnh chụp
captureCountSelect.addEventListener("change", () => {
  // Không cần xóa ảnh hiện tại
  // Chỉ cập nhật số lượng ảnh sẽ chụp trong lần tiếp theo
});

// Thêm sự kiện khi thay đổi thời gian chụp
captureTimeSelect.addEventListener("change", () => {
  // Không cần xóa ảnh hiện tại
  // Chỉ cập nhật thời gian chụp trong lần tiếp theo
});

// Cập nhật sự kiện capture
captureBtn.addEventListener("click", async () => {
  try {
    const captureCount = parseInt(captureCountSelect.value);
    const captureTime = parseInt(captureTimeSelect.value);
    captureBtn.disabled = true;

    for (let i = 0; i < captureCount; i++) {
      await startVideoSegmentRecording();
      await runCountdown(captureTime);
      const photo = await capturePhotoCover();
      const videoData = await stopVideoSegmentRecording();
      
      if (!photo || !videoData) {
        throw new Error('Không thể chụp ảnh hoặc quay video');
      }

      photoData.push(photo);
      videoSegments.push(videoData);

      const wrapper = document.createElement("div");
      wrapper.classList.add("preview-wrapper");
      const imgPreview = document.createElement("img");
      imgPreview.src = photo;
      imgPreview.setAttribute("data-index", photoData.length - 1);
      wrapper.appendChild(imgPreview);
      attachPreviewClick(wrapper);
      previewImagesContainer.appendChild(wrapper);
    }
  } catch (error) {
    console.error('Lỗi khi chụp:', error);
    alert('Có lỗi xảy ra khi chụp ảnh: ' + error.message);
  } finally {
    captureBtn.disabled = false;
  }
});

exportBtn.addEventListener("click", async () => {
  const selectedWrappers = previewImagesContainer.querySelectorAll(".preview-wrapper.selected");
  const layoutType = layoutTypeSelect.value;
  const requiredImages = layoutType === '1x4' ? 4 : 
                        layoutType === '1x3' ? 3 :
                        layoutType === '1x2' ? 2 : 6;

  if (selectedWrappers.length !== requiredImages) {
    alert(`Vui lòng chọn đúng ${requiredImages} ảnh để ghép`);
    return;
  }

  showSpinner();
  try {
    // Tạo canvas để ghép ảnh
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let width, height, padding, gap, targetW, targetH;
    if (layoutType === '2x3') {
      width = 1150;
      height = 1300;
      padding = 50;
      gap = 50;
      targetW = 500;
      targetH = 350;
    } else {
      width = 600;
      height = layoutType === '1x4' ? 1800 : layoutType === '1x3' ? 1350 : 900;
      padding = 50;
      gap = 50;
      targetW = 500;
      targetH = 350;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    // Vẽ ảnh theo bố cục đã chọn
    for (let i = 0; i < selectedWrappers.length; i++) {
      const wrapper = selectedWrappers[i];
      const img = wrapper.querySelector('img');
      let x, y;
      if (layoutType === '2x3') {
        const col = i % 2;
        const row = Math.floor(i / 2);
        x = padding + col * (targetW + gap);
        y = padding + row * (targetH + gap);
      } else {
        x = padding;
        y = padding + i * (targetH + gap);
      }
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const iAsp = iw / ih;
      const tAsp = targetW / targetH;
      let sx, sy, sW, sH;
      if (iAsp > tAsp) {
        sH = ih;
        sW = ih * tAsp;
        sx = (iw - sW) / 2;
        sy = 0;
      } else {
        sW = iw;
        sH = iw / tAsp;
        sx = 0;
        sy = (ih - sH) / 2;
      }
      ctx.drawImage(img, sx, sy, sW, sH, x, y, targetW, targetH);
    }

    // Vẽ frame nếu có
    if (selectedFrameUrl) {
      const frameImg = new Image();
      frameImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        frameImg.onload = resolve;
        frameImg.onerror = reject;
        frameImg.src = selectedFrameUrl;
      });
      ctx.drawImage(frameImg, 0, 0, width, height);

      // Vẽ tất cả stickers
      for (const sticker of stickers) {
        const stickerImg = new Image();
        stickerImg.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          stickerImg.onload = resolve;
          stickerImg.onerror = reject;
          stickerImg.src = sticker.url;
        });

        // Lưu trạng thái canvas hiện tại
        ctx.save();
        
        // Tính toán điểm trung tâm của sticker
        const centerX = sticker.x + sticker.width / 2;
        const centerY = sticker.y + sticker.height / 2;
        
        // Di chuyển đến điểm trung tâm và xoay
        ctx.translate(centerX, centerY);
        ctx.rotate((sticker.rotation * Math.PI) / 180);
        
        // Vẽ sticker với điểm tham chiếu là trung tâm
        ctx.drawImage(
          stickerImg,
          -sticker.width / 2,
          -sticker.height / 2,
          sticker.width,
          sticker.height
        );
        
        ctx.restore();
      }

      // Thêm ngày và giờ
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const dateStr = now.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const datetimeStr = `${timeStr}, ${dateStr}`;
      
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      
      let textX = width - 40;
      let textY = height - 40;
      ctx.fillText(datetimeStr, textX, textY);
      
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Tạo link tải xuống
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `photobooth-${layoutType}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    hideSpinner();
  } catch (error) {
    hideSpinner();
    console.error("Lỗi khi ghép ảnh:", error);
    alert("Có lỗi xảy ra khi ghép ảnh: " + error.message);
  }
});

// Khi xuất video, trước tiên kiểm tra xem có ảnh nào được upload (không có video) không
exportVideoBtn.addEventListener("click", async () => {
  const selectedWrappers = previewImagesContainer.querySelectorAll(".preview-wrapper.selected");
  const layoutType = layoutTypeSelect.value;
  const requiredImages = layoutType === '1x4' ? 4 : 
                        layoutType === '1x3' ? 3 :
                        layoutType === '1x2' ? 2 : 6;

  if (selectedWrappers.length === 0) {
    alert("Vui lòng chọn ít nhất 1 video để xuất");
    return;
  }

  // Kiểm tra xem có ảnh nào có thuộc tính data-upload hay không
  const hasUpload = Array.from(selectedWrappers).some(wrapper => {
    const img = wrapper.querySelector("img");
    return img.getAttribute("data-upload") === "true";
  });
  if (hasUpload) {
    alert("Có ảnh được upload không có video. Vui lòng chọn lại hoặc chụp ảnh mới để xuất video.");
    return;
  }
  updateModal();
  videoExportModal.style.display = "flex";
});

confirmExportBtn.addEventListener("click", async () => {
  const selectedWrappers = previewImagesContainer.querySelectorAll(".preview-wrapper.selected");
  const layoutType = layoutTypeSelect.value;
  const requiredImages = layoutType === '1x4' ? 4 : 
                        layoutType === '1x3' ? 3 :
                        layoutType === '1x2' ? 2 : 6;

  if (selectedWrappers.length === 0) {
    alert("Vui lòng chọn ít nhất 1 video để xuất");
    return;
  }

  showSpinner();
  try {
    // Tạo canvas để ghép video
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = 1;
    const width = layoutType === '2x3' ? 1100 * scale : 600 * scale;
    const height = layoutType === '2x3' ? 1200 * scale : 
                  layoutType === '1x4' ? 1800 * scale :
                  layoutType === '1x3' ? 1350 * scale : 900 * scale;
    const padding = 50 * scale;
    const gap = 50 * scale;
    const targetW = 500 * scale;
    const targetH = 350 * scale;

    canvas.width = width;
    canvas.height = height;

    // Lấy danh sách video đã chọn
    const selectedVideos = Array.from(selectedWrappers).map(wrapper => {
      const img = wrapper.querySelector('img');
      const index = img.getAttribute('data-index');
      return videoSegments[index];
    });

    // Tạo video elements để phát video
    const videos = selectedVideos.map(videoData => {
      const video = document.createElement('video');
      video.style.display = 'none';
      video.playsInline = true;
      video.muted = true;
      video.src = videoData;
      video.preload = 'auto';
      document.body.appendChild(video);
      return video;
    });

    // Đợi tất cả video load xong
    await Promise.all(videos.map(video => {
      return new Promise((resolve, reject) => {
        video.onloadeddata = resolve;
        video.onerror = reject;
        video.load();
      });
    }));

    // Tải frame image
    const frameImage = new Image();
    frameImage.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      frameImage.onload = resolve;
      frameImage.onerror = reject;
      frameImage.src = selectedFrameUrl;
    });

    // Tải tất cả sticker images
    const stickerImages = await Promise.all(stickers.map(sticker => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve({ img, sticker });
        img.onerror = reject;
        img.src = sticker.url;
      });
    }));

    // Kiểm tra codec được hỗ trợ
    let mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4;codecs=h264';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            throw new Error('Trình duyệt không hỗ trợ ghi video');
          }
        }
      }
    }

    // Tạo MediaRecorder để ghi lại video
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: mimeType,
      videoBitsPerSecond: 2500000 // Giảm bitrate để tăng khả năng tương thích
    });

    const chunks = [];
    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    
    // Bắt đầu ghi
    recorder.start();

    // Phát và ghi video (lặp lại 3 lần)
    for (let repeat = 0; repeat < 3; repeat++) {
      // Reset tất cả video về đầu
      videos.forEach(video => {
        video.currentTime = 0;
      });

      // Phát tất cả video cùng lúc
      try {
        await Promise.all(videos.map(video => {
          return new Promise((resolve, reject) => {
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.then(resolve).catch(reject);
            } else {
              resolve();
            }
          });
        }));
      } catch (error) {
        console.error('Lỗi khi phát video:', error);
        throw new Error('Không thể phát video. Vui lòng thử lại.');
      }

      // Vẽ frame và ghi lại
      const drawFrame = () => {
        ctx.clearRect(0, 0, width, height);
        
        // Vẽ các video theo bố cục đã chọn
        videos.forEach((video, i) => {
          let x, y;
          if (layoutType === '2x3') {
            const col = i % 2;
            const row = Math.floor(i / 2);
            x = padding + col * (targetW + gap);
            y = padding + row * (targetH + gap);
          } else {
            x = padding;
            y = padding + i * (targetH + gap);
          }
          ctx.drawImage(video, x, y, targetW, targetH);
        });

        // Vẽ frame lên trên cùng
        ctx.drawImage(frameImage, 0, 0, width, height);

        // Vẽ tất cả stickers
        stickerImages.forEach(({ img, sticker }) => {
          ctx.save();
          
          // Tính toán điểm trung tâm của sticker
          const centerX = sticker.x + sticker.width / 2;
          const centerY = sticker.y + sticker.height / 2;
          
          // Di chuyển đến điểm trung tâm và xoay
          ctx.translate(centerX, centerY);
          ctx.rotate((sticker.rotation * Math.PI) / 180);
          
          // Vẽ sticker với điểm tham chiếu là trung tâm
          ctx.drawImage(
            img,
            -sticker.width / 2,
            -sticker.height / 2,
            sticker.width,
            sticker.height
          );
          
          ctx.restore();
        });

        // Thêm ngày và giờ
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        const dateStr = now.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const datetimeStr = `${timeStr}, ${dateStr}`;
        
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        let textX = width - 40;
        let textY = height - 40;
        ctx.fillText(datetimeStr, textX, textY);
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      };

      // Đợi cho đến khi tất cả video kết thúc
      await new Promise((resolve, reject) => {
        const interval = setInterval(drawFrame, 1000/30);
        const checkEnded = () => {
          if (videos.every(video => video.ended)) {
            clearInterval(interval);
            resolve();
          }
        };
        videos.forEach(video => {
          video.onended = checkEnded;
          video.onerror = () => {
            clearInterval(interval);
            reject(new Error('Lỗi khi phát video'));
          };
        });
      });
    }

    // Dừng ghi và tạo blob
    recorder.stop();
    await new Promise(resolve => {
      recorder.onstop = resolve;
    });

    const blob = new Blob(chunks, { type: mimeType });
    
    // Kiểm tra xem có phải iOS không
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS) {
      // Trên iOS, mở video trong tab mới
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else {
      // Trên các thiết bị khác, tải xuống bình thường
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `photobooth-${layoutType}.mp4`;
      link.type = 'video/mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    // Dọn dẹp
    videos.forEach(video => {
      video.pause();
      video.src = '';
      document.body.removeChild(video);
    });
    hideSpinner();
  } catch (error) {
    hideSpinner();
    console.error("Lỗi khi ghép video:", error);
    alert(error.message || "Có lỗi xảy ra khi ghép video. Vui lòng thử lại.");
  }
});

cancelExportBtn.addEventListener("click", () => {
  hideModal();
});

youtubeSignupBtn.addEventListener("click", async () => {
  try {
    const response = await fetch("/photobooth/4-images/youtube-signup", { method: "POST" });
    const result = await response.json();
    if (result.success) {
      userBalance = result.newBalance;
      window.open("https://www.tiktok.com/@nam_26th4", "_blank");
      alert("Đăng ký Tiktok thành công! Số dư đã được cộng thêm 10000 đồng.");
      updateModal();
    } else {
      alert(result.message || "Có lỗi khi đăng ký Youtube.");
    }
  } catch (error) {
    console.error(error);
    alert("Có lỗi khi đăng ký Youtube.");
  }
});

hihiBtn.addEventListener("click", () => {
  window.open("https://www.facebook.com/cao.vannam.26042k5", "_blank");
});

rechargeBtn.addEventListener("click", () => {
  window.location.href = "/ung-ho";
});

// Thêm sự kiện khi thay đổi layout type
layoutTypeSelect.addEventListener("change", () => {
  const layoutType = layoutTypeSelect.value;
  const requiredImages = layoutType === '1x4' ? 4 : 
                        layoutType === '1x3' ? 3 :
                        layoutType === '1x2' ? 2 : 6;
  
  const selectedWrappers = previewImagesContainer.querySelectorAll(".preview-wrapper.selected");
  const currentSelected = selectedWrappers.length;
  
  // Nếu số lượng ảnh đã chọn nhiều hơn yêu cầu, bỏ chọn các ảnh thừa
  if (currentSelected > requiredImages) {
    // Bỏ chọn từ ảnh cuối cùng
    for (let i = currentSelected - 1; i >= requiredImages; i--) {
      selectedWrappers[i].classList.remove("selected");
    }
  }
  
  // Cập nhật preview khi thay đổi layout
  updateTemplatePreview();
});

// Thêm nút xóa ảnh đã chọn
const deleteBtn = document.createElement('button');
deleteBtn.className = 'function-button';
deleteBtn.textContent = 'Xóa ảnh đã chọn';
deleteBtn.style.margin = '10px auto';
deleteBtn.style.display = 'block';

// Thêm nút vào container
const buttonContainer = document.querySelector('.cute-container');
buttonContainer.insertBefore(deleteBtn, document.getElementById('templatePreviewContainer'));

// Xử lý sự kiện xóa ảnh
deleteBtn.addEventListener('click', () => {
  const selectedWrappers = previewImagesContainer.querySelectorAll('.preview-wrapper.selected');
  if (selectedWrappers.length === 0) {
    alert('Vui lòng chọn ảnh cần xóa');
    return;
  }

  if (!confirm('Bạn có chắc chắn muốn xóa các ảnh đã chọn?')) {
    return;
  }

  selectedWrappers.forEach(wrapper => {
    const img = wrapper.querySelector('img');
    const index = img.getAttribute('data-index');
    if (index !== null) {
      // Xóa ảnh và video tương ứng
      photoData.splice(index, 1);
      videoSegments.splice(index, 1);
      // Cập nhật lại index cho các ảnh còn lại
      previewImagesContainer.querySelectorAll('img').forEach(img => {
        const currentIndex = parseInt(img.getAttribute('data-index'));
        if (currentIndex > index) {
          img.setAttribute('data-index', currentIndex - 1);
        }
      });
    }
    wrapper.remove();
  });

  updateTemplatePreview();
});

// Thêm nút xóa tất cả ảnh
const deleteAllBtn = document.createElement('button');
deleteAllBtn.className = 'function-button';
deleteAllBtn.textContent = 'Xóa tất cả ảnh';
deleteAllBtn.style.margin = '10px auto';
deleteAllBtn.style.display = 'block';

// Thêm nút vào container
buttonContainer.insertBefore(deleteAllBtn, deleteBtn);

// Xử lý sự kiện xóa tất cả ảnh
deleteAllBtn.addEventListener('click', () => {
  if (previewImagesContainer.children.length === 0) {
    alert('Không có ảnh nào để xóa');
    return;
  }

  if (!confirm('Bạn có chắc chắn muốn xóa tất cả ảnh?')) {
    return;
  }

  // Xóa tất cả ảnh và video
  photoData = [];
  videoSegments = [];
  previewImagesContainer.innerHTML = '';
  updateTemplatePreview();
});

// Thêm hàm attachPreviewClick
function attachPreviewClick(wrapper) {
  wrapper.addEventListener("click", function() {
    wrapper.classList.toggle("selected");
    updateTemplatePreview();
  });
}

function handleTouchStart(e) {
  e.preventDefault();
  const rect = templatePreviewCanvas.getBoundingClientRect();
  const scale = templatePreviewCanvas.width / rect.width;
  
  if (e.touches.length === 1) {
    // Single touch - move sticker
    const touch = e.touches[0];
    touchStartX = (touch.clientX - rect.left) * scale;
    touchStartY = (touch.clientY - rect.top) * scale;
    lastTouchX = touchStartX;
    lastTouchY = touchStartY;

    // Check if touch is on a sticker
    for (let i = stickers.length - 1; i >= 0; i--) {
      const sticker = stickers[i];
      if (touchStartX >= sticker.x && touchStartX <= sticker.x + sticker.width &&
          touchStartY >= sticker.y && touchStartY <= sticker.y + sticker.height) {
        isDragging = true;
        currentSticker = sticker;
        selectedSticker = sticker;
        dragOffset = {
          x: touchStartX - sticker.x,
          y: touchStartY - sticker.y
        };
        break;
      }
    }
  } else if (e.touches.length === 2 && currentSticker) {
    // Two finger touch - scale and rotate
    isPinching = true;
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    
    // Calculate initial pinch distance
    initialPinchDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
    
    // Store initial sticker size and rotation
    initialStickerSize = currentSticker.width;
    initialStickerRotation = currentSticker.rotation;
  }
  
  updateTemplatePreview();
}

function handleTouchMove(e) {
  e.preventDefault();
  if (!isDragging && !isPinching) return;

  const rect = templatePreviewCanvas.getBoundingClientRect();
  const scale = templatePreviewCanvas.width / rect.width;

  if (isDragging && currentSticker) {
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * scale;
    const y = (touch.clientY - rect.top) * scale;
    
    currentSticker.x = x - dragOffset.x;
    currentSticker.y = y - dragOffset.y;
    
    lastTouchX = x;
    lastTouchY = y;
  } else if (isPinching && currentSticker && e.touches.length === 2) {
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    
    // Calculate current pinch distance
    const currentDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
    
    // Calculate scale factor
    const scaleFactor = currentDistance / initialPinchDistance;
    
    // Update sticker size
    const newWidth = Math.max(20, Math.min(300, initialStickerSize * scaleFactor));
    const newHeight = Math.max(20, Math.min(300, initialStickerSize * scaleFactor));
    currentSticker.width = newWidth;
    currentSticker.height = newHeight;
    
    // Calculate rotation
    const angle = Math.atan2(
      touch2.clientY - touch1.clientY,
      touch2.clientX - touch1.clientX
    ) * 180 / Math.PI;
    currentSticker.rotation = initialStickerRotation + angle;
  }
  
  updateTemplatePreview();
}

function handleTouchEnd(e) {
  e.preventDefault();
  isDragging = false;
  isPinching = false;
  currentSticker = null;
  updateTemplatePreview();
}

// Thêm hàm tạo nút điều khiển cho mobile
function createMobileControls() {
  const controls = document.createElement('div');
  controls.id = 'mobileControls';
  controls.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.5);
    padding: 10px;
    border-radius: 20px;
  `;

  // Nút xoay
  const rotateBtn = document.createElement('button');
  rotateBtn.innerHTML = '🔄';
  rotateBtn.style.cssText = `
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: white;
    font-size: 20px;
    cursor: pointer;
  `;
  rotateBtn.onclick = () => {
    if (selectedSticker) {
      selectedSticker.rotation = (selectedSticker.rotation + 45) % 360;
      updateTemplatePreview();
    }
  };

  // Nút phóng to
  const zoomInBtn = document.createElement('button');
  zoomInBtn.innerHTML = '➕';
  zoomInBtn.style.cssText = rotateBtn.style.cssText;
  zoomInBtn.onclick = () => {
    if (selectedSticker) {
      const newWidth = Math.min(300, selectedSticker.width * 1.2);
      const newHeight = Math.min(300, selectedSticker.height * 1.2);
      selectedSticker.width = newWidth;
      selectedSticker.height = newHeight;
      updateTemplatePreview();
    }
  };

  // Nút thu nhỏ
  const zoomOutBtn = document.createElement('button');
  zoomOutBtn.innerHTML = '➖';
  zoomOutBtn.style.cssText = rotateBtn.style.cssText;
  zoomOutBtn.onclick = () => {
    if (selectedSticker) {
      const newWidth = Math.max(20, selectedSticker.width * 0.8);
      const newHeight = Math.max(20, selectedSticker.height * 0.8);
      selectedSticker.width = newWidth;
      selectedSticker.height = newHeight;
      updateTemplatePreview();
    }
  };

  // Nút xóa
  const deleteBtn = document.createElement('button');
  deleteBtn.innerHTML = '❌';
  deleteBtn.style.cssText = rotateBtn.style.cssText;
  deleteBtn.onclick = () => {
    if (selectedSticker) {
      const index = stickers.indexOf(selectedSticker);
      if (index > -1) {
        stickers.splice(index, 1);
        selectedSticker = null;
        updateTemplatePreview();
      }
    }
  };

  controls.appendChild(rotateBtn);
  controls.appendChild(zoomInBtn);
  controls.appendChild(zoomOutBtn);
  controls.appendChild(deleteBtn);

  // Chỉ hiển thị controls khi có sticker được chọn
  controls.style.display = 'none';
  document.body.appendChild(controls);

  // Cập nhật hiển thị controls khi chọn sticker
  const originalUpdateTemplatePreview = updateTemplatePreview;
  updateTemplatePreview = function() {
    originalUpdateTemplatePreview();
    controls.style.display = selectedSticker ? 'flex' : 'none';
  };
}

// Gọi hàm tạo controls khi trang load
window.addEventListener('load', createMobileControls);
