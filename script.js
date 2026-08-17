'use strict';

// ============================================
// GLOBAL CONFIGURATION
// ============================================

const CONFIG = {
  MAX_INVENTORY_DISPLAY: 6,
  MAX_NOTIFICATIONS: 15,
  MAX_LIVE_NOTIFICATIONS: 15,
  NOTIFICATION_DURATION: 25000,
  LOADING_MIN_TIME: 2000,
  SPIN_DURATION: 4500,
  SPIN_MAX_SPEED: 25,
  CUBE_WIDTH: 120,
  GAP_WIDTH: 48,
  BALANCE_SYNC_INTERVAL: 30000,

  // ── Void Spin (second wheel, home-page banner) ──
  // Own knobs, not shared with the daily wheel's CONFIG values above —
  // keeps the two engines tunable independently. NOTE: these must match
  // the actual .cube/.wheel CSS (120px cube + 48px gap via `gap: 3rem`)
  // since void cubes reuse the same .cube class with no size override —
  // if these drift from the real rendered dimensions the scroll/recycle
  // math falls out of sync with the DOM and the wheel visually crushes.
  VOID_SPIN_COST: 50,          // Stars deducted the moment Spin is pressed
  VOID_SPIN_DURATION: 4500,
  VOID_SPIN_MAX_SPEED: 25,
  VOID_CUBE_WIDTH: 120,
  VOID_GAP_WIDTH: 48
};

const PRIZE_COIN_VALUES = {
  'Heart': 15,
  'Bear': 75,
  'Rose': 100,
  'Gift': 125,
  'Cake': 150,
  'Rose Bouquet': 200,
  'Ring': 300,
  'Trophy': 500,
  'Diamond': 750,
  'Calendar': 1000,

  // ── Void Spin exclusives — needed so "Convert to Coins" has a price
  // for these once they land in the inventory. Real Telegram gift IDs
  // for these three are still placeholders, see TELEGRAM_GIFT_IDS below. ──
  'Rocket': 400,
  'Star Notepad': 1250,
  'Instant Ramen': 1100
};

const RARE_GIFTS  = ['Ring', 'Trophy', 'Diamond', 'Calendar', 'Rocket', 'Star Notepad', 'Instant Ramen'];
const NFT_GIFTS   = ['Calendar', 'Star Notepad', 'Instant Ramen'];

// Static SVG icons used everywhere EXCEPT the spin wheel cubes/win-reveal
// wheel animation, which keep the Lottie JSON (that's the one place the
// motion actually matters). Every other Lottie instance — inventory grid,
// prize modal, full inventory modal, live notifications, legend icons —
// was adding up to real lag on phones, so those get lightweight static
// SVGs instead.
const GIFT_SVG_ICONS = {
  'Heart':        'assets/Heart.svg',
  'Bear':         'assets/Bear.svg',
  'Rose':         'assets/Rose.svg',
  'Gift':         'assets/Gift.svg',
  'Cake':         'assets/Cake.svg',
  'Rose Bouquet': 'assets/Flowers.svg',
  'Ring':         'assets/Ring.svg',
  'Trophy':       'assets/Trophy.svg',
  'Diamond':      'assets/Diamond.svg',
  'Calendar':     'assets/Calender.svg',

  // ── Void Spin exclusives. You'll need to actually add these three
  // SVG files to /assets — everything else in the pipeline (inventory,
  // prize modal, notifications) already looks them up by this map. ──
  'Rocket':        'assets/Rocket.svg',
  'Star Notepad':  'assets/StarNotepad.svg',
  'Instant Ramen': 'assets/InstantRamen.svg'
};

// ── REAL odds. These decide what the player actually wins. ──
const SPIN_PRIZES = [
  { id: 'coin1',           type: 'coin', value: 1,             chance: 75.00, icon: 'coin' },
  { id: 'coin5',           type: 'coin', value: 5,             chance: 6.79,  icon: 'coin' },
  { id: 'coin10',          type: 'coin', value: 10,            chance: 4.53,  icon: 'coin' },
  { id: 'coin25',          type: 'coin', value: 25,            chance: 3.61,  icon: 'coin' },
  { id: 'coin50',          type: 'coin', value: 50,            chance: 2.25,  icon: 'coin' },
  { id: 'coin100',         type: 'coin', value: 100,           chance: 1.81,  icon: 'coin' },
  { id: 'coin250',         type: 'coin', value: 250,           chance: 0.92,  icon: 'coin' },
  { id: 'coin500',         type: 'coin', value: 500,           chance: 0.44,  icon: 'coin' },
  { id: 'giftHeart',       type: 'gift', value: 'Heart',       chance: 0.92,  lottie: 'assets/giftHeart.json' },
  { id: 'giftBear',        type: 'gift', value: 'Bear',        chance: 0.92,  lottie: 'assets/giftBear.json' },
  { id: 'giftRose',        type: 'gift', value: 'Rose',        chance: 0.66,  lottie: 'assets/giftRose.json' },
  { id: 'giftGift',        type: 'gift', value: 'Gift',        chance: 0.66,  lottie: 'assets/giftGift.json' },
  { id: 'giftCake',        type: 'gift', value: 'Cake',        chance: 0.44,  lottie: 'assets/giftCake.json' },
  { id: 'giftRoseBouquet', type: 'gift', value: 'Rose Bouquet',chance: 0.44,  lottie: 'assets/giftRoseBouquet.json' },
  { id: 'giftRing',        type: 'gift', value: 'Ring',        chance: 0.22,  lottie: 'assets/giftRing.json' },
  { id: 'giftTrophy',      type: 'gift', value: 'Trophy',      chance: 0.15,  lottie: 'assets/giftTrophy.json' },
  { id: 'giftDiamond',     type: 'gift', value: 'Diamond',     chance: 0.22,  lottie: 'assets/giftDiamond.json' },
  { id: 'giftCalendar',    type: 'gift', value: 'Calendar',    chance: 0.02,  lottie: 'assets/giftCalendar.json' }
];

// ── DISPLAY-ONLY odds. Used for idle wheel + pre-reveal repaint so the
// reel *looks* more generous than it actually is. Never touches the
// real outcome — selectPrize() (using SPIN_PRIZES) still decides what
// the player wins. Same ids/values/lottie paths as SPIN_PRIZES, just
// different `chance` weighting. ──
const PREVIEW_PRIZES = [
  { id: 'coin1',           type: 'coin', value: 1,             chance: 20.00, icon: 'coin' },
  { id: 'coin5',           type: 'coin', value: 5,             chance: 12.00, icon: 'coin' },
  { id: 'coin10',          type: 'coin', value: 10,            chance: 10.00, icon: 'coin' },
  { id: 'coin25',          type: 'coin', value: 25,            chance: 8.00,  icon: 'coin' },
  { id: 'coin50',          type: 'coin', value: 50,            chance: 6.00,  icon: 'coin' },
  { id: 'coin100',         type: 'coin', value: 100,           chance: 5.00,  icon: 'coin' },
  { id: 'coin250',         type: 'coin', value: 250,           chance: 4.00,  icon: 'coin' },
  { id: 'coin500',         type: 'coin', value: 500,           chance: 3.50,  icon: 'coin' },
  { id: 'giftHeart',       type: 'gift', value: 'Heart',       chance: 6.00,  lottie: 'assets/giftHeart.json' },
  { id: 'giftBear',        type: 'gift', value: 'Bear',        chance: 6.00,  lottie: 'assets/giftBear.json' },
  { id: 'giftRose',        type: 'gift', value: 'Rose',        chance: 5.00,  lottie: 'assets/giftRose.json' },
  { id: 'giftGift',        type: 'gift', value: 'Gift',        chance: 5.00,  lottie: 'assets/giftGift.json' },
  { id: 'giftCake',        type: 'gift', value: 'Cake',        chance: 3.50,  lottie: 'assets/giftCake.json' },
  { id: 'giftRoseBouquet', type: 'gift', value: 'Rose Bouquet',chance: 3.00,  lottie: 'assets/giftRoseBouquet.json' },
  { id: 'giftRing',        type: 'gift', value: 'Ring',        chance: 1.50,  lottie: 'assets/giftRing.json' },
  { id: 'giftTrophy',      type: 'gift', value: 'Trophy',      chance: 0.80,  lottie: 'assets/giftTrophy.json' },
  { id: 'giftDiamond',     type: 'gift', value: 'Diamond',     chance: 0.60,  lottie: 'assets/giftDiamond.json' },
  { id: 'giftCalendar',    type: 'gift', value: 'Calendar',    chance: 0.10,  lottie: 'assets/giftCalendar.json' }
];

// ============================================
// VOID SPIN — second wheel, home-page banner.
// Duplicated (not merged) from SPIN_PRIZES/PREVIEW_PRIZES above:
// own ids ("void" prefix), own coin/star denominations, adds the new
// 'stars' prize type. Everything downstream (Inventory, PrizeModal,
// FullInventoryModal, LiveGiftNotifications, Leaderboard) only ever
// keys off prize.type / prize.value, so it already works for these
// without any changes there.
// ============================================

// ── REAL odds for Void Spin. Decides what the player actually wins. ──
const VOID_SPIN_PRIZES = [
  { id: 'voidCoin1',           type: 'coin',  value: 1,               chance: 65.00, icon: 'coin' },
  { id: 'voidCoin5',           type: 'coin',  value: 5,               chance: 8.00,  icon: 'coin' },
  { id: 'voidCoin10',          type: 'coin',  value: 10,              chance: 5.50,  icon: 'coin' },
  { id: 'voidCoin15',          type: 'coin',  value: 15,              chance: 4.00,  icon: 'coin' },
  { id: 'voidCoin25',          type: 'coin',  value: 25,              chance: 3.00,  icon: 'coin' },
  { id: 'voidCoin50',          type: 'coin',  value: 50,              chance: 2.00,  icon: 'coin' },
  { id: 'voidCoin100',         type: 'coin',  value: 100,             chance: 1.00,  icon: 'coin' },
  { id: 'voidCoin150',         type: 'coin',  value: 150,             chance: 0.50,  icon: 'coin' },
  { id: 'voidStars5',          type: 'stars', value: 5,               chance: 5.50,  icon: 'stars' },
  { id: 'voidStars10',         type: 'stars', value: 10,              chance: 3.00,  icon: 'stars' },
  { id: 'voidStars25',         type: 'stars', value: 25,              chance: 1.00,  icon: 'stars' },
  { id: 'voidGiftHeart',       type: 'gift',  value: 'Heart',         chance: 1.00,  lottie: 'assets/giftHeart.json' },
  { id: 'voidGiftBear',        type: 'gift',  value: 'Bear',          chance: 0.30,  lottie: 'assets/giftBear.json' },
  { id: 'voidGiftCake',        type: 'gift',  value: 'Cake',          chance: 0.15,  lottie: 'assets/giftCake.json' },
  { id: 'voidGiftRocket',      type: 'gift',  value: 'Rocket',        chance: 0.04,  lottie: 'assets/giftRocket.json' },
  { id: 'voidGiftStarNotepad', type: 'gift',  value: 'Star Notepad',  chance: 0.007, lottie: 'assets/giftStarNotepad.json' },
  { id: 'voidGiftInstantRamen',type: 'gift',  value: 'Instant Ramen', chance: 0.003, lottie: 'assets/giftInstantRamen.json' }
];

