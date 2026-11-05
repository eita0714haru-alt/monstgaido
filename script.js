const canvas = document.getElementById('guideCanvas');
const ctx = canvas.getContext('2d');

let uploadedImage = null;

let startX = 200;
let startY = 400;
let currentX = 200;
let currentY = 300;

let hasAim = true;     
let maxReflections = 6;
let charType = 'reflect';

let enemies = [
    { x: 150, y: 100, w: 50, h: 50 },
    { x: 150, y: 200, w: 50, h: 50 }
];

let bounds = {
    left: 20,
    right: 380,
    top: 80,
    bottom: 340
};

let selectedEnemyIndex = -1;
let resizeHandle = null; 
let isDraggingAim = false;    
let draggingBound = null;

let currentAngle = -Math.PI / 2; 
let currentDistance = 100;       

function setType(type) {
    charType = type;
    document.getElementById('btnReflect').style.fontWeight = (type === 'reflect') ? 'bold' : 'normal';
    document.getElementById('btnReflect').style.background = (type === 'reflect') ? '#aaffaa' : '';
    document.getElementById('btnPierce').style.fontWeight = (type === 'pierce') ? 'bold' : 'normal';
    document.getElementById('btnPierce').style.background = (type === 'pierce') ? '#ffaaaa' : '';
    draw();
}

function setBounce(count) {
    maxReflections = count;
    draw();
}

function adjustAim(action) {
    const angleStep = (0.5 * Math.PI) / 180; 

    if (action === 'left') {
        currentAngle -= angleStep;
    } else if (action === 'right') {
        currentAngle += angleStep;
    } else if (action === 'up') {
        currentDistance = Math.min(250, currentDistance + 8);
    } else if (action === 'down') {
        currentDistance = Math.max(30, currentDistance - 8);
    }
    updateAimCoordinates();
    draw();
}

document.getElementById('imageLoader').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const maxWidth = 380;
            const scale = maxWidth / img.width;
            
            canvas.width = maxWidth;
            canvas.height = img.height * scale;

            uploadedImage = img; 

            // ★調整完了したジャストフィットのデフォルト比率
            bounds = {
                left: canvas.width * 0.05,
                right: canvas.width * 0.95,
                top: canvas.height * 0.155,  // 上側の枠
                bottom: canvas.height * 0.68  // 下側の枠（HPバーの上）
            };

            // 発射点（ボール）の初期位置
            startX = canvas.width / 2;
            startY = canvas.height * 0.685; 
            
            updateAimCoordinates();
            draw(); 
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

function updateAimCoordinates() {
    currentX = startX + Math.cos(currentAngle) * currentDistance;
    currentY = startY + Math.sin(currentAngle) * currentDistance;
}

// PC用キーボード操作
window.addEventListener('keydown', (e) => {
    const angleStep = (0.35 * Math.PI) / 180; 

    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        currentAngle -= angleStep; 
        updateAimCoordinates();
        draw();
        e.preventDefault();
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        currentAngle += angleStep; 
        updateAimCoordinates();
        draw();
        e.preventDefault();
    } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        currentDistance = Math.min(250, currentDistance + 5); 
        updateAimCoordinates();
        draw();
        e.preventDefault();
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        currentDistance = Math.max(30, currentDistance - 5);  
        updateAimCoordinates();
        draw();
        e.preventDefault();
    }
});

// --- マウス操作（PC用） ---
canvas.addEventListener('mousedown', (e) => handleStart(e.clientX, e.clientY));
window.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
window.addEventListener('mouseup', () => handleEnd());

// --- タッチ操作（スマホ用） ---
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (!isDraggingAim && !draggingBound && selectedEnemyIndex === -1) return;
    e.preventDefault();
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
}, { passive: false });

window.addEventListener('touchend', () => handleEnd());

