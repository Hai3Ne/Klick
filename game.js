// Các biến chính của game
const gameState = {
    score: 0,
    clickValue: 1,
    autoClickRate: 0,
    upgradesPurchased: {
        click: 1,   // Giá trị mặc định cho nấp chuột
        auto: 0,    // Giá trị tự động click bắt đầu từ 0
        speed: 1,   // Tốc độ bắt đầu từ 1
        defense: 0, // Phòng thủ bắt đầu từ 0
    },
    costs: {
        click: 10,   // Chi phí để nâng cấp click
        auto: 25,    // Chi phí để nâng cấp tự động
        speed: 50,   // Chi phí để nâng cấp tốc độ
        defense: 100, // Chi phí để nâng cấp phòng thủ
    },
    enemies: [],
    enemySpawnRate: 0, // Sẽ được kích hoạt khi đạt level 5
    enemyDamage: 5,    // Điểm bị trừ khi bị kẻ địch tấn công
    enemySpeed: 2000,  // Thời gian di chuyển của kẻ địch (ms)
    enemyLifetime: 8000, // Thời gian tồn tại của kẻ địch (ms)
    lastUpdate: Date.now(),
    autoSaveInterval: 60000, // Tự động lưu sau mỗi 1 phút
    lastAutoSave: Date.now()
};
function getRandomColor() {
    // Danh sách các màu sắc có thể có cho kẻ địch (tông đỏ/cam/vàng)
    const colors = [
        0xff6b6b, // Đỏ nhạt
        0xff4757, // Đỏ đậm
        0xff7f50, // Cam san hô
        0xff6348, // Cam đỏ
        0xffa502, // Cam vàng
        0xe84118, // Đỏ cam
        0xf368e0, // Hồng
        0xc56cf0, // Tím nhạt
        0xff9ff3, // Hồng nhạt
        0xbadc58  // Xanh lá nhạt
    ];
    
    // Chọn ngẫu nhiên một màu từ danh sách
    return colors[Math.floor(Math.random() * colors.length)];
}

// Các phần tử DOM
const scoreElement = document.getElementById('score');
const pointsPerSecondElement = document.getElementById('points-per-second');
const gameCanvasElement = document.getElementById('game-canvas');

// Các nút nâng cấp
const clickUpgradeButton = document.getElementById('click-upgrade');
const autoUpgradeButton = document.getElementById('auto-upgrade');
const speedUpgradeButton = document.getElementById('speed-upgrade');
const defenseUpgradeButton = document.getElementById('enemy-defense');

// Các nút điều khiển game
const saveGameButton = document.getElementById('save-game');
const loadGameButton = document.getElementById('load-game');
const resetGameButton = document.getElementById('reset-game');

// Các phần tử hiển thị level
const clickLevelElement = document.getElementById('click-level');
const autoLevelElement = document.getElementById('auto-level');
const speedLevelElement = document.getElementById('speed-level');
const defenseLevelElement = document.getElementById('defense-level');

// Khởi tạo PixiJS
let app;
let target;
let enemyContainer;
let floatingTexts = [];

// Khởi tạo game
function initGame() {
    // Khởi tạo ứng dụng PixiJS
    app = new PIXI.Application({
        width: gameCanvasElement.clientWidth,
        height: gameCanvasElement.clientHeight,
        backgroundColor: 0xf8f9fa,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: true
    });
    
    // Thêm canvas PixiJS vào DOM
    gameCanvasElement.appendChild(app.view);
    
    // Đảm bảo canvas điền đầy không gian container
    app.renderer.resize(gameCanvasElement.clientWidth, gameCanvasElement.clientHeight);
    window.addEventListener('resize', resizeCanvas);
    
    // Tạo container cho kẻ địch
    enemyContainer = new PIXI.Container();
    app.stage.addChild(enemyContainer);
    
    // Tạo đối tượng mục tiêu (target)
    createTarget();
    
    // Thêm sự kiện click cho các nút nâng cấp
    clickUpgradeButton.addEventListener('click', () => purchaseUpgrade('click'));
    autoUpgradeButton.addEventListener('click', () => purchaseUpgrade('auto'));
    speedUpgradeButton.addEventListener('click', () => purchaseUpgrade('speed'));
    defenseUpgradeButton.addEventListener('click', () => purchaseUpgrade('defense'));
    
    // Thêm sự kiện cho các nút điều khiển game
    saveGameButton.addEventListener('click', saveGame);
    loadGameButton.addEventListener('click', loadGame);
    resetGameButton.addEventListener('click', resetGame);
    
    // Tải game từ localStorage nếu có
    loadGame(true); // true = tự động tải khi khởi động
    
    // Cập nhật nội dung hiển thị ban đầu
    updateDisplay();
    
    // Bắt đầu hệ thống tự động cộng điểm
    setInterval(autoClick, 1000);
    
    // Bắt đầu hệ thống trò chơi
    app.ticker.add(gameLoop);
}

