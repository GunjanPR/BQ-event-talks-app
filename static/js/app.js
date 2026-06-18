// ==========================================================================
// Application State
// ==========================================================================
let state = {
    releaseNotes: [],
    categories: ['All'],
    activeCategory: 'All',
    searchQuery: '',
    sortOrder: 'newest',
    isLoading: false,
    selectedNote: null
};

// ==========================================================================
// DOM Elements
// ==========================================================================
const DOM = {
    notesContainer: document.getElementById('notes-container'),
    refreshBtn: document.getElementById('refresh-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    categoryPills: document.getElementById('category-pills'),
    sortSelect: document.getElementById('sort-select'),
    emptyState: document.getElementById('empty-state'),
    emptyAction: document.getElementById('empty-action'),
    cacheInfo: document.getElementById('cache-info'),
    
    // Stats
    statTotal: document.getElementById('stat-total'),
    statFeatures: document.getElementById('stat-features'),
    statIssues: document.getElementById('stat-issues'),
    statOthers: document.getElementById('stat-others'),
    
    // Modal
    tweetModal: document.getElementById('tweet-modal'),
    modalClose: document.getElementById('modal-close'),
    previewCategory: document.getElementById('preview-category'),
    previewDate: document.getElementById('preview-date'),
    previewBody: document.getElementById('preview-body'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCounter: document.getElementById('char-counter'),
    copyTweetBtn: document.getElementById('copy-tweet-btn'),
    copyBtnText: document.getElementById('copy-btn-text'),
    publishTweetBtn: document.getElementById('publish-tweet-btn')
};

// ==========================================================================
// Init & Event Listeners
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchReleaseNotes(false);
    setupEventListeners();
});

function setupEventListeners() {
    // Refresh feed
    DOM.refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Theme toggler
    DOM.themeToggle.addEventListener('click', toggleTheme);
    
    // Realtime Search
    DOM.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        renderNotes();
    });
    
    // Clear search
    DOM.searchClear.addEventListener('click', () => {
        DOM.searchInput.value = '';
        state.searchQuery = '';
        renderNotes();
        DOM.searchInput.focus();
    });
    
    // Sorting
    DOM.sortSelect.addEventListener('change', (e) => {
        state.sortOrder = e.target.value;
        renderNotes();
    });
    
    // Reset filters empty state button
    DOM.emptyAction.addEventListener('click', resetFilters);
    
    // Modal controls
    DOM.modalClose.addEventListener('click', closeModal);
    DOM.tweetModal.addEventListener('click', (e) => {
        if (e.target === DOM.tweetModal) closeModal();
    });
    
    // Textarea input for character counter
    DOM.tweetTextarea.addEventListener('input', updateCharCount);
    
    // Copy Tweet
    DOM.copyTweetBtn.addEventListener('click', copyTweetText);
    
    // Publish Tweet
    DOM.publishTweetBtn.addEventListener('click', publishTweet);
}

// ==========================================================================
// Theme Management
// ==========================================================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// ==========================================================================
// Data Fetching
// ==========================================================================
async function fetchReleaseNotes(forceRefresh = false) {
    if (state.isLoading) return;
    
    setLoadingState(true);
    
    try {
        const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.items) {
            state.releaseNotes = data.items;
            
            // Extract unique categories dynamically
            const categoriesSet = new Set(['All']);
            data.items.forEach(item => {
                if (item.category) {
                    categoriesSet.add(capitalize(item.category));
                }
            });
            state.categories = Array.from(categoriesSet);
            
            // Update cache info time
            if (data.cached_at) {
                const date = new Date(data.cached_at * 1000);
                DOM.cacheInfo.textContent = `Cached at: ${date.toLocaleTimeString()} ${date.toLocaleDateString()}`;
            }
            
            updateStats();
            renderCategoryPills();
            renderNotes();
        } else {
            showErrorState(data.error || 'Failed to fetch release notes.');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showErrorState('Network error occurred while fetching release notes.');
    } finally {
        setLoadingState(false);
    }
}

function setLoadingState(loading) {
    state.isLoading = loading;
    if (loading) {
        DOM.refreshBtn.classList.add('loading');
        DOM.refreshBtn.disabled = true;
        
        // Show skeletons
        DOM.notesContainer.innerHTML = Array(3).fill(0).map(() => `
            <div class="skeleton-card">
                <div class="skeleton-header">
                    <div class="skeleton-badge"></div>
                    <div class="skeleton-date"></div>
                </div>
                <div class="skeleton-content">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                </div>
                <div class="skeleton-footer"></div>
            </div>
        `).join('');
        DOM.emptyState.classList.add('hidden');
    } else {
        DOM.refreshBtn.classList.remove('loading');
        DOM.refreshBtn.disabled = false;
    }
}

