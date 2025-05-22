import { GITHUB_OWNER, GITHUB_REPO, GITHUB_API_BASE_URL } from './config.js';

// --- UTILITY FUNCTIONS ---

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function elementInView(el, threshold = 0.1) {
    if (!el) return false;
    const elementTop = el.getBoundingClientRect().top;
    return (
        elementTop <= (window.innerHeight || document.documentElement.clientHeight) * (1 - threshold)
    );
}

// Helper function to escape HTML special characters and prevent XSS
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, function (match) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match];
    });
}


// --- SCROLL ANIMATIONS ---
let handleScrollAnimationThrottled;

function displayScrollElement(element) {
    element.classList.add('is-visible');
}

function handleScrollAnimation() {
    const elementsToReveal = document.querySelectorAll('.scroll-reveal:not(.is-visible)');
    elementsToReveal.forEach((el) => {
        if (elementInView(el, 0.1)) {
            displayScrollElement(el);
        }
    });
}

function initScrollAnimations() {
    if (!document.querySelector('.scroll-reveal')) return;

    handleScrollAnimationThrottled = throttle(handleScrollAnimation, 100);
    
    // Initial check for elements already in view
    handleScrollAnimation(); 
    window.addEventListener('scroll', handleScrollAnimationThrottled);
}

// Function to explicitly re-check scroll elements, e.g., after dynamic content load
export function refreshScrollElements() {
    // Immediately check if any new/existing elements are now in view
    handleScrollAnimation();
}


// --- HEADER SCROLL EFFECT ---
function handleHeaderScroll() {
    const header = document.querySelector('header');
    if (!header) return;

    window.addEventListener('scroll', throttle(() => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }, 100));
}


// --- PAGE TRANSITIONS ---
function initPageTransitions() {
    // Page load fade-in
    // Set initial opacity via JS to ensure it's applied before class for transition
    document.body.style.opacity = '0'; 
    // Use requestAnimationFrame to ensure the style is applied, then add class for transition
    requestAnimationFrame(() => {
        requestAnimationFrame(() => { // Double RAF for robustness
            document.body.classList.add('page-loaded');
            document.body.style.opacity = ''; // Let CSS class control opacity
        });
    });

    // Handle navigation for internal links
    const internalLinks = document.querySelectorAll('a');
    internalLinks.forEach(link => {
        // Ensure it's an internal link, not opening in a new tab, 
        // not a hash link on the same page, and not a javascript action.
        if (link.hostname === window.location.hostname &&
            link.pathname !== window.location.pathname && // Only for actual page changes
            link.target !== '_blank' &&
            !link.getAttribute('href').startsWith('#') &&
            !link.getAttribute('href').startsWith('javascript:') &&
            !link.hasAttribute('data-no-transition')) {

            link.addEventListener('click', function(event) {
                event.preventDefault();
                const destinationUrl = this.href;
                document.body.classList.remove('page-loaded');
                document.body.classList.add('page-leaving'); // Optional if using same class for fade out
                
                setTimeout(() => {
                    window.location.href = destinationUrl;
                }, 400); // Match CSS transition duration (0.4s)
            });
        }
    });

    // Handle browser back/forward navigation (bfcache)
    window.addEventListener('pageshow', function(event) {
        if (event.persisted) { // Page loaded from bfcache
            document.body.classList.remove('page-leaving');
            document.body.classList.add('page-loaded');
            document.body.style.opacity = ''; // Ensure CSS class takes over
        }
    });
}


// --- COMMON INITIALIZATION ---
export function initCommon() {
    // Mobile Nav Toggle
    const navToggle = document.getElementById('nav-toggle');
    const mainNav = document.getElementById('main-nav');
    if (navToggle && mainNav) {
        navToggle.addEventListener('click', () => {
            const isExpanded = navToggle.getAttribute('aria-expanded') === 'true' || false;
            navToggle.setAttribute('aria-expanded', !isExpanded);
            mainNav.classList.toggle('active');
            document.body.classList.toggle('nav-open');
        });
    }

    // Set current year in footer
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    initScrollAnimations();
    handleHeaderScroll();
    initPageTransitions(); // Initialize page transitions
}


// --- STELA ENGINE PAGE SPECIFIC ---
export function initStelaEnginePage() {
    loadLatestCommit();
}

async function loadLatestCommit() {
    const commitContainer = document.getElementById('latest-commit-info');
    if (!commitContainer) return;

    commitContainer.innerHTML = '<p class="scroll-reveal">Loading latest commit from GitHub...</p>';
    refreshScrollElements(); // Make "Loading..." message animate if applicable

    try {
        const response = await fetch(`${GITHUB_API_BASE_URL}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits`);

        if (!response.ok) {
            let errorMsg = `GitHub API error: ${response.status}`;
            if (response.status === 403) {
                 errorMsg += ' (Rate limit exceeded or private repo without token)';
            } else if (response.status === 404) {
                errorMsg += ` (Repository not found. Check GITHUB_OWNER: ${GITHUB_OWNER} and GITHUB_REPO: ${GITHUB_REPO} in js/config.js)`;
            }
            throw new Error(errorMsg);
        }

        const commits = await response.json();
        if (commits && commits.length > 0) {
            const latest = commits[0];
            const commitMessage = escapeHTML(latest.commit.message.split('\n')[0]);
            const authorName = escapeHTML(latest.commit.author.name);
            const authorLogin = latest.author ? escapeHTML(latest.author.login) : 'N/A';
            const commitDate = new Date(latest.commit.author.date).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            const commitInfoHTML = `
                <div class="commit-card scroll-reveal">
                    <h4 class="scroll-reveal d-100">Latest Engine Update</h4>
                    <p class="scroll-reveal d-200"><strong>Message:</strong> ${commitMessage}</p>
                    <p class="scroll-reveal d-300"><strong>Author:</strong> ${authorName} (${authorLogin})</p>
                    <p class="scroll-reveal d-400"><strong>Date:</strong> ${commitDate}</p>
                    <a href="${latest.html_url}" target="_blank" rel="noopener noreferrer" class="btn scroll-reveal d-500">View Commit on GitHub</a>
                </div>
            `;
            commitContainer.innerHTML = commitInfoHTML;
        } else {
            commitContainer.innerHTML = `<p class="scroll-reveal">No commits found. The repository <span class="highlight">${GITHUB_OWNER}/${GITHUB_REPO}</span> might be empty or new.</p>`;
        }
    } catch (error) {
        console.error('Failed to load commit:', error);
        commitContainer.innerHTML = `<p class="error-message scroll-reveal">Could not load latest commit. ${error.message}</p>`;
    }
    refreshScrollElements(); // Re-check all scroll-reveal elements after content update
}