// Điều chỉnh kích thước canvas khi thay đổi kích thước cửa sổ
function resizeCanvas() {
    app.renderer.resize(gameCanvasElement.clientWidth, gameCanvasElement.clientHeight);
    
    // Cập nhật vị trí target vào giữa
    if (target) {
        target.x = app.screen.width / 2;
        target.y = app.screen.height / 2;
    }
}

// Tạo đối tượng mục tiêu (target)
function createTarget() {
    // Tạo hình tròn màu xanh
    target = new PIXI.Graphics();
    target.beginFill(0x4c6ef5);
    target.drawCircle(0, 0, 50); // Bán kính 50px
    target.endFill();
    
    // Kiểm tra trước khi thêm hiệu ứng phát sáng
    if (PIXI.filters && PIXI.filters.GlowFilter) {
        // Thêm hiệu ứng phát sáng
        const targetGlow = new PIXI.filters.GlowFilter({
            distance: 15,
            outerStrength: 2,
            innerStrength: 0.5,
            color: 0x4c6ef5,
            quality: 0.5
        });
        target.filters = [targetGlow];
    } else {
        console.warn("PIXI.filters.GlowFilter not available, skipping glow effect");
    }
    
    // Đặt vị trí vào giữa màn hình
    target.x = app.screen.width / 2;
    target.y = app.screen.height / 2;
    
    // Thêm khả năng tương tác
    target.eventMode = 'static';
    target.cursor = 'pointer';
    
    // Đăng ký sự kiện click
    target.on('pointerdown', handleTargetClick);
    
    // Thêm vào sân khấu
    app.stage.addChild(target);
    
    // Thêm hiệu ứng sinh động
    animateTarget();
}

// Hiệu ứng sinh động cho đối tượng target
function animateTarget() {
    // Tạo hiệu ứng lên-xuống nhẹ nhàng
    app.ticker.add((delta) => {
        const time = performance.now() / 1000;
        target.scale.set(1 + Math.sin(time) * 0.05);
    });
}

// Xử lý khi người chơi nhấp vào đối tượng mục tiêu
function handleTargetClick() {
    // Thêm điểm
    addPoints(gameState.clickValue);
    
    // Hiệu ứng nhấp chuột (thu nhỏ nhanh rồi phóng to trở lại)
    const scaleDown = 0.8;
    const originalScale = 1;
    const animDuration = 0.1;
    
    gsap.to(target.scale, {
        x: scaleDown,
        y: scaleDown,
        duration: animDuration,
        onComplete: () => {
            gsap.to(target.scale, {
                x: originalScale,
                y: originalScale,
                duration: animDuration
            });
        }
    });
    
    // Đổi màu floating text thành màu cam (0xFFA500)
    showFloatingText(`+${gameState.clickValue}`, target.x, target.y, 0xFFA500);
}

// Hiển thị điểm số nổi lên khi cộng/trừ điểm
function showFloatingText(text, x, y, color = 0x4c6ef5) {
    const floatingText = new PIXI.Text(text, {
        fontFamily: 'Arial',
        fontSize: 20,
        fontWeight: 'bold',
        fill: color,
        align: 'center',
    });
    
    // Đặt vị trí và neo điểm
    floatingText.x = x;
    floatingText.y = y - 30;
    floatingText.anchor.set(0.5);
    
    // Thêm vào sân khấu
    app.stage.addChild(floatingText);
    
    // Theo dõi text để xóa sau khi hoàn thành
    floatingTexts.push({
        text: floatingText,
        alpha: 1,
        y: floatingText.y
    });
}

