/**
 * MusicFinder - PocketBase API Integration & Audio Player
 */

// Determine PocketBase API base URL
const API_BASE = (() => {
  if (window.location.protocol === 'file:') {
    return 'http://127.0.0.1:8091';
  }
  // When running via website port (8080 or 80), relative URL proxies to PocketBase via Nginx
  if (window.location.port === '8080' || window.location.port === '80' || !window.location.port) {
    return '';
  }
  // If running via another dev server (e.g. port 5500, 3000, etc.)
  return `${window.location.protocol}//${window.location.hostname}:8091`;
})();

// Application State
const state = {
  allSongs: [],
  filteredSongs: [],
  artists: [],
  currentSongIndex: -1,
  isPlaying: false,
  isMuted: false,
  user: null,
  token: null,
  userFavorites: new Map(), // songId -> favoriteRecordId
  localLikedIds: new Set(JSON.parse(localStorage.getItem('mf_local_likes') || '[]')),
  showingFavoritesOnly: false
};

// DOM Elements
const musicGrid = document.getElementById('musicGrid');
const artistGrid = document.getElementById('artistGrid');
const popularSearches = document.getElementById('popularSearches');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const songsSectionTitle = document.getElementById('songsSectionTitle');
const seeAllBtn = document.getElementById('seeAllBtn');
const viewFavoritesBtn = document.getElementById('viewFavoritesBtn');
const navDiscover = document.getElementById('navDiscover');
const navTrending = document.getElementById('navTrending');
const navFavorites = document.getElementById('navFavorites');
const userNavContainer = document.getElementById('userNavContainer');

// Player Elements
const mainAudio = document.getElementById('mainAudio');
const playerPlayBtn = document.getElementById('playerPlayBtn');
const playerPrevBtn = document.getElementById('playerPrevBtn');
const playerNextBtn = document.getElementById('playerNextBtn');
const playerSongTitle = document.getElementById('playerSongTitle');
const playerArtistName = document.getElementById('playerArtistName');
const playerMiniCover = document.getElementById('playerMiniCover');
const playerCurrentTime = document.getElementById('playerCurrentTime');
const playerTotalTime = document.getElementById('playerTotalTime');
const playerProgressBar = document.getElementById('playerProgressBar');
const playerProgressFill = document.getElementById('playerProgressFill');
const playerVolumeBtn = document.getElementById('playerVolumeBtn');

// Modal Elements
const authModal = document.getElementById('authModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const tabLoginBtn = document.getElementById('tabLoginBtn');
const tabRegisterBtn = document.getElementById('tabRegisterBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authErrorMsg = document.getElementById('authErrorMsg');
const toastContainer = document.getElementById('toastContainer');

// --- Helper: Format Time (mm:ss) ---
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// --- Helper: Show Toast ---
function showToast(message, isError = false) {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'toast-error' : ''}`;
  toast.innerHTML = `<i class="fa-solid ${isError ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> <span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// --- Helper: PocketBase API Fetcher ---
async function pbFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers['Authorization'] = state.token;
  }

  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(data?.message || `HTTP xatosi: ${res.status}`);
      err.data = data;
      throw err;
    }
    return data;
  } catch (err) {
    console.error(`PocketBase API xatosi (${endpoint}):`, err);
    throw err;
  }
}

// --- Load Initial Data from PocketBase ---
async function loadSongs() {
  try {
    const res = await pbFetch('/api/collections/songs/records?sort=-plays&expand=artist');
    state.allSongs = res.items || [];
    state.filteredSongs = [...state.allSongs];
    renderSongs(state.filteredSongs);
  } catch (err) {
    console.warn('Qo‘shiqlarni yuklab bo‘lmadi:', err);
    musicGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #888; padding: 40px;">Qo‘shiqlarni yuklashda xatolik yuz berdi. PocketBase serveri ishga tushganini tekshiring.</div>`;
  }
}

async function loadArtists() {
  try {
    const res = await pbFetch('/api/collections/artists/records?sort=-monthly_listeners');
    state.artists = res.items || [];
    renderArtists(state.artists);
  } catch (err) {
    console.warn('Ijodkorlarni yuklab bo‘lmadi:', err);
  }
}

async function loadPopularSearches() {
  try {
    const res = await pbFetch('/api/collections/popular_searches/records?sort=-search_count&perPage=6');
    if (res.items && res.items.length > 0) {
      renderPopularSearches(res.items);
    }
  } catch (err) {
    console.warn('Mashhur qidiruvlarni yuklab bo‘lmadi:', err);
  }
}

