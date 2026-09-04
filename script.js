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
  'WELCOME100': { coins: 100, messageKey: 'promoWelcome' },
  'LUCKY777':   { coins: 777, messageKey: 'promoLucky' },
  'FREECOINS':  { coins: 50,  messageKey: 'promoFree' },
  'VOIDGIFT':   { coins: 200, messageKey: 'promoVoidGift' },
  'SPIN2WIN':   { coins: 150, messageKey: 'promoSpin2Win' }
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
  ],
  
  ton: [
    { id: 'ton_tiny',   amount: 0.5, stars: 200,   popular: false },
    { id: 'ton_small',  amount: 1,   stars: 400,   popular: false },
    { id: 'ton_medium', amount: 3,   stars: 1200,  popular: true  },
    { id: 'ton_large',  amount: 5,   stars: 2000,  popular: false },
    { id: 'ton_xl',     amount: 10,  stars: 4000,  popular: false },
    { id: 'ton_mega',   amount: 25,  stars: 10000, popular: false }
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
  soundEffects: true,
  prizeAlerts: true,
  animationsEnabled: true,
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
    home: 'Home',
    leaderboard: 'Leaderboard',
    inventory: 'Items',
    deposit: 'Deposit',
    settings: 'Settings',
    customizeExperience: 'Customize your experience',
    promocode: 'Promocode',
    language: 'Language',
    appLanguage: 'App Language',
    chooseLanguage: 'Choose your preferred language',
    notifications: 'Notifications',
    display: 'Display',
    privacy: 'Privacy',
    dangerZone: 'Danger Zone',
    topPlayers: 'Leaderboard',

    copyright: '© 2025 Copyright All Rights Reserved',
    liveGifts: '▸ live gifts',
    more: '▸ more',

    dailyRewardEyebrow: 'daily reward',
    bagOfLoot: 'Bag of',
    lootHighlight: 'Loot!',
    dailyRewardSub: 'Your free daily gift — open it before midnight.',
    openGift: 'Open Gift',

    yourItemsEyebrow: 'your items',
    inventoryHighlight: 'Inventory',
    inventorySub: 'Collected prizes and gifts.',
    viewAllItems: 'View All Items',

    premiumSpinEyebrow: 'premium spin',
    voidSpinTitle: 'VOID',
    voidSpinTitleSuffix: 'Spin',
    voidSpinSub: 'Higher stakes — NFTs, Stars, and rare gifts up for grabs.',
    starsWord: 'Stars',
    spinNow: 'Spin Now',

    freeDropsEyebrow: 'free drops every day',
    freeHighlight: 'FREE',
    channelSuffix: 'Channel',
    channelSub: 'Join to never miss a giveaway or secret code.',
    joinChannel: 'Join Channel',

    exclusiveRewardsEyebrow: 'exclusive rewards',
    enterCodesFor: 'Enter codes for',
    prizesHighlight: 'prizes!',
    findCodes: 'Find codes in our',
    telegramWord: 'telegram',
    channelWord: 'channel.',
    enterCode: 'Enter Code',

    contactSupport: 'Contact Support',
    settingsAndCodes: 'Settings & Codes',

    updatesEvery24h: 'updates every 24 hours',
    tabCoins: 'Coins',
    tabGifts: 'Gifts',
    tabStars: 'Stars',
    yourRank: 'Your Rank',

    depositEyebrow: 'telegram stars',
    depositTitle: 'Deposit',
    depositSubtitle: 'purchase coins with Telegram Stars',
    tabTelegramStars: 'Telegram Stars',
    tabTonCoin: 'TON Coin',
    securePayment: 'Secure Payment',
    securePaymentDesc: 'All transactions are processed securely through Telegram. Coins are delivered instantly.',
    purchase: 'Purchase',
    popular: 'Popular',

    promocodePlaceholder: 'Enter promocode...',
    promocodeInfo: 'Enter a valid promocode to receive rewards',

    soundEffects: 'Sound Effects',
    soundEffectsDesc: 'Play sounds when spinning',
    prizeAlerts: 'Prize Alerts',
    prizeAlertsDesc: 'Notify on rare prizes',
    animations: 'Animations',
    animationsDesc: 'Smooth animations and effects',
    showInLeaderboard: 'Show in Leaderboard',
    showInLeaderboardDesc: 'Public stats visibility',
    shareStatistics: 'Share Statistics',
    shareStatisticsDesc: 'Allow sharing stats with friends',

    about: 'About',
    termsOfService: 'Terms of Service',
    termsOfServiceDesc: 'Read our terms and conditions',
    privacyPolicy: 'Privacy Policy',
    privacyPolicyDesc: 'How we handle your data',
    version: 'Version',
    versionDesc: 'App version information',

    resetAllData: 'Reset All Data',
    clearCache: 'Clear Cache',

    backToHome: 'Home',
    whatCanIGet: 'What can I',
    getWord: 'get?',
    spinButton: 'SPIN!',
    coinPrizes: 'Coin Prizes',
    starPrizes: 'Star Prizes',

    youWon: 'you won',
    claim: 'Claim!',

    yourPrize: 'your prize',
    convertToCoins: 'Convert to Coins',
    claimPrize: 'Claim Prize',
    coinsWord: 'Coins',
    coinsValue: 'Coins value',
    starsAddedToBalance: 'Stars added to balance',

    selectLanguage: 'Select Language',

    yourCompleteInventory: 'Your Complete Inventory',
    totalGifts: 'Total Gifts',
    totalValue: 'Total Value',
    rareGifts: 'Rare Gifts',
    filterAll: 'All Gifts',
    filterTelegram: 'Telegram Gifts',
    filterNft: 'NFTs',
    filterRare: 'Rare Only',
    noGiftsYet: 'No Gifts Yet',
    noGiftsYetDesc: 'Win your first gift by spinning the wheel!',

    settingSaved: 'Setting saved',
    languageChanged: 'Language changed',
    paymentSuccessAdding: 'Payment successful! Adding {n} stars…',
    starsAdded: '{n} stars added!',
    notEnoughStars: 'Not enough Stars — need {n} ⭐',
    creatingInvoice: 'Creating invoice…',
    paymentCancelled: 'Payment cancelled',
    paymentFailed: 'Payment failed. Please try again.',
    claimingGift: 'Claiming your gift…',
    giftSentToTelegram: '{name} sent to your Telegram!',
    failedToClaim: 'Failed to claim: {msg}',
    noPrizeSelected: 'No prize selected',
    telegramUnavailable: 'Telegram unavailable',
    giftMappingError: 'Gift mapping error: {name}',
    cacheCleared: 'Cache cleared',
    telegramWebAppUnavailable: 'Telegram WebApp not available',
    userIdUnavailable: 'User ID not available',
    invoiceError: 'Error: {msg}',
    giftSentPopupTitle: 'Gift Sent!',
    giftSentPopupMessage: 'Your {name} gift has been sent to your Telegram account!',
    claimFailedPopupTitle: 'Claim Failed',
    connectWallet: 'Connect Wallet',
    chooseWallet: 'Choose a Wallet',
    noWalletFound: 'No wallet found',
    walletNotConnectedWarning: '⚠️ Connect a wallet to purchase with TON',
    walletNotConnected: 'Not connected',
    walletConnected: 'Wallet Connected',
    tonPurchaseTitle: 'Purchase with TON',
    payWithWallet: 'Pay with this wallet',
    useAnotherWallet: 'Use another wallet',
    connectAWallet: 'Connect a Wallet',
    connectingWallet: 'Waiting for wallet connection…',
    confirmInWalletApp: 'Confirm the payment in your wallet app…',
    waitingTonConfirmation: 'Waiting for on-chain confirmation…',
    tonPaymentSuccessTitle: 'Payment Confirmed',
    tonPaymentSuccessDesc: '{n} stars have been added to your balance.',
    tonPaymentFailedTitle: 'Payment Failed',
    tonConfirmationPendingTitle: 'Still Confirming',
    tonConfirmationPendingDesc: "This can take a few minutes on-chain. Your stars will be added automatically once it's confirmed — no need to keep this open.",
    done: 'Done',
    close: 'Close',
    tryAgain: 'Try Again',
    disconnectWallet: 'Disconnect Wallet',
    disconnected: 'Wallet disconnected',

    promoEnterCode: 'Please enter a promocode',
    promoAlreadyRedeemed: 'Code already redeemed',
    promoInvalid: 'Invalid promocode',
    promoRedeemed: '✓ {message} +{coins} coins!',
    promoWelcome: 'Welcome bonus claimed!',
    promoLucky: 'Lucky bonus activated!',
    promoFree: 'Free coins added!',
    promoVoidGift: 'Special gift redeemed!',
    promoSpin2Win: 'Spin bonus unlocked!',

    confirmResetData: '⚠️ Delete ALL data? This cannot be undone.',
    confirmResetType: 'Type "RESET" to confirm:',
    resetCancelled: 'Reset cancelled.',
    allDataReset: 'All data reset!\nReloading…',
    confirmClearCache: 'Clear cache?\n\nYour data will not be affected.'
  },
  ru: {
    home: 'Главная',
    leaderboard: 'Лидеры',
    inventory: 'Вещи',
    deposit: 'Депозит',
    settings: 'Настройки',
    customizeExperience: 'Настройте свой опыт',
    promocode: 'Промокод',
    language: 'Язык',
    appLanguage: 'Язык приложения',
    chooseLanguage: 'Выберите предпочитаемый язык',
    notifications: 'Уведомления',
    display: 'Экран',
    privacy: 'Приватность',
    dangerZone: 'Опасная зона',
    topPlayers: 'Лидеры',

    copyright: '© 2025 Все права защищены',
    liveGifts: '▸ подарки в реальном времени',
    more: '▸ ещё',

    dailyRewardEyebrow: 'ежедневная награда',
    bagOfLoot: 'Мешок',
    lootHighlight: 'добычи!',
    dailyRewardSub: 'Ваш бесплатный ежедневный подарок — заберите до полуночи.',
    openGift: 'Открыть подарок',

    yourItemsEyebrow: 'ваши предметы',
    inventoryHighlight: 'Инвентарь',
    inventorySub: 'Полученные призы и подарки.',
    viewAllItems: 'Все предметы',

    premiumSpinEyebrow: 'премиум-спин',
    voidSpinTitle: 'VOID',
    voidSpinTitleSuffix: 'Spin',
    voidSpinSub: 'Выше ставки — NFT, звёзды и редкие подарки.',
    starsWord: 'Звёзд',
    spinNow: 'Крутить',

    freeDropsEyebrow: 'бесплатные дропы каждый день',
    freeHighlight: 'FREE',
    channelSuffix: 'Канал',
    channelSub: 'Подпишитесь, чтобы не пропустить розыгрыш или секретный код.',
    joinChannel: 'Подписаться',

    exclusiveRewardsEyebrow: 'эксклюзивные награды',
    enterCodesFor: 'Введите коды на',
    prizesHighlight: 'призы!',
    findCodes: 'Ищите коды в нашем',
    telegramWord: 'телеграм',
    channelWord: 'канале.',
    enterCode: 'Ввести код',

    contactSupport: 'Связаться с поддержкой',
    settingsAndCodes: 'Настройки и коды',

    updatesEvery24h: 'обновляется каждые 24 часа',
    tabCoins: 'Монеты',
    tabGifts: 'Подарки',
    tabStars: 'Звёзды',
    yourRank: 'Ваш ранг',

    depositEyebrow: 'telegram stars',
    depositTitle: 'Депозит',
    depositSubtitle: 'покупайте монеты за Telegram Stars',
    tabTelegramStars: 'Telegram Stars',
    tabTonCoin: 'TON Coin',
    securePayment: 'Безопасная оплата',
    securePaymentDesc: 'Все транзакции обрабатываются безопасно через Telegram. Монеты зачисляются мгновенно.',
    purchase: 'Купить',
    popular: 'Популярно',

    promocodePlaceholder: 'Введите промокод...',
    promocodeInfo: 'Введите действующий промокод, чтобы получить награду',

    soundEffects: 'Звуковые эффекты',
    soundEffectsDesc: 'Воспроизводить звуки при вращении',
    prizeAlerts: 'Уведомления о призах',
    prizeAlertsDesc: 'Уведомлять о редких призах',
    animations: 'Анимации',
    animationsDesc: 'Плавные анимации и эффекты',
    showInLeaderboard: 'Показывать в рейтинге',
    showInLeaderboardDesc: 'Видимость публичной статистики',
    shareStatistics: 'Делиться статистикой',
    shareStatisticsDesc: 'Разрешить делиться статистикой с друзьями',

    about: 'О приложении',
    termsOfService: 'Условия использования',
    termsOfServiceDesc: 'Прочитайте наши условия',
    privacyPolicy: 'Политика конфиденциальности',
    privacyPolicyDesc: 'Как мы обрабатываем ваши данные',
    version: 'Версия',
    versionDesc: 'Информация о версии приложения',

    resetAllData: 'Сбросить все данные',
    clearCache: 'Очистить кэш',

    backToHome: 'Домой',
    whatCanIGet: 'Что можно',
    getWord: 'получить?',
    spinButton: 'КРУТИТЬ!',
    coinPrizes: 'Призовые монеты',
    starPrizes: 'Призовые звёзды',

    youWon: 'вы выиграли',
    claim: 'Забрать!',

    yourPrize: 'ваш приз',
    convertToCoins: 'Обменять на монеты',
    claimPrize: 'Забрать приз',
    coinsWord: 'Монет',
    coinsValue: 'монет стоимостью',
    starsAddedToBalance: 'звёзд зачислено на баланс',

    selectLanguage: 'Выберите язык',

    yourCompleteInventory: 'Ваш полный инвентарь',
    totalGifts: 'Всего подарков',
    totalValue: 'Общая стоимость',
    rareGifts: 'Редкие подарки',
    filterAll: 'Все подарки',
    filterTelegram: 'Подарки Telegram',
    filterNft: 'NFT',
    filterRare: 'Только редкие',
    noGiftsYet: 'Пока нет подарков',
    noGiftsYetDesc: 'Выиграйте первый подарок, крутанув колесо!',

    settingSaved: 'Настройка сохранена',
    languageChanged: 'Язык изменён',
    paymentSuccessAdding: 'Оплата прошла успешно! Начисляем {n} звёзд…',
    starsAdded: 'Начислено {n} звёзд!',
    notEnoughStars: 'Недостаточно звёзд — нужно {n} ⭐',
    creatingInvoice: 'Создаём счёт…',
    paymentCancelled: 'Оплата отменена',
    paymentFailed: 'Оплата не удалась. Попробуйте снова.',
    claimingGift: 'Забираем ваш подарок…',
    giftSentToTelegram: '{name} отправлен в ваш Telegram!',
    failedToClaim: 'Не удалось забрать: {msg}',
    noPrizeSelected: 'Приз не выбран',
    telegramUnavailable: 'Telegram недоступен',
    giftMappingError: 'Ошибка сопоставления подарка: {name}',
    cacheCleared: 'Кэш очищен',
    telegramWebAppUnavailable: 'Telegram WebApp недоступен',
    userIdUnavailable: 'ID пользователя недоступен',
    invoiceError: 'Ошибка: {msg}',
    giftSentPopupTitle: 'Подарок отправлен!',
    giftSentPopupMessage: 'Ваш подарок «{name}» отправлен в ваш аккаунт Telegram!',
    claimFailedPopupTitle: 'Не удалось забрать',

    promoEnterCode: 'Пожалуйста, введите промокод',
    promoAlreadyRedeemed: 'Код уже использован',
    promoInvalid: 'Неверный промокод',
    promoRedeemed: '✓ {message} +{coins} монет!',
    promoWelcome: 'Приветственный бонус получен!',
    promoLucky: 'Счастливый бонус активирован!',
    promoFree: 'Бесплатные монеты начислены!',
    promoVoidGift: 'Особый подарок получен!',
    promoSpin2Win: 'Бонус спина разблокирован!',

    confirmResetData: '⚠️ Удалить ВСЕ данные? Это действие необратимо.',
    confirmResetType: 'Введите "RESET" для подтверждения:',
    resetCancelled: 'Сброс отменён.',
    allDataReset: 'Все данные сброшены!\nПерезагрузка…',
    confirmClearCache: 'Очистить кэш?\n\nВаши данные не будут затронуты.'
  },
  es: {
    home: 'Inicio',
    leaderboard: 'Clasificación',
    inventory: 'Objetos',
    deposit: 'Depósito',
    settings: 'Configuración',
    customizeExperience: 'Personaliza tu experiencia',
    promocode: 'Código promocional',
    language: 'Idioma',
    appLanguage: 'Idioma de la app',
    chooseLanguage: 'Elige tu idioma preferido',
    notifications: 'Notificaciones',
    display: 'Pantalla',
    privacy: 'Privacidad',
    dangerZone: 'Zona de peligro',
    topPlayers: 'Clasificación',

    copyright: '© 2025 Todos los derechos reservados',
    liveGifts: '▸ regalos en vivo',
    more: '▸ más',

    dailyRewardEyebrow: 'recompensa diaria',
    bagOfLoot: 'Bolsa de',
    lootHighlight: 'botín!',
    dailyRewardSub: 'Tu regalo diario gratuito — ábrelo antes de medianoche.',
    openGift: 'Abrir regalo',

    yourItemsEyebrow: 'tus objetos',
    inventoryHighlight: 'Inventario',
    inventorySub: 'Premios y regalos recolectados.',
    viewAllItems: 'Ver todos los objetos',

    premiumSpinEyebrow: 'giro premium',
    voidSpinTitle: 'VOID',
    voidSpinTitleSuffix: 'Spin',
    voidSpinSub: 'Apuestas más altas — NFTs, Stars y regalos raros en juego.',
    starsWord: 'Stars',
    spinNow: 'Girar ahora',

    freeDropsEyebrow: 'drops gratis cada día',
    freeHighlight: 'GRATIS',
    channelSuffix: 'Canal',
    channelSub: 'Únete para no perderte ningún sorteo o código secreto.',
    joinChannel: 'Unirse al canal',

    exclusiveRewardsEyebrow: 'recompensas exclusivas',
    enterCodesFor: 'Introduce códigos para',
    prizesHighlight: 'premios!',
    findCodes: 'Encuentra códigos en nuestro',
    telegramWord: 'telegram',
    channelWord: 'canal.',
    enterCode: 'Introducir código',

    contactSupport: 'Contactar soporte',
    settingsAndCodes: 'Configuración y códigos',

    updatesEvery24h: 'se actualiza cada 24 horas',
    tabCoins: 'Monedas',
    tabGifts: 'Regalos',
    tabStars: 'Stars',
    yourRank: 'Tu posición',

    depositEyebrow: 'telegram stars',
    depositTitle: 'Depósito',
    depositSubtitle: 'compra monedas con Telegram Stars',
    tabTelegramStars: 'Telegram Stars',
    tabTonCoin: 'TON Coin',
    securePayment: 'Pago seguro',
    securePaymentDesc: 'Todas las transacciones se procesan de forma segura a través de Telegram. Las monedas se entregan al instante.',
    purchase: 'Comprar',
    popular: 'Popular',

    promocodePlaceholder: 'Introduce el código promocional...',
    promocodeInfo: 'Introduce un código promocional válido para recibir recompensas',

    soundEffects: 'Efectos de sonido',
    soundEffectsDesc: 'Reproducir sonidos al girar',
    prizeAlerts: 'Alertas de premios',
    prizeAlertsDesc: 'Notificar sobre premios raros',
    animations: 'Animaciones',
    animationsDesc: 'Animaciones y efectos suaves',
    showInLeaderboard: 'Mostrar en la clasificación',
    showInLeaderboardDesc: 'Visibilidad de estadísticas públicas',
    shareStatistics: 'Compartir estadísticas',
    shareStatisticsDesc: 'Permitir compartir estadísticas con amigos',

    about: 'Acerca de',
    termsOfService: 'Términos de servicio',
    termsOfServiceDesc: 'Lee nuestros términos y condiciones',
    privacyPolicy: 'Política de privacidad',
    privacyPolicyDesc: 'Cómo manejamos tus datos',
    version: 'Versión',
    versionDesc: 'Información de la versión de la app',

    resetAllData: 'Restablecer todos los datos',
    clearCache: 'Borrar caché',

    backToHome: 'Inicio',
    whatCanIGet: 'Qué puedo',
    getWord: 'obtener?',
    spinButton: '¡GIRAR!',
    coinPrizes: 'Premios en monedas',
    starPrizes: 'Premios en Stars',

    youWon: 'ganaste',
    claim: '¡Reclamar!',

    yourPrize: 'tu premio',
    convertToCoins: 'Convertir a monedas',
    claimPrize: 'Reclamar premio',
    coinsWord: 'Monedas',
    coinsValue: 'monedas de valor',
    starsAddedToBalance: 'Stars añadidas al saldo',

    selectLanguage: 'Seleccionar idioma',

    yourCompleteInventory: 'Tu inventario completo',
    totalGifts: 'Regalos totales',
    totalValue: 'Valor total',
    rareGifts: 'Regalos raros',
    filterAll: 'Todos los regalos',
    filterTelegram: 'Regalos de Telegram',
    filterNft: 'NFTs',
    filterRare: 'Solo raros',
    noGiftsYet: 'Aún no hay regalos',
    noGiftsYetDesc: '¡Gana tu primer regalo girando la rueda!',

    settingSaved: 'Ajuste guardado',
    languageChanged: 'Idioma cambiado',
    paymentSuccessAdding: '¡Pago exitoso! Añadiendo {n} stars…',
    starsAdded: '¡{n} stars añadidas!',
    notEnoughStars: 'No tienes suficientes Stars — necesitas {n} ⭐',
    creatingInvoice: 'Creando factura…',
    paymentCancelled: 'Pago cancelado',
    paymentFailed: 'El pago falló. Inténtalo de nuevo.',
    claimingGift: 'Reclamando tu regalo…',
    giftSentToTelegram: '¡{name} enviado a tu Telegram!',
    failedToClaim: 'No se pudo reclamar: {msg}',
    noPrizeSelected: 'Ningún premio seleccionado',
    telegramUnavailable: 'Telegram no disponible',
    giftMappingError: 'Error de mapeo del regalo: {name}',
    cacheCleared: 'Caché borrada',
    telegramWebAppUnavailable: 'Telegram WebApp no disponible',
    userIdUnavailable: 'ID de usuario no disponible',
    invoiceError: 'Error: {msg}',
    giftSentPopupTitle: '¡Regalo enviado!',
    giftSentPopupMessage: '¡Tu regalo {name} ha sido enviado a tu cuenta de Telegram!',
    claimFailedPopupTitle: 'Error al reclamar',

    promoEnterCode: 'Introduce un código promocional',
    promoAlreadyRedeemed: 'Código ya canjeado',
    promoInvalid: 'Código promocional inválido',
    promoRedeemed: '✓ {message} +{coins} monedas!',
    promoWelcome: '¡Bono de bienvenida reclamado!',
    promoLucky: '¡Bono de la suerte activado!',
    promoFree: '¡Monedas gratis añadidas!',
    promoVoidGift: '¡Regalo especial canjeado!',
    promoSpin2Win: '¡Bono de giro desbloqueado!',

    confirmResetData: '⚠️ ¿Eliminar TODOS los datos? Esto no se puede deshacer.',
    confirmResetType: 'Escribe "RESET" para confirmar:',
    resetCancelled: 'Restablecimiento cancelado.',
    allDataReset: '¡Todos los datos restablecidos!\nRecargando…',
    confirmClearCache: '¿Borrar caché?\n\nTus datos no se verán afectados.'
  },
  fr: {
    home: 'Accueil',
    leaderboard: 'Classement',
    inventory: 'Objets',
    deposit: 'Dépôt',
    settings: 'Paramètres',
    customizeExperience: 'Personnalisez votre expérience',
    promocode: 'Code promo',
    language: 'Langue',
    appLanguage: "Langue de l'application",
    chooseLanguage: 'Choisissez votre langue préférée',
    notifications: 'Notifications',
    display: 'Affichage',
    privacy: 'Confidentialité',
    dangerZone: 'Zone dangereuse',
    topPlayers: 'Classement',

    copyright: '© 2025 Tous droits réservés',
    liveGifts: '▸ cadeaux en direct',
    more: '▸ plus',

    dailyRewardEyebrow: 'récompense quotidienne',
    bagOfLoot: 'Sac de',
    lootHighlight: 'butin!',
    dailyRewardSub: 'Votre cadeau quotidien gratuit — ouvrez-le avant minuit.',
    openGift: 'Ouvrir le cadeau',

    yourItemsEyebrow: 'vos objets',
    inventoryHighlight: 'Inventaire',
    inventorySub: 'Prix et cadeaux collectés.',
    viewAllItems: 'Voir tous les objets',

    premiumSpinEyebrow: 'spin premium',
    voidSpinTitle: 'VOID',
    voidSpinTitleSuffix: 'Spin',
    voidSpinSub: 'Enjeux plus élevés — NFT, Stars et cadeaux rares à gagner.',
    starsWord: 'Stars',
    spinNow: 'Tourner',

    freeDropsEyebrow: 'drops gratuits chaque jour',
    freeHighlight: 'GRATUIT',
    channelSuffix: 'Chaîne',
    channelSub: 'Rejoignez pour ne jamais manquer un tirage ou un code secret.',
    joinChannel: 'Rejoindre la chaîne',

    exclusiveRewardsEyebrow: 'récompenses exclusives',
    enterCodesFor: 'Entrez des codes pour',
    prizesHighlight: 'des prix!',
    findCodes: 'Trouvez des codes sur notre',
    telegramWord: 'telegram',
    channelWord: 'chaîne.',
    enterCode: 'Entrer le code',

    contactSupport: 'Contacter le support',
    settingsAndCodes: 'Paramètres et codes',

    updatesEvery24h: 'mis à jour toutes les 24 heures',
    tabCoins: 'Pièces',
    tabGifts: 'Cadeaux',
    tabStars: 'Stars',
    yourRank: 'Votre rang',

    depositEyebrow: 'telegram stars',
    depositTitle: 'Dépôt',
    depositSubtitle: 'achetez des pièces avec des Telegram Stars',
    tabTelegramStars: 'Telegram Stars',
    tabTonCoin: 'TON Coin',
    securePayment: 'Paiement sécurisé',
    securePaymentDesc: 'Toutes les transactions sont traitées en toute sécurité via Telegram. Les pièces sont livrées instantanément.',
    purchase: 'Acheter',
    popular: 'Populaire',

    promocodePlaceholder: 'Entrez le code promo...',
    promocodeInfo: 'Entrez un code promo valide pour recevoir des récompenses',

    soundEffects: 'Effets sonores',
    soundEffectsDesc: 'Jouer des sons lors du spin',
    prizeAlerts: 'Alertes de prix',
    prizeAlertsDesc: 'Notifier pour les prix rares',
    animations: 'Animations',
    animationsDesc: 'Animations et effets fluides',
    showInLeaderboard: 'Afficher dans le classement',
    showInLeaderboardDesc: 'Visibilité des statistiques publiques',
    shareStatistics: 'Partager les statistiques',
    shareStatisticsDesc: 'Autoriser le partage des statistiques avec des amis',

    about: 'À propos',
    termsOfService: "Conditions d'utilisation",
    termsOfServiceDesc: 'Lisez nos conditions générales',
    privacyPolicy: 'Politique de confidentialité',
    privacyPolicyDesc: 'Comment nous traitons vos données',
    version: 'Version',
    versionDesc: "Informations sur la version de l'application",

    resetAllData: 'Réinitialiser toutes les données',
    clearCache: 'Vider le cache',

    backToHome: 'Accueil',
    whatCanIGet: 'Que puis-je',
    getWord: 'gagner?',
    spinButton: 'SPIN!',
    coinPrizes: 'Prix en pièces',
    starPrizes: 'Prix en Stars',

    youWon: 'vous avez gagné',
    claim: 'Réclamer!',

    yourPrize: 'votre prix',
    convertToCoins: 'Convertir en pièces',
    claimPrize: 'Réclamer le prix',
    coinsWord: 'Pièces',
    coinsValue: 'pièces de valeur',
    starsAddedToBalance: 'Stars ajoutées au solde',

    selectLanguage: 'Sélectionner la langue',

    yourCompleteInventory: 'Votre inventaire complet',
    totalGifts: 'Cadeaux totaux',
    totalValue: 'Valeur totale',
    rareGifts: 'Cadeaux rares',
    filterAll: 'Tous les cadeaux',
    filterTelegram: 'Cadeaux Telegram',
    filterNft: 'NFT',
    filterRare: 'Rares uniquement',
    noGiftsYet: 'Pas encore de cadeaux',
    noGiftsYetDesc: 'Gagnez votre premier cadeau en tournant la roue !',

    settingSaved: 'Paramètre enregistré',
    languageChanged: 'Langue changée',
    paymentSuccessAdding: 'Paiement réussi ! Ajout de {n} stars…',
    starsAdded: '{n} stars ajoutées !',
    notEnoughStars: 'Pas assez de Stars — {n} nécessaires ⭐',
    creatingInvoice: 'Création de la facture…',
    paymentCancelled: 'Paiement annulé',
    paymentFailed: 'Le paiement a échoué. Veuillez réessayer.',
    claimingGift: 'Réclamation de votre cadeau…',
    giftSentToTelegram: '{name} envoyé sur votre Telegram !',
    failedToClaim: 'Échec de la réclamation : {msg}',
    noPrizeSelected: 'Aucun prix sélectionné',
    telegramUnavailable: 'Telegram indisponible',
    giftMappingError: 'Erreur de mappage du cadeau : {name}',
    cacheCleared: 'Cache vidé',
    telegramWebAppUnavailable: 'Telegram WebApp non disponible',
    userIdUnavailable: "ID utilisateur non disponible",
    invoiceError: 'Erreur : {msg}',
    giftSentPopupTitle: 'Cadeau envoyé !',
    giftSentPopupMessage: 'Votre cadeau {name} a été envoyé sur votre compte Telegram !',
    claimFailedPopupTitle: 'Échec de la réclamation',

    promoEnterCode: 'Veuillez entrer un code promo',
    promoAlreadyRedeemed: 'Code déjà utilisé',
    promoInvalid: 'Code promo invalide',
    promoRedeemed: '✓ {message} +{coins} pièces !',
    promoWelcome: 'Bonus de bienvenue réclamé !',
    promoLucky: 'Bonus chanceux activé !',
    promoFree: 'Pièces gratuites ajoutées !',
    promoVoidGift: 'Cadeau spécial échangé !',
    promoSpin2Win: 'Bonus de spin débloqué !',

    confirmResetData: '⚠️ Supprimer TOUTES les données ? Ceci est irréversible.',
    confirmResetType: 'Tapez "RESET" pour confirmer :',
    resetCancelled: 'Réinitialisation annulée.',
    allDataReset: 'Toutes les données réinitialisées !\nRechargement…',
    confirmClearCache: 'Vider le cache ?\n\nVos données ne seront pas affectées.'
  },
  de: {
    home: 'Start',
    leaderboard: 'Bestenliste',
    inventory: 'Gegenstände',
    deposit: 'Einzahlung',
    settings: 'Einstellungen',
    customizeExperience: 'Passe deine Erfahrung an',
    promocode: 'Gutscheincode',
    language: 'Sprache',
    appLanguage: 'App-Sprache',
    chooseLanguage: 'Wähle deine bevorzugte Sprache',
    notifications: 'Benachrichtigungen',
    display: 'Anzeige',
    privacy: 'Datenschutz',
    dangerZone: 'Gefahrenzone',
    topPlayers: 'Bestenliste',

    copyright: '© 2025 Alle Rechte vorbehalten',
    liveGifts: '▸ Live-Geschenke',
    more: '▸ mehr',

    dailyRewardEyebrow: 'tägliche Belohnung',
    bagOfLoot: 'Beutel voller',
    lootHighlight: 'Beute!',
    dailyRewardSub: 'Dein kostenloses tägliches Geschenk — öffne es vor Mitternacht.',
    openGift: 'Geschenk öffnen',

    yourItemsEyebrow: 'deine Gegenstände',
    inventoryHighlight: 'Inventar',
    inventorySub: 'Gesammelte Preise und Geschenke.',
    viewAllItems: 'Alle Gegenstände ansehen',

    premiumSpinEyebrow: 'Premium-Spin',
    voidSpinTitle: 'VOID',
    voidSpinTitleSuffix: 'Spin',
    voidSpinSub: 'Höhere Einsätze — NFTs, Stars und seltene Geschenke zu gewinnen.',
    starsWord: 'Stars',
    spinNow: 'Jetzt drehen',

    freeDropsEyebrow: 'kostenlose Drops jeden Tag',
    freeHighlight: 'GRATIS',
    channelSuffix: 'Kanal',
    channelSub: 'Trete bei, um kein Gewinnspiel oder Geheimcode zu verpassen.',
    joinChannel: 'Kanal beitreten',

    exclusiveRewardsEyebrow: 'exklusive Belohnungen',
    enterCodesFor: 'Codes eingeben für',
    prizesHighlight: 'Preise!',
    findCodes: 'Codes findest du in unserem',
    telegramWord: 'telegram',
    channelWord: 'Kanal.',
    enterCode: 'Code eingeben',

    contactSupport: 'Support kontaktieren',
    settingsAndCodes: 'Einstellungen & Codes',

    updatesEvery24h: 'aktualisiert alle 24 Stunden',
    tabCoins: 'Münzen',
    tabGifts: 'Geschenke',
    tabStars: 'Stars',
    yourRank: 'Dein Rang',

    depositEyebrow: 'telegram stars',
    depositTitle: 'Einzahlung',
    depositSubtitle: 'kaufe Münzen mit Telegram Stars',
    tabTelegramStars: 'Telegram Stars',
    tabTonCoin: 'TON Coin',
    securePayment: 'Sichere Zahlung',
    securePaymentDesc: 'Alle Transaktionen werden sicher über Telegram abgewickelt. Münzen werden sofort gutgeschrieben.',
    purchase: 'Kaufen',
    popular: 'Beliebt',

    promocodePlaceholder: 'Gutscheincode eingeben...',
    promocodeInfo: 'Gib einen gültigen Gutscheincode ein, um Belohnungen zu erhalten',

    soundEffects: 'Soundeffekte',
    soundEffectsDesc: 'Sounds beim Drehen abspielen',
    prizeAlerts: 'Preisbenachrichtigungen',
    prizeAlertsDesc: 'Bei seltenen Preisen benachrichtigen',
    animations: 'Animationen',
    animationsDesc: 'Sanfte Animationen und Effekte',
    showInLeaderboard: 'In der Bestenliste anzeigen',
    showInLeaderboardDesc: 'Sichtbarkeit öffentlicher Statistiken',
    shareStatistics: 'Statistiken teilen',
    shareStatisticsDesc: 'Erlauben, Statistiken mit Freunden zu teilen',

    about: 'Über',
    termsOfService: 'Nutzungsbedingungen',
    termsOfServiceDesc: 'Lies unsere Allgemeinen Geschäftsbedingungen',
    privacyPolicy: 'Datenschutzrichtlinie',
    privacyPolicyDesc: 'Wie wir mit deinen Daten umgehen',
    version: 'Version',
    versionDesc: 'App-Versionsinformationen',

    resetAllData: 'Alle Daten zurücksetzen',
    clearCache: 'Cache leeren',

    backToHome: 'Start',
    whatCanIGet: 'Was kann ich',
    getWord: 'gewinnen?',
    spinButton: 'DREHEN!',
    coinPrizes: 'Münzpreise',
    starPrizes: 'Star-Preise',

    youWon: 'du hast gewonnen',
    claim: 'Abholen!',

    yourPrize: 'dein Preis',
    convertToCoins: 'In Münzen umwandeln',
    claimPrize: 'Preis abholen',
    coinsWord: 'Münzen',
    coinsValue: 'Münzen Wert',
    starsAddedToBalance: 'Stars zum Guthaben hinzugefügt',

    selectLanguage: 'Sprache auswählen',

    yourCompleteInventory: 'Dein komplettes Inventar',
    totalGifts: 'Geschenke gesamt',
    totalValue: 'Gesamtwert',
    rareGifts: 'Seltene Geschenke',
    filterAll: 'Alle Geschenke',
    filterTelegram: 'Telegram-Geschenke',
    filterNft: 'NFTs',
    filterRare: 'Nur Seltene',
    noGiftsYet: 'Noch keine Geschenke',
    noGiftsYetDesc: 'Gewinne dein erstes Geschenk, indem du das Rad drehst!',

    settingSaved: 'Einstellung gespeichert',
    languageChanged: 'Sprache geändert',
    paymentSuccessAdding: 'Zahlung erfolgreich! {n} Stars werden hinzugefügt…',
    starsAdded: '{n} Stars hinzugefügt!',
    notEnoughStars: 'Nicht genug Stars — {n} benötigt ⭐',
    creatingInvoice: 'Rechnung wird erstellt…',
    paymentCancelled: 'Zahlung abgebrochen',
    paymentFailed: 'Zahlung fehlgeschlagen. Bitte erneut versuchen.',
    claimingGift: 'Dein Geschenk wird abgeholt…',
    giftSentToTelegram: '{name} an dein Telegram gesendet!',
    failedToClaim: 'Abholen fehlgeschlagen: {msg}',
    noPrizeSelected: 'Kein Preis ausgewählt',
    telegramUnavailable: 'Telegram nicht verfügbar',
    giftMappingError: 'Geschenk-Zuordnungsfehler: {name}',
    cacheCleared: 'Cache geleert',
    telegramWebAppUnavailable: 'Telegram WebApp nicht verfügbar',
    userIdUnavailable: 'Benutzer-ID nicht verfügbar',
    invoiceError: 'Fehler: {msg}',
    giftSentPopupTitle: 'Geschenk gesendet!',
    giftSentPopupMessage: 'Dein {name}-Geschenk wurde an dein Telegram-Konto gesendet!',
    claimFailedPopupTitle: 'Abholen fehlgeschlagen',

    promoEnterCode: 'Bitte gib einen Gutscheincode ein',
    promoAlreadyRedeemed: 'Code bereits eingelöst',
    promoInvalid: 'Ungültiger Gutscheincode',
    promoRedeemed: '✓ {message} +{coins} Münzen!',
    promoWelcome: 'Willkommensbonus erhalten!',
    promoLucky: 'Glücksbonus aktiviert!',
    promoFree: 'Kostenlose Münzen hinzugefügt!',
    promoVoidGift: 'Spezielles Geschenk eingelöst!',
    promoSpin2Win: 'Spin-Bonus freigeschaltet!',

    confirmResetData: '⚠️ ALLE Daten löschen? Dies kann nicht rückgängig gemacht werden.',
    confirmResetType: 'Gib zur Bestätigung "RESET" ein:',
    resetCancelled: 'Zurücksetzen abgebrochen.',
    allDataReset: 'Alle Daten zurückgesetzt!\nWird neu geladen…',
    confirmClearCache: 'Cache leeren?\n\nDeine Daten bleiben unberührt.'
  },
  zh: {
    home: '首页',
    leaderboard: '排行榜',
    inventory: '物品',
    deposit: '充值',
    settings: '设置',
    customizeExperience: '自定义您的体验',
    promocode: '兑换码',
    language: '语言',
    appLanguage: '应用语言',
    chooseLanguage: '选择您的首选语言',
    notifications: '通知',
    display: '显示',
    privacy: '隐私',
    dangerZone: '危险区域',
    topPlayers: '排行榜',

    copyright: '© 2025 版权所有',
    liveGifts: '▸ 实时礼物',
    more: '▸ 更多',

    dailyRewardEyebrow: '每日奖励',
    bagOfLoot: '战利品',
    lootHighlight: '袋！',
    dailyRewardSub: '您的免费每日礼物 — 请在午夜前领取。',
    openGift: '打开礼物',

    yourItemsEyebrow: '您的物品',
    inventoryHighlight: '库存',
    inventorySub: '已收集的奖品和礼物。',
    viewAllItems: '查看全部物品',

    premiumSpinEyebrow: '高级转盘',
    voidSpinTitle: 'VOID',
    voidSpinTitleSuffix: 'Spin',
    voidSpinSub: '更高赌注 — NFT、星星和稀有礼物等你来拿。',
    starsWord: '星星',
    spinNow: '立即旋转',

    freeDropsEyebrow: '每日免费掉落',
    freeHighlight: '免费',
    channelSuffix: '频道',
    channelSub: '加入以不错过任何抽奖或秘密代码。',
    joinChannel: '加入频道',

    exclusiveRewardsEyebrow: '专属奖励',
    enterCodesFor: '输入兑换码获取',
    prizesHighlight: '奖品！',
    findCodes: '在我们的',
    telegramWord: 'telegram',
    channelWord: '频道中查找兑换码。',
    enterCode: '输入兑换码',

    contactSupport: '联系客服',
    settingsAndCodes: '设置与兑换码',

    updatesEvery24h: '每24小时更新一次',
    tabCoins: '金币',
    tabGifts: '礼物',
    tabStars: '星星',
    yourRank: '您的排名',

    depositEyebrow: 'telegram stars',
    depositTitle: '充值',
    depositSubtitle: '使用 Telegram Stars 购买金币',
    tabTelegramStars: 'Telegram Stars',
    tabTonCoin: 'TON Coin',
    securePayment: '安全支付',
    securePaymentDesc: '所有交易均通过 Telegram 安全处理。金币即时到账。',
    purchase: '购买',
    popular: '热门',

    promocodePlaceholder: '输入兑换码...',
    promocodeInfo: '输入有效的兑换码以获取奖励',

    soundEffects: '音效',
    soundEffectsDesc: '旋转时播放声音',
    prizeAlerts: '奖品提醒',
    prizeAlertsDesc: '稀有奖品提醒',
    animations: '动画',
    animationsDesc: '流畅的动画与特效',
    showInLeaderboard: '在排行榜中显示',
    showInLeaderboardDesc: '公开统计信息可见性',
    shareStatistics: '分享统计信息',
    shareStatisticsDesc: '允许与好友分享统计信息',

    about: '关于',
    termsOfService: '服务条款',
    termsOfServiceDesc: '阅读我们的条款和条件',
    privacyPolicy: '隐私政策',
    privacyPolicyDesc: '我们如何处理您的数据',
    version: '版本',
    versionDesc: '应用版本信息',

    resetAllData: '重置所有数据',
    clearCache: '清除缓存',

    backToHome: '首页',
    whatCanIGet: '我能获得',
    getWord: '什么？',
    spinButton: '旋转！',
    coinPrizes: '金币奖品',
    starPrizes: '星星奖品',

    youWon: '您赢得了',
    claim: '领取！',

    yourPrize: '您的奖品',
    convertToCoins: '兑换为金币',
    claimPrize: '领取奖品',
    coinsWord: '金币',
    coinsValue: '金币价值',
    starsAddedToBalance: '星星已添加到余额',

    selectLanguage: '选择语言',

    yourCompleteInventory: '您的完整库存',
    totalGifts: '礼物总数',
    totalValue: '总价值',
    rareGifts: '稀有礼物',
    filterAll: '全部礼物',
    filterTelegram: 'Telegram 礼物',
    filterNft: 'NFT',
    filterRare: '仅稀有',
    noGiftsYet: '暂无礼物',
    noGiftsYetDesc: '转动转盘赢取您的第一个礼物！',

    settingSaved: '设置已保存',
    languageChanged: '语言已更改',
    paymentSuccessAdding: '支付成功！正在添加 {n} 星星…',
    starsAdded: '已添加 {n} 星星！',
    notEnoughStars: '星星不足 — 需要 {n} ⭐',
    creatingInvoice: '正在创建发票…',
    paymentCancelled: '支付已取消',
    paymentFailed: '支付失败，请重试。',
    claimingGift: '正在领取您的礼物…',
    giftSentToTelegram: '{name} 已发送到您的 Telegram！',
    failedToClaim: '领取失败：{msg}',
    noPrizeSelected: '未选择奖品',
    telegramUnavailable: 'Telegram 不可用',
    giftMappingError: '礼物映射错误：{name}',
    cacheCleared: '缓存已清除',
    telegramWebAppUnavailable: 'Telegram WebApp 不可用',
    userIdUnavailable: '用户ID不可用',
    invoiceError: '错误：{msg}',
    giftSentPopupTitle: '礼物已发送！',
    giftSentPopupMessage: '您的 {name} 礼物已发送到您的 Telegram 账户！',
    claimFailedPopupTitle: '领取失败',

    promoEnterCode: '请输入兑换码',
    promoAlreadyRedeemed: '兑换码已使用',
    promoInvalid: '无效的兑换码',
    promoRedeemed: '✓ {message} +{coins} 金币！',
    promoWelcome: '欢迎奖励已领取！',
    promoLucky: '幸运奖励已激活！',
    promoFree: '已添加免费金币！',
    promoVoidGift: '特殊礼物已兑换！',
    promoSpin2Win: '旋转奖励已解锁！',

    confirmResetData: '⚠️ 删除所有数据？此操作无法撤销。',
    confirmResetType: '输入 "RESET" 以确认：',
    resetCancelled: '重置已取消。',
    allDataReset: '所有数据已重置！\n正在重新加载…',
    confirmClearCache: '清除缓存？\n\n您的数据不会受到影响。'
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

  // t(key, vars) — vars is an optional { token: value } map used to fill
  // {token} placeholders in the translated string (e.g. t('starsAdded', { n: 50 })).
  t(key, vars) {
    const lang = STATE.settings.language;
    let str = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
    if (vars) {
      Object.keys(vars).forEach(k => { str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]); });
    }
    return str;
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