// Cập nhật hiệu ứng text nổi
function updateFloatingTexts(delta) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const floatingText = floatingTexts[i];
        
        // Cập nhật vị trí và độ trong suốt
        floatingText.alpha -= 0.02 * delta;
        floatingText.y -= 1 * delta;
        floatingText.text.alpha = floatingText.alpha;
        floatingText.text.y = floatingText.y;
        
        // Xóa khi đã mờ hẳn
        if (floatingText.alpha <= 0) {
            app.stage.removeChild(floatingText.text);
            floatingTexts.splice(i, 1);
        }
    }
}

// Thêm điểm vào điểm số hiện tại
function addPoints(amount) {
    gameState.score += amount;
    updateDisplay();
}

// Trừ điểm từ điểm số hiện tại
function subtractPoints(amount) {
    // Áp dụng phòng thủ nếu có
    const damageReduction = gameState.upgradesPurchased.defense * 0.2; // Mỗi cấp giảm 20% thiệt hại
    const actualDamage = Math.max(1, Math.floor(amount * (1 - damageReduction)));
    
    gameState.score = Math.max(0, gameState.score - actualDamage);
    updateDisplay();
    
    return actualDamage;
}

// Hệ thống tự động cộng điểm
function autoClick() {
    if (gameState.autoClickRate > 0) {
        addPoints(gameState.autoClickRate);
        
        // Hiển thị hiệu ứng điểm tự động (50% cơ hội)
        if (Math.random() > 0.5) {
            // Tạo vị trí ngẫu nhiên gần target
            const angle = Math.random() * Math.PI * 2;
            const radius = 30 + Math.random() * 20;
            const x = target.x + Math.cos(angle) * radius;
            const y = target.y + Math.sin(angle) * radius;
            
            // Đổi màu floating text thành màu cam (0xFFA500)
            showFloatingText(`+${gameState.autoClickRate}`, x, y, 0xFFA500);
        }
    }
}

// Mua nâng cấp
function purchaseUpgrade(type) {
    const cost = gameState.costs[type];
    
    // Kiểm tra xem có đủ điểm để mua không
    if (gameState.score >= cost) {
        // Trừ điểm
        gameState.score -= cost;
        
        // Tăng cấp độ nâng cấp
        gameState.upgradesPurchased[type]++;
        
        // Cập nhật giá trị dựa trên loại nâng cấp
        switch (type) {
            case 'click':
                gameState.clickValue += 1;
                break;
            case 'auto':
                gameState.autoClickRate += 1;
                break;
            case 'speed':
                // Tăng 50% tốc độ tự động - không thay đổi cách tính
                break;
            case 'defense':
                // Giảm thiệt hại từ kẻ địch - được xử lý trong hàm subtractPoints
                break;
        }
        
        // Tăng chi phí cho lần nâng cấp tiếp theo
        gameState.costs[type] = Math.floor(cost * 1.5);
        
        // Cập nhật hiển thị
        updateDisplay();
        
        // Kiểm tra và kích hoạt hệ thống kẻ địch
        checkAndEnableEnemies();
        
        // Lưu game sau khi nâng cấp
        saveGame(false); // false = tự động lưu, không thông báo
    }
}

// Kiểm tra và kích hoạt hệ thống kẻ địch
function checkAndEnableEnemies() {
    const totalLevel = Object.values(gameState.upgradesPurchased).reduce((sum, level) => sum + level, 0);
    
    // Nếu tổng cấp độ >= 5, kích hoạt hệ thống kẻ địch
    if (totalLevel >= 5 && gameState.enemySpawnRate === 0) {
        gameState.enemySpawnRate = 3000; // Tạo kẻ địch mỗi 3 giây
        startEnemySystem();
    }
}

// Bắt đầu hệ thống kẻ địch
function startEnemySystem() {
    setInterval(spawnEnemy, gameState.enemySpawnRate);
}

