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
    exportCsvBtn: document.getElementById('export-csv-btn'),
    themeCheckbox: document.getElementById('theme-checkbox'),
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    categoryPills: document.getElementById('category-pills'),
    sortSelect: document.getElementById('sort-select'),
    emptyState: document.getElementById('empty-state'),
    emptyAction: document.getElementById('empty-action'),
    cacheInfo: document.getElementById('cache-info'),
    staleBanner: document.getElementById('stale-banner'),
    staleBannerText: document.getElementById('stale-banner-text'),
    toastContainer: document.getElementById('toast-container'),
    
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
    publishTweetBtn: document.getElementById('publish-tweet-btn'),
    autofitTweetBtn: document.getElementById('autofit-tweet-btn')
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
    
    // Export CSV
    DOM.exportCsvBtn.addEventListener('click', () => exportToCSV());
    
    // Theme toggler
    DOM.themeCheckbox.addEventListener('change', toggleTheme);
    
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
    
    // Keyboard shortcut to focus search: '/' key
    window.addEventListener('keydown', (e) => {
        const activeTag = document.activeElement.tagName.toLowerCase();
        if (e.key === '/' && activeTag !== 'input' && activeTag !== 'textarea') {
            e.preventDefault();
            DOM.searchInput.focus();
            showToast('Search bar focused', 'info');
        }
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
    
    // Auto-fit Tweet text
    DOM.autofitTweetBtn.addEventListener('click', autofitTweetDraft);
    
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
    if (DOM.themeCheckbox) {
        DOM.themeCheckbox.checked = (savedTheme === 'light');
    }
}

function toggleTheme(e) {
    const isLight = e.target.checked;
    const newTheme = isLight ? 'light' : 'dark';
    
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
            
            // Handle stale warning banner
            if (data.stale) {
                DOM.staleBanner.classList.remove('hidden');
                const cacheTime = data.cached_at ? new Date(data.cached_at * 1000).toLocaleTimeString() : 'unknown';
                DOM.staleBannerText.textContent = `Offline: serving cached release notes from ${cacheTime}.`;
            } else {
                DOM.staleBanner.classList.add('hidden');
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
            const relativeDate = getRelativeTimeString(note.date);
            const displayDate = relativeDate ? `${note.date} (${relativeDate})` : note.date;
            
            let renderedHtml = note.html;
            if (state.searchQuery) {
                const escapedQuery = escapeRegExp(state.searchQuery);
                const highlightRegex = new RegExp(`(${escapedQuery})(?![^<>]*>)`, 'gi');
                renderedHtml = renderedHtml.replace(highlightRegex, '<mark class="highlight">$1</mark>');
            }
            
            const isCollapsible = note.text.length > 250;
            const bodyClass = isCollapsible ? 'card-body collapsible' : 'card-body';
            
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
                            ${displayDate}
                        </span>
                    </header>
                    <div class="${bodyClass}">
                        ${renderedHtml}
                    </div>
                    ${isCollapsible ? `
                    <button class="read-more-btn">
                        Read More
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    ` : ''}
                </div>
                <footer class="card-footer">
                    <a href="${note.link}" target="_blank" rel="noopener noreferrer" class="link-icon-btn" title="View official release notes source page">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </a>
                    <div class="card-actions">
                        <button class="btn btn-secondary btn-sm copy-trigger-btn" title="Copy plain-text release note to clipboard">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span class="copy-btn-label">Copy</span>
                        </button>
                        <button class="btn btn-secondary btn-sm tweet-trigger-btn" data-id="${note.id}">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            Tweet
                        </button>
                    </div>
                </footer>
            `;
            
            // Wire up Read More click handler
            if (isCollapsible) {
                card.querySelector('.read-more-btn').addEventListener('click', (e) => {
                    const body = card.querySelector('.card-body');
                    const isExpanded = body.classList.toggle('expanded');
                    e.currentTarget.innerHTML = isExpanded 
                        ? `Read Less <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`
                        : `Read More <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
                });
            }
            
            // Wire up Copy Note click handler
            card.querySelector('.copy-trigger-btn').addEventListener('click', (e) => {
                copyNoteText(note, e.currentTarget);
            });
            
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
        showToast('Tweet draft copied to clipboard!', 'success');
        
        // Reset button state after delay
        setTimeout(() => {
            DOM.copyBtnText.textContent = 'Copy Text';
            DOM.copyTweetBtn.classList.remove('btn-success');
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy to clipboard.', 'error');
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

// Copy a single note's plain-text representation to clipboard
async function copyNoteText(note, buttonElement) {
    const textToCopy = `BigQuery Release [${note.date}] - ${note.category.toUpperCase()}:\n${note.text}\n\nSource: ${note.link}`;
    const label = buttonElement.querySelector('.copy-btn-label');
    
    try {
        await navigator.clipboard.writeText(textToCopy);
        buttonElement.classList.add('btn-success');
        if (label) label.textContent = 'Copied!';
        showToast('Release note copied!', 'success');
        
        setTimeout(() => {
            buttonElement.classList.remove('btn-success');
            if (label) label.textContent = 'Copy';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy card: ', err);
        showToast('Failed to copy note.', 'error');
    }
}

// Get the notes list currently filtered by category and search query
function getFilteredNotes() {
    let filtered = state.releaseNotes.filter(note => {
        const matchesCategory = state.activeCategory === 'All' || 
            note.category.toLowerCase() === state.activeCategory.toLowerCase();
            
        const matchesSearch = !state.searchQuery || 
            note.category.toLowerCase().includes(state.searchQuery) ||
            note.date.toLowerCase().includes(state.searchQuery) ||
            note.text.toLowerCase().includes(state.searchQuery);
            
        return matchesCategory && matchesSearch;
    });
    
    filtered.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return state.sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    return filtered;
}

// Export the currently filtered notes as a CSV file
function exportToCSV() {
    const filtered = getFilteredNotes();
    if (filtered.length === 0) {
        showToast('No notes available to export.', 'info');
        return;
    }
    
    const headers = ['Date', 'Category', 'Plain Text Description', 'Source URL'];
    
    const escapeCSV = (value) => {
        if (value === null || value === undefined) return '';
        let str = String(value);
        str = str.replace(/"/g, '""'); // Escape double quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            str = `"${str}"`; // Wrap values containing commas, quotes, or newlines
        }
        return str;
    };
    
    const csvRows = [
        headers.join(','),
        ...filtered.map(note => [
            note.date,
            note.category,
            note.text,
            note.link
        ].map(escapeCSV).join(','))
    ];
    
    const csvContent = csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const dateStr = new Date().toISOString().split('T')[0];
    const categoryName = state.activeCategory.toLowerCase().replace(/\s+/g, '_');
    
    const downloadLink = document.createElement('a');
    downloadLink.setAttribute('href', url);
    downloadLink.setAttribute('download', `bigquery_release_notes_${categoryName}_${dateStr}.csv`);
    downloadLink.style.visibility = 'hidden';
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    showToast(`Exported ${filtered.length} notes to CSV!`, 'success');
}

// Helper: Escape regex special characters
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper: Show custom toast notification
function showToast(message, type = 'success') {
    if (!DOM.toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    DOM.toastContainer.appendChild(toast);
    
    // Auto-remove toast after transition (3 seconds total)
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Helper: Generate a relative date string (e.g. "2 days ago")
function getRelativeTimeString(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        
        const now = new Date();
        // Clear time of day for exact date calculations
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        const diffTime = today - target;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays > 1 && diffDays < 30) return `${diffDays} days ago`;
        
        // Return months ago if longer
        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths === 1) return '1 month ago';
        if (diffMonths > 1) return `${diffMonths} months ago`;
        
        return null;
    } catch (e) {
        return null;
    }
}

// Helper: Auto-fit tweet compose text to 280-character limit
function autofitTweetDraft() {
    if (!state.selectedNote) return;
    
    const note = state.selectedNote;
    const emoji = getCategoryEmoji(note.category);
    const header = `${emoji} BigQuery Release [${note.date}] - ${note.category.toUpperCase()}:\n`;
    const link = note.link;
    
    const maxTotalLength = 280;
    const urlFixedLength = 23;
    
    // Total static template length
    const templateLength = header.length + 3 + urlFixedLength;
    const textBudget = maxTotalLength - templateLength;
    
    let noteText = note.text;
    if (noteText.length > textBudget) {
        noteText = noteText.substring(0, textBudget - 3).trim() + '...';
        showToast('Text auto-fitted to 280 characters', 'info');
    } else {
        showToast('Text already fits in character limit', 'info');
    }
    
    DOM.tweetTextarea.value = `${header}${noteText}\n\n${link}`;
    updateCharCount();
}
