// Vengeful Blade - Main Game File
// =================================

// Game State
const GameState = {
    START: 'start',
    PLAYING: 'playing',
    PAUSED: 'paused',
    POWERUP_SELECTION: 'powerup_selection',
    META_SELECTION: 'meta_selection',
    GAME_OVER: 'game_over',
    VICTORY: 'victory'
};

// Weapon Types
const WeaponType = {
    SWORD: 'sword',
    AXE: 'axe',
    BOW: 'bow',
    POLEARM: 'polearm',
    DAGGER: 'dagger'
};

// Power-up Types
const PowerUpType = {
    WEAPON: 'weapon',
    MODIFIER: 'modifier',
    ABILITY: 'ability',
    PET: 'pet'
};

// Game Constants
const CONSTANTS = {
    CANVAS_WIDTH: 1000,
    CANVAS_HEIGHT: 700,
    TILE_SIZE: 40,
    ARENA_WIDTH: 2000,
    ARENA_HEIGHT: 2000,
    PLAYER_SPEED: 5,
    BASE_HEALTH: 100,
    BASE_MANA: 50,
    MANA_REGEN: 0.1,
    ATTACK_COOLDOWN: 300,
    SPECIAL_COOLDOWN: 3000,
    PROJECTILE_SPEED: 8,
    MAX_WAVES: 10,
    ARENA_PICKUP_SPAWN_RATE: 10000,
    ISOMETRIC_ANGLE: Math.PI / 4
};

// Input Handler
class InputHandler {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0, leftDown: false, rightDown: false };
        
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') e.preventDefault();
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        const canvas = document.getElementById('game-canvas');
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.mouse.leftDown = true;
            if (e.button === 2) this.mouse.rightDown = true;
        });
        
        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.leftDown = false;
            if (e.button === 2) this.mouse.rightDown = false;
        });
        
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    isDown(code) {
        return this.keys[code] === true;
    }
    
    getMovementVector() {
        let screenDx = 0, screenDy = 0;
        if (this.isDown('KeyW') || this.isDown('ArrowUp')) screenDy -= 1;
        if (this.isDown('KeyS') || this.isDown('ArrowDown')) screenDy += 1;
        if (this.isDown('KeyA') || this.isDown('ArrowLeft')) screenDx -= 1;
        if (this.isDown('KeyD') || this.isDown('ArrowRight')) screenDx += 1;
        
        // Normalize screen-space direction
        const length = Math.sqrt(screenDx * screenDx + screenDy * screenDy);
        if (length > 0) {
            screenDx /= length;
            screenDy /= length;
        }
        
        // Convert screen-space movement to world-space (inverse isometric projection)
        // Screen to World transformation:
        // worldX = (screenX + 2*screenY) / 2
        // worldY = (2*screenY - screenX) / 2
        const worldDx = (screenDx + 2 * screenDy) / 2;
        const worldDy = (2 * screenDy - screenDx) / 2;
        
        return { x: worldDx, y: worldDy };
    }
}

// Isometric Helper Functions
class IsoMath {
    static screenToIso(screenX, screenY, centerX, centerY) {
        const offsetX = screenX - centerX;
        const offsetY = screenY - centerY;
        
        // Isometric conversion
        const worldX = (offsetX + offsetY) / 2;
        const worldY = (offsetY - offsetX) / 2;
        
        return {
            x: worldX + centerX,
            y: worldY + centerY
        };
    }
    
    static isoToScreen(worldX, worldY, playerX, playerY, centerX, centerY) {
        // Offset from player (camera follows player)
        const offsetX = worldX - playerX;
        const offsetY = worldY - playerY;
        
        // Scale down the arena for better visibility (isometric spreads things out)
        const scale = 0.8;
        
        // Isometric projection with proper scale
        const screenX = (offsetX - offsetY) * scale + centerX;
        const screenY = (offsetX + offsetY) * scale * 0.5 + centerY;
        
        return { x: screenX, y: screenY };
    }
}

// Sprite Manager
class SpriteManager {
    constructor() {
        this.sprites = {};
        this.loadAllSprites();
    }
    
    loadAllSprites() {
        // Soldier sprites for player (Garrick)
        const soldierPath = 'assets/Characters(100x100)/Soldier/Soldier/';
        this.sprites.player = {
            idle: new Image(),
            walk: new Image(),
            attack1: new Image(),
            attack2: new Image(),
            hurt: new Image(),
            death: new Image()
        };
        this.sprites.player.idle.src = soldierPath + 'Soldier-Idle.png';
        this.sprites.player.walk.src = soldierPath + 'Soldier-Walk.png';
        this.sprites.player.attack1.src = soldierPath + 'Soldier-Attack01.png';
        this.sprites.player.attack2.src = soldierPath + 'Soldier-Attack02.png';
        this.sprites.player.hurt.src = soldierPath + 'Soldier-Hurt.png';
        this.sprites.player.death.src = soldierPath + 'Soldier-Death.png';
        
        // Orc sprites for enemies
        const orcPath = 'assets/Characters(100x100)/Orc/Orc/';
        this.sprites.enemy = {
            idle: new Image(),
            walk: new Image(),
            attack1: new Image(),
            attack2: new Image(),
            hurt: new Image(),
            death: new Image()
        };
        this.sprites.enemy.idle.src = orcPath + 'Orc-Idle.png';
        this.sprites.enemy.walk.src = orcPath + 'Orc-Walk.png';
        this.sprites.enemy.attack1.src = orcPath + 'Orc-Attack01.png';
        this.sprites.enemy.attack2.src = orcPath + 'Orc-Attack02.png';
        this.sprites.enemy.hurt.src = orcPath + 'Orc-Hurt.png';
        this.sprites.enemy.death.src = orcPath + 'Orc-Death.png';
    }
    
    getSprite(characterType, state) {
        if (!this.sprites[characterType]) return null;
        const sprite = this.sprites[characterType][state];
        return sprite ? sprite : this.sprites[characterType].idle;
    }
    
    isLoaded() {
        // Check if all images are loaded
        const allImages = [];
        for (const type in this.sprites) {
            for (const state in this.sprites[type]) {
                allImages.push(this.sprites[type][state]);
            }
        }
        return allImages.every(img => img.complete && img.naturalHeight !== 0);
    }
}

// Damage Number Class
class DamageNumber {
    constructor(x, y, amount, type = 'normal') {
        this.screenX = x;
        this.screenY = y;
        this.amount = amount;
        this.type = type;
        this.life = 100;
        this.maxLife = 100;
        this.velocityY = -1;
    }
    
    update() {
        this.life -= 2;
        this.screenY += this.velocityY;
    }
    