// --- Render Functions ---
function renderSongs(songs) {
  musicGrid.innerHTML = '';

  if (!songs || songs.length === 0) {
    musicGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: #888; padding: 40px;">
        <i class="fa-solid fa-music" style="font-size: 36px; margin-bottom: 12px; color: #444;"></i>
        <p>Hech qanday qo‘shiq topilmadi.</p>
      </div>`;
    return;
  }

  songs.forEach((song, idx) => {
    const isPlayingCurrent = state.currentSongIndex === idx && state.isPlaying;
    const isLiked = isSongLiked(song.id);

    const card = document.createElement('div');
    card.className = `music-card ${isPlayingCurrent ? 'playing' : ''}`;
    card.dataset.id = song.id;
    card.dataset.index = idx;

    card.innerHTML = `
      <div class="cover ${song.cover_class || 'cover-one'}">
        <span>${song.cover_number || ('0' + (idx + 1)).slice(-2)}</span>
        <button class="card-play" title="Trekni tinglash">
          <i class="fa-solid ${isPlayingCurrent ? 'fa-pause' : 'fa-play'}"></i>
        </button>
      </div>
      <div class="song-info">
        <div>
          <h3>${escapeHtml(song.title)}</h3>
          <p>${escapeHtml(song.artist_name || 'Noma‘lum ijodkor')}</p>
        </div>
        <button class="heart ${isLiked ? 'active' : ''}" title="Sevimli">
          <i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart"></i>
        </button>
      </div>
    `;

    // Click on play button or card to play
    card.querySelector('.card-play').addEventListener('click', (e) => {
      e.stopPropagation();
      handleSongPlayClick(idx);
    });

    card.addEventListener('click', () => {
      handleSongPlayClick(idx);
    });

    // Heart (Favorite) button
    card.querySelector('.heart').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(song);
    });

    musicGrid.appendChild(card);
  });
}

function renderArtists(artists) {
  artistGrid.innerHTML = '';
  if (!artists || artists.length === 0) return;

  artists.forEach(artist => {
    const card = document.createElement('div');
    card.className = 'artist-card';
    card.dataset.id = artist.id;
    card.title = `${artist.name} qo‘shiqlarini ko‘rish`;

    const listeners = artist.monthly_listeners 
      ? (artist.monthly_listeners >= 1000000 
          ? (artist.monthly_listeners / 1000000).toFixed(1) + 'M tinglovchi' 
          : artist.monthly_listeners.toLocaleString() + ' tinglovchi')
      : (artist.genre || 'Ijodkor');

    card.innerHTML = `
      <div class="artist-image ${artist.avatar_class || 'artist-one'}">${artist.avatar_symbol || '♫'}</div>
      <h3>${escapeHtml(artist.name)}</h3>
      <p>${escapeHtml(listeners)}</p>
    `;

    card.addEventListener('click', () => {
      filterByArtist(artist.name);
    });

    artistGrid.appendChild(card);
  });
}

function renderPopularSearches(items) {
  popularSearches.innerHTML = '<span>Mashhur:</span>';
  items.forEach(item => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = item.query;
    btn.dataset.query = item.query;
    btn.addEventListener('click', () => {
      searchInput.value = item.query;
      performSearch(item.query);
    });
    popularSearches.appendChild(btn);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- Audio Player Logic ---
function handleSongPlayClick(index) {
  if (state.currentSongIndex === index) {
    togglePlay();
  } else {
    playSong(index);
  }
}

function playSong(index) {
  if (index < 0 || index >= state.filteredSongs.length) return;
  state.currentSongIndex = index;
  const song = state.filteredSongs[index];

  playerSongTitle.textContent = song.title;
  playerArtistName.textContent = song.artist_name || 'Ijodkor';
  playerMiniCover.className = `mini-cover ${song.cover_class || 'cover-one'}`;
  playerMiniCover.textContent = song.cover_number || '♫';

  mainAudio.src = song.audio_url;
  mainAudio.play().then(() => {
    state.isPlaying = true;
    updatePlayerPlayState();
    // Increment plays in background
    incrementSongPlays(song.id);
  }).catch(err => {
    console.warn('Audio ijro etilmadi:', err);
    showToast('Audioni ijro etib bo‘lmadi', true);
  });

  updateActiveCard();
}

function togglePlay() {
  if (state.currentSongIndex === -1 && state.filteredSongs.length > 0) {
    playSong(0);
    return;
  }
  if (!mainAudio.src) return;

  if (mainAudio.paused) {
    mainAudio.play().then(() => {
      state.isPlaying = true;
      updatePlayerPlayState();
      updateActiveCard();
    });
  } else {
    mainAudio.pause();
    state.isPlaying = false;
    updatePlayerPlayState();
    updateActiveCard();
  }
}

function nextSong() {
  if (state.filteredSongs.length === 0) return;
  const nextIdx = (state.currentSongIndex + 1) % state.filteredSongs.length;
  playSong(nextIdx);
}

function prevSong() {
  if (state.filteredSongs.length === 0) return;
  const prevIdx = (state.currentSongIndex - 1 + state.filteredSongs.length) % state.filteredSongs.length;
  playSong(prevIdx);
}

function updatePlayerPlayState() {
  const icon = playerPlayBtn.querySelector('i');
  if (state.isPlaying) {
    icon.className = 'fa-solid fa-pause';
  } else {
    icon.className = 'fa-solid fa-play';
  }
}

function updateActiveCard() {
  const cards = musicGrid.querySelectorAll('.music-card');
  cards.forEach((card, idx) => {
    const playIcon = card.querySelector('.card-play i');
    if (idx === state.currentSongIndex && state.isPlaying) {
      card.classList.add('playing');
      if (playIcon) playIcon.className = 'fa-solid fa-pause';
    } else {
      card.classList.remove('playing');
      if (playIcon) playIcon.className = 'fa-solid fa-play';
    }
  });
}

// Audio Element Events
mainAudio.addEventListener('timeupdate', () => {
  if (mainAudio.duration) {
    const pct = (mainAudio.currentTime / mainAudio.duration) * 100;
    playerProgressFill.style.width = `${pct}%`;
    playerCurrentTime.textContent = formatTime(mainAudio.currentTime);
  }
});

mainAudio.addEventListener('loadedmetadata', () => {
  playerTotalTime.textContent = formatTime(mainAudio.duration);
});

mainAudio.addEventListener('ended', () => {
  nextSong();
});

// Click to Seek
playerProgressBar.addEventListener('click', (e) => {
  if (!mainAudio.duration) return;
  const rect = playerProgressBar.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const width = rect.width;
  const seekTime = (clickX / width) * mainAudio.duration;
  mainAudio.currentTime = seekTime;
});

// Volume Mute/Unmute
playerVolumeBtn.addEventListener('click', () => {
  state.isMuted = !state.isMuted;
  mainAudio.muted = state.isMuted;
  const icon = playerVolumeBtn.querySelector('i');
  if (state.isMuted) {
    icon.className = 'fa-solid fa-volume-xmark';
  } else {
    icon.className = 'fa-solid fa-volume-high';
  }
});

playerPlayBtn.addEventListener('click', togglePlay);
playerNextBtn.addEventListener('click', nextSong);
playerPrevBtn.addEventListener('click', prevSong);

// --- PocketBase Play Count Tracker ---
async function incrementSongPlays(songId) {
  try {
    const song = state.allSongs.find(s => s.id === songId);
    if (!song) return;
    const currentPlays = song.plays || 0;
    await pbFetch(`/api/collections/songs/records/${songId}`, {
      method: 'PATCH',
      body: JSON.stringify({ plays: currentPlays + 1 })
    });
    song.plays = currentPlays + 1;
  } catch (err) {
    // Non-critical, ignore
  }
}

// --- Search & Filtering ---
async function performSearch(query) {
  const trimmed = query.trim().toLowerCase();
  state.showingFavoritesOnly = false;
  songsSectionTitle.textContent = trimmed ? `Qidiruv natijalari: "${trimmed}"` : 'Bugungi trendlar';

  if (!trimmed) {
    state.filteredSongs = [...state.allSongs];
    renderSongs(state.filteredSongs);
    return;
  }

  // Try server-side search first via PocketBase filter
  try {
    const filterExpr = `title ~ '${trimmed}' || artist_name ~ '${trimmed}' || tags ~ '${trimmed}'`;
    const res = await pbFetch(`/api/collections/songs/records?filter=(${encodeURIComponent(filterExpr)})&expand=artist`);
    if (res.items && res.items.length > 0) {
      state.filteredSongs = res.items;
      renderSongs(state.filteredSongs);
      return;
    }
  } catch (e) {
    // Fallback to client-side filtering if filter syntax failed
  }

  // Client-side fallback filter
  state.filteredSongs = state.allSongs.filter(song => {
    return (
      (song.title && song.title.toLowerCase().includes(trimmed)) ||
      (song.artist_name && song.artist_name.toLowerCase().includes(trimmed)) ||
      (song.tags && song.tags.toLowerCase().includes(trimmed))
    );
  });
  renderSongs(state.filteredSongs);
}

function filterByArtist(artistName) {
  searchInput.value = artistName;
  songsSectionTitle.textContent = `${artistName} qo‘shiqlari`;
  state.filteredSongs = state.allSongs.filter(s => 
    s.artist_name && s.artist_name.toLowerCase() === artistName.toLowerCase()
  );
  renderSongs(state.filteredSongs);
  document.getElementById('discover').scrollIntoView({ behavior: 'smooth' });
}

searchButton.addEventListener('click', () => {
  performSearch(searchInput.value);
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    performSearch(searchInput.value);
  }
});

// "Barchasini ko‘rish" button
seeAllBtn.addEventListener('click', () => {
  state.showingFavoritesOnly = false;
  songsSectionTitle.textContent = 'Barcha treklar';
  state.filteredSongs = [...state.allSongs];
  renderSongs(state.filteredSongs);
  document.getElementById('discover').scrollIntoView({ behavior: 'smooth' });
});

// Nav Links
navDiscover.addEventListener('click', () => {
  state.showingFavoritesOnly = false;
  songsSectionTitle.textContent = 'Bugungi trendlar';
  state.filteredSongs = [...state.allSongs];
  renderSongs(state.filteredSongs);
});

navTrending.addEventListener('click', () => {
  document.getElementById('trending').scrollIntoView({ behavior: 'smooth' });
});

navFavorites.addEventListener('click', (e) => {
  e.preventDefault();
  showFavoritesView();
});

viewFavoritesBtn.addEventListener('click', () => {
  showFavoritesView();
});

function showFavoritesView() {
  state.showingFavoritesOnly = true;
  songsSectionTitle.textContent = 'Sevimli qo‘shiqlaringiz';
  state.filteredSongs = state.allSongs.filter(song => isSongLiked(song.id));
  renderSongs(state.filteredSongs);
  document.getElementById('discover').scrollIntoView({ behavior: 'smooth' });
}

// --- Favorites (Likes) Logic ---
function isSongLiked(songId) {
  if (state.user) {
    return state.userFavorites.has(songId);
  }
  return state.localLikedIds.has(songId);
}

async function toggleFavorite(song) {
  const isLiked = isSongLiked(song.id);

  if (state.user) {
    // Authenticated user: store in PocketBase
    if (isLiked) {
      const favId = state.userFavorites.get(song.id);
      try {
        await pbFetch(`/api/collections/favorites/records/${favId}`, { method: 'DELETE' });
        state.userFavorites.delete(song.id);
        showToast(`"${song.title}" sevimlilardan olib tashlandi`);
      } catch (err) {
        showToast('Xatolik yuz berdi', true);
      }
    } else {
      try {
        const record = await pbFetch('/api/collections/favorites/records', {
          method: 'POST',
          body: JSON.stringify({
            user: state.user.id,
            song: song.id
          })
        });
        state.userFavorites.set(song.id, record.id);
        showToast(`"${song.title}" sevimlilarga qo‘shildi!`);
      } catch (err) {
        showToast('Xatolik yuz berdi', true);
      }
    }
  } else {
    // Guest user: store in localStorage
    if (isLiked) {
      state.localLikedIds.delete(song.id);
      showToast(`"${song.title}" sevimlilardan olib tashlandi`);
    } else {
      state.localLikedIds.add(song.id);
      showToast(`"${song.title}" sevimlilarga qo‘shildi!`);
    }
    localStorage.setItem('mf_local_likes', JSON.stringify([...state.localLikedIds]));
  }

  // If in favorites view, refresh
  if (state.showingFavoritesOnly) {
    showFavoritesView();
  } else {
    renderSongs(state.filteredSongs);
  }
}

async function loadUserFavorites() {
  if (!state.user) return;
  try {
    const res = await pbFetch(`/api/collections/favorites/records?filter=(user='${state.user.id}')`);
    state.userFavorites.clear();
    (res.items || []).forEach(fav => {
      state.userFavorites.set(fav.song, fav.id);
    });
    renderSongs(state.filteredSongs);
  } catch (err) {
    console.warn('Foydalanuvchi sevimlilarini yuklab bo‘lmadi:', err);
  }
}

// --- Auth (Login / Register / Profile) ---
function initAuth() {
  const savedToken = localStorage.getItem('mf_pb_token');
  const savedUser = localStorage.getItem('mf_pb_user');

  if (savedToken && savedUser) {
    try {
      state.token = savedToken;
      state.user = JSON.parse(savedUser);
      renderUserNav();
      loadUserFavorites();
    } catch (e) {
      logout();
    }
  } else {
    renderUserNav();
  }
}

function renderUserNav() {
  if (!userNavContainer) return;

  if (state.user) {
    const displayName = state.user.name || state.user.email.split('@')[0];
    userNavContainer.innerHTML = `
      <div class="user-menu">
        <div class="user-badge" id="userProfileBtn" title="Foydalanuvchi profili">
          <i class="fa-solid fa-circle-user"></i>
          <span>${escapeHtml(displayName)}</span>
        </div>
        <button class="logout-btn" id="logoutBtn" title="Chiqish">Chiqish</button>
      </div>
    `;

    document.getElementById('logoutBtn').addEventListener('click', logout);
  } else {
    userNavContainer.innerHTML = `<button class="login-btn" id="loginBtn">Kirish</button>`;
    document.getElementById('loginBtn').addEventListener('click', openModal);
  }
}

function openModal() {
  authErrorMsg.style.display = 'none';
  authModal.classList.add('active');
}

function closeModal() {
  authModal.classList.remove('active');
}

function logout() {
  state.token = null;
  state.user = null;
  state.userFavorites.clear();
  localStorage.removeItem('mf_pb_token');
  localStorage.removeItem('mf_pb_user');
  renderUserNav();
  renderSongs(state.filteredSongs);
  showToast('Tizimdan chiqdingiz');
}

// Modal Tabs
tabLoginBtn.addEventListener('click', () => {
  tabLoginBtn.classList.add('active');
  tabRegisterBtn.classList.remove('active');
  loginForm.style.display = 'block';
  registerForm.style.display = 'none';
  authErrorMsg.style.display = 'none';
});

tabRegisterBtn.addEventListener('click', () => {
  tabRegisterBtn.classList.add('active');
  tabLoginBtn.classList.remove('active');
  loginForm.style.display = 'none';
  registerForm.style.display = 'block';
  authErrorMsg.style.display = 'none';
});

modalCloseBtn.addEventListener('click', closeModal);
authModal.addEventListener('click', (e) => {
  if (e.target === authModal) closeModal();
});

// Login Form Submit
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authErrorMsg.style.display = 'none';
  const identity = document.getElementById('loginIdentity').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await pbFetch('/api/collections/users/auth-with-password', {
      method: 'POST',
      body: JSON.stringify({ identity, password })
    });

    state.token = res.token;
    state.user = res.record;
    localStorage.setItem('mf_pb_token', res.token);
    localStorage.setItem('mf_pb_user', JSON.stringify(res.record));

    renderUserNav();
    closeModal();
    loginForm.reset();
    showToast(`Xush kelibsiz, ${state.user.name || 'Foydalanuvchi'}!`);
    await loadUserFavorites();
  } catch (err) {
    authErrorMsg.textContent = 'Email yoki parol noto‘g‘ri kiritildi.';
    authErrorMsg.style.display = 'block';
  }
});

// Register Form Submit
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authErrorMsg.style.display = 'none';

  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const passwordConfirm = document.getElementById('regPasswordConfirm').value;

  if (password !== passwordConfirm) {
    authErrorMsg.textContent = 'Kiritilgan parollar mos kelmadi!';
    authErrorMsg.style.display = 'block';
    return;
  }

  try {
    // 1. Create user
    await pbFetch('/api/collections/users/records', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, passwordConfirm })
    });

    // 2. Auto-login
    const authRes = await pbFetch('/api/collections/users/auth-with-password', {
      method: 'POST',
      body: JSON.stringify({ identity: email, password })
    });

    state.token = authRes.token;
    state.user = authRes.record;
    localStorage.setItem('mf_pb_token', authRes.token);
    localStorage.setItem('mf_pb_user', JSON.stringify(authRes.record));

    renderUserNav();
    closeModal();
    registerForm.reset();
    showToast(`Ro‘yxatdan muvaffaqiyatli o‘tdingiz! Xush kelibsiz!`);
    await loadUserFavorites();
  } catch (err) {
    authErrorMsg.textContent = err.data?.message || 'Ro‘yxatdan o‘tishda xatolik yuz berdi.';
    authErrorMsg.style.display = 'block';
  }
});

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  loadSongs();
  loadArtists();
  loadPopularSearches();
});