// ── DISPLAY-ONLY odds for Void Spin idle wheel + pre-reveal repaint. ──
const VOID_PREVIEW_PRIZES = [
  { id: 'voidCoin1',           type: 'coin',  value: 1,               chance: 15.00, icon: 'coin' },
  { id: 'voidCoin5',           type: 'coin',  value: 5,               chance: 10.00, icon: 'coin' },
  { id: 'voidCoin10',          type: 'coin',  value: 10,              chance: 9.00,  icon: 'coin' },
  { id: 'voidCoin15',          type: 'coin',  value: 15,              chance: 8.00,  icon: 'coin' },
  { id: 'voidCoin25',          type: 'coin',  value: 25,              chance: 7.00,  icon: 'coin' },
  { id: 'voidCoin50',          type: 'coin',  value: 50,              chance: 6.00,  icon: 'coin' },
  { id: 'voidCoin100',         type: 'coin',  value: 100,             chance: 5.00,  icon: 'coin' },
  { id: 'voidCoin150',         type: 'coin',  value: 150,             chance: 4.00,  icon: 'coin' },
  { id: 'voidStars5',          type: 'stars', value: 5,               chance: 10.00, icon: 'stars' },
  { id: 'voidStars10',         type: 'stars', value: 10,              chance: 8.00,  icon: 'stars' },
  { id: 'voidStars25',         type: 'stars', value: 25,              chance: 5.00,  icon: 'stars' },
  { id: 'voidGiftHeart',       type: 'gift',  value: 'Heart',         chance: 5.00,  lottie: 'assets/giftHeart.json' },
  { id: 'voidGiftBear',        type: 'gift',  value: 'Bear',          chance: 3.00,  lottie: 'assets/giftBear.json' },
  { id: 'voidGiftCake',        type: 'gift',  value: 'Cake',          chance: 2.50,  lottie: 'assets/giftCake.json' },
  { id: 'voidGiftRocket',      type: 'gift',  value: 'Rocket',        chance: 1.50,  lottie: 'assets/giftRocket.json' },
  { id: 'voidGiftStarNotepad', type: 'gift',  value: 'Star Notepad',  chance: 0.60,  lottie: 'assets/giftStarNotepad.json' },
  { id: 'voidGiftInstantRamen',type: 'gift',  value: 'Instant Ramen', chance: 0.40,  lottie: 'assets/giftInstantRamen.json' }
];

const VALID_PROMOCODES = {
  'WELCOME100': { coins: 100, message: 'Welcome bonus claimed!' },
  'LUCKY777':   { coins: 777, message: 'Lucky bonus activated!' },
  'FREECOINS':  { coins: 50,  message: 'Free coins added!' },
  'VOIDGIFT':   { coins: 200, message: 'Special gift redeemed!' },
  'SPIN2WIN':   { coins: 150, message: 'Spin bonus unlocked!' }
};

const TELEGRAM_GIFT_IDS = {
  'Heart':       'd01a849b9ef17642d8f4',
  'Bear':        'd01a849bfc7f7938aa86',
  'Rose':        'd01a849b9e2c54fb0cf1',
  'Gift':        'd01a849ba490ee9e6308',
  'Cake':        'd01a849bb0e2c9f42a0a',
  'Rose Bouquet':'d01a849b8c2f0cd6de99',
  'Ring':        'd01a849b9c4de7d48c4e',
  'Trophy':      'd01a849b8de88d0e703d',
  'Diamond':     'd01a849b92670e79adce',
  'Calendar':    'd01a849b95b3da4d0acb',

  // ── PLACEHOLDERS — not real Telegram gift ids. "Convert to Coins"
  // works fine on these immediately (doesn't touch this map at all),
  // but "Claim Prize" will hit the backend with a bogus id and fail
  // until you swap these for the real ones. ──
  'Rocket':        'PLACEHOLDER_ROCKET_ID',
  'Star Notepad':  'PLACEHOLDER_STARNOTEPAD_ID',
  'Instant Ramen': 'PLACEHOLDER_INSTANTRAMEN_ID'
};

// ============================================
// DEPOSIT CONFIGURATION
// ============================================

const DEPOSIT_PACKAGES = {
  stars: [
    { id: 'package_tiny',         amount: 1,     stars: 1,     popular: false },
    { id: 'package_mini',         amount: 25,    stars: 25,    popular: false },
    { id: 'package_small',        amount: 50,    stars: 50,    popular: false },
    { id: 'package_bit',          amount: 75,    stars: 75,    popular: true  },
    { id: 'package_medium',       amount: 100,   stars: 100,   popular: false },
    { id: 'package_biggermedium', amount: 250,   stars: 250,   popular: false },
    { id: 'package_moderate',     amount: 500,   stars: 500,   popular: false },
    { id: 'package_large',        amount: 750,   stars: 750,   popular: false },
    { id: 'package_superlarge',   amount: 1000,  stars: 1000,  popular: false },
    { id: 'package_huge',         amount: 2500,  stars: 2500,  popular: false },
    { id: 'package_xlsize',       amount: 5000,  stars: 5000,  popular: true  },
    { id: 'package_mega',         amount: 7500,  stars: 7500,  popular: false },
    { id: 'package_giant',        amount: 10000, stars: 10000, popular: false }
  ]
};

// ============================================
// GLOBAL STATE
// ============================================

const STATE = {
  tg: window.Telegram?.WebApp || null,
  userData: null,
  currentPage: 'home',
  userCoins: 0,
  userStars: 0,
  inventoryItems: [],
  notifications: [],
  liveGiftNotifications: [],
  isSpinning: false,
  currentWinningPrize: null,
  scrollPosition: 0,
  scrollSpeed: 1,
  animationFrameId: null,
  lottieInstances: new Map(),
  lastScaleUpdate: 0,

  // ── Void Spin — entirely separate animation/spin state so the two
  // wheels can never stomp on each other mid-spin. ──
  voidIsSpinning: false,
  voidCurrentWinningPrize: null,
  voidScrollPosition: 0,
  voidScrollSpeed: 1,
  voidAnimationFrameId: null,
  voidLottieInstances: new Map(),
  voidLastScaleUpdate: 0,

  currentLeaderboardTab: 'coins',
  leaderboardData: {
    coins: [
      { id: 1, name: 'CryptoKing',    username: 'cryptoking',    coins: 15420, avatar: null },
      { id: 2, name: 'MoonWalker',    username: 'moonwalker',    coins: 12850, avatar: null },
      { id: 3, name: 'DiamondHands',  username: 'diamondhands',  coins: 10370, avatar: null },
      { id: 4, name: 'TokenMaster',   username: 'tokenmaster',   coins: 8920,  avatar: null },
      { id: 5, name: 'BlockChainer',  username: 'blockchainer',  coins: 7540,  avatar: null },
      { id: 6, name: 'NFT Hunter',    username: 'nfthunter',     coins: 6230,  avatar: null },
      { id: 7, name: 'Satoshi Fan',   username: 'satoshifan',    coins: 5180,  avatar: null },
      { id: 8, name: 'Whale Watcher', username: 'whalewatcher',  coins: 4560,  avatar: null }
    ],
    gifts: [
      { id: 1, name: 'GiftCollector',  username: 'giftcollector',  gifts: 87, avatar: null },
      { id: 2, name: 'Present Pro',    username: 'presentpro',     gifts: 65, avatar: null },
      { id: 3, name: 'Lucky Winner',   username: 'luckywinner',    gifts: 52, avatar: null },
      { id: 4, name: 'Spin Master',    username: 'spinmaster',     gifts: 43, avatar: null },
      { id: 5, name: 'Fortune Finder', username: 'fortunefinder',  gifts: 38, avatar: null },
      { id: 6, name: 'Reward Hunter',  username: 'rewardhunter',   gifts: 31, avatar: null },
      { id: 7, name: 'Loot Lord',      username: 'lootlord',       gifts: 27, avatar: null },
      { id: 8, name: 'Prize Collector',username: 'prizecollector', gifts: 19, avatar: null }
    ],
    stars: [
      { id: 1, name: 'StarBaron',     username: 'starbaron',     stars: 9800,  avatar: null },
      { id: 2, name: 'GalaxyBrain',   username: 'galaxybrain',   stars: 7650,  avatar: null },
      { id: 3, name: 'NebulaMike',    username: 'nebulamike',    stars: 5430,  avatar: null },
      { id: 4, name: 'CosmosQueen',   username: 'cosmosqueen',   stars: 4210,  avatar: null },
      { id: 5, name: 'AstroAlex',     username: 'astroalex',     stars: 3180,  avatar: null },
      { id: 6, name: 'OrbitalJay',    username: 'orbitaljay',    stars: 2560,  avatar: null },
      { id: 7, name: 'StarDrifter',   username: 'stardrifter',   stars: 1820,  avatar: null },
      { id: 8, name: 'PulsarPete',    username: 'pulsarpete',    stars: 1100,  avatar: null }
    ]
  },
  settings: {
    language: 'en',
    pushNotifications: true,
    soundEffects: true,
    prizeAlerts: true,
    animationsEnabled: true,
    confettiEffects: true,
    showInLeaderboard: true,
    shareStats: true
  },
  currentDepositTab: 'stars',
  currentModalPrize: null,
  isClaimingPrize: false,
  currentFilter: 'all',
  redeemedCodes: [],
  isSyncing: false,
  lastBalanceSync: null,
  syncIntervalId: null
};

// ============================================
// TRANSLATIONS
// ============================================

const TRANSLATIONS = {
  en: {
    settings: 'Settings',
    customizeExperience: 'Customize your experience',
    promocode: 'Promocode',
    language: 'Language',
    appLanguage: 'App Language',
    chooseLanguage: 'Choose your preferred language',
    notifications: 'Notifications',
    display: 'Display',
    privacy: 'Privacy',
    home: 'Home',
    leaderboard: 'Leaderboard',
    deposit: 'Deposit',
    dailyGift: 'Daily',
    bagOfLoot: 'Bag of Loot!',
    dailyGiftSubtitle: 'Daily gift from us!',
    inventory: 'Inventory',
    yourCollectedItems: 'Your collected items',
    viewAllItems: 'View All Items',
    contact: 'Contact',
    topPlayers: 'Top Players',
    coins: 'Coins',
    gifts: 'Gifts',
    yourRank: 'Your Rank',
    dangerZone: 'Danger Zone'
  },
  ru: {
    settings: 'Настройки',
    customizeExperience: 'Настройте свой опыт',
    home: 'Главная',
    leaderboard: 'Таблица лидеров',
    deposit: 'Депозит',
    coins: 'Монеты',
    gifts: 'Подарки',
    dangerZone: 'Опасная зона'
  },
  es: {
    settings: 'Configuración',
    customizeExperience: 'Personaliza tu experiencia',
    home: 'Inicio',
    leaderboard: 'Clasificación',
    deposit: 'Depósito',
    coins: 'Monedas',
    gifts: 'Regalos',
    dangerZone: 'Zona de peligro'
  }
};