// ==========================================================================
// Rendering and Filtering UI
// ==========================================================================
function updateStats() {
    const total = state.releaseNotes.length;
    const features = state.releaseNotes.filter(n => n.category.toLowerCase() === 'feature').length;
    const issues = state.releaseNotes.filter(n => n.category.toLowerCase() === 'issue').length;
    const others = total - features - issues;
    
    DOM.statTotal.textContent = total;
    DOM.statFeatures.textContent = features;
    DOM.statIssues.textContent = issues;
    DOM.statOthers.textContent = others;
}

function renderCategoryPills() {
    DOM.categoryPills.innerHTML = '';
    
    state.categories.forEach(category => {
        const count = category === 'All' 
            ? state.releaseNotes.length 
            : state.releaseNotes.filter(n => n.category.toLowerCase() === category.toLowerCase()).length;
            
        const pill = document.createElement('button');
        pill.className = `pill ${state.activeCategory === category ? 'active' : ''}`;
        pill.setAttribute('data-category', category.toLowerCase());
        pill.innerHTML = `
            ${category}
            <span class="pill-count">${count}</span>
        `;
        
        pill.addEventListener('click', () => {
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.activeCategory = category;
            renderNotes();
        });
        
        DOM.categoryPills.appendChild(pill);
    });
}

function renderNotes() {
    // 1. Filter
    let filtered = state.releaseNotes.filter(note => {
        // Category Filter
        const matchesCategory = state.activeCategory === 'All' || 
            note.category.toLowerCase() === state.activeCategory.toLowerCase();
            
        // Search Filter
        const matchesSearch = !state.searchQuery || 
            note.category.toLowerCase().includes(state.searchQuery) ||
            note.date.toLowerCase().includes(state.searchQuery) ||
            note.text.toLowerCase().includes(state.searchQuery);
            
        return matchesCategory && matchesSearch;
    });
    
    // 2. Sort
    filtered.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (state.sortOrder === 'newest') {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });
    
    // 3. Render
    DOM.notesContainer.innerHTML = '';
    
    if (filtered.length === 0) {
        DOM.emptyState.classList.remove('hidden');
        if (state.searchQuery) {
            document.getElementById('empty-title').textContent = 'No matching search results';
            document.getElementById('empty-message').textContent = `No updates matched "${state.searchQuery}". Try a different keyword.`;
        } else {
            document.getElementById('empty-title').textContent = 'No notes in this category';
            document.getElementById('empty-message').textContent = `No items classified as "${state.activeCategory}" were found.`;
        }
    } else {
        DOM.emptyState.classList.add('hidden');
        
        filtered.forEach(note => {
            const card = document.createElement('article');
            card.className = 'note-card';
            card.setAttribute('data-category', note.category);
            
            const categoryClass = `badge-${note.category.toLowerCase()}`;
            
            card.innerHTML = `
                <div>
                    <header class="card-header">
                        <span class="badge ${categoryClass}">${note.category}</span>
                        <span class="card-date">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            ${note.date}
                        </span>
                    </header>
                    <div class="card-body">
                        ${note.html}
                    </div>
                </div>
                <footer class="card-footer">
                    <a href="${note.link}" target="_blank" rel="noopener noreferrer" class="link-icon-btn" title="View official release notes source page">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </a>
                    <button class="btn btn-secondary btn-sm tweet-trigger-btn" data-id="${note.id}">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        Tweet Note
                    </button>
                </footer>
            `;
            
            // Wire up Tweet Note click handler
            card.querySelector('.tweet-trigger-btn').addEventListener('click', () => {
                openTweetModal(note);
            });
            
            DOM.notesContainer.appendChild(card);
        });
    }
}

function showErrorState(message) {
    DOM.notesContainer.innerHTML = '';
    DOM.emptyState.classList.remove('hidden');
    document.getElementById('empty-title').textContent = 'An error occurred';
    document.getElementById('empty-message').textContent = message;
    DOM.emptyAction.textContent = 'Retry Loading';
    DOM.emptyAction.onclick = () => fetchReleaseNotes(true);
}