// Standalone TON on-chain payment backend (ton-payments.js). Fully
// independent of vgtserver (gift transactor) and vgservers (Stars invoices).
const TON_API_BASE = 'https://ton-backend347-production.up.railway.app';

const STATUS_CONFIG = {
  URL: 'https://raw.githubusercontent.com/sn0wydev/ProtV3/main/status.json',
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

  // ── TON payments (ton-payments.js confirms on-chain transfers async via
  // polling, then holds an unclaimed credit — nothing is pushed to the
  // client, so this has to be pulled explicitly) ──

  async claimTonCredits() {
    const userId = STATE.tg?.initDataUnsafe?.user?.id;
    if (!userId) return 0;
    try {
      const res = await fetch(`${TON_API_BASE}/ton/claim-credits/${userId}`);
      if (!res.ok) return 0;
      const data = await res.json();
      if (data.stars > 0) Currency.addStars(data.stars);
      return data.stars || 0;
    } catch (err) {
      console.error('❌ claimTonCredits failed:', err);
      return 0;
    }
  },

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

    // Safety net: picks up any TON credit that got confirmed after the
    // purchase flow stopped waiting (app closed, tab backgrounded, etc).
    this.claimTonCredits();
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
      <span>${coinsVal.toLocaleString()} ${Utils.t('coinsWord')}</span>
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
    if (!STATE.currentModalPrize) { Utils.showToast(Utils.t('noPrizeSelected'), 'error'); return; }
    if (STATE.isClaimingPrize) return; // already mid-claim — ignore extra clicks

    const prize          = STATE.currentModalPrize;
    const prizeId        = prize.prizeId;
    const giftName       = prize.value;
    const telegramGiftId = TELEGRAM_GIFT_IDS[giftName];

    if (!telegramGiftId) { Utils.showToast(Utils.t('giftMappingError', { name: giftName }), 'error'); return; }
    if (!STATE.tg?.initDataUnsafe?.user?.id) { Utils.showToast(Utils.t('telegramUnavailable'), 'error'); return; }

    const userId   = STATE.tg.initDataUnsafe.user.id;
    const claimBtn = document.getElementById('claimPrizeBtn');

    STATE.isClaimingPrize = true;
    Utils.showToast(Utils.t('claimingGift'), 'success');
    if (claimBtn) { claimBtn.disabled = true; claimBtn.textContent = Utils.t('claimingGift'); }

    try {
      const res = await fetch('https://vgtserver-production.up.railway.app/claim-gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, prizeId, giftName: telegramGiftId })
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to claim gift'); }

      Inventory.remove(prizeId);
      this.close();
      Utils.showToast(Utils.t('giftSentToTelegram', { name: giftName }), 'success');

      STATE.tg.showPopup?.({
        title: Utils.t('giftSentPopupTitle'),
        message: Utils.t('giftSentPopupMessage', { name: giftName }),
        buttons: [{ type: 'close' }]
      });
    } catch (error) {
      Utils.showToast(Utils.t('failedToClaim', { msg: error.message }), 'error');
      STATE.tg?.showPopup?.({
        title: Utils.t('claimFailedPopupTitle'),
        message: `${error.message}\n\nPrize ID: ${prizeId}`,
        buttons: [{ type: 'close' }]
      });
    } finally {
      STATE.isClaimingPrize = false;
      if (claimBtn) { claimBtn.disabled = false; claimBtn.textContent = Utils.t('claimPrize'); }
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
    this.render(STATE.currentFilter);
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

    this.render(STATE.currentLeaderboardTab);
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
    return `${player.gifts} ${Utils.t('tabGifts').toLowerCase()}`;
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
      scoreEl.textContent = `${STATE.userCoins.toLocaleString()} ${Utils.t('tabCoins').toLowerCase()}`;
    } else if (type === 'stars') {
      rankEl.textContent  = STATE.leaderboardData.stars.filter(p => p.stars > STATE.userStars).length + 1;
      scoreEl.textContent = `${STATE.userStars.toLocaleString()} ⭐`;
    } else {
      const gifts = STATE.inventoryItems.length;
      rankEl.textContent  = STATE.leaderboardData.gifts.filter(p => p.gifts > gifts).length + 1;
      scoreEl.textContent = `${gifts} ${Utils.t('tabGifts').toLowerCase()}`;
    }
  },

  updateData() {
    if (STATE.currentPage === 'leaderboard') this.updateYourRank(STATE.currentLeaderboardTab);
  },

  // Re-render whatever's currently on screen with fresh translated strings.
  refreshLabels() {
    if (STATE.currentPage === 'leaderboard') this.render(STATE.currentLeaderboardTab);
  }
};