const LANGUAGE_NAMES = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  zh: '中文'
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const Utils = {
  generatePrizeId() {
    const four  = Math.floor(1000 + Math.random() * 9000);
    const two   = Math.floor(10 + Math.random() * 90);
    const three = Array.from({ length: 3 }, () =>
      String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('');
    return `${four}-${two}-${three}`;
  },

  t(key) {
    const lang = STATE.settings.language;
    return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
  },

  createErrorIcon() {
    const ns  = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.style.color = '#ef4444';
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', '10');
    const l1 = document.createElementNS(ns, 'line');
    l1.setAttribute('x1','15'); l1.setAttribute('y1','9'); l1.setAttribute('x2','9'); l1.setAttribute('y2','15');
    const l2 = document.createElementNS(ns, 'line');
    l2.setAttribute('x1','9'); l2.setAttribute('y1','9'); l2.setAttribute('x2','15'); l2.setAttribute('y2','15');
    svg.append(circle, l1, l2);
    return svg;
  },

  setVH() {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  },

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);
      background:${type === 'success' ? 'rgba(16,185,129,0.92)' : 'rgba(239,68,68,0.92)'};
      color:#fff;padding:.7rem 1.5rem;border-radius:50px;font-weight:600;
      font-size:.88rem;z-index:10000;opacity:0;transition:opacity .3s ease;
      font-family:'Manrope',sans-serif;white-space:nowrap;
    `;
    document.body.appendChild(toast);
    void toast.offsetHeight;
    toast.style.opacity = '1';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 2200);
  }
};

// ============================================
// STATUS CHECK — remote app status (production /
// maintenance). Fail-open: if the check itself
// fails for any reason (network down, bad JSON,
// slow response), we treat it as production so a
// broken status endpoint never blocks a working app.
// ============================================

const STATUS_CONFIG = {
  URL: 'https://raw.githubusercontent.com/IMAGE002/Build1/main/status.json',
  TIMEOUT_MS: 4000
};

const StatusCheck = {
  async fetchStatus() {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), STATUS_CONFIG.TIMEOUT_MS);
      const res = await fetch(`${STATUS_CONFIG.URL}?t=${Date.now()}`, {
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timer);
      if (!res.ok) return { status: 'production' };
      const data = await res.json();
      const allowed = ['production', 'maintenance'];
      if (!allowed.includes(data.status)) return { status: 'production' };
      return data;
    } catch {
      return { status: 'production' };
    }
  }
};

// ============================================
// BACKEND / CLOUD STORAGE
// ============================================

const BackendAPI = {
  isCloudStorageAvailable() {
    return !!(STATE.tg?.CloudStorage?.getItem);
  },

  // ── Generic helpers ──

  async _cloudGet(key, fallback) {
    if (this.isCloudStorageAvailable()) {
      return new Promise((resolve) => {
        STATE.tg.CloudStorage.getItem(key, (err, val) => {
          if (err) { const fb = localStorage.getItem(key); resolve(fb ? parseInt(fb, 10) : fallback); }
          else      { resolve(val ? parseInt(val, 10) : fallback); }
        });
      });
    }
    const saved = localStorage.getItem(key);
    return saved ? parseInt(saved, 10) : fallback;
  },

  async _cloudSet(key, value) {
    let ok = false;
    if (this.isCloudStorageAvailable()) {
      ok = await new Promise((resolve) => {
        STATE.tg.CloudStorage.setItem(key, String(value), (err, success) => resolve(!err && success));
      });
    }
    try { localStorage.setItem(key, String(value)); return true; } catch { return ok; }
  },

  // ── Coins ──

  async getUserCoins()   { return this._cloudGet('userCoins', STATE.userCoins); },
  async saveUserCoins(v) { return this._cloudSet('userCoins', v); },

  // ── Stars ──

  async getUserStars()   { return this._cloudGet('userStars', STATE.userStars); },
  async saveUserStars(v) { return this._cloudSet('userStars', v); },

  // ── Sync both ──

  async syncBalance() {
    if (STATE.isSyncing) return;
    STATE.isSyncing = true;

    const [coins, stars] = await Promise.all([this.getUserCoins(), this.getUserStars()]);

    let changed = false;
    if (coins !== STATE.userCoins) { STATE.userCoins = coins; changed = true; }
    if (stars !== STATE.userStars) { STATE.userStars = stars; changed = true; }
    if (changed) Currency.update();

    STATE.lastBalanceSync = Date.now();
    STATE.isSyncing = false;
  },

  startPeriodicSync() {
    this.syncBalance();
    if (STATE.syncIntervalId) clearInterval(STATE.syncIntervalId);
    STATE.syncIntervalId = setInterval(() => this.syncBalance(), CONFIG.BALANCE_SYNC_INTERVAL);
  },

  stopPeriodicSync() {
    if (STATE.syncIntervalId) { clearInterval(STATE.syncIntervalId); STATE.syncIntervalId = null; }
  }
};

// ============================================
// TELEGRAM WEB APP
// ============================================

const TelegramApp = {
  init() {
    if (STATE.tg) {
      if (STATE.tg.initDataUnsafe?.user) {
        STATE.userData = STATE.tg.initDataUnsafe.user;
        this.updateUserProfile(STATE.userData);
      }
      this.applyTheme();
      STATE.tg.ready();
      STATE.tg.expand();
      BackendAPI.startPeriodicSync();

      STATE.tg.onEvent('viewportChanged', (e) => {
        if (e.isStateStable) setTimeout(() => BackendAPI.syncBalance(), 1000);
      });

      // Keep the bottom nav's safe-area padding in sync with Telegram's
      // own inset reporting (covers half-expanded / fullscreen states
      // and devices where env(safe-area-inset-bottom) alone isn't enough).
      this._applySafeArea();
      STATE.tg.onEvent('viewportChanged', () => this._applySafeArea());
      STATE.tg.onEvent('safeAreaChanged', () => this._applySafeArea());
    } else {
      this.initFallbackMode();
    }
  },

  _applySafeArea() {
    const bottom = STATE.tg?.safeAreaInset?.bottom ?? 0;
    document.documentElement.style.setProperty('--tg-safe-bottom', `${bottom}px`);
  },

  initFallbackMode() {
    this.updateUserProfile({ first_name: 'Test User', username: 'testuser', photo_url: null });
  },

  updateUserProfile(user) {
    const nameEl   = document.querySelector('.account-name');
    const userEl   = document.querySelector('.account-username');
    const avatarEl = document.querySelector('.account-avatar');

    if (nameEl) {
      nameEl.textContent = user.last_name
        ? `${user.first_name} ${user.last_name}`
        : (user.first_name || 'User');
    }
    if (userEl) {
      userEl.textContent = user.username ? `@${user.username}` : 'No username';
    }
    if (avatarEl) {
      if (user.photo_url) {
        avatarEl.style.cssText = `background-image:url(${user.photo_url});background-size:cover;background-position:center`;
      } else {
        const initials = (user.first_name?.[0] ?? 'U') + (user.last_name?.[0] ?? '');
        avatarEl.textContent = initials;
        Object.assign(avatarEl.style, { display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', fontWeight:'bold', color:'#60a5fa' });
      }
    }
  },

  applyTheme() {
    if (STATE.tg?.themeParams) {
      document.documentElement.style.setProperty('--tg-theme-bg-color',   STATE.tg.themeParams.bg_color   || '#0f172a');
      document.documentElement.style.setProperty('--tg-theme-text-color', STATE.tg.themeParams.text_color || '#ffffff');
    }
  },

  sendData(data) {
    if (STATE.tg?.sendData) {
      try { STATE.tg.sendData(JSON.stringify(data)); return true; }
      catch { return false; }
    }
    return false;
  }
};

// ============================================
// LOADING SCREEN
// ============================================

const LoadingScreen = {
  loadingAnimation: null,

  init() {
    document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    Utils.setVH();
    window.addEventListener('resize', Utils.setVH);
    window.addEventListener('orientationchange', Utils.setVH);

    if (typeof lottie !== 'undefined') {
      this.initAnimation('assets/dev_duck--@DMJ_Stickers.json');
      this.startLoading();
    } else {
      setTimeout(() => this.init(), 100);
    }
  },

  initAnimation(path) {
    const el = document.getElementById('lottie-loading-container');
    if (!el) return;
    if (this.loadingAnimation) { this.loadingAnimation.destroy(); this.loadingAnimation = null; }
    el.innerHTML = '';
    this.loadingAnimation = lottie.loadAnimation({
      container: el, renderer: 'svg', loop: true, autoplay: true, path
    });
  },

  startLoading() {
    const startTime = Date.now();
    const checkComplete = () => {
      const remaining = Math.max(0, CONFIG.LOADING_MIN_TIME - (Date.now() - startTime));
      setTimeout(() => this.hide(), remaining);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkComplete);
    } else {
      checkComplete();
    }
  },

  hide() {
    const loadingScreen = document.getElementById('loadingScreen');
    const mainContent   = document.getElementById('mainContent');
    if (!loadingScreen || !mainContent) return;
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
      mainContent.style.display  = 'block';
      setTimeout(() => {
        mainContent.classList.add('visible');
        document.body.classList.remove('no-scroll');
      }, 50);
    }, 500);
  },

  // ── Maintenance mode ──
  // Swaps the duck, hides the progress bar, rewrites the text — and
  // deliberately never calls hide(). The rest of the app (Navigation,
  // wheels, Telegram sync) is also never started for this status in
  // initializeApp(), so there's nothing half-working underneath to
  // accidentally reveal.
  showMaintenance(message) {
    document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    Utils.setVH();
    window.addEventListener('resize', Utils.setVH);
    window.addEventListener('orientationchange', Utils.setVH);

    const start = () => {
      this.initAnimation('assets/DuckyThink.json');

      const heading = document.getElementById('loadingStatusHeading');
      if (heading) { heading.textContent = 'Тех Перерыв'; heading.style.display = 'block'; }

      const barWrap = document.getElementById('loadingBarWrapper');
      if (barWrap) barWrap.style.display = 'none';

      const textEl = document.getElementById('loadingText');
      if (textEl) {
        textEl.innerHTML = message
          ? message
          : 'Исправляем и делаем лучше! Подробнее на: <a href="https://t.me/VoidGiftsOfficial" target="_blank" rel="noopener noreferrer">t.me/VoidGiftsOfficial</a>';
      }
    };

    if (typeof lottie !== 'undefined') start();
    else setTimeout(() => this.showMaintenance(message), 100);
  }
};

// ============================================
// CURRENCY
// ============================================

const Currency = {
  add(amount) {
    const oldValue = STATE.userCoins;
    const newValue = oldValue + amount;
    this.animateChange(oldValue, newValue);
    BackendAPI.saveUserCoins(newValue);
  },

  // Also used to *deduct* Stars (e.g. Void Spin's cost) — just call with
  // a negative amount. Same single code path either direction.
  addStars(amount) {
    const oldValue = STATE.userStars;
    const newValue = oldValue + amount;
    STATE.userStars = newValue;
    BackendAPI.saveUserStars(newValue);
    this.update();
  },

  animateChange(oldValue, newValue, duration = 1000) {
    const el = document.getElementById('currencyAmount');
    if (!el) return;
    const start = performance.now();
    const diff  = newValue - oldValue;
    const tick  = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.floor(oldValue + diff * eased).toLocaleString();
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        STATE.userCoins = newValue;
        el.textContent  = newValue.toLocaleString();
        Leaderboard.updateData();
      }
    };
    requestAnimationFrame(tick);
  },

  update() {
    const coinsEl = document.getElementById('currencyAmount');
    if (coinsEl) coinsEl.textContent = STATE.userCoins.toLocaleString();
    const starsEl = document.getElementById('starsAmount');
    if (starsEl) starsEl.textContent = STATE.userStars.toLocaleString();
  }
};

// ============================================
// INVENTORY
// ============================================

const Inventory = {
  add(prize) {
    const item = { ...prize, prizeId: Utils.generatePrizeId(), claimedAt: Date.now() };
    STATE.inventoryItems.push(item);
    this.updateDisplay();
    const modal = document.getElementById('fullInventoryModal');
    if (modal?.classList.contains('show')) {
      FullInventoryModal.updateStats();
      FullInventoryModal.render(STATE.currentFilter);
    }
    return item;
  },

  remove(prizeId) {
    const idx = STATE.inventoryItems.findIndex(i => i.prizeId === prizeId);
    if (idx === -1) return null;
    const removed = STATE.inventoryItems.splice(idx, 1)[0];
    this.updateDisplay();
    const modal = document.getElementById('fullInventoryModal');
    if (modal?.classList.contains('show')) {
      FullInventoryModal.updateStats();
      FullInventoryModal.render(STATE.currentFilter);
    }
    return removed;
  },

  updateDisplay() {
    const grid = document.querySelector('.inventory-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const display = STATE.inventoryItems.slice(0, CONFIG.MAX_INVENTORY_DISPLAY);
    display.forEach(item => {
      const div  = document.createElement('div');
      div.className      = 'inventory-item';
      div.dataset.prizeId = item.prizeId;
      const iconDiv = document.createElement('div');
      iconDiv.className  = 'item-icon-container';
      if (item.lottie) {
        const img = Object.assign(document.createElement('img'), {
          src: GIFT_SVG_ICONS[item.value] ?? '',
          alt: item.value
        });
        img.style.cssText = 'width:100%;height:100%;object-fit:contain';
        iconDiv.appendChild(img);
      }
      div.appendChild(iconDiv);
      div.addEventListener('click', () => PrizeModal.open(item));
      grid.appendChild(div);
    });

    const empties = CONFIG.MAX_INVENTORY_DISPLAY - display.length;
    for (let i = 0; i < empties; i++) {
      const e = document.createElement('div');
      e.className = 'inventory-item empty';
      grid.appendChild(e);
    }
    Leaderboard.updateData();
  },

  getItems()      { return STATE.inventoryItems.map(i => ({ prizeId: i.prizeId, prizeName: i.value, prizeType: i.type, claimedAt: i.claimedAt })); },
  verify(prizeId) { return STATE.inventoryItems.some(i => i.prizeId === prizeId); }
};

// ============================================
// PRIZE MODAL
// ============================================

const PrizeModal = {
  open(prize) {
    STATE.currentModalPrize = prize;

    const modal    = document.getElementById('prizeModal');
    const iconEl   = document.getElementById('prizeModalIcon');
    const nameEl   = document.getElementById('prizeModalName');
    const idEl     = document.getElementById('prizeModalId');
    const valueEl  = document.getElementById('prizeModalCoinValue');
    if (!modal || !iconEl || !nameEl || !idEl || !valueEl) return;

    iconEl.innerHTML = '';

    if (prize.lottie) {
      const img = document.createElement('img');
      img.src = GIFT_SVG_ICONS[prize.value] ?? '';
      img.alt = prize.value;
      img.style.cssText = 'width:100%;height:100%;object-fit:contain';
      iconEl.appendChild(img);
    } else if (prize.type === 'coin') {
      const img = document.createElement('img');
      img.src = 'assets/Coin.svg'; img.alt = 'Coins';
      img.style.cssText = 'width:100%;height:100%;object-fit:contain';
      iconEl.appendChild(img);
    }

    nameEl.textContent = prize.value;
    idEl.textContent   = `ID: ${prize.prizeId}`;

    const coinsVal = PRIZE_COIN_VALUES[prize.value] ?? 50;
    valueEl.innerHTML = `
      <img src="assets/Coin.svg" alt="Coins">
      <span>${coinsVal.toLocaleString()} Coins</span>
    `;

    modal.classList.add('show');
  },

  close() {
    const modal = document.getElementById('prizeModal');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => {
      const iconEl = document.getElementById('prizeModalIcon');
      if (iconEl) iconEl.innerHTML = '';
      STATE.currentModalPrize = null;
    }, 300);
  },

  convert() {
    // Guard: grab it, then immediately clear it. A second click (or a
    // double-fired event) sees currentModalPrize already null and bails
    // at the top instead of converting the same prize twice.
    if (!STATE.currentModalPrize) return;
    const prize = STATE.currentModalPrize;
    STATE.currentModalPrize = null;
    const val = PRIZE_COIN_VALUES[prize.value] ?? 50;
    Currency.add(val);
    Inventory.remove(prize.prizeId);
    this.close();
  },

  async claim() {
    if (!STATE.currentModalPrize) { Utils.showToast('No prize selected', 'error'); return; }
    if (STATE.isClaimingPrize) return; // already mid-claim — ignore extra clicks

    const prize          = STATE.currentModalPrize;
    const prizeId        = prize.prizeId;
    const giftName       = prize.value;
    const telegramGiftId = TELEGRAM_GIFT_IDS[giftName];

    if (!telegramGiftId) { Utils.showToast(`Gift mapping error: ${giftName}`, 'error'); return; }
    if (!STATE.tg?.initDataUnsafe?.user?.id) { Utils.showToast('Telegram unavailable', 'error'); return; }

    const userId   = STATE.tg.initDataUnsafe.user.id;
    const claimBtn = document.getElementById('claimPrizeBtn');

    STATE.isClaimingPrize = true;
    Utils.showToast('Claiming your gift…', 'success');
    if (claimBtn) { claimBtn.disabled = true; claimBtn.textContent = 'Claiming…'; }

    try {
      const res = await fetch('https://vgtserver-production.up.railway.app/claim-gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, prizeId, giftName: telegramGiftId })
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to claim gift'); }

      Inventory.remove(prizeId);
      this.close();
      Utils.showToast(`${giftName} sent to your Telegram!`, 'success');

      STATE.tg.showPopup?.({
        title: 'Gift Sent!',
        message: `Your ${giftName} gift has been sent to your Telegram account!`,
        buttons: [{ type: 'close' }]
      });
    } catch (error) {
      Utils.showToast(`Failed to claim: ${error.message}`, 'error');
      STATE.tg?.showPopup?.({
        title: 'Claim Failed',
        message: `${error.message}\n\nPrize ID: ${prizeId}`,
        buttons: [{ type: 'close' }]
      });
    } finally {
      STATE.isClaimingPrize = false;
      if (claimBtn) { claimBtn.disabled = false; claimBtn.textContent = 'Claim Prize'; }
    }
  }
};

// ============================================
// NAVIGATION
// ============================================

const Navigation = {
  init() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateTo(link.dataset.page);
        const nav = document.getElementById('navMenu');
        if (nav?.classList.contains('active')) Menu.toggle();
      });
    });

    window.addEventListener('popstate', () => {
      const hash = window.location.hash.slice(1) || 'home';
      this.navigateTo(hash, false);
    });
  },

  navigateTo(pageName, pushHistory = true) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageName}`)?.classList.add('active');

    // Desktop / website-ratio hamburger nav
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.page === pageName);
    });

    // Mobile bottom nav — keep it in sync with whatever page is active,
    // including pages reached from elsewhere (e.g. tapping the Daily
    // Loot card jumps to "dailyspin", which has no bottom-nav icon of
    // its own, so we fall back to leaving Home highlighted for it).
    const bottomNavTarget = pageName === 'dailyspin' ? 'home' : pageName;
    document.querySelectorAll('.bottom-nav-item[data-page]').forEach(b => {
      b.classList.toggle('active', b.dataset.page === bottomNavTarget);
    });

    STATE.currentPage = pageName;
    if (pushHistory) history.pushState(null, '', `#${pageName}`);

    if (pageName === 'leaderboard') Leaderboard.init();
    if (pageName === 'deposit')     Deposit.init();

    const debugEl = document.getElementById('currentPageDebug');
    if (debugEl) debugEl.textContent = pageName;
  }
};