    draw(ctx, playerX, playerY, centerX, centerY) {
        const screenPos = IsoMath.isoToScreen(this.screenX, this.screenY, playerX, playerY, centerX, centerY);
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        
        let color;
        if (this.type === 'critical') {
            color = '#ff6b00';
        } else if (this.type === 'healing') {
            color = '#4caf50';
        } else {
            color = '#ffffff';
        }
        
        const opacity = this.life / this.maxLife;
        ctx.fillStyle = `rgba(${this.rgbToValues(color)}, ${opacity})`;
        ctx.fillText(`-${this.amount}`, screenPos.x, screenPos.y);
    }
    
    rgbToValues(color) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `${r}, ${g}, ${b}`;
    }
    
    isDead() {
        return this.life <= 0;
    }
}

// Projectile Class
class Projectile {
    constructor(x, y, targetX, targetY, damage, weaponType, owner) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.weaponType = weaponType;
        this.owner = owner;
        this.life = 100;
        this.radius = 4;
        this.hitted = false;
        
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.vx = (dx / dist) * CONSTANTS.PROJECTILE_SPEED;
        this.vy = (dy / dist) * CONSTANTS.PROJECTILE_SPEED;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 2;
    }
    
    draw(ctx, playerX, playerY, centerX, centerY) {
        const screenPos = IsoMath.isoToScreen(this.x, this.y, playerX, playerY, centerX, centerY);
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, this.radius, 0, Math.PI * 2);
        
        if (this.weaponType === WeaponType.BOW) {
            ctx.fillStyle = '#8b4513';
        } else if (this.weaponType === WeaponType.SWORD) {
            ctx.fillStyle = '#c0c0c0';
        } else if (this.weaponType === WeaponType.AXE) {
            ctx.fillStyle = '#cd853f';
        } else {
            ctx.fillStyle = '#f5c518';
        }
        
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    isDead() {
        return this.life <= 0 || this.hitted;
    }
    
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            radius: this.radius
        };
    }
}

// Status Effect Class
class StatusEffect {
    constructor(type, duration, damage = 0) {
        this.type = type;
        this.duration = duration;
        this.remaining = duration;
        this.damage = damage;
    }
    
    update(deltaTime) {
        this.remaining -= deltaTime;
    }
    
    isActive() {
        return this.remaining > 0;
    }
}

// Bleeding Effect
class BleedingEffect extends StatusEffect {
    constructor(duration, damage) {
        super('bleeding', duration, damage);
    }
    
    draw(ctx, targetX, targetY, playerX, playerY, centerX, centerY) {
        const screenPos = IsoMath.isoToScreen(targetX, targetY, playerX, playerY, centerX, centerY);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#8b0000';
        ctx.fillText('🩸', screenPos.x, screenPos.y - 20);
    }
}

// Arena Pickup Class
class ArenaPickup {
    constructor(x, y, type, value) {
        this.x = x;
        this.y = y;
        this.type = type; // 'health', 'mana', 'damage', 'speed'
        this.value = value;
        this.radius = 15;
        this.pulse = 0;
    }
    
    update(deltaTime) {
        this.pulse += 0.05;
    }
    
    draw(ctx, playerX, playerY, centerX, centerY) {
        const screenPos = IsoMath.isoToScreen(this.x, this.y, playerX, playerY, centerX, centerY);
        const scale = 1 + Math.sin(this.pulse) * 0.1;
        
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);
        ctx.scale(scale, scale);
        
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        
        switch(this.type) {
            case 'health':
                ctx.fillStyle = '#ff6b6b';
                break;
            case 'mana':
                ctx.fillStyle = '#4169e1';
                break;
            case 'damage':
                ctx.fillStyle = '#f5c518';
                break;
            case 'speed':
                ctx.fillStyle = '#4caf50';
                break;
        }
        
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Icon
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let icon;
        switch(this.type) {
            case 'health': icon = '❤️'; break;
            case 'mana': icon = '🔵'; break;
            case 'damage': icon = '⚔️'; break;
            case 'speed': icon = '⚡'; break;
        }
        
        ctx.fillText(icon, 0, 0);
        ctx.restore();
    }
    
    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

// Enemy Class
class Enemy {
    constructor(x, y, type, wave) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.wave = wave;
        this.radius = 15;
        this.hitted = false;
        
        // Set stats based on type and wave
        const waveMultiplier = 1 + (wave * 0.2);
        
        if (type === 'soldier') {
            this.health = 30 * waveMultiplier;
            this.maxHealth = this.health;
            this.damage = 5 * waveMultiplier;
            this.speed = 2 * (1 + wave * 0.05);
            this.color = '#4a4';
            this.souls = 5;
        } else if (type === 'archer') {
            this.health = 20 * waveMultiplier;
            this.maxHealth = this.health;
            this.damage = 8 * waveMultiplier;
            this.speed = 1.5 * (1 + wave * 0.05);
            this.color = '#a44';
            this.souls = 8;
            this.range = 150;
            this.attackCooldown = 2000;
            this.lastAttack = 0;
        } else if (type === 'tank') {
            this.health = 60 * waveMultiplier;
            this.maxHealth = this.health;
            this.damage = 10 * waveMultiplier;
            this.speed = 1 * (1 + wave * 0.03);
            this.color = '#44a';
            this.souls = 10;
            this.radius = 20;
        } else if (type === 'zeus') {
            // Boss
            this.health = 500;
            this.maxHealth = this.health;
            this.damage = 25;
            this.speed = 1.5;
            this.color = '#f5c518';
            this.souls = 100;
            this.radius = 30;
            this.range = 200;
            this.attackCooldown = 1500;
            this.lastAttack = 0;
            this.abilities = {
                lightning: { cooldown: 3000, lastUsed: 0 },
                storm: { cooldown: 5000, lastUsed: 0 }
            };
        } else {
            this.health = 20 * waveMultiplier;
            this.maxHealth = this.health;
            this.damage = 3 * waveMultiplier;
            this.speed = 2.5 * (1 + wave * 0.05);
            this.color = '#fa4';
            this.souls = 3;
        }
        
        this.statusEffects = [];
        