// ============================================
// WALLETPICKER
// ============================================
const WalletPickerModal = {
  _resolve: null,

  _hide() {
    document.getElementById('walletPickerModal')?.classList.remove('show');
  },

  // Returns a Promise resolving to the chosen wallet object, or null if cancelled.
  open(wallets) {
    const modal = document.getElementById('walletPickerModal');
    const list  = document.getElementById('walletPickerList');
    if (!modal || !list || !wallets.length) return Promise.resolve(null);

    list.innerHTML = '';
    wallets.forEach(w => {
      const opt = document.createElement('div');
      opt.className = 'language-option';

      const icon = document.createElement('span');
      icon.className = 'language-flag';
      if (w.imageUrl) {
        const img = document.createElement('img');
        img.src = w.imageUrl;
        img.alt = w.name || '';
        img.style.cssText = 'width:28px;height:28px;object-fit:contain;border-radius:6px;';
        icon.appendChild(img);
      } else {
        icon.textContent = '💼';
      }

      const name = document.createElement('span');
      name.className = 'language-name';
      name.textContent = w.name || w.appName;

      opt.append(icon, name);
      opt.addEventListener('click', () => {
        this._hide();
        const resolve = this._resolve;
        this._resolve = null;
        resolve?.(w);
      });
      list.appendChild(opt);
    });

    modal.classList.add('show');
    return new Promise(resolve => { this._resolve = resolve; });
  },

  close() {
    this._hide();
    const resolve = this._resolve;
    this._resolve = null;
    resolve?.(null);
  },

  init() {
    document.getElementById('walletPickerClose')?.addEventListener('click', () => this.close());
    document.getElementById('walletPickerModal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.close();
    });
  }
};