function resetFilters() {
    DOM.searchInput.value = '';
    state.searchQuery = '';
    state.activeCategory = 'All';
    DOM.sortSelect.value = 'newest';
    state.sortOrder = 'newest';
    
    // Reset category pill styles
    document.querySelectorAll('.pill').forEach(p => {
        if (p.getAttribute('data-category') === 'all') {
            p.classList.add('active');
        } else {
            p.classList.remove('active');
        }
    });
    
    renderNotes();
}

// ==========================================================================
// Tweet Modal Actions
// ==========================================================================
function openTweetModal(note) {
    state.selectedNote = note;
    
    // Format modal preview
    DOM.previewCategory.textContent = note.category;
    DOM.previewCategory.className = `badge badge-${note.category.toLowerCase()}`;
    DOM.previewDate.textContent = note.date;
    DOM.previewBody.innerHTML = note.html;
    
    // Generate draft text
    const initialText = generateInitialTweet(note);
    DOM.tweetTextarea.value = initialText;
    
    // Show character count
    updateCharCount();
    
    // Reset copy button status
    DOM.copyBtnText.textContent = 'Copy Text';
    DOM.copyTweetBtn.classList.remove('btn-success');
    
    // Activate modal animation
    DOM.tweetModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Stop background scrolling
    
    // Focus textarea
    setTimeout(() => DOM.tweetTextarea.focus(), 150);
}

function closeModal() {
    DOM.tweetModal.classList.remove('active');
    document.body.style.overflow = '';
    state.selectedNote = null;
}

function generateInitialTweet(note) {
    const emoji = getCategoryEmoji(note.category);
    const header = `${emoji} BigQuery Release [${note.date}] - ${note.category.toUpperCase()}:\n`;
    const link = note.link;
    
    // Total text budget
    const maxTotalLength = 280;
    const urlFixedLength = 23; // Twitter URL fixed count
    
    // Count characters needed for template spacing and elements:
    // header + newlines + space + link
    const templateLength = header.length + 3 + urlFixedLength;
    const textBudget = maxTotalLength - templateLength;
    
    let noteText = note.text;
    if (noteText.length > textBudget) {
        // Subtract 3 for ellipsis
        noteText = noteText.substring(0, textBudget - 3).trim() + '...';
    }
    
    return `${header}${noteText}\n\n${link}`;
}

function getCategoryEmoji(category) {
    switch (category.toLowerCase()) {
        case 'feature': return '🚀';
        case 'issue': return '⚠️';
        case 'deprecated': return '🛑';
        case 'changed': return '🔄';
        default: return '📢';
    }
}

function getTweetLength(text) {
    // Twitter handles URLs as 23 characters regardless of length.
    // Detect URLs:
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];
    
    let length = text.length;
    urls.forEach(url => {
        length = length - url.length + 23;
    });
    
    return length;
}

function updateCharCount() {
    const text = DOM.tweetTextarea.value;
    const length = getTweetLength(text);
    
    DOM.charCounter.textContent = `${length} / 280`;
    
    // Add warnings depending on count
    DOM.charCounter.className = 'char-counter';
    if (length > 280) {
        DOM.charCounter.classList.add('danger');
        DOM.publishTweetBtn.disabled = true;
    } else if (length > 250) {
        DOM.charCounter.classList.add('warning');
        DOM.publishTweetBtn.disabled = false;
    } else {
        DOM.publishTweetBtn.disabled = false;
    }
}

async function copyTweetText() {
    const text = DOM.tweetTextarea.value;
    try {
        await navigator.clipboard.writeText(text);
        
        DOM.copyBtnText.textContent = 'Copied!';
        DOM.copyTweetBtn.classList.add('btn-success');
        
        // Reset button state after delay
        setTimeout(() => {
            DOM.copyBtnText.textContent = 'Copy Text';
            DOM.copyTweetBtn.classList.remove('btn-success');
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy to clipboard. Please select the text manually.');
    }
}

function publishTweet() {
    const text = DOM.tweetTextarea.value;
    const length = getTweetLength(text);
    
    if (length > 280) {
        alert('Tweet is too long! Please shorten it before publishing.');
        return;
    }
    
    // Build Twitter intent URL
    const encodedText = encodeURIComponent(text);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    
    // Open in a popup window centered if possible, otherwise standard tab
    const width = 550;
    const height = 420;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    window.open(
        twitterUrl, 
        'Share on Twitter', 
        `width=${width},height=${height},left=${left},top=${top},location=0,menubar=0,toolbar=0,status=0,scrollbars=1,resizable=1`
    );
    
    closeModal();
}

// ==========================================================================
// Helper functions
// ==========================================================================
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}