        // Animation
        this.state = 'idle';
        this.frame = 0;
        this.frameTimer = 0;
        this.frameRate = 75; // Slow down animation (ms per frame)
        this.direction = 1;
    }
    
    update(deltaTime, target, enemies) {
        // Update status effects
        this.statusEffects = this.statusEffects.filter(effect => {
            effect.update(deltaTime);
            if (effect.type === 'bleeding' && effect.isActive()) {
                this.takeDamage(effect.damage);
            }
            return effect.isActive();
        });
        
        // Track previous state to detect state changes
        const previousState = this.state;
        
        // Update animation state
        this.frameTimer += deltaTime;
        if (this.frameTimer >= this.frameRate) {
            this.frameTimer = 0;
            this.frame++;
        }
        
        // Update facing direction based on movement
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dx > 0) this.direction = 1;
        if (dx < 0) this.direction = -1;
        
        // Determine animation state
        if (this.range && dist <= this.range) {
            const now = Date.now();
            if (now - this.lastAttack <= 500) {
                this.state = 'attack1';
            } else if (dist > 30) {
                this.state = 'walk';
            } else {
                this.state = 'idle';
            }
        } else if (dist > 30) {
            this.state = 'walk';
        } else {
            this.state = 'idle';
        }
        
        // Reset frame counter when state changes to ensure animation starts from frame 0
        if (this.state !== previousState) {
            this.frame = 0;
            this.frameTimer = 0;
        }
        
        // Check for ranged attack
        if (this.range && dist <= this.range) {
            const now = Date.now();
            if (now - this.lastAttack >= this.attackCooldown) {
                // Shoot projectile at target
                this.lastAttack = now;
                return {
                    projectile: new Projectile(this.x, this.y, target.x, target.y, this.damage, WeaponType.BOW, 'enemy')
                };
            }
            return { projectiles: [] };
        }
        
        // Move towards target
        if (dist > 30) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
        
        // Soft collision with other enemies
        enemies.forEach(other => {
            if (other !== this) {
                const odx = this.x - other.x;
                const ody = this.y - other.y;
                const odist = Math.sqrt(odx * odx + ody * ody);
                const minDist = this.radius + other.radius;
                
                if (odist < minDist && odist > 0) {
                    const pushX = (odx / odist) * 0.5;
                    const pushY = (ody / odist) * 0.5;
                    this.x += pushX;
                    this.y += pushY;
                }
            }
        });
        
        return { projectiles: [] };
    }
    
    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }
    
    addStatusEffect(effect) {
        this.statusEffects.push(effect);
    }
    
    draw(ctx, playerX, playerY, centerX, centerY) {
        const screenPos = IsoMath.isoToScreen(this.x, this.y, playerX, playerY, centerX, centerY);
        
        // Get sprite from sprite manager
        const spriteManager = window.gameInstance ? window.gameInstance.spriteManager : null;
        const sprite = spriteManager ? spriteManager.getSprite('enemy', this.state) : null;
        
        // Shadow
        ctx.beginPath();
        ctx.ellipse(screenPos.x, screenPos.y + 30, 20, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();
        
        // Draw sprite if loaded, otherwise fall back to circle
        if (sprite && sprite.complete && sprite.naturalHeight !== 0) {
            const spriteWidth = 100;
            const spriteHeight = 100;
            const scale = 3.6;
        
            // Determine which frame to show based on animation
            let frameX = 0;
            let frameWidth = 100;
        
            // For multi-frame sprites, we'll show different frames
            if (this.state === 'walk' || this.state === 'attack1') {
                const frameCount = Math.floor(sprite.naturalWidth / frameWidth);
                if (frameCount > 1) {
                    frameX = (this.frame % frameCount) * frameWidth;
                }
            }
        
            // Draw the sprite
            ctx.save();
            ctx.translate(screenPos.x, screenPos.y - 10);
            ctx.scale(this.direction * scale, scale);
            ctx.drawImage(sprite, frameX, 0, frameWidth, spriteHeight, -frameWidth/2, -spriteHeight/2, frameWidth, spriteHeight);
            ctx.restore();
        } else {
            // Fallback to circle if sprite not loaded
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y - 20, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Health bar
        const healthPct = Math.max(0, Math.min(1, this.health / this.maxHealth));
        ctx.fillStyle = '#333';
        ctx.fillRect(screenPos.x - 20, screenPos.y - 70, 40, 5);
        ctx.fillStyle = healthPct > 0.5 ? '#4caf50' : healthPct > 0.25 ? '#ff9800' : '#f44';
        ctx.fillRect(screenPos.x - 20, screenPos.y - 70, 40 * healthPct, 5);
        
        // Draw status effects
        this.statusEffects.forEach(effect => {
            if (effect.type === 'bleeding') {
                effect.draw(ctx, this.x, this.y, playerX, playerY, centerX, centerY);
            }
        });
    }
    
    isDead() {
        return this.health <= 0;
    }
}

// Pet Class
class Pet {
    constructor(type, damage, range) {
        this.type = type;
        this.damage = damage;
        this.range = range || 100;
        this.x = 0;
        this.y = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.attackCooldown = 1000;
        this.lastAttack = 0;
        this.radius = 10;
    }
    
    follow(x, y) {
        this.offsetX = x + (this.offsetX - x) * 0.1;
        this.offsetY = y + (this.offsetY - y) * 0.1;
        this.x = this.offsetX;
        this.y = this.offsetY;
    }
    
    update(deltaTime, enemies) {
        const now = Date.now();
        let projectile = null;
        
        // Find closest enemy
        let closest = null;
        let closestDist = Infinity;
        
        enemies.forEach(enemy => {
            const dist = Math.sqrt((enemy.x - this.x) ** 2 + (enemy.y - this.y) ** 2);
            if (dist < closestDist && dist <= this.range) {
                closest = enemy;
                closestDist = dist;
            }
        });
        
        if (closest && now - this.lastAttack >= this.attackCooldown) {
            this.lastAttack = now;
            projectile = new Projectile(this.x, this.y, closest.x, closest.y, this.damage, WeaponType.SWORD, 'pet');
        }
        
        return { projectile };
    }
    
    draw(ctx, playerX, playerY, centerX, centerY) {
        const screenPos = IsoMath.isoToScreen(this.x, this.y, playerX, playerY, centerX, centerY);
        
        // Shadow
        ctx.beginPath();
        ctx.ellipse(screenPos.x, screenPos.y + this.radius, this.radius, this.radius / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();
        
        // Body
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#9c27b0';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Icon
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐾', screenPos.x, screenPos.y);
    }
}

// Player Class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        
        // Stats
        this.maxHealth = CONSTANTS.BASE_HEALTH;
        this.health = this.maxHealth;
        this.maxMana = CONSTANTS.BASE_MANA;
        this.mana = this.maxMana;
        this.damage = 10;
        this.speed = CONSTANTS.PLAYER_SPEED;
        
        // Combat
        this.weapon = WeaponType.SWORD;
        this.attackCooldown = CONSTANTS.ATTACK_COOLDOWN;
        this.lastAttack = 0;
        this.isAttacking = false;
        this.isSpecial = false;
        this.specialCooldown = CONSTANTS.SPECIAL_COOLDOWN;
        this.lastSpecial = 0;
        
        // Modifiers
        this.bleedingEdge = false;
        this.triforce = false;
        this.whirlwind = false;
        this.teleport = false;
        this.teleportDistance = 150;
        this.teleportCooldown = 5000;
        this.lastTeleport = 0;
        
        // Stats multipliers
        this.damageMultiplier = 1;
        this.healthMultiplier = 1;
        this.manaMultiplier = 1;
        
        // Pets
        this.pets = [];
        
        // Souls (for this run)
        this.souls = 0;
        
        // Active powers list
        this.activePowers = [];
        
        // Animation
        this.state = 'idle';
        this.frame = 0;
        this.frameTimer = 0;
        this.frameRate = 75; // Slow down animation (ms per frame)
        this.direction = 1;
    }
    
    applyPower(power) {
        this.activePowers.push(power.name);
        
        if (power.type === PowerUpType.WEAPON) {
            this.weapon = power.weaponType;
        } else if (power.type === PowerUpType.MODIFIER) {
            this.applyModifier(power);
        } else if (power.type === PowerUpType.ABILITY) {
            this.applyAbility(power);
        } else if (power.type === PowerUpType.PET) {
            this.applyPet(power);
        }
    }
    
    applyModifier(power) {
        if (power.name.includes('Bleeding')) {
            this.bleedingEdge = true;
        }
        
        if (power.effect === 'damage') {
            this.damageMultiplier += power.value;
        }
        if (power.effect === 'health') {
            this.healthMultiplier += power.value;
            this.maxHealth = CONSTANTS.BASE_HEALTH * this.healthMultiplier;
            this.health = this.maxHealth;
        }
        if (power.effect === 'mana') {
            this.manaMultiplier += power.value;
            this.maxMana = CONSTANTS.BASE_MANA * this.manaMultiplier;
            this.mana = this.maxMana;
        }
        if (power.effect === 'speed') {
            this.speed *= (1 + power.value);
        }
    }
    
    applyAbility(power) {
        if (power.name.includes('Whirlwind')) {
            this.whirlwind = true;
        }
        if (power.name.includes('Triforce')) {
            this.triforce = true;
        }
        if (power.name.includes('Teleport')) {
            this.teleport = true;
        }
    }
    
    applyPet(power) {
        this.pets.push(new Pet(power.petType, this.damage, power.range));
    }
    
    update(deltaTime, input, arenaWidth, arenaHeight, enemies) {
        // Mana regeneration
        this.mana = Math.min(this.maxMana, this.mana + CONSTANTS.MANA_REGEN * deltaTime / 16);
        
        // Handle movement
        const move = input.getMovementVector();
        
        // Track previous state to detect state changes
        const previousState = this.state;
        
        // Update facing direction based on movement
        if (move.x > 0) this.direction = 1;
        if (move.x < 0) this.direction = -1;
        
        // Determine animation state
        if (this.isSpecial) {
            this.state = 'attack1';
        } else if (this.isAttacking) {
            this.state = 'attack2';
        } else if (move.x !== 0 || move.y !== 0) {
            this.state = 'walk';
        } else {
            this.state = 'idle';
        }
        
        // Reset frame counter when state changes to ensure animation starts from frame 0
        if (this.state !== previousState) {
            this.frame = 0;
            this.frameTimer = 0;
        }
        
        // Update animation frame
        this.frameTimer += deltaTime;
        if (this.frameTimer >= this.frameRate) {
            this.frameTimer = 0;
            this.frame++;
        }
        
        // Reset attack flag after animation duration (longer for visible animation)
        if (this.isAttacking && Date.now() - this.lastAttack > 500) {
            this.isAttacking = false;
        }
        
        // Handle teleport
        if (this.teleport && input.isDown('KeyT')) {
            const now = Date.now();
            if (now - this.lastTeleport >= this.teleportCooldown) {
                if (move.x !== 0 || move.y !== 0) {
                    this.x += move.x * this.teleportDistance;
                    this.y += move.y * this.teleportDistance;
                    this.lastTeleport = now;
                    return { teleport: true, x: this.x, y: this.y };
                }
            }
        }
        
        // Move player
        if (move.x !== 0 || move.y !== 0) {
            this.x += move.x * this.speed;
            this.y += move.y * this.speed;
        }
        
        // Keep player in arena bounds
        this.x = Math.max(this.radius, Math.min(arenaWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(arenaHeight - this.radius, this.y));
        
        // Update pets
        let petProjectiles = [];
        this.pets.forEach(pet => {
            pet.follow(this.x, this.y);
            const result = pet.update(deltaTime, enemies);
            if (result.projectile) {
                petProjectiles.push(result.projectile);
            }
        });
        
        // Attack
        const now = Date.now();
        let attackProjectile = null;
        let isWhirlwind = false;
        
        if (input.isDown('Space')) {
            // Check for special (held)
            if (this.whirlwind && input.heldSpace > 100) {
                if (now - this.lastSpecial >= this.specialCooldown && this.mana >= 20) {
                    this.lastSpecial = now;
                    this.mana -= 20;
                    isWhirlwind = true;
                }
            } else {
                // Normal attack
                if (now - this.lastAttack >= this.attackCooldown) {
                    this.lastAttack = now;
                    this.isAttacking = true;
                    
                    if (this.weapon === WeaponType.BOW) {
                        // Shoot towards mouse (in isometric view, simplify to direction of movement)
                        const targetX = this.x + move.x * 100;
                        const targetY = this.y + move.y * 100;
                        
                        if (this.triforce) {
                            attackProjectile = [
                                new Projectile(this.x, this.y, targetX, targetY, this.damage * this.damageMultiplier, this.weapon, 'player'),
                                new Projectile(this.x, this.y, targetX + 30, targetY, this.damage * this.damageMultiplier, this.weapon, 'player'),
                                new Projectile(this.x, this.y, targetX - 30, targetY, this.damage * this.damageMultiplier, this.weapon, 'player')
                            ];
                        } else {
                            attackProjectile = new Projectile(this.x, this.y, targetX, targetY, this.damage * this.damageMultiplier, this.weapon, 'player');
                        }
                    } else {
                        // Melee weapons hit nearby enemies
                        isWhirlwind = false;
                    }
                }
            }
        }
        
        this.isSpecial = isWhirlwind;
        
        return {
            projectiles: attackProjectile ? (Array.isArray(attackProjectile) ? attackProjectile : [attackProjectile]) : [],
            petProjectiles,
            isWhirlwind,
            move: { x: move.x, y: move.y }
        };
    }
    
    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }
    
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }
    
    draw(ctx, playerX, playerY, centerX, centerY) {
        const screenPos = IsoMath.isoToScreen(this.x, this.y, playerX, playerY, centerX, centerY);
        
        // Get sprite from sprite manager
        const spriteManager = window.gameInstance.spriteManager;
        const sprite = spriteManager ? spriteManager.getSprite('player', this.state) : null;
        
        // Whirlwind effect
        if (this.isSpecial) {
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, 60, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(233, 69, 96, 0.3)';
            ctx.fill();
        }
        
        // Teleport effect
        if (this.teleporting) {
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, 40, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(33, 150, 243, 0.5)';
            ctx.fill();
        }
        
        // Shadow
        ctx.beginPath();
        ctx.ellipse(screenPos.x, screenPos.y + 30, 25, 10, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();
        
        // Draw sprite if loaded, otherwise fall back to circle
        if (sprite && sprite.complete && sprite.naturalHeight !== 0) {
            const spriteWidth = 100;
            const spriteHeight = 100;
            const scale = 3.6; // Scale down sprite to fit game
            
            // Determine which frame to show based on animation
            let frameX = 0;
            let frameWidth = 100;
            
            // For multi-frame sprites, we'll show different frames
            if (this.state === 'walk' || this.state === 'attack1' || this.state === 'attack2') {
                const frameCount = Math.floor(sprite.naturalWidth / frameWidth);
                if (frameCount > 1) {
                    frameX = (this.frame % frameCount) * frameWidth;
                }
            }
            
            // Draw the sprite
            ctx.save();
            ctx.translate(screenPos.x, screenPos.y - 10);
            ctx.scale(this.direction * scale, scale);
            ctx.drawImage(sprite, frameX, 0, frameWidth, spriteHeight, -frameWidth/2, -spriteHeight/2, frameWidth, spriteHeight);
            ctx.restore();
        } else {
            // Fallback to circle if sprite not loaded
            ctx.fill();
            ctx.strokeStyle = '#c23658';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Weapon indicator
            let weaponIcon;
            switch(this.weapon) {
                case WeaponType.SWORD: weaponIcon = '⚔️'; break;
                case WeaponType.AXE: weaponIcon = '🪓'; break;
                case WeaponType.BOW: weaponIcon = '🏹'; break;
                case WeaponType.POLEARM: weaponIcon = '🎯'; break;
                case WeaponType.DAGGER: weaponIcon = '🗡️'; break;
                default: weaponIcon = '⚔️';
            }
            
            ctx.fillStyle = '#fff';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(weaponIcon, screenPos.x, screenPos.y - 30);
        }
        
        // Draw pets
        this.pets.forEach(pet => pet.draw(ctx, playerX, playerY, centerX, centerY));
        
        // Teleport cooldown indicator
        if (this.teleport) {
            const now = Date.now();
            const cooldownRemaining = this.teleportCooldown - (now - this.lastTeleport);
            if (cooldownRemaining > 0) {
                ctx.fillStyle = 'rgba(33, 150, 243, 0.7)';
                ctx.fillRect(screenPos.x - 20, screenPos.y + 20, 40, 5);
                ctx.fillStyle = '#333';
                ctx.fillRect(screenPos.x - 20, screenPos.y + 20, 40 * (cooldownRemaining / this.teleportCooldown), 5);
            }
        }
    }
    
    isDead() {
        return this.health <= 0;
    }
}