// ============================================
// BOTTOM NAV (mobile / mini-app)
// ============================================

const BottomNav = {
  init() {
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.action === 'inventory') {
          // Items tab opens the full inventory modal directly — the
          // home grid's Inventory card is hidden on mobile, so this
          // is the only entry point there.
          FullInventoryModal.open();
          return;
        }
        if (btn.dataset.page) Navigation.navigateTo(btn.dataset.page);
      });
    });
  }
};

// ============================================
// MENU
// ============================================

const Menu = {
  init() {
    document.getElementById('hamburger')?.addEventListener('click', () => this.toggle());
    document.getElementById('navClose')?.addEventListener('click',  () => this.toggle());
    document.getElementById('overlay')?.addEventListener('click',   () => this.closeAll());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closeAll(); });
  },

  toggle() {
    ['hamburger','navMenu','overlay'].forEach(id => document.getElementById(id)?.classList.toggle('active'));
    document.body.style.overflow = document.getElementById('navMenu')?.classList.contains('active') ? 'hidden' : '';
  },

  closeAll() {
    ['hamburger','navMenu','overlay','debugPanel'].forEach(id => document.getElementById(id)?.classList.remove('active'));
    document.body.style.overflow = '';
  }
};

// ============================================
// NOTIFICATIONS
// ============================================

const Notifications = {
  add() {
    if (STATE.notifications.length >= CONFIG.MAX_NOTIFICATIONS) return;
    const id   = Date.now() + Math.random();
    const cube = document.createElement('div');
    cube.className   = 'notification-cube';
    cube.dataset.id  = id;
    cube.appendChild(Utils.createErrorIcon());

    const closeBtn = Object.assign(document.createElement('div'), { className: 'close-btn', innerHTML: '×' });
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.remove(id); });
    cube.appendChild(closeBtn);

    const timeBar = document.createElement('div');
    timeBar.className = 'time-bar';
    const fill = document.createElement('div');
    fill.className = 'time-bar-fill';
    timeBar.appendChild(fill);
    cube.appendChild(timeBar);

    document.getElementById('notificationContainer')?.appendChild(cube);
    STATE.notifications.push(id);
    this.updateCount();
    setTimeout(() => this.remove(id), 20000);
  },

  remove(id) {
    const cube = document.querySelector(`[data-id="${id}"]`);
    if (cube) {
      Object.assign(cube.style, { animation:'none', transform:'translateX(100px)', opacity:'0' });
      setTimeout(() => {
        cube.remove();
        STATE.notifications = STATE.notifications.filter(n => n !== id);
        this.updateCount();
      }, 300);
    }
  },

  clearAll() {
    document.querySelectorAll('#notificationContainer .notification-cube:not(.gift-notification):not(.nft-notification)').forEach(c => {
      Object.assign(c.style, { animation:'none', transform:'translateX(100px)', opacity:'0' });
    });
    setTimeout(() => {
      STATE.notifications.forEach(id => document.querySelector(`[data-id="${id}"]`)?.remove());
      STATE.notifications = [];
      this.updateCount();
    }, 300);
  },

  updateCount() {
    const el = document.getElementById('notificationCount');
    if (el) el.textContent = STATE.notifications.length + STATE.liveGiftNotifications.length;
  }
};

// ============================================
// LIVE GIFT NOTIFICATIONS
// ============================================

const LiveGiftNotifications = {
  add(prize) {
    if (STATE.liveGiftNotifications.length >= CONFIG.MAX_LIVE_NOTIFICATIONS) {
      this.remove(STATE.liveGiftNotifications[0]);
    }
    const id    = Date.now() + Math.random();
    const isNFT = NFT_GIFTS.includes(prize.value);
    const cube  = document.createElement('div');
    cube.className  = `notification-cube ${isNFT ? 'nft-notification' : 'gift-notification'}`;
    cube.dataset.id = id;

    const lottieWrap = Object.assign(document.createElement('div'), { className: 'gift-notification-lottie' });
    if (prize.lottie) {
      const img = Object.assign(document.createElement('img'), {
        src: GIFT_SVG_ICONS[prize.value] ?? '',
        alt: prize.value
      });
      img.style.cssText = 'width:100%;height:100%;object-fit:contain';
      lottieWrap.appendChild(img);
    }
    cube.appendChild(lottieWrap);

    const label = Object.assign(document.createElement('div'), { className: 'gift-notification-label', textContent: isNFT ? 'NFT' : prize.value });
    cube.appendChild(label);

    const fill = document.createElement('div'); fill.className = 'time-bar-fill';
    fill.style.animationDuration = `${CONFIG.NOTIFICATION_DURATION}ms`;
    const bar = document.createElement('div'); bar.className = 'time-bar';
    bar.appendChild(fill); cube.appendChild(bar);

    document.getElementById('notificationContainer')?.appendChild(cube);
    STATE.liveGiftNotifications.push(id);
    Notifications.updateCount();
    setTimeout(() => this.remove(id), CONFIG.NOTIFICATION_DURATION);
  },

  remove(id) {
    const cube = document.querySelector(`[data-id="${id}"]`);
    if (cube) {
      Object.assign(cube.style, { animation:'none', transform:'translateX(100px)', opacity:'0' });
      setTimeout(() => {
        cube.remove();
        STATE.liveGiftNotifications = STATE.liveGiftNotifications.filter(n => n !== id);
        Notifications.updateCount();
      }, 300);
    }
  }
};

// ============================================
// FULL INVENTORY MODAL
// ============================================

const FullInventoryModal = {
  open() {
    const modal = document.getElementById('fullInventoryModal');
    if (!modal) return;
    const iconEl = document.getElementById('fullInventoryLottieIcon');
    if (iconEl && !iconEl.children.length) {
      lottie.loadAnimation({ container: iconEl, renderer: 'svg', loop: true, autoplay: true, path: 'assets/CrystalForInv.json' });
    }
    this.updateStats();
    this.render('all');
    modal.classList.add('show');
  },

  close() {
    document.getElementById('fullInventoryModal')?.classList.remove('show');
  },

  updateStats() {
    const total  = STATE.inventoryItems.length;
    const value  = STATE.inventoryItems.reduce((s, i) => s + (PRIZE_COIN_VALUES[i.value] ?? 0), 0);
    const rare   = STATE.inventoryItems.filter(i => RARE_GIFTS.includes(i.value)).length;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('totalGiftsCount', total);
    set('totalGiftValue',  value.toLocaleString());
    set('rareGiftsCount',  rare);
  },

  render(filter) {
    const grid  = document.getElementById('fullInventoryGrid');
    const empty = document.getElementById('emptyInventory');
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = STATE.inventoryItems.filter(item => {
      if (filter === 'telegram') return !NFT_GIFTS.includes(item.value);
      if (filter === 'nft')      return NFT_GIFTS.includes(item.value);
      if (filter === 'rare')     return RARE_GIFTS.includes(item.value);
      return true;
    });

    if (!filtered.length) {
      if (empty) { empty.style.display = 'flex'; grid.style.display = 'none'; }
      return;
    }
    if (empty) { empty.style.display = 'none'; grid.style.display = 'grid'; }

    filtered.forEach(item => {
      const div = document.createElement('div');
      div.className = 'full-inventory-item' + (NFT_GIFTS.includes(item.value) ? ' nft-item' : '');

      const lottieWrap = document.createElement('div');
      lottieWrap.className = 'full-item-lottie';
      if (item.lottie) {
        const img = Object.assign(document.createElement('img'), {
          src: GIFT_SVG_ICONS[item.value] ?? '',
          alt: item.value
        });
        img.style.cssText = 'width:100%;height:100%;object-fit:contain';
        lottieWrap.appendChild(img);
      }
      div.appendChild(lottieWrap);

      const name = Object.assign(document.createElement('div'), { className: 'full-item-name', textContent: item.value });
      const id   = Object.assign(document.createElement('div'), { className: 'full-item-id', textContent: item.prizeId });
      div.append(name, id);

      if (NFT_GIFTS.includes(item.value)) {
        const badge = Object.assign(document.createElement('div'), { className: 'full-item-badge', textContent: 'NFT' });
        div.appendChild(badge);
      }

      div.addEventListener('click', () => { PrizeModal.open(item); this.close(); });
      grid.appendChild(div);
    });
  }
};