// Tạo kẻ địch mới
function spawnEnemy() {
    // Chỉ tạo kẻ địch nếu đã kích hoạt hệ thống kẻ địch
    if (gameState.enemySpawnRate > 0) {
        // Tạo ID duy nhất cho kẻ địch
        const enemyId = Date.now().toString();
        
        // Tạo hình tròn đỏ cho kẻ địch
        const enemy = new PIXI.Graphics();
        enemy.beginFill(0xff6b6b);
        enemy.drawCircle(0, 0, 20); // Bán kính 20px
        enemy.endFill();
        
        // Thêm hiệu ứng phát sáng đỏ - nếu có lỗi, hãy comment đoạn này lại
        try {
            if (PIXI.filters && PIXI.filters.GlowFilter) {
                const enemyGlow = new PIXI.filters.GlowFilter({
                    distance: 10,
                    outerStrength: 1,
                    innerStrength: 0.5,
                    color: 0xff6b6b,
                    quality: 0.5
                });
                enemy.filters = [enemyGlow];
            }
        } catch (error) {
            console.warn("Không thể tạo hiệu ứng glow cho kẻ địch:", error);
        }
        
        // Đặt vị trí ngẫu nhiên (tránh vị trí trùng với target)
        let x, y;
        do {
            x = Math.random() * (app.screen.width - 40);
            y = Math.random() * (app.screen.height - 40);
        } while (
            Math.abs(x - target.x) < 100 &&
            Math.abs(y - target.y) < 100
        );
        
        enemy.x = x;
        enemy.y = y;
        
        // Đặt ID
        enemy.name = enemyId;
        
        // Thêm khả năng tương tác
        enemy.eventMode = 'static';
        enemy.cursor = 'pointer';
        
        // Tạo điểm thưởng ngẫu nhiên khi tiêu diệt kẻ địch (5-15 điểm)
        const bountyPoints = 5 + Math.floor(Math.random() * 11);
        
        // Tạo tỷ lệ trừ điểm mỗi giây (1-3 điểm)
        const damagePerSecond = 1 + Math.floor(Math.random() * 3);
        
        // Container cho text
        const textContainer = new PIXI.Container();
        
        // Tạo text hiển thị điểm thưởng trên kẻ địch
        const bountyText = new PIXI.Text(`+${bountyPoints}`, {
            fontFamily: 'Arial',
            fontSize: 14,
            fontWeight: 'bold',
            fill: 0xFFFF00, // Màu vàng
            align: 'center',
        });
        bountyText.anchor.set(0.5);
        bountyText.y = -25;
        
        // Tạo text hiển thị tốc độ trừ điểm trên kẻ địch
        const damageText = new PIXI.Text(`-${damagePerSecond}/s`, {
            fontFamily: 'Arial',
            fontSize: 14,
            fontWeight: 'bold',
            fill: 0xFF0000, // Màu đỏ
            align: 'center',
        });
        damageText.anchor.set(0.5);
        damageText.y = -10;
        
        // Thêm text vào container
        textContainer.addChild(bountyText);
        textContainer.addChild(damageText);
        
        // Thêm container vào enemy
        enemy.addChild(textContainer);
        
        // Đăng ký sự kiện click để tiêu diệt kẻ địch và nhận điểm
        enemy.on('pointerdown', (event) => {
            event.stopPropagation();
            // Thêm điểm thưởng khi tiêu diệt kẻ địch
            addPoints(bountyPoints);
            // Hiển thị floating text với điểm nhận được
            showFloatingText(`+${bountyPoints}`, enemy.x, enemy.y, 0xFFFF00); // Màu vàng
            destroyEnemy(enemyId);
        });
        
        // Thêm vào container kẻ địch
        enemyContainer.addChild(enemy);
        
        // Thời gian lần cuối trừ điểm
        const lastDamageTime = Date.now();
        
        // Tạo hàm để trừ điểm ngẫu nhiên trong phạm vi cho phép
        const getRandomDamage = () => {
            // Tạo số ngẫu nhiên từ 70% đến 130% mức trừ điểm cơ bản
            const multiplier = 0.7 + Math.random() * 0.6; // Từ 0.7 đến 1.3
            return Math.max(1, Math.floor(damagePerSecond * multiplier));
        };
        
        // Thêm kẻ địch vào mảng theo dõi
        gameState.enemies.push({
            id: enemyId,
            sprite: enemy,
            createdAt: Date.now(),
            lastDamageTime: lastDamageTime,
            bountyPoints: bountyPoints,
            damagePerSecond: damagePerSecond,
            getRandomDamage: getRandomDamage
        });
    }
}