// Game Main Class
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CONSTANTS.CANVAS_WIDTH;
        this.canvas.height = CONSTANTS.CANVAS_HEIGHT;
        
        this.input = new InputHandler();
        this.spriteManager = new SpriteManager();
        this.state = GameState.START;
        this.wave = 1;
        this.lastTime = 0;
        
        // Meta progression
        this.totalSouls = parseInt(localStorage.getItem('vengefulBlade_souls') || '0');
        this.ascensionLevel = parseInt(localStorage.getItem('vengefulBlade_level') || '1');
        this.permanentUpgrades = JSON.parse(localStorage.getItem('vengefulBlade_upgrades') || '[]');
        
        this.initUI();
        this.setupEventListeners();
        
        // Store global reference for sprite access
        window.gameInstance = this;
    }
    
    initUI() {
        // Initialize all UI elements
        this.screens = {
            start: document.getElementById('start-screen'),
            meta: document.getElementById('meta-screen'),
            game: document.getElementById('game-ui'),
            powerup: document.getElementById('powerup-screen'),
            death: document.getElementById('death-screen'),
            victory: document.getElementById('victory-screen')
        };
    }
    
    setupEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => {
            this.showScreen('meta');
            this.renderMetaUpgrades();
        });
        
        document.getElementById('continue-btn').addEventListener('click', () => {
            this.startRun();
        });
        
        document.getElementById('respawn-btn').addEventListener('click', () => {
            this.showScreen('meta');
            this.renderMetaUpgrades();
        });
        
        document.getElementById('next-run-btn').addEventListener('click', () => {
            this.showScreen('meta');
            this.renderMetaUpgrades();
        });
    }
    
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.add('hidden');
            if (screen.id === 'powers-display') {
                screen.classList.add('hidden');
            }
        });
        
        this.screens[screenName].classList.remove('hidden');
        
        if (screenName === 'game') {
            document.getElementById('powers-display').classList.remove('hidden');
        }
    }
    
    startRun() {
        // Apply permanent upgrades
        const upgrades = this.permanentUpgrades;
        const damageBonus = upgrades.includes('damagePerk') ? 0.1 : 0;
        const healthBonus = upgrades.includes('healthPerk') ? 0.1 : 0;
        
        this.player = new Player(CONSTANTS.ARENA_WIDTH / 2, CONSTANTS.ARENA_HEIGHT / 2);
        this.player.damage += this.player.damage * damageBonus;
        this.player.maxHealth += this.player.maxHealth * healthBonus;
        this.player.health = this.player.maxHealth;
        
        this.enemies = [];
        this.enemiesToSpawn = 0;
        this.projectiles = [];
        this.damageNumbers = [];
        this.arenaPickups = [];
        this.wave = 1;
        this.player.souls = 0;
        this.state = GameState.PLAYING;
        
        this.startWave();
        this.showScreen('game');
        
        // Start game loop
        this.lastTime = Date.now();
        requestAnimationFrame((t) => this.gameLoop(t));
        
        // Start pickup spawning
        this.pickupSpawnInterval = setInterval(() => {
            if (this.state === GameState.PLAYING && this.arenaPickups.length < 5) {
                this.spawnArenaPickup();
            }
        }, CONSTANTS.ARENA_PICKUP_SPAWN_RATE);
        
        this.updateHUD();
    }
    
    startWave() {
        // Clear old enemies
        this.enemies = [];
        
        // Spawn enemies based on wave
        const enemyCount = 3 + this.wave * 2;
        this.enemiesToSpawn = enemyCount;
        const spawnInterval = 1000;
        
        for (let i = 0; i < enemyCount; i++) {
            setTimeout(() => {
                if (this.state !== GameState.PLAYING) return;
                
                const type = this.getEnemyType();
                const { x, y } = this.getRandomSpawnPosition();
                this.enemies.push(new Enemy(x, y, type, this.wave));
                this.enemiesToSpawn--;
            }, i * spawnInterval);
        }
        
        // Update wave display
        document.getElementById('wave-num').textContent = this.wave;
        this.updateHUD();
    }
    
    getEnemyType() {
        if (this.wave === 10) return 'zeus';
        
        const rand = Math.random();
        const wave = this.wave;
        
        if (wave >= 8 && rand < 0.3) return 'tank';
        if (wave >= 5 && rand < 0.4) return 'archer';
        if (wave >= 3 && rand < 0.5) return 'fast';
        return 'soldier';
    }
    
    getRandomSpawnPosition() {
        // Spawn at arena edges
        const edge = Math.floor(Math.random() * 4);
        const margin = 100;
        const width = CONSTANTS.ARENA_WIDTH;
        const height = CONSTANTS.ARENA_HEIGHT;
        
        switch(edge) {
            case 0: return { x: margin, y: margin + Math.random() * (height - margin * 2) };
            case 1: return { x: width - margin, y: margin + Math.random() * (height - margin * 2) };
            case 2: return { x: margin + Math.random() * (width - margin * 2), y: margin };
            case 3: return { x: margin + Math.random() * (width - margin * 2), y: height - margin };
            default: return { x: width / 2, y: height / 2 };
        }
    }
    
    spawnArenaPickup() {
        const { x, y } = this.getRandomSpawnPosition();
        const types = ['health', 'mana', 'damage', 'speed'];
        const type = types[Math.floor(Math.random() * types.length)];
        const value = 1 + Math.floor(this.wave / 3);
        
        this.arenaPickups.push(new ArenaPickup(x, y, type, value));
    }
    
    gameLoop(currentTime) {
        if (this.state !== GameState.PLAYING) return;
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.draw();
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    update(deltaTime) {
        const arenaWidth = CONSTANTS.ARENA_WIDTH;
        const arenaHeight = CONSTANTS.ARENA_HEIGHT;
        
        // Update player
        const playerResult = this.player.update(deltaTime, this.input, arenaWidth, arenaHeight, this.enemies);
        this.player.teleporting = playerResult.teleport;
        
        // Add player projectiles
        this.projectiles.push(...(playerResult.petProjectiles || []));
        this.projectiles.push(...(playerResult.projectiles || []));
        
        // Check melee attacks
        if (playerResult.isWhirlwind) {
            this.checkWhirlwind(this.player, this.enemies, this.player.damage * this.damageMultiplier);
        } else {
            // Check if Space is held for melee
            if (this.input.isDown('Space') && this.player.weapon !== WeaponType.BOW) {
                this.checkMeleeAttack(this.player, this.enemies, this.player.damage * this.player.damageMultiplier);
            }
        }
        
        // Update projectiles
        this.projectiles.forEach(proj => proj.update());
        
        // Check projectile collisions
        this.projectiles.forEach(proj => {
            if (proj.hitted) return;
            
            const targets = proj.owner === 'player' ? this.enemies : [this.player];
            
            targets.forEach(target => {
                const dx = proj.x - target.x;
                const dy = proj.y - target.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < target.radius + proj.radius) {
                    proj.hitted = true;
                    
                    if (target instanceof Enemy) {
                        const killed = target.takeDamage(proj.damage);
                        this.createDamageNumber(proj.x, proj.y, proj.damage);
                        
                        if (target.type === 'bleeding' && this.player.bleedingEdge) {
                            target.addStatusEffect(new BleedingEffect(5000, Math.floor(proj.damage * 0.1)));
                        }
                        
                        if (killed) {
                            this.player.souls += target.souls;
                        }
                    } else if (target === this.player) {
                        const killed = this.player.takeDamage(proj.damage);
                        this.createDamageNumber(proj.x, proj.y, proj.damage, 'enemy');
                        
                        if (killed) {
                            this.handleDeath();
                        }
                    }
                }
            });
        });
        
        // Update enemies
        this.enemies.forEach(enemy => {
            const result = enemy.update(deltaTime, this.player, this.enemies);
            if (result.projectile) {
                this.projectiles.push(result.projectile);
            }
            
            // Check melee collision with player
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < enemy.radius + this.player.radius) {
                const killed = this.player.takeDamage(enemy.damage * 0.1);
                if (killed) {
                    this.handleDeath();
                }
            }
        });
        
        // Update damage numbers
        this.damageNumbers.forEach(dn => dn.update());
        
        // Update arena pickups
        this.arenaPickups.forEach(pickup => pickup.update(deltaTime));
        
        // Check pickup collection
        this.arenaPickups.forEach(pickup => {
            if (pickup.distanceTo(this.player) < pickup.radius + this.player.radius) {
                this.collectPickup(pickup);
            }
        });
        
        // Cleanup
        this.projectiles = this.projectiles.filter(p => !p.isDead());
        this.damageNumbers = this.damageNumbers.filter(dn => !dn.isDead());
        this.arenaPickups = this.arenaPickups.filter(p => p !== null);
        this.enemies = this.enemies.filter(e => !e.isDead());
        
        // Check wave completion - must defeat all enemies and no more spawning
        if (this.enemies.length === 0 && this.enemiesToSpawn === 0) {
            this.waveComplete();
        }
        
        // Update enemy counter
        document.getElementById('enemy-count').textContent = this.enemies.length;
        document.getElementById('run-souls').textContent = this.player.souls;
    }
    
    checkMeleeAttack(player, enemies, damage) {
        const range = 60;
        enemies.forEach(enemy => {
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < range) {
                const killed = enemy.takeDamage(damage);
                this.createDamageNumber(enemy.x, enemy.y, damage);
                
                if (player.bleedingEdge) {
                    enemy.addStatusEffect(new BleedingEffect(5000, Math.floor(damage * 0.1)));
                }
                
                if (killed) {
                    player.souls += enemy.souls;
                }
            }
        });
    }
    
    checkWhirlwind(player, enemies, damage) {
        const range = 80;
        enemies.forEach(enemy => {
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < range) {
                const killed = enemy.takeDamage(damage);
                this.createDamageNumber(enemy.x, enemy.y, damage);
                
                if (player.bleedingEdge) {
                    enemy.addStatusEffect(new BleedingEffect(5000, Math.floor(damage * 0.1)));
                }
                
                if (killed) {
                    player.souls += enemy.souls;
                }
            }
        });
    }
    
    createDamageNumber(x, y, amount) {
        this.damageNumbers.push(new DamageNumber(x, y, amount));
    }
    
    collectPickup(pickup) {
        const index = this.arenaPickups.indexOf(pickup);
        if (index !== -1) {
            this.arenaPickups.splice(index, 1);
            
            switch(pickup.type) {
                case 'health':
                    this.player.heal(pickup.value * 10);
                    break;
                case 'mana':
                    this.player.mana = Math.min(this.player.maxMana, this.player.mana + pickup.value * 10);
                    break;
                case 'damage':
                    this.player.damageMultiplier += pickup.value * 0.05;
                    break;
                case 'speed':
                    this.player.speed *= (1 + pickup.value * 0.02);
                    break;
            }
            this.updateHUD();
        }
    }
    
    draw() {
        const ctx = this.ctx;
        const centerX = CONSTANTS.CANVAS_WIDTH / 2;
        const centerY = CONSTANTS.CANVAS_HEIGHT / 2;
        
        // Clear canvas
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, CONSTANTS.CANVAS_WIDTH, CONSTANTS.CANVAS_HEIGHT);
        
        // Draw arena background
        this.drawArena(this.player.x, this.player.y, centerX, centerY);
        
        // Sort all entities by y position for proper depth
        const entities = [
            { type: 'player', obj: this.player, depth: this.player.y },
            ...this.enemies.map(e => ({ type: 'enemy', obj: e, depth: e.y })),
            ...this.arenaPickups.map(p => ({ type: 'pickup', obj: p, depth: p.y }))
        ];
        
        entities.sort((a, b) => a.depth - b.depth);
        
        entities.forEach(entity => {
            if (entity.type === 'player') {
                entity.obj.draw(ctx, this.player.x, this.player.y, centerX, centerY);
            } else if (entity.type === 'enemy') {
                entity.obj.draw(ctx, this.player.x, this.player.y, centerX, centerY);
            } else if (entity.type === 'pickup') {
                entity.obj.draw(ctx, this.player.x, this.player.y, centerX, centerY);
            }
        });
        
        // Draw projectiles
        this.projectiles.forEach(proj => proj.draw(ctx, this.player.x, this.player.y, centerX, centerY));
        
        // Draw damage numbers
        this.damageNumbers.forEach(dn => dn.draw(ctx, this.player.x, this.player.y, centerX, centerY));
        
        // Draw arena border
        this.drawArenaBorder(this.player.x, this.player.y, centerX, centerY);
    }
    
    drawArena(playerX, playerY, centerX, centerY) {
        const ctx = this.ctx;
        const width = CONSTANTS.ARENA_WIDTH;
        const height = CONSTANTS.ARENA_HEIGHT;
        
        // Convert arena corners to screen space
        const tl = IsoMath.isoToScreen(0, 0, playerX, playerY, centerX, centerY);
        const tr = IsoMath.isoToScreen(width, 0, playerX, playerY, centerX, centerY);
        const bl = IsoMath.isoToScreen(0, height, playerX, playerY, centerX, centerY);
        const br = IsoMath.isoToScreen(width, height, playerX, playerY, centerX, centerY);
        
        // Draw arena floor
        ctx.fillStyle = '#2c1810';
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y);
        ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.closePath();
        ctx.fill();
        
        // Draw grid
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        
        for (let x = 0; x <= width; x += CONSTANTS.TILE_SIZE) {
            const pos1 = IsoMath.isoToScreen(x, 0, playerX, playerY, centerX, centerY);
            const pos2 = IsoMath.isoToScreen(x, height, playerX, playerY, centerX, centerY);
            ctx.beginPath();
            ctx.moveTo(pos1.x, pos1.y);
            ctx.lineTo(pos2.x, pos2.y);
            ctx.stroke();
        }
        
        for (let y = 0; y <= height; y += CONSTANTS.TILE_SIZE) {
            const pos1 = IsoMath.isoToScreen(0, y, playerX, playerY, centerX, centerY);
            const pos2 = IsoMath.isoToScreen(width, y, playerX, playerY, centerX, centerY);
            ctx.beginPath();
            ctx.moveTo(pos1.x, pos1.y);
            ctx.lineTo(pos2.x, pos2.y);
            ctx.stroke();
        }
    }
    
    drawArenaBorder(playerX, playerY, centerX, centerY) {
        const ctx = this.ctx;
        const width = CONSTANTS.ARENA_WIDTH;
        const height = CONSTANTS.ARENA_HEIGHT;
        
        const tl = IsoMath.isoToScreen(0, 0, playerX, playerY, centerX, centerY);
        const tr = IsoMath.isoToScreen(width, 0, playerX, playerY, centerX, centerY);
        const bl = IsoMath.isoToScreen(0, height, playerX, playerY, centerX, centerY);
        const br = IsoMath.isoToScreen(width, height, playerX, playerY, centerX, centerY);
        
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y);
        ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.closePath();
        ctx.stroke();
    }
    
    waveComplete() {
        if (this.wave === CONSTANTS.MAX_WAVES) {
            this.handleVictory();
            return;
        }
        
        this.enemiesToSpawn = 0;
        this.state = GameState.POWERUP_SELECTION;
        clearInterval(this.pickupSpawnInterval);
        
        const powerups = this.generatePowerUpOptions();
        this.renderPowerUpSelection(powerups);
        this.showScreen('powerup');
    }
    
    generatePowerUpOptions() {
        const allPowerups = POWERUPS;
        const selected = [];
        
        while (selected.length < 3 && selected.length < allPowerups.length) {
            const randomPowerup = allPowerups[Math.floor(Math.random() * allPowerups.length)];
            if (!selected.includes(randomPowerup)) {
                selected.push(randomPowerup);
            }
        }
        
        return selected;
    }
    
    renderPowerUpSelection(powerups) {
        const grid = document.getElementById('powerup-grid');
        grid.innerHTML = '';
        
        powerups.forEach(powerup => {
            const card = document.createElement('div');
            card.className = `powerup-card ${powerup.type.toLowerCase()}`;
            card.innerHTML = `
                <h3>${powerup.name}</h3>
                <p>${powerup.description}</p>
                <div class="rarity">Rarity: ${powerup.rarity}</div>
            `;
            card.addEventListener('click', () => {
                this.player.applyPower(powerup);
                this.wave++;
                this.state = GameState.PLAYING;
                this.startWave();
                this.showScreen('game');
                
                this.pickupSpawnInterval = setInterval(() => {
                    if (this.state === GameState.PLAYING && this.arenaPickups.length < 5) {
                        this.spawnArenaPickup();
                    }
                }, CONSTANTS.ARENA_PICKUP_SPAWN_RATE);
                
                this.lastTime = Date.now();
                requestAnimationFrame((t) => this.gameLoop(t));
                
                this.updatePowersList();
            });
            grid.appendChild(card);
        });
    }
    
    updatePowersList() {
        const list = document.getElementById('powers-list');
        list.innerHTML = '';
        
        this.player.activePowers.forEach(power => {
            const item = document.createElement('div');
            item.className = 'power-item';
            item.textContent = power;
            list.appendChild(item);
        });
    }
    
    updateHUD() {
        const hpPct = (this.player.health / this.player.maxHealth) * 100;
        const mpPct = (this.player.mana / this.player.maxMana) * 100;
        
        document.getElementById('health-fill').style.width = `${Math.max(0, hpPct)}%`;
        document.getElementById('mana-fill').style.width = `${Math.max(0, mpPct)}%`;
        document.getElementById('health-text').textContent = `${Math.floor(this.player.health)}/${Math.floor(this.player.maxHealth)}`;
        document.getElementById('mana-text').textContent = `${Math.floor(this.player.mana)}/${Math.floor(this.player.maxMana)}`;
    }
    
    handleDeath() {
        this.state = GameState.GAME_OVER;
        clearInterval(this.pickupSpawnInterval);
        
        // Save souls
        const soulsGained = this.player.souls;
        this.totalSouls += soulsGained;
        localStorage.setItem('vengefulBlade_souls', this.totalSouls);
        
        document.getElementById('death-wave').textContent = this.wave;
        document.getElementById('death-souls').textContent = soulsGained;
        
        this.showScreen('death');
    }
    
    handleVictory() {
        this.state = GameState.VICTORY;
        clearInterval(this.pickupSpawnInterval);
        
        // Bonus souls for victory
        const soulsGained = this.player.souls + 100;
        this.totalSouls += soulsGained;
        this.ascensionLevel++;
        
        localStorage.setItem('vengefulBlade_souls', this.totalSouls);
        localStorage.setItem('vengefulBlade_level', this.ascensionLevel);
        
        document.getElementById('victory-wave').textContent = this.wave;
        document.getElementById('victory-souls').textContent = soulsGained;
        document.getElementById('victory-level').textContent = this.ascensionLevel;
        
        this.showScreen('victory');
    }
    
    renderMetaUpgrades() {
        document.getElementById('meta-souls').textContent = this.totalSouls;
        document.getElementById('meta-level').textContent = this.ascensionLevel;
        
        const upgradeGrid = document.getElementById('upgrade-grid');
        upgradeGrid.innerHTML = '';
        
        META_UPGRADES.forEach(upgrade => {
            const purchased = this.permanentUpgrades.includes(upgrade.id);
            const card = document.createElement('div');
            card.className = `upgrade-card ${purchased ? 'purchased' : ''}`;
            card.innerHTML = `
                <h3>${upgrade.name}</h3>
                <p>${upgrade.description}</p>
                <div class="cost">Cost: ${upgrade.cost} Souls</div>
            `;
            
            if (!purchased) {
                card.addEventListener('click', () => {
                    if (this.totalSouls >= upgrade.cost) {
                        this.totalSouls -= upgrade.cost;
                        this.permanentUpgrades.push(upgrade.id);
                        
                        localStorage.setItem('vengefulBlade_souls', this.totalSouls);
                        localStorage.setItem('vengefulBlade_upgrades', JSON.stringify(this.permanentUpgrades));
                        
                        document.getElementById('meta-souls').textContent = this.totalSouls;
                        this.renderMetaUpgrades();
                    }
                });
            }
            
            upgradeGrid.appendChild(card);
        });
    }
}