// ============================================
// LEADERBOARD
// ============================================

const Leaderboard = {
  init() {
    const trophyEl = document.getElementById('leaderboardTrophyIcon');
    if (trophyEl && !trophyEl.children.length) {
      lottie.loadAnimation({ container: trophyEl, renderer: 'svg', loop: true, autoplay: true, path: 'assets/giftTrophy.json' });
    }
    const giftEl = document.getElementById('giftTabIcon');
    if (giftEl && !giftEl.children.length) {
      lottie.loadAnimation({ container: giftEl, renderer: 'svg', loop: true, autoplay: true, path: 'assets/giftHeart.json' });
    }

    document.querySelectorAll('.leaderboard-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.leaderboard-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.leaderboard-list').forEach(l => l.classList.remove('active'));
        tab.classList.add('active');
        const type = tab.dataset.tab;
        STATE.currentLeaderboardTab = type;
        document.getElementById(`leaderboard-${type}`)?.classList.add('active');
        this.render(type);
      });
    });

    this.render('coins');
  },

  render(type) {
    const data =
      type === 'coins' ? STATE.leaderboardData.coins :
      type === 'stars' ? STATE.leaderboardData.stars :
      STATE.leaderboardData.gifts;
    const container = document.getElementById(`leaderboard-${type}`);
    if (!container) return;

    const podium = container.querySelector('.podium-container');
    const ranks  = container.querySelector('.ranks-list');
    if (podium) podium.innerHTML = '';
    if (ranks)  ranks.innerHTML  = '';

    data.slice(0, 3).forEach((p, i) => podium?.appendChild(this.createPodiumCard(p, i + 1, type)));
    data.slice(3).forEach((p, i)    => ranks?.appendChild(this.createRankCard(p, i + 4, type)));
    this.updateYourRank(type);
  },

  _avatar(player, size) {
    const el = document.createElement('div');
    el.className = `${size}-avatar`;
    if (player.avatar) { el.style.backgroundImage = `url(${player.avatar})`; el.style.backgroundSize = 'cover'; }
    else { el.textContent = player.name.split(' ').map(n => n[0]).join('').substring(0, 2); }
    return el;
  },

  _scoreText(player, type) {
    if (type === 'coins') return player.coins.toLocaleString();
    if (type === 'stars') return `${player.stars.toLocaleString()} ⭐`;
    return `${player.gifts} gifts`;
  },

  createPodiumCard(player, rank, type) {
    const card     = document.createElement('div');
    card.className = 'podium-card';
    card.setAttribute('data-rank', rank);
    const badge = document.createElement('div'); badge.className = 'podium-rank'; badge.textContent = rank;
    const name  = document.createElement('div'); name.className  = 'podium-name'; name.textContent  = player.name;
    const score = document.createElement('div'); score.className = 'podium-score';
    score.textContent = this._scoreText(player, type);
    card.append(badge, this._avatar(player, 'podium'), name, score);
    return card;
  },

  createRankCard(player, rank, type) {
    const card = document.createElement('div'); card.className = 'rank-card';
    const pos  = document.createElement('div'); pos.className  = 'rank-position'; pos.textContent = `#${rank}`;
    const info = document.createElement('div'); info.className = 'rank-info';
    const name  = document.createElement('div'); name.className  = 'rank-name';  name.textContent  = player.name;
    const score = document.createElement('div'); score.className = 'rank-score';
    score.textContent = this._scoreText(player, type);
    info.append(name, score);
    card.append(pos, this._avatar(player, 'rank'), info);
    return card;
  },

  updateYourRank(type) {
    const user  = STATE.userData || { first_name: 'You' };
    const uName = user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name;
    const rankEl  = document.getElementById('yourRank');
    const nameEl  = document.getElementById('yourRankName');
    const scoreEl = document.getElementById('yourRankScore');
    if (!rankEl || !nameEl || !scoreEl) return;
    nameEl.textContent = uName;
    if (type === 'coins') {
      rankEl.textContent  = STATE.leaderboardData.coins.filter(p => p.coins > STATE.userCoins).length + 1;
      scoreEl.textContent = `${STATE.userCoins.toLocaleString()} coins`;
    } else if (type === 'stars') {
      rankEl.textContent  = STATE.leaderboardData.stars.filter(p => p.stars > STATE.userStars).length + 1;
      scoreEl.textContent = `${STATE.userStars.toLocaleString()} ⭐`;
    } else {
      const gifts = STATE.inventoryItems.length;
      rankEl.textContent  = STATE.leaderboardData.gifts.filter(p => p.gifts > gifts).length + 1;
      scoreEl.textContent = `${gifts} gifts`;
    }
  },

  updateData() {
    if (STATE.currentPage === 'leaderboard') this.updateYourRank(STATE.currentLeaderboardTab);
  }
};

// ============================================
// DEPOSIT
// ============================================

const Deposit = {
  init() {
    this.renderPackages('stars');
    this.initIcons();
  },

  renderPackages(type) {
    const grid = document.querySelector(`#deposit-${type} .packages-grid`);
    if (!grid) return;
    grid.innerHTML = '';
    DEPOSIT_PACKAGES[type].forEach((pkg, i) => grid.appendChild(this.createCard(pkg, type, i)));
  },

  createCard(pkg, type, index) {
    const card = document.createElement('div');
    card.className = 'package-card';
    card.style.animationDelay = `${index * 0.05}s`;

    if (pkg.popular) {
      const badge = Object.assign(document.createElement('div'), { className: 'popular-badge', textContent: 'Popular' });
      card.appendChild(badge);
    }

    const icon = document.createElement('div');
    icon.className = 'package-icon';
    icon.id = `pkg-${type}-${index}`;
    card.appendChild(icon);

    const amt = Object.assign(document.createElement('div'), { className: 'package-amount', textContent: pkg.amount.toLocaleString() });
    const cur = Object.assign(document.createElement('div'), { className: 'package-currency', textContent: 'Stars' });
    const div = document.createElement('div'); div.className = 'package-divider';

    const coins = document.createElement('div'); coins.className = 'package-coins';
    coins.innerHTML = `<img src="assets/TStars.svg" alt="Star"><span>${pkg.stars.toLocaleString()} Stars</span>`;

    const btn = Object.assign(document.createElement('button'), { className: 'package-buy-btn', textContent: 'Purchase' });
    btn.addEventListener('click', () => this.purchasePackage(pkg, type));

    card.append(amt, cur, div, coins, btn);
    return card;
  },

  async purchasePackage(pkg) {
    if (!STATE.tg) { Utils.showToast('Telegram WebApp not available', 'error'); return; }
    const userId = STATE.tg.initDataUnsafe?.user?.id;
    if (!userId)  { Utils.showToast('User ID not available', 'error'); return; }

    Utils.showToast('Creating invoice…', 'success');

    try {
      const res = await fetch('https://vgservers-production.up.railway.app/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId: pkg.id })
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to create invoice'); }
      const data = await res.json();
      if (!data.invoiceLink) throw new Error('No invoice link received');

      STATE.tg.openInvoice(data.invoiceLink, async (status) => {
        if (status === 'paid') {
          Utils.showToast(`Payment successful! Adding ${pkg.stars} stars…`, 'success');
          setTimeout(() => BackendAPI.syncBalance(), 1500);
        } else if (status === 'cancelled') {
          Utils.showToast('Payment cancelled', 'error');
        } else if (status === 'failed') {
          Utils.showToast('Payment failed. Please try again.', 'error');
        }
      });
    } catch (error) {
      Utils.showToast(`Error: ${error.message}`, 'error');
    }
  },

  initIcons() {
    setTimeout(() => {
      const starsTabEl = document.getElementById('starsTabIcon');
      if (starsTabEl && !starsTabEl.children.length) {
        lottie.loadAnimation({ container: starsTabEl, renderer: 'svg', loop: true, autoplay: true, path: 'assets/TStars.json' });
      }
      DEPOSIT_PACKAGES.stars.forEach((_, i) => {
        const el = document.getElementById(`pkg-stars-${i}`);
        if (el && !el.children.length) {
          lottie.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: true, path: 'assets/TStars.json' });
        }
      });
    }, 500);
  }
};

// ============================================
// SPIN WHEEL (Daily Spin — original wheel, unchanged)
// ============================================