// ============================================
// TonWalletInit
// ============================================

// Builds a valid base64 BOC (Bag of Cells) for a plain-text TON transfer
// comment: a single ordinary cell containing a 32-bit zero opcode followed
// by the UTF-8 comment bytes, per the TON/TonConnect "text comment" format
// (docs.ton.org/v3/guidelines/ton-connect/guidelines/preparing-messages).
// Previously this repo base64-encoded raw bytes with no BOC framing, which
// wallets either rejected or silently dropped — meaning the reference
// comment never reached the chain and ton-payments.js could never match
// the deposit. Keep comments short (well under ~240 bytes) so the whole
// BOC still fits the 1-byte size/offset fields used below.
function buildCommentBoc(comment) {
  const textBytes = new TextEncoder().encode(comment);
  const n = textBytes.length;
  const dataLen = 4 + n; // 4 zero bytes (opcode) + comment bytes

  const d1 = 0x00;            // 0 refs, ordinary cell, level 0
  const d2 = dataLen * 2;     // byte-aligned data

  const cellBytes = new Uint8Array(2 + dataLen);
  cellBytes[0] = d1;
  cellBytes[1] = d2;
  cellBytes.set(textBytes, 2 + 4);

  const totCellsSize = cellBytes.length;

  const header = new Uint8Array([
    0xb5, 0xee, 0x9c, 0x72, // BOC magic
    0x01,                   // flags: size_bytes = 1
    0x01,                   // off_bytes = 1
    0x01,                   // cells_count
    0x01,                   // roots_count
    0x00,                   // absent_count
    totCellsSize,           // tot_cells_size
    0x00                    // root_list[0] = cell index 0
  ]);

  const boc = new Uint8Array(header.length + cellBytes.length);
  boc.set(header, 0);
  boc.set(cellBytes, header.length);

  let binary = '';
  boc.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

const TonWallet = {
  connector: null,
  address: null,

  init() {
    if (!window.TonConnectSDK) { console.warn('TonConnect SDK not loaded'); return; }
    this.connector = new window.TonConnectSDK.TonConnect({
      manifestUrl: 'https://sn0wydev.github.io/ProtV3/tonconnect-manifest.json' // ← real host URL
    });
    this.connector.onStatusChange(wallet => {
      this.address = wallet ? window.TonConnectSDK.toUserFriendlyAddress(wallet.account.address) : null;
      this.updateUI();
    });
    this.connector.restoreConnection(); // picks up a session from a previous visit
  },

  async connect() {
    if (!this.connector) return null;
    if (this.connector.connected) return this.address;

    const wallets = await this.connector.getWallets();
    if (!wallets.length) { Utils.showToast(Utils.t('noWalletFound'), 'error'); return null; }

    const chosen = await WalletPickerModal.open(wallets);
    if (!chosen) return null;

    try {
      // A wallet advertising `jsBridgeKey` only means it *supports* a browser-extension
      // bridge on some platform — not that the extension is installed in THIS browser.
      // Tonkeeper is mostly a mobile app / deep link, so it has jsBridgeKey but
      // injected/embedded is false. Only take the bridge path when the extension is
      // actually live right now; otherwise fall back to the universal link.
      const isInjected = 'jsBridgeKey' in chosen && (chosen.injected || chosen.embedded);

      if (isInjected) {
        await this.connector.connect({ jsBridgeKey: chosen.jsBridgeKey });
      } else if ('universalLink' in chosen) {
        const link = this.connector.connect({ universalLink: chosen.universalLink, bridgeUrl: chosen.bridgeUrl });
        STATE.tg?.openLink ? STATE.tg.openLink(link) : window.open(link, '_blank');
      } else {
        Utils.showToast(Utils.t('noWalletFound'), 'error');
        return null;
      }
    } catch (err) {
      console.error('TonWallet.connect failed:', err);
      Utils.showToast(Utils.t('noWalletFound'), 'error');
      return null;
    }

    return new Promise(resolve => {
      const unsub = this.connector.onStatusChange(wallet => {
        if (wallet) { unsub(); resolve(this.address); }
      });
    });
  },

  // Sends a plain TON transfer and returns the signed message's boc.
  // NOTE: this is not proof of an on-chain confirmation — see backend note below.
  async sendPayment(amountTon, merchantAddress, comment) {
    if (!this.connector?.connected) throw new Error('Wallet not connected');
    const nanotons = Math.round(amountTon * 1e9).toString();
    const message = { address: merchantAddress, amount: nanotons };
    if (comment) message.payload = buildCommentBoc(comment);
    return this.connector.sendTransaction({
      validUntil: Math.floor(Date.now() / 1000) + 300,
      messages: [message]
    });
  },

  // Manual disconnect, triggered from the wallet-manage modal. onStatusChange
  // fires from this too, so UI updates through the normal path.
  async disconnect() {
    if (!this.connector?.connected) return;
    try { await this.connector.disconnect(); }
    catch (err) { console.error('TonWallet.disconnect failed:', err); }
  },

  updateUI() {
    const chip = document.getElementById('tonWalletChip');
    const label = document.getElementById('tonWalletChipLabel');
    if (chip) chip.classList.toggle('connected', !!this.address);
    if (label) label.textContent = this.address
      ? `${this.address.slice(0, 4)}…${this.address.slice(-4)}`
      : Utils.t('walletNotConnected');
  }
};

// ============================================
// TON WALLET MANAGE (chip -> address + disconnect)
// ============================================

const TonWalletManage = {
  open() {
    const modal = document.getElementById('tonWalletManageModal');
    const body = document.getElementById('tonWalletManageBody');
    if (!modal || !body) return;

    if (!TonWallet.address) { modal.classList.remove('show'); return; }

    body.innerHTML = '';
    const pill = document.createElement('div');
    pill.className = 'ton-wallet-address-pill';
    pill.textContent = TonWallet.address;

    const disconnectBtn = document.createElement('button');
    disconnectBtn.className = 'ton-purchase-btn danger';
    disconnectBtn.textContent = Utils.t('disconnectWallet');
    disconnectBtn.addEventListener('click', async () => {
      await TonWallet.disconnect();
      modal.classList.remove('show');
      Utils.showToast(Utils.t('disconnected'), 'success');
    });

    body.append(pill, disconnectBtn);
    modal.classList.add('show');
  },

  init() {
    document.getElementById('tonWalletChip')?.addEventListener('click', () => {
      if (TonWallet.address) this.open();
      // Not connected: the chip is just a status indicator — connecting
      // happens through the purchase flow, per design.
    });
    document.getElementById('tonWalletManageClose')?.addEventListener('click', () => {
      document.getElementById('tonWalletManageModal')?.classList.remove('show');
    });
    document.getElementById('tonWalletManageModal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) e.currentTarget.classList.remove('show');
    });
  }
};