// Power-up Definitions
const POWERUPS = [
    {
        id: 'bleeding_edge',
        name: 'Bleeding Edge',
        description: 'Attacks apply Bleeding status effect (deals damage over time)',
        type: PowerUpType.MODIFIER,
        effect: 'bleeding',
        value: 1,
        rarity: 'Common'
    },
    {
        id: 'whirlwind',
        name: 'Whirlwind',
        description: 'Hold SPACE to spin and damage all nearby enemies (20 Mana)',
        type: PowerUpType.ABILITY,
        rarity: 'Uncommon'
    },
    {
        id: 'triforce',
        name: 'Triforce',
        description: 'Attacks hit 3 enemies instead of 1',
        type: PowerUpType.ABILITY,
        rarity: 'Rare'
    },
    {
        id: 'teleport',
        name: 'Quick Step',
        description: 'Press T to teleport forward (5s cooldown)',
        type: PowerUpType.ABILITY,
        rarity: 'Rare'
    },
    {
        id: 'pet_golem',
        name: 'Stone Golem',
        description: 'Summon a Stone Golem pet that attacks enemies',
        type: PowerUpType.PET,
        petType: 'golem',
        rarity: 'Epic'
    },
    {
        id: 'damage_5',
        name: 'Sharpness',
        description: '+5% Damage',
        type: PowerUpType.MODIFIER,
        effect: 'damage',
        value: 0.05,
        rarity: 'Common'
    },
    {
        id: 'damage_10',
        name: 'Superior Sharpness',
        description: '+10% Damage',
        type: PowerUpType.MODIFIER,
        effect: 'damage',
        value: 0.1,
        rarity: 'Uncommon'
    },
    {
        id: 'health_20',
        name: 'Vitality',
        description: '+20% Max Health',
        type: PowerUpType.MODIFIER,
        effect: 'health',
        value: 0.2,
        rarity: 'Common'
    },
    {
        id: 'mana_20',
        name: 'Mental Clarity',
        description: '+20% Max Mana',
        type: PowerUpType.MODIFIER,
        effect: 'mana',
        value: 0.2,
        rarity: 'Common'
    },
    {
        id: 'speed_10',
        name: 'Haste',
        description: '+10% Movement Speed',
        type: PowerUpType.MODIFIER,
        effect: 'speed',
        value: 0.1,
        rarity: 'Common'
    },
    {
        id: 'axe',
        name: 'War Axe',
        description: 'Axe: Higher damage, slower attack speed',
        type: PowerUpType.WEAPON,
        weaponType: WeaponType.AXE,
        rarity: 'Common'
    },
    {
        id: 'bow',
        name: 'Longbow',
        description: 'Bow: Ranged attacks, pierces enemies',
        type: PowerUpType.WEAPON,
        weaponType: WeaponType.BOW,
        rarity: 'Common'
    },
    {
        id: 'polearm',
        name: 'Spear',
        description: 'Polearm: Long reach, moderate damage',
        type: PowerUpType.WEAPON,
        weaponType: WeaponType.POLEARM,
        rarity: 'Uncommon'
    },
    {
        id: 'dagger',
        name: 'Daggers',
        description: 'Daggers: Fast attacks, low damage',
        type: PowerUpType.WEAPON,
        weaponType: WeaponType.DAGGER,
        rarity: 'Common'
    }
];

// Meta-upgrade Definitions
const META_UPGRADES = [
    {
        id: 'damagePerk',
        name: 'Battle Hardened',
        description: '+10% Damage (permanent)',
        cost: 100,
        description: 'Increases starting damage by 10%'
    },
    {
        id: 'healthPerk',
        name: 'Sturdy Constitution',
        description: '+10% Max Health (permanent)',
        cost: 100
    },
    {
        id: 'manaPerk',
        name: 'Arcane Mind',
        description: '+10% Max Mana (permanent)',
        cost: 100
    },
    {
        id: 'speedPerk',
        name: 'Fleet Footed',
        description: '+5% Movement Speed (permanent)',
        cost: 100
    },
    {
        id: 'bleedPerk',
        name: 'Master of Blood',
        description: 'Bleeding deals 20% more damage (permanent)',
        cost: 250
    },
    {
        id: 'petPerk',
        name: 'Familiar Bond',
        description: 'Pets deal 15% more damage (permanent)',
        cost: 250
    }
];

// Initialize game
window.addEventListener('load', () => {
    window.game = new Game();
});