const SpinWheel = {
  init() {
    this.populateCubes();
    this.startAnimation();
    this.loadIcons();
  },

  // Picks the REAL outcome. Only ever called from spin() to determine
  // what the player actually wins.
  selectPrize() {
    const r = Math.random() * 100;
    let cum = 0;
    for (const p of SPIN_PRIZES) { cum += p.chance; if (r <= cum) return p; }
    return SPIN_PRIZES[0];
  },

  // Picks a DISPLAY-ONLY prize from PREVIEW_PRIZES. Used for the idle
  // wheel and the pre-reveal repaint so the reel looks more generous
  // than the true odds. Never used to decide what the player wins.
  selectPreviewPrize() {
    const r = Math.random() * 100;
    let cum = 0;
    for (const p of PREVIEW_PRIZES) { cum += p.chance; if (r <= cum) return p; }
    return PREVIEW_PRIZES[0];
  },

  populateCubes() {
    document.querySelectorAll('#wheel .cube').forEach(c => this.renderCube(c, this.selectPreviewPrize()));
  },

  renderCube(cube, prize) {
    this._cleanupLottie(cube);
    cube.dataset.prizeId    = prize.id;
    cube.dataset.prizeType  = prize.type;
    cube.dataset.prizeValue = prize.value;
    if (!cube.dataset.cubeId) cube.dataset.cubeId = `cube_${Math.random().toString(36).slice(2,11)}`;
    cube.innerHTML = '';
    cube.style.cssText = 'position:relative;display:flex;align-items:center;justify-content:center;';

    if (prize.type === 'coin') {
      const img = Object.assign(document.createElement('img'), { src: 'assets/Coin.svg', alt: 'Coin' });
      img.style.cssText = 'width:70px;height:70px;object-fit:contain;margin:auto';
      const txt = document.createElement('div');
      txt.textContent = prize.value;
      txt.style.cssText = 'position:absolute;top:15%;left:25%;transform:translate(-50%,-50%);font-size:1.5rem;font-weight:700;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.8);pointer-events:none';
      cube.append(img, txt);
    } else {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'width:80px;height:80px;margin:auto';
      cube.appendChild(wrap);
      const inst = lottie.loadAnimation({
        container: wrap, renderer: 'svg', loop: true, autoplay: true, path: prize.lottie,
        rendererSettings: { preserveAspectRatio: 'xMidYMid slice', clearCanvas: true, progressiveLoad: true }
      });
      STATE.lottieInstances.set(cube.dataset.cubeId, inst);
    }
  },

  _cleanupLottie(cube) {
    const id = cube.dataset.cubeId;
    if (id && STATE.lottieInstances.has(id)) {
      STATE.lottieInstances.get(id).destroy();
      STATE.lottieInstances.delete(id);
    }
  },

  updateScales(cubes) {
    const now = Date.now();
    if (now - STATE.lastScaleUpdate < 16 && STATE.isSpinning) return;
    STATE.lastScaleUpdate = now;
    const wc = document.querySelector('.wheel-container:not(.void-wheel-container)');
    if (!wc) return;
    const center = wc.offsetWidth / 2;
    const wRect  = wc.getBoundingClientRect();
    cubes.forEach(cube => {
      const cRect = cube.getBoundingClientRect();
      const dist  = Math.abs(cRect.left + cRect.width / 2 - wRect.left - center);
      const scale = Math.max(0.6, 1.5 - (dist / center) * 0.9);
      cube.style.transform   = `scale(${scale})`;
      cube.style.borderColor = scale > 1.3 ? 'rgba(96,165,250,0.8)' : 'rgba(96,165,250,0.4)';
      cube.style.boxShadow   = scale > 1.3 ? '0 0 30px rgba(96,165,250,0.5)' : 'none';
    });
  },

  startAnimation() {
  let lastTime = performance.now();
  const animate = (now) => {
    // Clamp dt so a backgrounded tab / huge stall doesn't cause a
    // giant catch-up teleport when it resumes.
    const dt = Math.min(now - lastTime, 100);
    lastTime = now;

    const wheel = document.getElementById('wheel');
    if (wheel) {
      // scrollSpeed was tuned as "px per frame" at 60fps.
      // Scale by real elapsed time so total distance traveled depends
      // only on wall-clock duration, never on how many frames fired.
      STATE.scrollPosition += STATE.scrollSpeed * (dt / (1000 / 60));
      const stride = CONFIG.CUBE_WIDTH + CONFIG.GAP_WIDTH;

      // while, not if — a lag spike can cross more than one cube-width
      // in a single frame; recycle all of them so the reel never sticks.
      while (STATE.scrollPosition >= stride) {
        const first = document.querySelector('#wheel .cube');
        if (!first) break;
        wheel.appendChild(first);
        STATE.scrollPosition -= stride;
        if (!STATE.isSpinning) this.renderCube(first, this.selectPreviewPrize());
      }

      wheel.style.transform = `translateX(-${STATE.scrollPosition}px)`;
      this.updateScales(Array.from(document.querySelectorAll('#wheel .cube')));
    }
    STATE.animationFrameId = requestAnimationFrame(animate);
  };
  STATE.animationFrameId = requestAnimationFrame(animate);
},

  spin() {
    if (STATE.isSpinning) return;
    STATE.isSpinning = true;
    const btn = document.getElementById('spinButton');
    if (btn) btn.disabled = true;

    // Real outcome — decided here, from SPIN_PRIZES only.
    const winning = this.selectPrize();
    const cubes   = Array.from(document.querySelectorAll('#wheel .cube'));
    if (!cubes.length) { STATE.isSpinning = false; if (btn) btn.disabled = false; return; }

    // Repaint every cube for the spin visual — uses REAL odds so the
    // reel you watch scroll actually reflects what you can win. Only
    // the idle/resting wheel (populateCubes + the recycle branch below,
    // gated by !isSpinning) uses the inflated preview odds.
    cubes.forEach(c => { this._cleanupLottie(c); this.renderCube(c, this.selectPrize()); });

    const stride   = CONFIG.CUBE_WIDTH + CONFIG.GAP_WIDTH;
    const minDist  = 5000 + Math.random() * 600;
    const winIdx   = Math.floor(minDist / stride) % cubes.length;
    this.renderCube(cubes[winIdx], winning);

    const startTime = Date.now();
    const tick = () => {
      if (!STATE.isSpinning) return;
      const progress  = Math.min((Date.now() - startTime) / CONFIG.SPIN_DURATION, 1);
      STATE.scrollSpeed = CONFIG.SPIN_MAX_SPEED * (1 - (1 - Math.pow(1 - progress, 4)));
      if (progress < 1) { requestAnimationFrame(tick); }
      else { STATE.scrollSpeed = 0; setTimeout(() => this.snapToCenter(), 100); }
    };
    tick();
  },

  snapToCenter() {
    const cubes = Array.from(document.querySelectorAll('#wheel .cube'));
    const wc    = document.querySelector('.wheel-container:not(.void-wheel-container)');
    if (!wc) return;
    const center = wc.offsetWidth / 2;
    const wRect  = wc.getBoundingClientRect();
    let bestCube = null, bestDist = Infinity, snapDelta = 0;

    cubes.forEach(c => {
      const r    = c.getBoundingClientRect();
      const dist = Math.abs(r.left + r.width / 2 - wRect.left - center);
      if (dist < bestDist) { bestDist = dist; bestCube = c; snapDelta = (r.left + r.width / 2 - wRect.left) - center; }
    });

    const startPos = STATE.scrollPosition;
    const startT   = Date.now();
    const snap = () => {
      const p = Math.min((Date.now() - startT) / 400, 1);
      const e = 1 - Math.pow(1 - p, 3);
      STATE.scrollPosition = startPos + snapDelta * e;
      if (p < 1) { requestAnimationFrame(snap); return; }
      if (bestCube) {
        bestCube.style.transition = 'all .3s ease';
        bestCube.style.borderColor = '#60a5fa';
        bestCube.style.boxShadow   = '0 0 40px rgba(96,165,250,.8)';
        setTimeout(() => { if (bestCube) bestCube.style.transition = ''; }, 300);
        const final = SPIN_PRIZES.find(p => p.id === bestCube.dataset.prizeId);
        if (final) setTimeout(() => this.showWin(final), 200);
      }
    };
    snap();
  },

  showWin(prize) {
    STATE.currentWinningPrize = prize;
    const modal    = document.getElementById('winModal');
    const iconEl   = document.getElementById('modalPrizeIcon');
    const nameEl   = document.getElementById('modalPrizeName');
    const valueRow = document.getElementById('modalValueRow');
    if (!modal || !iconEl || !nameEl) return;

    iconEl.innerHTML = '';

    if (prize.type === 'coin') {
      const img = Object.assign(document.createElement('img'), { src: 'assets/Coin.svg', alt: 'Coins' });
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;animation:prizeFloat 2.5s ease-in-out infinite;filter:drop-shadow(0 12px 32px rgba(245,194,107,.4))';
      iconEl.appendChild(img);
      nameEl.innerHTML = `<span class="hl">${prize.value}</span> Coins`;
      if (valueRow) {
        valueRow.innerHTML = `<img src="assets/Coin.svg" alt="Coins" style="width:22px;height:22px"><span>${prize.value} Coins</span>`;
        valueRow.style.display = 'flex';
      }
    } else {
      const img = document.createElement('img');
      img.src = GIFT_SVG_ICONS[prize.value] ?? '';
      img.alt = prize.value;
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;animation:prizeFloat 2.5s ease-in-out infinite;filter:drop-shadow(0 12px 32px rgba(245,194,107,.4))';
      iconEl.appendChild(img);
      nameEl.innerHTML = `the <span class="hl">${prize.value}</span>`;
      if (valueRow) {
        const val = PRIZE_COIN_VALUES[prize.value] ?? 50;
        valueRow.innerHTML = `<img src="assets/Coin.svg" alt="Coins" style="width:22px;height:22px"><span>${val.toLocaleString()} Coins value</span>`;
        valueRow.style.display = 'flex';
      }
    }

    modal.classList.add('show');
  },

  hideWin() {
    const modal = document.getElementById('winModal');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => {
      const el = document.getElementById('modalPrizeIcon');
      if (el) el.innerHTML = '';
    }, 300);
  },

  async claimWin() {
    // Guard: same pattern as convert(). Capture the prize, clear the shared
    // state immediately — BEFORE the await below — so a click landing
    // inside that network round-trip has nothing left to claim.
    if (!STATE.currentWinningPrize) return;
    const prize = STATE.currentWinningPrize;
    STATE.currentWinningPrize = null;

    const claimBtn = document.getElementById('claimButton');
    if (claimBtn) claimBtn.disabled = true;

    if (prize.type === 'coin') {
      Currency.add(parseInt(prize.value, 10));
    } else {
      const added = Inventory.add(prize);
      const telegramGiftId = TELEGRAM_GIFT_IDS[prize.value];
      if (telegramGiftId) {
        const STORE_URL = 'https://vgdatastorage-production.up.railway.app';
        const userId    = STATE.tg?.initDataUnsafe?.user?.id ?? 'unknown';
        const username  = STATE.tg?.initDataUnsafe?.user?.username ?? null;
        try {
          await fetch(`${STORE_URL}/prizes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prize_id: added.prizeId,
              gift_name: prize.value,
              telegram_gift_id: telegramGiftId,
              user_id: userId,
              username
            })
          });
        } catch { /* non-fatal */ }
      }
      LiveGiftNotifications.add(added);
    }

    this.hideWin();

    document.querySelectorAll('#wheel .cube').forEach(c => this._cleanupLottie(c));
    this.populateCubes();
    STATE.scrollSpeed = 1;
    STATE.isSpinning  = false;
    if (claimBtn) claimBtn.disabled = false;
    const spinBtn = document.getElementById('spinButton');
    if (spinBtn) spinBtn.disabled = false;
  },

  loadIcons() {
    ['coin1','coin5','coin10','coin25','coin50','coin100','coin250','coin500'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const img = Object.assign(document.createElement('img'), { src: 'assets/Coin.svg', alt: 'Coin' });
      el.appendChild(img);
    });
    [
      ['giftHeart','Heart'], ['giftBear','Bear'],
      ['giftGift','Gift'],   ['giftRose','Rose'],
      ['giftCake','Cake'],   ['giftRoseBouquet','Rose Bouquet'],
      ['giftRing','Ring'],   ['giftTrophy','Trophy'],
      ['giftDiamond','Diamond'], ['giftCalendar','Calendar']
    ].forEach(([id, giftName]) => {
      const el = document.getElementById(id);
      if (el) {
        const img = Object.assign(document.createElement('img'), {
          src: GIFT_SVG_ICONS[giftName] ?? '',
          alt: giftName
        });
        img.style.cssText = 'width:100%;height:100%;object-fit:contain';
        el.appendChild(img);
      }
    });
  }
};

// ============================================
// VOID SPIN WHEEL — second wheel, home-page banner.
//
// Deliberately duplicated from SpinWheel above rather than merged into
// it: every wheel-specific piece (cubes, reel, spin/claim buttons, win
// modal id) uses "void" prefixed classes/ids and its own STATE.void*
// fields, so a spin on one wheel can never stomp the other's animation
// mid-flight. Everything downstream (Inventory, PrizeModal, notifications,
// leaderboard) is untouched — it already keys off prize.type/prize.value,
// not which wheel produced the prize.
//
// Gift cubes here render with the flat GIFT_SVG_ICONS art (no Lottie) —
// Lottie JSON only exists for the 10 original gifts and none of the 3
// new Void-exclusive ones have it. `lottie` stays set on those prize
// objects anyway purely as the truthy flag the generic inventory/modal/
// notification code checks for — it's never actually loaded as an
// animation from here.
//
// Cost: CONFIG.VOID_SPIN_COST Stars, deducted the instant Spin is
// pressed (not on claim). Insufficient balance blocks the spin with a
// toast + a quick shake on the button, no cubes move.
// ============================================

const VoidSpinWheel = {
  init() {
    this.populateCubes();
    this.startAnimation();
    this.loadIcons();
  },

  selectPrize() {
    const r = Math.random() * 100;
    let cum = 0;
    for (const p of VOID_SPIN_PRIZES) { cum += p.chance; if (r <= cum) return p; }
    return VOID_SPIN_PRIZES[0];
  },

  selectPreviewPrize() {
    const r = Math.random() * 100;
    let cum = 0;
    for (const p of VOID_PREVIEW_PRIZES) { cum += p.chance; if (r <= cum) return p; }
    return VOID_PREVIEW_PRIZES[0];
  },

  populateCubes() {
    document.querySelectorAll('.void-cube').forEach(c => this.renderCube(c, this.selectPreviewPrize()));
  },

  renderCube(cube, prize) {
    this._cleanupLottie(cube);
    cube.dataset.prizeId    = prize.id;
    cube.dataset.prizeType  = prize.type;
    cube.dataset.prizeValue = prize.value;
    if (!cube.dataset.cubeId) cube.dataset.cubeId = `voidcube_${Math.random().toString(36).slice(2,11)}`;
    cube.innerHTML = '';
    cube.style.cssText = 'position:relative;display:flex;align-items:center;justify-content:center;';

    if (prize.type === 'coin' || prize.type === 'stars') {
      const img = Object.assign(document.createElement('img'), {
        src: prize.type === 'coin' ? 'assets/Coin.svg' : 'assets/TStars.svg',
        alt: prize.type === 'coin' ? 'Coin' : 'Stars'
      });
      img.style.cssText = 'width:70px;height:70px;object-fit:contain;margin:auto';
      const txt = document.createElement('div');
      txt.textContent = prize.value;
      txt.style.cssText = 'position:absolute;top:15%;left:25%;transform:translate(-50%,-50%);font-size:1.5rem;font-weight:700;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.8);pointer-events:none';
      cube.append(img, txt);
    } else {
      // Gift — flat SVG, no lottie (see file-header note above).
      const wrap = document.createElement('div');
      wrap.style.cssText = 'width:80px;height:80px;margin:auto';
      const img = Object.assign(document.createElement('img'), {
        src: GIFT_SVG_ICONS[prize.value] ?? '',
        alt: prize.value
      });
      img.style.cssText = 'width:100%;height:100%;object-fit:contain';
      wrap.appendChild(img);
      cube.appendChild(wrap);
    }
  },

  // No-op today (gift cubes don't load lottie instances here), kept so
  // the recycle/spin code paths mirror SpinWheel exactly and stay a
  // drop-in copy if Lottie assets get added for these gifts later.
  _cleanupLottie(cube) {
    const id = cube.dataset.cubeId;
    if (id && STATE.voidLottieInstances.has(id)) {
      STATE.voidLottieInstances.get(id).destroy();
      STATE.voidLottieInstances.delete(id);
    }
  },

  updateScales(cubes) {
    const now = Date.now();
    if (now - STATE.voidLastScaleUpdate < 16 && STATE.voidIsSpinning) return;
    STATE.voidLastScaleUpdate = now;
    const wc = document.querySelector('.void-wheel-container');
    if (!wc) return;
    const center = wc.offsetWidth / 2;
    const wRect  = wc.getBoundingClientRect();
    cubes.forEach(cube => {
      const cRect = cube.getBoundingClientRect();
      const dist  = Math.abs(cRect.left + cRect.width / 2 - wRect.left - center);
      const scale = Math.max(0.6, 1.5 - (dist / center) * 0.9);
      cube.style.transform   = `scale(${scale})`;
      cube.style.zIndex      = scale > 1.3 ? '5' : '1';
      cube.style.borderColor = scale > 1.3 ? 'rgba(192,132,252,0.8)' : 'rgba(192,132,252,0.4)';
      cube.style.boxShadow   = scale > 1.3 ? '0 0 30px rgba(192,132,252,0.5)' : 'none';
    });
  },

  startAnimation() {
    let lastTime = performance.now();
    const animate = (now) => {
      const dt = Math.min(now - lastTime, 100);
      lastTime = now;

      const wheel = document.getElementById('voidWheel');
      if (wheel) {
        STATE.voidScrollPosition += STATE.voidScrollSpeed * (dt / (1000 / 60));
        const stride = CONFIG.VOID_CUBE_WIDTH + CONFIG.VOID_GAP_WIDTH;

        while (STATE.voidScrollPosition >= stride) {
          const first = document.querySelector('.void-cube');
          if (!first) break;
          wheel.appendChild(first);
          STATE.voidScrollPosition -= stride;
          if (!STATE.voidIsSpinning) this.renderCube(first, this.selectPreviewPrize());
        }

        wheel.style.transform = `translateX(-${STATE.voidScrollPosition}px)`;
        this.updateScales(Array.from(document.querySelectorAll('.void-cube')));
      }
      STATE.voidAnimationFrameId = requestAnimationFrame(animate);
    };
    STATE.voidAnimationFrameId = requestAnimationFrame(animate);
  },

  spin() {
    if (STATE.voidIsSpinning) return;

    const btn = document.getElementById('voidSpinButton');

    // Cost check — happens before anything else moves. Deduct-on-press,
    // not on claim, per spec.
    if (STATE.userStars < CONFIG.VOID_SPIN_COST) {
      Utils.showToast(`Not enough Stars — need ${CONFIG.VOID_SPIN_COST} ⭐`, 'error');
      if (btn) {
        btn.classList.remove('shake-error');
        void btn.offsetWidth; // restart the animation if it's already mid-shake
        btn.classList.add('shake-error');
        setTimeout(() => btn.classList.remove('shake-error'), 400);
      }
      return;
    }

    STATE.voidIsSpinning = true;
    if (btn) btn.disabled = true;
    Currency.addStars(-CONFIG.VOID_SPIN_COST);

    const winning = this.selectPrize();
    const cubes   = Array.from(document.querySelectorAll('.void-cube'));
    if (!cubes.length) { STATE.voidIsSpinning = false; if (btn) btn.disabled = false; return; }

    cubes.forEach(c => { this._cleanupLottie(c); this.renderCube(c, this.selectPrize()); });

    const stride  = CONFIG.VOID_CUBE_WIDTH + CONFIG.VOID_GAP_WIDTH;
    const minDist = 5000 + Math.random() * 600;
    const winIdx  = Math.floor(minDist / stride) % cubes.length;
    this.renderCube(cubes[winIdx], winning);

    const startTime = Date.now();
    const tick = () => {
      if (!STATE.voidIsSpinning) return;
      const progress = Math.min((Date.now() - startTime) / CONFIG.VOID_SPIN_DURATION, 1);
      STATE.voidScrollSpeed = CONFIG.VOID_SPIN_MAX_SPEED * (1 - (1 - Math.pow(1 - progress, 4)));
      if (progress < 1) { requestAnimationFrame(tick); }
      else { STATE.voidScrollSpeed = 0; setTimeout(() => this.snapToCenter(), 100); }
    };
    tick();
  },

  snapToCenter() {
    const cubes = Array.from(document.querySelectorAll('.void-cube'));
    const wc    = document.querySelector('.void-wheel-container');
    if (!wc) return;
    const center = wc.offsetWidth / 2;
    const wRect  = wc.getBoundingClientRect();
    let bestCube = null, bestDist = Infinity, snapDelta = 0;

    cubes.forEach(c => {
      const r    = c.getBoundingClientRect();
      const dist = Math.abs(r.left + r.width / 2 - wRect.left - center);
      if (dist < bestDist) { bestDist = dist; bestCube = c; snapDelta = (r.left + r.width / 2 - wRect.left) - center; }
    });

    const startPos = STATE.voidScrollPosition;
    const startT   = Date.now();
    const snap = () => {
      const p = Math.min((Date.now() - startT) / 400, 1);
      const e = 1 - Math.pow(1 - p, 3);
      STATE.voidScrollPosition = startPos + snapDelta * e;
      if (p < 1) { requestAnimationFrame(snap); return; }
      if (bestCube) {
        bestCube.style.transition = 'all .3s ease';
        bestCube.style.borderColor = '#c084fc';
        bestCube.style.boxShadow   = '0 0 40px rgba(192,132,252,.8)';
        setTimeout(() => { if (bestCube) bestCube.style.transition = ''; }, 300);
        const final = VOID_SPIN_PRIZES.find(p => p.id === bestCube.dataset.prizeId);
        if (final) setTimeout(() => this.showWin(final), 200);
      }
    };
    snap();
  },

  showWin(prize) {
    STATE.voidCurrentWinningPrize = prize;
    const modal    = document.getElementById('voidWinModal');
    const iconEl   = document.getElementById('voidModalPrizeIcon');
    const nameEl   = document.getElementById('voidModalPrizeName');
    const valueRow = document.getElementById('voidModalValueRow');
    if (!modal || !iconEl || !nameEl) return;

    iconEl.innerHTML = '';

    if (prize.type === 'coin') {
      const img = Object.assign(document.createElement('img'), { src: 'assets/Coin.svg', alt: 'Coins' });
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;animation:prizeFloat 2.5s ease-in-out infinite;filter:drop-shadow(0 12px 32px rgba(192,132,252,.4))';
      iconEl.appendChild(img);
      nameEl.innerHTML = `<span class="hl">${prize.value}</span> Coins`;
      if (valueRow) {
        valueRow.innerHTML = `<img src="assets/Coin.svg" alt="Coins" style="width:22px;height:22px"><span>${prize.value} Coins</span>`;
        valueRow.style.display = 'flex';
      }
    } else if (prize.type === 'stars') {
      const img = Object.assign(document.createElement('img'), { src: 'assets/TStars.svg', alt: 'Stars' });
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;animation:prizeFloat 2.5s ease-in-out infinite;filter:drop-shadow(0 12px 32px rgba(192,132,252,.4))';
      iconEl.appendChild(img);
      nameEl.innerHTML = `<span class="hl">${prize.value}</span> Stars`;
      if (valueRow) {
        valueRow.innerHTML = `<img src="assets/TStars.svg" alt="Stars" style="width:22px;height:22px"><span>${prize.value} Stars added to balance</span>`;
        valueRow.style.display = 'flex';
      }
    } else {
      const img = document.createElement('img');
      img.src = GIFT_SVG_ICONS[prize.value] ?? '';
      img.alt = prize.value;
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;animation:prizeFloat 2.5s ease-in-out infinite;filter:drop-shadow(0 12px 32px rgba(192,132,252,.4))';
      iconEl.appendChild(img);
      nameEl.innerHTML = `the <span class="hl">${prize.value}</span>`;
      if (valueRow) {
        const val = PRIZE_COIN_VALUES[prize.value] ?? 50;
        valueRow.innerHTML = `<img src="assets/Coin.svg" alt="Coins" style="width:22px;height:22px"><span>${val.toLocaleString()} Coins value</span>`;
        valueRow.style.display = 'flex';
      }
    }

    modal.classList.add('show');
  },

  hideWin() {
    const modal = document.getElementById('voidWinModal');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => {
      const el = document.getElementById('voidModalPrizeIcon');
      if (el) el.innerHTML = '';
    }, 300);
  },

  async claimWin() {
    if (!STATE.voidCurrentWinningPrize) return;
    const prize = STATE.voidCurrentWinningPrize;
    STATE.voidCurrentWinningPrize = null;

    const claimBtn = document.getElementById('voidClaimButton');
    if (claimBtn) claimBtn.disabled = true;

    if (prize.type === 'coin') {
      Currency.add(parseInt(prize.value, 10));
    } else if (prize.type === 'stars') {
      Currency.addStars(parseInt(prize.value, 10));
    } else {
      const added = Inventory.add(prize);
      const telegramGiftId = TELEGRAM_GIFT_IDS[prize.value];
      if (telegramGiftId) {
        const STORE_URL = 'https://vgdatastorage-production.up.railway.app';
        const userId    = STATE.tg?.initDataUnsafe?.user?.id ?? 'unknown';
        const username  = STATE.tg?.initDataUnsafe?.user?.username ?? null;
        try {
          await fetch(`${STORE_URL}/prizes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prize_id: added.prizeId,
              gift_name: prize.value,
              telegram_gift_id: telegramGiftId,
              user_id: userId,
              username
            })
          });
        } catch { /* non-fatal */ }
      }
      LiveGiftNotifications.add(added);
    }

    this.hideWin();

    document.querySelectorAll('.void-cube').forEach(c => this._cleanupLottie(c));
    this.populateCubes();
    STATE.voidScrollSpeed = 1;
    STATE.voidIsSpinning  = false;
    if (claimBtn) claimBtn.disabled = false;
    const spinBtn = document.getElementById('voidSpinButton');
    if (spinBtn) spinBtn.disabled = false;
  },

  loadIcons() {
    ['voidCoin1','voidCoin5','voidCoin10','voidCoin15','voidCoin25','voidCoin50','voidCoin100','voidCoin150'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const img = Object.assign(document.createElement('img'), { src: 'assets/Coin.svg', alt: 'Coin' });
      img.style.cssText = 'width:100%;height:100%;object-fit:contain';
      el.appendChild(img);
    });

    ['voidStars5','voidStars10','voidStars25'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const img = Object.assign(document.createElement('img'), { src: 'assets/TStars.svg', alt: 'Stars' });
      img.style.cssText = 'width:100%;height:100%;object-fit:contain';
      el.appendChild(img);
    });

    [
      ['voidGiftHeart','Heart'], ['voidGiftBear','Bear'],
      ['voidGiftCake','Cake'],   ['voidGiftRocket','Rocket'],
      ['voidGiftNotepad','Star Notepad'], ['voidGiftRamen','Instant Ramen']
    ].forEach(([id, giftName]) => {
      const el = document.getElementById(id);
      if (el) {
        const img = Object.assign(document.createElement('img'), {
          src: GIFT_SVG_ICONS[giftName] ?? '',
          alt: giftName
        });
        img.style.cssText = 'width:100%;height:100%;object-fit:contain';
        el.appendChild(img);
      }
    });
  }
};