function handleStart(clientX, clientY) {
    if (!uploadedImage) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const threshold = 15; 

    // 1. 境界線の調整
    if (Math.abs(mouseX - bounds.left) < threshold && mouseY >= bounds.top && mouseY <= bounds.bottom) {
        draggingBound = 'left'; return;
    }
    if (Math.abs(mouseX - bounds.right) < threshold && mouseY >= bounds.top && mouseY <= bounds.bottom) {
        draggingBound = 'right'; return;
    }
    if (Math.abs(mouseY - bounds.top) < threshold && mouseX >= bounds.left && mouseX <= bounds.right) {
        draggingBound = 'top'; return;
    }
    if (Math.abs(mouseY - bounds.bottom) < threshold && mouseX >= bounds.left && mouseX <= bounds.right) {
        draggingBound = 'bottom'; return;
    }

    // 2. ボール（発射点）のひっぱり判定
    const distToStart = Math.hypot(mouseX - startX, mouseY - startY);
    if (distToStart < 60) {
        isDraggingAim = true;
        currentX = mouseX;
        currentY = mouseY;
        currentDistance = Math.hypot(currentX - startX, currentY - startY);
        currentAngle = Math.atan2(currentY - startY, currentX - startX);
        draw();
        return;
    }

    // 3. 敵（四角形）の操作
    if (charType === 'reflect') {
        for (let i = 0; i < enemies.length; i++) {
            let en = enemies[i];
            const handleSize = 15;
            let isTop = Math.abs(mouseY - en.y) < handleSize;
            let isBottom = Math.abs(mouseY - (en.y + en.h)) < handleSize;
            let isLeft = Math.abs(mouseX - en.x) < handleSize;
            let isRight = Math.abs(mouseX - (en.x + en.w)) < handleSize;

            if (isTop && isLeft) { selectedEnemyIndex = i; resizeHandle = 'tl'; return; }
            if (isTop && isRight) { selectedEnemyIndex = i; resizeHandle = 'tr'; return; }
            if (isBottom && isLeft) { selectedEnemyIndex = i; resizeHandle = 'bl'; return; }
            if (isBottom && isRight) { selectedEnemyIndex = i; resizeHandle = 'br'; return; }

            if (mouseX >= en.x && mouseX <= en.x + en.w && mouseY >= en.y && mouseY <= en.y + en.h) {
                selectedEnemyIndex = i;
                resizeHandle = 'move';
                return;
            }
        }

        if (mouseX >= 10 && mouseX <= canvas.width - 10 && mouseY >= 10 && mouseY <= canvas.height - 10) {
            enemies.push({ x: mouseX - 25, y: mouseY - 25, w: 50, h: 50 });
            draw();
            return;
        }
    }
}

function handleMove(clientX, clientY) {
    if (!uploadedImage) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    if (draggingBound) {
        if (draggingBound === 'left') bounds.left = Math.min(mouseX, bounds.right - 50);
        if (draggingBound === 'right') bounds.right = Math.max(mouseX, bounds.left + 50);
        if (draggingBound === 'top') bounds.top = Math.min(mouseY, bounds.bottom - 50);
        if (draggingBound === 'bottom') bounds.bottom = Math.max(mouseY, bounds.top + 50);
        draw();
        return;
    }

    if (isDraggingAim) {
        currentX = mouseX;
        currentY = mouseY;
        currentDistance = Math.hypot(currentX - startX, currentY - startY);
        currentAngle = Math.atan2(currentY - startY, currentX - startX);
        draw();
        return;
    }

    if (selectedEnemyIndex !== -1) {
        let en = enemies[selectedEnemyIndex];
        
        if (resizeHandle === 'move') {
            en.x = mouseX - en.w / 2;
            en.y = mouseY - en.h / 2;
        } else if (resizeHandle === 'br') {
            en.w = Math.max(15, mouseX - en.x);
            en.h = Math.max(15, mouseY - en.y);
        } else if (resizeHandle === 'tl') {
            let right = en.x + en.w;
            let bottom = en.y + en.h;
            en.x = Math.min(mouseX, right - 15);
            en.y = Math.min(mouseY, bottom - 15);
            en.w = right - en.x;
            en.h = bottom - en.y;
        } else if (resizeHandle === 'tr') {
            let left = en.x;
            let bottom = en.y + en.h;
            en.w = Math.max(15, mouseX - left);
            en.y = Math.min(mouseY, bottom - 15);
            en.h = bottom - en.y;
        } else if (resizeHandle === 'bl') {
            let right = en.x + en.w;
            let top = en.y;
            en.x = Math.min(mouseX, right - 15);
            en.h = Math.max(15, mouseY - top);
            en.w = right - en.x;
        }
        draw();
        return;
    }
}

function handleEnd() {
    draggingBound = null;
    isDraggingAim = false;
    selectedEnemyIndex = -1;
    resizeHandle = null;
    draw();
}