// ============================================
// TON PURCHASE FLOW
// A single guided modal: choose/connect a wallet -> pay -> wait for
// on-chain confirmation -> success/fail screen. Replaces the old flow
// where pressing Purchase gave no feedback until the wallet app popped up.
// ============================================

const TonPurchaseFlow = {
  _pkg: null,
  _closable: true,

  _modal()  { return document.getElementById('tonPurchaseModal'); },
  _body()   { return document.getElementById('tonPurchaseBody'); },
  _title(t) { const el = document.getElementById('tonPurchaseTitle'); if (el) el.textContent = t; },

  _show() { this._modal()?.classList.add('show'); },
  _hide() { if (this._closable) this._modal()?.classList.remove('show'); },

  _renderSpinner(text) {
    this._closable = false;
    this._body().innerHTML = '';
    const spinner = document.createElement('div');
    spinner.className = 'ton-purchase-spinner';
    const p = document.createElement('div');
    p.className = 'ton-purchase-subtitle';
    p.textContent = text;
    this._body().append(spinner, p);
  },

  _renderResult({ ok, title, desc, primaryLabel, onPrimary }) {
    this._closable = true;
    this._title(title);
    this._body().innerHTML = '';

    const icon = document.createElement('div');
    icon.className = `ton-purchase-icon ${ok ? 'success' : 'fail'}`;
    icon.innerHTML = ok
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>';

    const p = document.createElement('div');
    p.className = 'ton-purchase-subtitle';
    p.textContent = desc;

    const btn = document.createElement('button');
    btn.className = 'ton-purchase-btn';
    btn.textContent = primaryLabel;
    btn.addEventListener('click', onPrimary);

    this._body().append(icon, p, btn);
  },

  // Step shown every time: pay with the already-connected wallet, or
  // connect a different one. Matches "offer connected wallets or select
  // a new wallet app" from the design request.
  _renderChooseWallet() {
    this._closable = true;
    this._title(Utils.t('tonPurchaseTitle'));
    this._body().innerHTML = '';

    const amount = document.createElement('div');
    amount.className = 'ton-purchase-amount';
    amount.textContent = this._pkg.amountTon ?? this._pkg.amount;
    const unit = document.createElement('span');
    unit.textContent = `TON → ${this._pkg.stars} ⭐`;
    amount.appendChild(unit);
    this._body().appendChild(amount);

    if (TonWallet.address) {
      const payBtn = document.createElement('button');
      payBtn.className = 'ton-purchase-btn';
      payBtn.textContent = `${Utils.t('payWithWallet')} (${TonWallet.address.slice(0,4)}…${TonWallet.address.slice(-4)})`;
      payBtn.addEventListener('click', () => this._runPayment());

      const switchBtn = document.createElement('button');
      switchBtn.className = 'ton-purchase-btn secondary';
      switchBtn.textContent = Utils.t('useAnotherWallet');
      switchBtn.addEventListener('click', async () => {
        await TonWallet.disconnect();
        const addr = await TonWallet.connect();
        if (addr) this._runPayment();
        else this._renderChooseWallet();
      });

      this._body().append(payBtn, switchBtn);
    } else {
      const connectBtn = document.createElement('button');
      connectBtn.className = 'ton-purchase-btn';
      connectBtn.textContent = Utils.t('connectAWallet');
      connectBtn.addEventListener('click', async () => {
        this._renderSpinner(Utils.t('connectingWallet'));
        const addr = await TonWallet.connect();
        if (addr) this._runPayment();
        else this._renderChooseWallet();
      });
      this._body().appendChild(connectBtn);
    }
  },

  async _runPayment() {
    const userId = STATE.tg?.initDataUnsafe?.user?.id;
    if (!userId) { Utils.showToast(Utils.t('userIdUnavailable'), 'error'); this._hide(); return; }

    try {
      this._renderSpinner(Utils.t('confirmInWalletApp'));

      const res = await fetch(`${TON_API_BASE}/ton/create-pending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId: this._pkg.id, walletAddress: TonWallet.address })
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to create pending payment'); }
      const { reference, merchantWallet, amountTon } = await res.json();

      // Resolves once signed + broadcast — not on-chain confirmation yet.
      await TonWallet.sendPayment(amountTon, merchantWallet, reference);

      this._renderSpinner(Utils.t('waitingTonConfirmation'));
      const confirmed = await Deposit.waitForTonConfirmation(reference);

      if (confirmed) {
        const stars = await BackendAPI.claimTonCredits();
        this._renderResult({
          ok: true,
          title: Utils.t('tonPaymentSuccessTitle'),
          desc: Utils.t('tonPaymentSuccessDesc', { n: stars || this._pkg.stars }),
          primaryLabel: Utils.t('done'),
          onPrimary: () => this._hide()
        });
      } else {
        // Not confirmed within the polling window — not a failure. The
        // backend keeps watching for 30 min and syncBalance() picks the
        // credit up automatically the moment it lands.
        this._renderResult({
          ok: true,
          title: Utils.t('tonConfirmationPendingTitle'),
          desc: Utils.t('tonConfirmationPendingDesc'),
          primaryLabel: Utils.t('close'),
          onPrimary: () => this._hide()
        });
      }
    } catch (err) {
      const cancelled = String(err.message).toLowerCase().includes('reject');
      this._renderResult({
        ok: false,
        title: Utils.t('tonPaymentFailedTitle'),
        desc: cancelled ? Utils.t('paymentCancelled') : Utils.t('invoiceError', { msg: err.message }),
        primaryLabel: Utils.t('tryAgain'),
        onPrimary: () => this._renderChooseWallet()
      });
    }
  },

  open(pkg) {
    this._pkg = pkg;
    this._show();
    this._renderChooseWallet();
  },

  init() {
    document.getElementById('tonPurchaseClose')?.addEventListener('click', () => this._hide());
    document.getElementById('tonPurchaseModal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this._hide();
    });
  }
};

// ============================================
// DEPOSIT
// ============================================

const Deposit = {
  init() {
    this.initTabs();
    this.renderPackages('stars');
    this.renderPackages('ton');
    this.initIcons();
  },

  initTabs() {
    const tabsContainer = document.querySelector('.deposit-tabs');
    if (!tabsContainer || tabsContainer.dataset.bound) return;
    tabsContainer.dataset.bound = 'true';

    tabsContainer.addEventListener('click', (e) => {
      const tab = e.target.closest('.deposit-tab');
      if (!tab) return;

      document.querySelectorAll('.deposit-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.deposit-list').forEach(l => l.classList.remove('active'));
    
      tab.classList.add('active');
      const type = tab.dataset.tab;
      STATE.currentDepositTab = type;
      document.getElementById(`deposit-${type}`)?.classList.add('active');
    });
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
      const badge = Object.assign(document.createElement('div'), { className: 'popular-badge', textContent: Utils.t('popular') });
      card.appendChild(badge);
    }

    const icon = document.createElement('div');
    icon.className = 'package-icon';
    icon.id = `pkg-${type}-${index}`;
    if (type === 'ton') {
      const img = Object.assign(document.createElement('img'), { src: 'assets/TON.svg', alt: 'TON' })
      img.style.cssText = 'width:100%;height:100%;object-fit:contain';
      icon.appendChild(img);
    }
    card.appendChild(icon);

    const amt = Object.assign(document.createElement('div'), { className: 'package-amount', textContent: pkg.amount.toLocaleString() });
    const cur = Object.assign(document.createElement('div'), {
      className: 'package-currency',
      textContent: type === 'ton' ? 'TON' : Utils.t('starsWord')
    });
    const div = document.createElement('div'); div.className = 'package-divider';

    const coins = document.createElement('div'); coins.className = 'package-coins';
    coins.innerHTML = `<img src="assets/TStars.svg" alt="Star"><span>${pkg.stars.toLocaleString()} ${Utils.t('starsWord')}</span>`;

    const btn = Object.assign(document.createElement('button'), { className: 'package-buy-btn', textContent: Utils.t('purchase') });
    btn.addEventListener('click', () => this.purchasePackage(pkg, type));

    card.append(amt, cur, div, coins, btn);
    return card;
  },

  async purchasePackage(pkg, type) {
    if (type === 'ton') return this.purchaseWithTon(pkg);
    
    if (!STATE.tg) { Utils.showToast(Utils.t('telegramWebAppUnavailable'), 'error'); return; }
    const userId = STATE.tg.initDataUnsafe?.user?.id;
    if (!userId)  { Utils.showToast(Utils.t('userIdUnavailable'), 'error'); return; }

    Utils.showToast(Utils.t('creatingInvoice'), 'success');

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
          Utils.showToast(Utils.t('paymentSuccessAdding', { n: pkg.stars }), 'success');
          setTimeout(() => BackendAPI.syncBalance(), 1500);
        } else if (status === 'cancelled') {
          Utils.showToast(Utils.t('paymentCancelled'), 'error');
        } else if (status === 'failed') {
          Utils.showToast(Utils.t('paymentFailed'), 'error');
        }
      });
    } catch (error) {
      Utils.showToast(Utils.t('invoiceError', { msg: error.message }), 'error');
    }
  },

  purchaseWithTon(pkg) {
    TonPurchaseFlow.open(pkg);
  },

  // Polls GET /ton/status/:reference until the backend's on-chain watcher
  // confirms the transfer (or the payment expires). Returns false on
  // timeout — that's a "still waiting" outcome, not a failure.
  async waitForTonConfirmation(reference, { intervalMs = 4000, timeoutMs = 90000 } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${TON_API_BASE}/ton/status/${reference}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'confirmed') return true;
          if (data.status === 'expired') return false;
        }
      } catch { /* transient network hiccup — just retry next tick */ }
      await new Promise(r => setTimeout(r, intervalMs));
    }
    return false;
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
  },

  // Re-render currently visible packages so "Popular"/"Purchase"/"Stars" pick up the new language.
  refreshLabels() {
    if (STATE.currentPage === 'deposit') this.renderPackages(STATE.currentDepositTab);
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
      nameEl.innerHTML = `<span class="hl">${prize.value}</span> ${Utils.t('coinsWord')}`;
      if (valueRow) {
        valueRow.innerHTML = `<img src="assets/Coin.svg" alt="Coins" style="width:22px;height:22px"><span>${prize.value} ${Utils.t('coinsWord')}</span>`;
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
        valueRow.innerHTML = `<img src="assets/Coin.svg" alt="Coins" style="width:22px;height:22px"><span>${val.toLocaleString()} ${Utils.t('coinsValue')}</span>`;
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
      Utils.showToast(Utils.t('notEnoughStars', { n: CONFIG.VOID_SPIN_COST }), 'error');
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
      nameEl.innerHTML = `<span class="hl">${prize.value}</span> ${Utils.t('coinsWord')}`;
      if (valueRow) {
        valueRow.innerHTML = `<img src="assets/Coin.svg" alt="Coins" style="width:22px;height:22px"><span>${prize.value} ${Utils.t('coinsWord')}</span>`;
        valueRow.style.display = 'flex';
      }
    } else if (prize.type === 'stars') {
      const img = Object.assign(document.createElement('img'), { src: 'assets/TStars.svg', alt: 'Stars' });
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;animation:prizeFloat 2.5s ease-in-out infinite;filter:drop-shadow(0 12px 32px rgba(192,132,252,.4))';
      iconEl.appendChild(img);
      nameEl.innerHTML = `<span class="hl">${prize.value}</span> ${Utils.t('starsWord')}`;
      if (valueRow) {
        valueRow.innerHTML = `<img src="assets/TStars.svg" alt="Stars" style="width:22px;height:22px"><span>${prize.value} ${Utils.t('starsAddedToBalance')}</span>`;
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
        valueRow.innerHTML = `<img src="assets/Coin.svg" alt="Coins" style="width:22px;height:22px"><span>${val.toLocaleString()} ${Utils.t('coinsValue')}</span>`;
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
    ['soundEffects','prizeAlerts','animationsEnabled','showInLeaderboard','shareStats'].forEach(id => {
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
  },

  // Applies translations to every static [data-i18n] element AND
  // re-renders the JS-generated bits (leaderboard tabs/labels, deposit
  // package cards, inventory/prize modal state) so switching language
  // updates everything currently on screen, not just the static markup.
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

    Leaderboard.refreshLabels();
    Deposit.refreshLabels();
    if (document.getElementById('fullInventoryModal')?.classList.contains('show')) {
      FullInventoryModal.render(STATE.currentFilter);
    }
  },

  init() {
    this.load();
    ['soundEffects','prizeAlerts','animationsEnabled','showInLeaderboard','shareStats'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', (e) => {
        STATE.settings[id] = e.target.checked;
        this.save(); this.applyEffects();
        Utils.showToast(Utils.t('settingSaved'));
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
    if (!confirm(Utils.t('confirmResetData'))) return;
    if (prompt(Utils.t('confirmResetType')) !== 'RESET') { alert(Utils.t('resetCancelled')); return; }
    localStorage.clear();
    STATE.userCoins = 0; STATE.userStars = 0; STATE.inventoryItems = [];
    Currency.update(); Inventory.updateDisplay();
    alert(Utils.t('allDataReset'));
    setTimeout(() => window.location.reload(), 1000);
  },

  clearCache() {
    if (confirm(Utils.t('confirmClearCache'))) Utils.showToast(Utils.t('cacheCleared'));
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
        setTimeout(() => { this.close(); Utils.showToast(Utils.t('languageChanged')); }, 300);
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
    if (!code) { this.showStatus(Utils.t('promoEnterCode'), 'error'); return; }
    if (STATE.redeemedCodes.includes(code)) { this.showStatus(Utils.t('promoAlreadyRedeemed'), 'error'); return; }
    if (VALID_PROMOCODES[code]) {
      const promo = VALID_PROMOCODES[code];
      Currency.add(promo.coins);
      STATE.redeemedCodes.push(code);
      localStorage.setItem('redeemedCodes', JSON.stringify(STATE.redeemedCodes));
      this.showStatus(Utils.t('promoRedeemed', { message: Utils.t(promo.messageKey), coins: promo.coins }), 'success');
      if (input) input.value = '';
      const btn = document.getElementById('promocodeSubmitBtn');
      if (btn) { btn.disabled = true; setTimeout(() => btn.disabled = false, 2000); }
    } else {
      this.showStatus(Utils.t('promoInvalid'), 'error');
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

  Utils.showToast(Utils.t('paymentSuccessAdding', { n: amount }), 'success');
  setTimeout(async () => {
    await BackendAPI.syncBalance();
    Utils.showToast(Utils.t('starsAdded', { n: amount }), 'success');
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
  WalletPickerModal.init();
  TonWalletManage.init();
  TonPurchaseFlow.init();
  ContentBoxes.init();
  EventListeners.init();

  BackendAPI.syncBalance().then(() => Currency.update());
  Inventory.updateDisplay();
  TonWallet.init()

  startWheels();
}

// Отдельная функция вместо голого addEventListener('load', ...) —
// проверяет, не наступила ли загрузка страницы УЖЕ (пока мы ждали
// ответ от StatusCheck), и в этом случае запускает колёса сразу,
// вместо того чтобы вечно ждать событие, которое уже никогда не придёт.
function startWheels() {
  const run = () => {
    SpinWheel.init();
    VoidSpinWheel.init();
    LottieAnimations.init();
  };
  if (document.readyState === 'complete') {
    run();
  } else {
    window.addEventListener('load', run, { once: true });
  }
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