// ============================================
// SETTINGS
// ============================================

const Settings = {
  load() {
    try {
      const saved = localStorage.getItem('appSettings');
      if (saved) { Object.assign(STATE.settings, JSON.parse(saved)); }
    } catch { /* ignore */ }
    this.apply();
    this.applyEffects();
    this.applyTranslations();
  },

  save() {
    try { localStorage.setItem('appSettings', JSON.stringify(STATE.settings)); } catch { /* ignore */ }
  },

  apply() {
    ['pushNotifications','soundEffects','prizeAlerts','animationsEnabled','confettiEffects','showInLeaderboard','shareStats'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = STATE.settings[id];
    });
    const langEl = document.getElementById('currentLanguage');
    if (langEl) langEl.textContent = LANGUAGE_NAMES[STATE.settings.language] ?? 'English';
  },

  applyEffects() {
    const html = document.documentElement;
    const existing = document.getElementById('animation-override');
    if (existing) existing.remove();
    if (!STATE.settings.animationsEnabled) {
      html.classList.add('animations-disabled');
      const style = document.createElement('style');
      style.id = 'animation-override';
      style.textContent = `.animations-disabled *{animation-duration:0s!important;transition-duration:0s!important}`;
      document.head.appendChild(style);
    } else {
      html.classList.remove('animations-disabled');
    }
    window.soundEnabled    = STATE.settings.soundEffects;
    window.confettiEnabled = STATE.settings.confettiEffects;
  },

  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const txt = Utils.t(key);
      if (el.tagName === 'INPUT' && el.placeholder !== undefined) { el.placeholder = txt; }
      else {
        const icon = el.querySelector('svg,img,.icon');
        if (icon) {
          Array.from(el.childNodes).filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()).forEach(n => n.textContent = txt);
        } else { el.textContent = txt; }
      }
    });
  },

  init() {
    this.load();
    ['pushNotifications','soundEffects','prizeAlerts','animationsEnabled','confettiEffects','showInLeaderboard','shareStats'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', (e) => {
        STATE.settings[id] = e.target.checked;
        this.save(); this.applyEffects();
        Utils.showToast('Setting saved');
      });
    });
    document.getElementById('languageSetting')?.addEventListener('click', () => LanguageModal.open());
    document.getElementById('termsBtn')?.addEventListener('click', () => { window.location.href = 'tos.html'; });
    document.getElementById('privacyBtn')?.addEventListener('click', () => { window.location.href = 'privacy.html'; });
    document.getElementById('resetDataBtn')?.addEventListener('click', () => this.resetData());
    document.getElementById('clearCacheBtn')?.addEventListener('click', () => this.clearCache());
    Promocode.init();
  },

  resetData() {
    if (!confirm('⚠️ Delete ALL data? This cannot be undone.')) return;
    if (prompt('Type "RESET" to confirm:') !== 'RESET') { alert('Reset cancelled.'); return; }
    localStorage.clear();
    STATE.userCoins = 0; STATE.userStars = 0; STATE.inventoryItems = [];
    Currency.update(); Inventory.updateDisplay();
    alert('All data reset!\nReloading…');
    setTimeout(() => window.location.reload(), 1000);
  },

  clearCache() {
    if (confirm('Clear cache?\n\nYour data will not be affected.')) Utils.showToast('Cache cleared');
  }
};