// 画面描画関数
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (uploadedImage) {
        ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);

        // 境界枠
        ctx.save();
        ctx.beginPath();
        ctx.rect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
        ctx.strokeStyle = '#ffa500';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.shadowColor = 'rgba(255, 165, 0, 0.8)';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();

        if (charType === 'reflect') {
            enemies.forEach(en => {
                ctx.save();
                ctx.beginPath();
                ctx.rect(en.x, en.y, en.w, en.h);
                ctx.fillStyle = 'rgba(255, 50, 50, 0.2)';
                ctx.fill();
                ctx.strokeStyle = '#ff3333';
                ctx.lineWidth = 2;
                ctx.shadowColor = 'rgba(255, 0, 0, 0.6)';
                ctx.shadowBlur = 8;
                ctx.stroke();
                ctx.restore();

                const hSize = 5;
                ctx.fillStyle = '#ff6666';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                
                [
                    {x: en.x, y: en.y},
                    {x: en.x + en.w, y: en.y},
                    {x: en.x, y: en.y + en.h},
                    {x: en.x + en.w, y: en.y + en.h}
                ].forEach(h => {
                    ctx.beginPath();
                    ctx.rect(h.x - hSize, h.y - hSize, hSize * 2, hSize * 2);
                    ctx.fill();
                    ctx.stroke();
                });
            });
        }

        if (hasAim) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(currentX, currentY);
            ctx.strokeStyle = 'rgba(255, 255, 100, 0.8)';
            ctx.lineWidth = 2;
            ctx.shadowColor = 'rgba(255, 255, 0, 0.8)';
            ctx.shadowBlur = 6;
            ctx.stroke();
            ctx.restore();

            drawReflectionPath(startX, startY, currentX, currentY, charType, enemies);
        }

        // 発射点（ボール）
        ctx.save();
        ctx.beginPath();
        ctx.arc(startX, startY, 13, 0, Math.PI * 2);
        
        let ballColor = (charType === 'reflect') ? '#ffcc00' : '#ff33cc';
        let grad = ctx.createRadialGradient(startX - 4, startY - 4, 2, startX, startY, 13);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, ballColor);
        grad.addColorStop(1, '#880000');
        
        ctx.fillStyle = grad;
        ctx.shadowColor = (charType === 'reflect') ? 'rgba(255, 204, 0, 0.9)' : 'rgba(255, 51, 204, 0.9)';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

    } else {
        ctx.fillStyle = '#18181b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '14px sans-serif';
        ctx.fillText('上に画像を選んでください', canvas.width / 2 - 75, canvas.height / 2);
    }
}

// 軌道計算
function drawReflectionPath(sx, sy, cx, cy, type, enemies) {
    let dx = cx - sx; 
    let dy = cy - sy;
    
    let len = Math.hypot(dx, dy);
    if (len === 0) return;
    let vx = dx / len;
    let vy = dy / len;

    let currentPosX = sx;
    let currentPosY = sy;

    const minX = bounds.left;                    
    const maxX = bounds.right;     
    const minY = bounds.top;  
    const maxY = bounds.bottom;  

    let pathPoints = [{x: currentPosX, y: currentPosY}];

    let activeEnemies = (type === 'reflect') ? enemies : [];

    for (let i = 0; i < maxReflections; i++) {
        let tX = Infinity;
        let tY = Infinity;
        let tEnemy = Infinity;
        let hitNormal = null;

        if (vx > 0) tX = (maxX - currentPosX) / vx;
        if (vx < 0) tX = (minX - currentPosX) / vx;
        if (vy > 0) tY = (maxY - currentPosY) / vy;
        if (vy < 0) tY = (minY - currentPosY) / vy;

        for (let j = 0; j < activeEnemies.length; j++) {
            let en = activeEnemies[j];
            let left = en.x - 4;
            let right = en.x + en.w + 4;
            let top = en.y - 4;
            let bottom = en.y + en.h + 4;

            let txMin = vx > 0 ? (left - currentPosX) / vx : (right - currentPosX) / vx;
            let txMax = vx > 0 ? (right - currentPosX) / vx : (left - currentPosX) / vx;
            let tyMin = vy > 0 ? (top - currentPosY) / vy : (bottom - currentPosY) / vy;
            let tyMax = vy > 0 ? (bottom - currentPosY) / vy : (top - currentPosY) / vy;

            let tNear = Math.max(txMin, tyMin);
            let tFar = Math.min(txMax, tyMax);

            if (tNear <= tFar && tFar > 0 && tNear > 0.5) {
                if (tNear < tEnemy) {
                    tEnemy = tNear;
                    if (txMin > tyMin) {
                        hitNormal = vx > 0 ? {x: -1, y: 0} : {x: 1, y: 0};
                    } else {
                        hitNormal = vy > 0 ? {x: 0, y: -1} : {x: 0, y: 1};
                    }
                }
            }
        }

        let t = Math.min(tX, tY, tEnemy);
        if (t <= 0 || t === Infinity) break;

        currentPosX += vx * t;
        currentPosY += vy * t;
        pathPoints.push({x: currentPosX, y: currentPosY});

        if (type === 'pierce') {
            if (t === tX) {
                vx = -vx;
            } else {
                vy = -vy;
            }
        } else {
            if (t === tEnemy && hitNormal) {
                let dot = vx * hitNormal.x + vy * hitNormal.y;
                vx = vx - 2 * dot * hitNormal.x;
                vy = vy - 2 * dot * hitNormal.y;
            } 
            else if (t === tX) {
                vx = -vx;
            } else {
                vy = -vy;
            }
        }
    }

    let mainColor = (type === 'reflect') ? '#00ffcc' : '#ff66ff';
    let glowColor = (type === 'reflect') ? 'rgba(0, 255, 204, 0.8)' : 'rgba(255, 102, 255, 0.8)';

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
    for(let p = 1; p < pathPoints.length; p++) {
        ctx.lineTo(pathPoints[p].x, pathPoints[p].y);
    }
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
    for(let p = 1; p < pathPoints.length; p++) {
        ctx.lineTo(pathPoints[p].x, pathPoints[p].y);
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
}

canvas.width = 380;
canvas.height = 300;
draw();