// Tiêu diệt kẻ địch
function destroyEnemy(enemyId) {
    // Tìm kẻ địch trong container
    const enemy = enemyContainer.children.find(child => child.name === enemyId);
    
    if (enemy) {
        // Hiệu ứng biến mất
        gsap.to(enemy.scale, {
            x: 0,
            y: 0,
            duration: 0.3,
            onComplete: () => {
                // Xóa sprite khỏi container
                enemyContainer.removeChild(enemy);
                
                // Xóa kẻ địch khỏi mảng theo dõi
                gameState.enemies = gameState.enemies.filter(e => e.id !== enemyId);
            }
        });
    }
}

// Cập nhật hiển thị
function updateDisplay() {
    // Cập nhật điểm số
    scoreElement.textContent = Math.floor(gameState.score);
    pointsPerSecondElement.textContent = gameState.autoClickRate;
    
    // Cập nhật hiển thị cấp độ
    clickLevelElement.textContent = gameState.upgradesPurchased.click;
    autoLevelElement.textContent = gameState.upgradesPurchased.auto;
    speedLevelElement.textContent = gameState.upgradesPurchased.speed;
    defenseLevelElement.textContent = gameState.upgradesPurchased.defense;
    
    // Cập nhật chi phí nâng cấp
    clickUpgradeButton.querySelector('.cost').textContent = `Giá: ${gameState.costs.click} điểm`;
    autoUpgradeButton.querySelector('.cost').textContent = `Giá: ${gameState.costs.auto} điểm`;
    speedUpgradeButton.querySelector('.cost').textContent = `Giá: ${gameState.costs.speed} điểm`;
    defenseUpgradeButton.querySelector('.cost').textContent = `Giá: ${gameState.costs.defense} điểm`;
    
    // Cập nhật trạng thái nút nâng cấp
    clickUpgradeButton.disabled = gameState.score < gameState.costs.click;
    autoUpgradeButton.disabled = gameState.score < gameState.costs.auto;
    speedUpgradeButton.disabled = gameState.score < gameState.costs.speed;
    defenseUpgradeButton.disabled = gameState.score < gameState.costs.defense;
}

// Vòng lặp game chính
function gameLoop(delta) {
    // Cập nhật thời gian
    const now = Date.now();
    const dt = (now - gameState.lastUpdate) / 1000; // Đổi sang giây
    gameState.lastUpdate = now;
    
    // Di chuyển các kẻ địch
    moveEnemies(delta);
    
    // Trừ điểm theo thời gian cho mỗi kẻ địch
    updateEnemyDamage(now);
    
    // Cập nhật text nổi
    updateFloatingTexts(delta);
    
    // Kiểm tra tự động lưu
    if (now - gameState.lastAutoSave > gameState.autoSaveInterval) {
        saveGame(false); // false = tự động lưu, không thông báo
        gameState.lastAutoSave = now;
    }
}

// Lưu tiến trình chơi
function saveGame(showNotification = true) {
    // Tạo đối tượng lưu trữ
    const saveData = {
        score: gameState.score,
        clickValue: gameState.clickValue,
        autoClickRate: gameState.autoClickRate,
        upgradesPurchased: gameState.upgradesPurchased,
        costs: gameState.costs,
        enemySpawnRate: gameState.enemySpawnRate,
        savedAt: Date.now()
    };
    
    // Lưu vào localStorage
    localStorage.setItem('clickerGameSave', JSON.stringify(saveData));
    
    // Hiển thị thông báo nếu cần
    if (showNotification) {
        showNotification("Đã lưu game thành công!");
    }
}

// Tải tiến trình chơi
function loadGame(isAutoLoad = false) {
    // Kiểm tra xem có dữ liệu lưu không
    const savedData = localStorage.getItem('clickerGameSave');
    
    if (savedData) {
        try {
            // Phân tích dữ liệu từ chuỗi JSON
            const loadedData = JSON.parse(savedData);
            
            // Áp dụng dữ liệu đã lưu
            gameState.score = loadedData.score || 0;
            gameState.clickValue = loadedData.clickValue || 1;
            gameState.autoClickRate = loadedData.autoClickRate || 0;
            gameState.upgradesPurchased = loadedData.upgradesPurchased || {
                click: 1,
                auto: 0,
                speed: 1,
                defense: 0
            };
            gameState.costs = loadedData.costs || {
                click: 10,
                auto: 25,
                speed: 50,
                defense: 100
            };
            gameState.enemySpawnRate = loadedData.enemySpawnRate || 0;
            
            // Kiểm tra và kích hoạt hệ thống kẻ địch nếu cần
            if (gameState.enemySpawnRate > 0 && gameState.enemies.length === 0) {
                startEnemySystem();
            }
            
            // Cập nhật hiển thị
            updateDisplay();
            
            // Hiển thị thông báo nếu không phải là tự động tải
            if (!isAutoLoad) {
                showNotification("Đã tải game thành công!");
            }
        } catch (error) {
            console.error("Lỗi khi tải game:", error);
            if (!isAutoLoad) {
                showNotification("Lỗi khi tải game!", true);
            }
        }
    } else if (!isAutoLoad) {
        showNotification("Không tìm thấy dữ liệu đã lưu!", true);
    }
}