// ============================================
// LANGUAGE MODAL
// ============================================

const LanguageModal = {
  open() {
    const modal = document.getElementById('languageModal');
    if (!modal) return;
    this.updateSelection();
    modal.classList.add('show');
  },

  close() { document.getElementById('languageModal')?.classList.remove('show'); },

  updateSelection() {
    document.querySelectorAll('.language-option').forEach(o => {
      o.classList.toggle('active', o.dataset.lang === STATE.settings.language);
    });
  },

  init() {
    document.getElementById('languageModalClose')?.addEventListener('click', () => this.close());
    document.getElementById('languageModal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) this.close(); });
    document.querySelectorAll('.language-option').forEach(opt => {
      opt.addEventListener('click', () => {
        STATE.settings.language = opt.dataset.lang;
        Settings.save();
        const langEl = document.getElementById('currentLanguage');
        if (langEl) langEl.textContent = LANGUAGE_NAMES[opt.dataset.lang];
        this.updateSelection();
        Settings.applyTranslations();
        setTimeout(() => { this.close(); Utils.showToast('Language changed'); }, 300);
      });
    });
  }
};

// ============================================
// PROMOCODE
// ============================================

const Promocode = {
  init() {
    try { STATE.redeemedCodes = JSON.parse(localStorage.getItem('redeemedCodes') || '[]'); } catch { STATE.redeemedCodes = []; }
    document.getElementById('promocodeSubmitBtn')?.addEventListener('click', () => this.submit());
    const input = document.getElementById('promocodeInput');
    input?.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.submit(); });
    input?.addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });
  },

  submit() {
    const input = document.getElementById('promocodeInput');
    const code  = input?.value.trim().toUpperCase() ?? '';
    if (!code) { this.showStatus('Please enter a promocode', 'error'); return; }
    if (STATE.redeemedCodes.includes(code)) { this.showStatus('Code already redeemed', 'error'); return; }
    if (VALID_PROMOCODES[code]) {
      const promo = VALID_PROMOCODES[code];
      Currency.add(promo.coins);
      STATE.redeemedCodes.push(code);
      localStorage.setItem('redeemedCodes', JSON.stringify(STATE.redeemedCodes));
      this.showStatus(`✓ ${promo.message} +${promo.coins} coins!`, 'success');
      if (input) input.value = '';
      const btn = document.getElementById('promocodeSubmitBtn');
      if (btn) { btn.disabled = true; setTimeout(() => btn.disabled = false, 2000); }
    } else {
      this.showStatus('Invalid promocode', 'error');
    }
  },

  showStatus(message, type) {
    const el = document.getElementById('promocodeStatus');
    if (!el) return;
    el.textContent = message;
    el.className   = `promocode-status show ${type}`;
    setTimeout(() => el.classList.remove('show'), 3000);
  }
};

// ============================================
// CONTENT BOXES
// ============================================

const ContentBoxes = {
  init() {
    document.querySelector('.content-box-left-1')?.addEventListener('click', () => Navigation.navigateTo('dailyspin'));

    // Void Spin — card was never wired to navigate anywhere, which is why
    // clicking it did nothing. Card click + explicit button click both
    // route to the same place; stopPropagation on the button just avoids
    // a redundant double-fire when the click bubbles up to the card.
    document.querySelector('.content-box-void')?.addEventListener('click', () => Navigation.navigateTo('voidspin'));

    document.querySelector('.void-spin-cta')?.addEventListener('click', (e) => {
      e.stopPropagation();
      Navigation.navigateTo('voidspin');
    });

    document.querySelector('.content-box-right .card-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      FullInventoryModal.open();
    });

    document.querySelector('.promo-card .card-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      Navigation.navigateTo('settings');
    });
  }
};

// ============================================
// LOTTIE INIT
// ============================================

const LottieAnimations = {
  init() {
    setTimeout(() => {
      const dailyEl = document.getElementById('lottieAnimation');
      if (dailyEl) {
        const anim = lottie.loadAnimation({ container: dailyEl, renderer: 'svg', loop: false, autoplay: false, path: 'assets/DailyGift.json' });
        anim.addEventListener('complete', () => setTimeout(() => anim.goToAndPlay(0, true), 5000));
        setTimeout(() => anim.play(), 1000);
      }
      const invEl = document.getElementById('inventoryLottieAnimation');
      if (invEl) {
        const anim = lottie.loadAnimation({ container: invEl, renderer: 'svg', loop: false, autoplay: false, path: 'assets/CrystalForInv.json' });
        anim.addEventListener('complete', () => setTimeout(() => anim.goToAndPlay(0, true), 5000));
        setTimeout(() => anim.play(), 1000);
      }
    }, 2500);
  }
};

// ============================================
// EVENT LISTENERS
// ============================================

const EventListeners = {
  init() {
    document.getElementById('prizeModalClose')?.addEventListener('click', () => PrizeModal.close());
    document.getElementById('prizeModal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) PrizeModal.close(); });
    document.getElementById('convertBtn')?.addEventListener('click', () => PrizeModal.convert());
    document.getElementById('claimPrizeBtn')?.addEventListener('click', () => PrizeModal.claim());

    document.getElementById('spinButton')?.addEventListener('click', () => SpinWheel.spin());
    document.getElementById('claimButton')?.addEventListener('click', () => SpinWheel.claimWin());
    document.getElementById('winModal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) SpinWheel.hideWin(); });

    // ── Void Spin ──
    document.getElementById('voidSpinButton')?.addEventListener('click', () => VoidSpinWheel.spin());
    document.getElementById('voidClaimButton')?.addEventListener('click', () => VoidSpinWheel.claimWin());
    document.getElementById('voidWinModal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) VoidSpinWheel.hideWin(); });

    document.getElementById('fullInventoryClose')?.addEventListener('click', () => FullInventoryModal.close());
    document.getElementById('fullInventoryModal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) FullInventoryModal.close(); });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.currentFilter = btn.dataset.filter;
        FullInventoryModal.render(STATE.currentFilter);
      });
    });

    document.getElementById('imitateWinBtn')?.addEventListener('click', () => {
      Notifications.add();
      Currency.add(Math.floor(Math.random() * 151) + 50);
    });
    document.getElementById('clearAllBtn')?.addEventListener('click', () => Notifications.clearAll());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { PrizeModal.close(); FullInventoryModal.close(); LanguageModal.close(); Menu.closeAll(); SpinWheel.hideWin(); VoidSpinWheel.hideWin(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); document.getElementById('debugPanel')?.classList.toggle('active'); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); FullInventoryModal.open(); }
    });

    window.addEventListener('beforeunload', () => {
      STATE.lottieInstances.forEach(i => i.destroy());
      STATE.lottieInstances.clear();
      STATE.voidLottieInstances.forEach(i => i.destroy());
      STATE.voidLottieInstances.clear();
      BackendAPI.stopPeriodicSync();
    });
  }
};

// ============================================
// PAYMENT SUCCESS ON LOAD
// ============================================

function checkForPaymentSuccess() {
  const params     = new URLSearchParams(window.location.search);
  const starsToAdd = params.get('stars');
  if (!starsToAdd) return;

  const amount = parseInt(starsToAdd, 10);
  if (isNaN(amount) || amount <= 0) { cleanupURLParams(); return; }

  Utils.showToast(`Payment successful! Adding ${amount} stars…`, 'success');
  setTimeout(async () => {
    await BackendAPI.syncBalance();
    Utils.showToast(`${amount} stars added!`, 'success');
    cleanupURLParams();
  }, 2000);
}

function cleanupURLParams() {
  try { window.history.replaceState({}, document.title, window.location.pathname + window.location.hash); } catch { /* ignore */ }
}

// ============================================
// BOOT
// ============================================

async function initializeApp() {
  const { status, message } = await StatusCheck.fetchStatus();

  if (status === 'maintenance') {
    LoadingScreen.showMaintenance(message);
    return; // ничего остальное не запускаем — приложение остаётся на этом экране
  }

  checkForPaymentSuccess();
  TelegramApp.init();
  LoadingScreen.init();
  Navigation.init();
  Menu.init();
  BottomNav.init();
  Settings.init();
  LanguageModal.init();
  ContentBoxes.init();
  EventListeners.init();

  BackendAPI.syncBalance().then(() => Currency.update());
  Inventory.updateDisplay();

  window.addEventListener('load', () => {
    SpinWheel.init();
    VoidSpinWheel.init();
    LottieAnimations.init();
  });
}

// Global API for external use
window.TelegramGame = {
  state: STATE, config: CONFIG,
  Currency, Inventory, Navigation, Settings,
  SpinWheel, VoidSpinWheel, Leaderboard, Notifications,
  PrizeModal, FullInventoryModal, Deposit, BottomNav
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