// Đặt lại game
function resetGame() {
    // Xác nhận từ người dùng
    if (confirm("Bạn có chắc chắn muốn đặt lại game? Mọi tiến trình sẽ bị mất!")) {
        // Xóa dữ liệu đã lưu
        localStorage.removeItem('clickerGameSave');
        
        // Đặt lại trạng thái game
        gameState.score = 0;
        gameState.clickValue = 1;
        gameState.autoClickRate = 0;
        gameState.upgradesPurchased = {
            click: 1,
            auto: 0,
            speed: 1,
            defense: 0
        };
        gameState.costs = {
            click: 10,
            auto: 25,
            speed: 50,
            defense: 100
        };
        gameState.enemies = [];
        gameState.enemySpawnRate = 0;
        
        // Xóa tất cả kẻ địch hiện tại
        enemyContainer.removeChildren();
        
        // Cập nhật hiển thị
        updateDisplay();
        
        // Hiển thị thông báo
        showNotification("Đã đặt lại game thành công!");
    }
}

// Hiển thị thông báo
function showNotification(message, isError = false) {
    // Kiểm tra xem đã có thông báo chưa
    let notification = document.querySelector('.save-notification');
    
    // Nếu chưa có, tạo mới
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'save-notification';
        document.body.appendChild(notification);
    }
    
    // Đặt nội dung và kiểu
    notification.textContent = message;
    notification.style.backgroundColor = isError ? '#dc3545' : '#28a745';
    
    // Hiển thị thông báo
    notification.classList.add('show');
    
    // Ẩn sau 3 giây
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function requestEnemy() {
    // Chỉ cho phép yêu cầu kẻ địch nếu số lượng kẻ địch < 10
    if (gameState.enemies.length < 10) {
        spawnEnemy();
        return true;
    }
    return false;
}

// Cập nhật hàm gameLoop để thêm chuyển động cho enemy
function gameLoop(delta) {
    // Cập nhật thời gian
    const now = Date.now();
    const dt = (now - gameState.lastUpdate) / 1000; // Đổi sang giây
    gameState.lastUpdate = now;
    
    // Di chuyển các kẻ địch
    // moveEnemies(delta);
    
    // Trừ điểm theo thời gian cho mỗi kẻ địch
    updateEnemyDamage(now);
    
    // Cập nhật text nổi
    updateFloatingTexts(delta);
    
    // Kiểm tra tự động lưu
    if (now - gameState.lastAutoSave > gameState.autoSaveInterval) {
        saveGame(false); // false = tự động lưu, không thông báo
        gameState.lastAutoSave = now;
    }
}
function updateEnemyDamage(currentTime) {
    gameState.enemies.forEach(enemy => {
        if (currentTime - enemy.lastDamageTime >= 1000) {

            const secondsPassed = Math.floor((currentTime - enemy.lastDamageTime) / 1000);
            
            if (secondsPassed > 0) {

                const damageAmount = enemy.getRandomDamage();
                
                // Trừ điểm
                const actualDamage = subtractPoints(damageAmount);
                
                // Hiển thị floating text với điểm bị trừ
                // Lấy vị trí của enemy
                const enemySprite = enemy.sprite;
                if (enemySprite && enemySprite.parent) {
                    showFloatingText(`-${actualDamage}`, enemySprite.x, enemySprite.y, 0xFF0000); // Màu đỏ
                }
                
                // Cập nhật thời gian trừ điểm cuối cùng
                enemy.lastDamageTime = currentTime;
            }
        }
    });
}
// Khởi động game khi trang web đã tải xong
window.addEventListener('load', initGame);