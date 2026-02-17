/**
 * SafeScape Course Progress Tracker
 * Handles localStorage persistence and provides API-ready methods for Node.js integration
 * Now includes real-time sync with the Next.js backend API
 */

const SafeScapeProgress = (function () {
    // Default progress structure
    const defaultProgress = {
        studentName: '',
        module1: {
            unlocked: true, // First module always unlocked
            completed: false,
            sections: {
                videoWatched: false,
                section1Read: false,
                section2Read: false,
                elementMixerCompleted: false
            }
        },
        module2: {
            unlocked: false,
            completed: false,
            sections: {
                videoWatched: false,
                soundDetectivePassed: false,
                networkMapViewed: false,
                rhythmGameCompleted: false,
                quizScore: 0,
                quizPassed: false
            }
        },
        module3: {
            unlocked: false,
            completed: false,
            sections: {
                videoWatched: false,
                scannerInteracted: false,
                labyrinthEscaped: false,
                integrityPassed: false,
                quizScore: 0,
                quizPassed: false
            }
        },
        module4: {
            unlocked: false,
            completed: false,
            sections: {
                cardsCompleted: [false, false, false, false, false],
                allCardsCompleted: false,
                tfAnswers: [null, null, null, null, null],
                finalCheckPassed: false
            }
        },
        module5: {
            unlocked: false,
            completed: false,
            sections: {
                videoWatched: false,
                sdrCompleted: false,
                sdrTrapCompleted: false,
                hazardHuntCompleted: false,
                finalExamScore: 0,
                finalExamPassed: false,
                certified: false,
                certificationDate: null
            }
        },
        overallProgress: 0,
        lastAccessed: null
    };

    // In-memory storage (replacing localStorage)
    let _currentProgress = JSON.parse(JSON.stringify(defaultProgress));

    // Promise that resolves when API initialization is complete
    let _readyResolve;
    let _readyPromise = new Promise(resolve => { _readyResolve = resolve; });

    const API_ENDPOINT = window.location.origin + '/api/kids/safescape/progress';

    // Auth helpers: Persist in sessionStorage to survive navigation (links between modules don't pass params)
    function getUserId() {
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get('userId');
        if (urlId) {
            try { sessionStorage.setItem('safescape_userId', urlId); } catch (e) { }
            return urlId;
        }
        try { return sessionStorage.getItem('safescape_userId'); } catch (e) { return null; }
    }

    function getUserName() {
        const params = new URLSearchParams(window.location.search);
        const urlName = params.get('userName');
        if (urlName) {
            try { sessionStorage.setItem('safescape_userName', urlName); } catch (e) { }
            return urlName || 'Future Hero';
        }
        try { return sessionStorage.getItem('safescape_userName') || 'Future Hero'; } catch (e) { return 'Future Hero'; }
    }

    // Check if we're in an authenticated session
    function isAuthenticated() {
        return !!getUserId();
    }

    // --- Core Functions ---

    function getProgress() {
        return deepMerge(defaultProgress, _currentProgress);
    }

    function saveProgress(progress) {
        try {
            progress.lastAccessed = new Date().toISOString();
            progress.overallProgress = calculateOverallProgress(progress);

            // Update in-memory state
            _currentProgress = progress;

            // Dispatch custom event for reactivity
            window.dispatchEvent(new CustomEvent('safescape-progress-update', { detail: progress }));

            // Notify parent window (Next.js wrapper) about progress update
            if (window.parent !== window) {
                window.parent.postMessage({ type: 'SAFESCAPE_PROGRESS_UPDATE', progress }, '*');
            }

            return true;
        } catch (e) {
            console.error('SafeScape: Error saving progress', e);
            return false;
        }
    }

    function resetProgress() {
        _currentProgress = JSON.parse(JSON.stringify(defaultProgress));

        // Reset on server if authenticated
        if (isAuthenticated()) {
            fetch(API_ENDPOINT, { method: 'DELETE' })
                .then(res => {
                    if (res.ok) console.log('SafeScape: Remote progress reset');
                    else console.error('SafeScape: Failed to reset remote progress');
                })
                .catch(e => console.error('SafeScape: Error resetting remote progress', e));
        }

        window.dispatchEvent(new CustomEvent('safescape-progress-update', { detail: _currentProgress }));
        return _currentProgress;
    }

    // --- API Sync Functions ---

    async function syncToAPI(moduleNum, sectionData, completed) {
        if (!isAuthenticated()) {
            return false;
        }

        try {
            // Notify parent window regardless of local fetch result
            // This ensures the parent (SafeScape app) can handle the sync even if iframe auth/cookies fail
            if (window.parent !== window) {
                window.parent.postMessage({
                    type: 'SAFESCAPE_SECTION_COMPLETE',
                    moduleNum,
                    sectionData,
                    completed
                }, '*');
            }

            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Include cookies for auth
                body: JSON.stringify({ moduleNum, sectionData, completed })
            });

            if (response.ok) {
                return true;
            } else {
                console.error('SafeScape: API sync failed', response.status);
                return false;
            }
        } catch (e) {
            console.error('SafeScape: API sync error', e);
            return false;
        }
    }

    async function submitQuizResult(moduleNum, score, maxScore = 100) {
        if (!isAuthenticated()) return false;

        try {
            const quizType = `module_${moduleNum}_quiz`;
            const url = window.location.origin + '/api/kids/quiz';
            // console.log(`[SafeScape] Submitting quiz to ${url}`, { moduleNum, score, maxScore });

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ quizType, score, maxScore })
            });

            if (!response.ok) {
                console.error(`[SafeScape] Quiz submit failed: ${response.status} ${response.statusText}`);
                const text = await response.text();
                console.error(`[SafeScape] Error details:`, text);
                return false;
            }

            return true;
        } catch (e) {
            console.error('SafeScape: Quiz submit network error', e);
            return false;
        }
    }

    async function fetchProgressFromAPI() {
        if (!isAuthenticated()) {
            return null;
        }

        try {
            const response = await fetch(API_ENDPOINT, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                return data;
            }
        } catch (e) {
            console.error('SafeScape: API fetch error', e);
        }
        return null;
    }

    // Initialize: merge API progress with local (in-memory) on page load
    async function initializeFromAPI() {
        // console.log('SafeScape: Initializing from API...');
        const apiData = await fetchProgressFromAPI();

        if (apiData && apiData.progress) {
            // console.log('SafeScape: API data received', apiData.progress);
            const localProgress = getProgress(); // Gets current in-memory defaults

            // Merge API progress into local progress 
            // AND recalibrate unlocked status for ALL modules
            for (let i = 1; i <= 5; i++) {
                const moduleKey = `module${i}`;

                // 1. Merge Completed/Section data if exists in API
                if (apiData.progress[i]) {
                    localProgress[moduleKey].completed = apiData.progress[i].completed;

                    // Merge section data
                    if (apiData.progress[i].sectionData) {
                        localProgress[moduleKey].sections = {
                            ...localProgress[moduleKey].sections,
                            ...apiData.progress[i].sectionData
                        };
                    }
                }

                // 2. Strict Unlock Logic (Independent of API existence)
                if (i === 1) {
                    localProgress[moduleKey].unlocked = true;
                } else {
                    const prevModuleKey = `module${i - 1}`;
                    // Unlocked if previous is completed
                    if (localProgress[prevModuleKey].completed) {
                        localProgress[moduleKey].unlocked = true;
                    }
                }
            }

            // Update student name from URL/Session
            const userName = getUserName();
            if (userName && userName !== 'Future Hero') {
                localProgress.studentName = userName;
            }

            saveProgress(localProgress); // Updates in-memory and notifies listeners
            // console.log('SafeScape: Progress initialized', localProgress);
        } else {
            // console.log('SafeScape: No API data or fetch failed.');
        }
    }

    // --- Section & Module Completion ---

    function completeSection(moduleNum, sectionKey, value = true) {
        const progress = getProgress();
        const moduleKey = `module${moduleNum}`;

        if (progress[moduleKey] && progress[moduleKey].sections) {
            progress[moduleKey].sections[sectionKey] = value;
            checkModuleCompletion(progress, moduleNum);
            saveProgress(progress);

            // Sync to API in real-time
            syncToAPI(moduleNum, progress[moduleKey].sections, progress[moduleKey].completed);
        }

        return progress;
    }

    function checkModuleCompletion(progress, moduleNum) {
        const moduleKey = `module${moduleNum}`;
        const module = progress[moduleKey];

        if (!module) return;

        let isComplete = false;

        switch (moduleNum) {
            case 1:
                isComplete = module.sections.elementMixerCompleted;
                break;
            case 2:
                isComplete = module.sections.quizPassed;
                break;
            case 3:
                isComplete = module.sections.quizPassed && module.sections.integrityPassed;
                break;
            case 4:
                isComplete = module.sections.finalCheckPassed;
                break;
            case 5:
                isComplete = module.sections.finalExamPassed;
                break;
        }

        if (isComplete && !module.completed) {
            module.completed = true;
            // Unlock next module
            const nextModuleKey = `module${moduleNum + 1}`;
            if (progress[nextModuleKey]) {
                progress[nextModuleKey].unlocked = true;
            }
        }
    }

    function isModuleUnlocked(moduleNum) {
        const progress = getProgress();
        const moduleKey = `module${moduleNum}`;
        return progress[moduleKey]?.unlocked || false;
    }

    function isModuleCompleted(moduleNum) {
        const progress = getProgress();
        const moduleKey = `module${moduleNum}`;
        return progress[moduleKey]?.completed || false;
    }

    // --- Student Name ---

    function setStudentName(name) {
        const progress = getProgress();
        progress.studentName = name;
        saveProgress(progress);
        return progress;
    }

    function getStudentName() {
        return getProgress().studentName || 'Future Hero';
    }

    // --- Certificate ---

    function awardCertificate() {
        const progress = getProgress();
        progress.module5.sections.certified = true;
        progress.module5.sections.certificationDate = new Date().toISOString();
        progress.module5.completed = true;
        saveProgress(progress);
        return progress;
    }

    function isCertified() {
        return getProgress().module5?.sections?.certified || false;
    }

    // --- Progress Calculation ---

    function calculateOverallProgress(progress) {
        let completed = 0;
        let total = 5;

        for (let i = 1; i <= 5; i++) {
            if (progress[`module${i}`]?.completed) completed++;
        }

        return Math.round((completed / total) * 100);
    }

    function getModuleProgress(moduleNum) {
        const progress = getProgress();
        const moduleKey = `module${moduleNum}`;
        const module = progress[moduleKey];

        if (!module) return 0;

        const sections = module.sections;
        const sectionKeys = Object.keys(sections);
        let completed = 0;

        sectionKeys.forEach(key => {
            const val = sections[key];
            if (val === true || (typeof val === 'number' && val > 0)) {
                completed++;
            }
        });

        return Math.round((completed / sectionKeys.length) * 100);
    }

    // --- API Export (for Node.js integration) ---

    function exportProgressJSON() {
        return JSON.stringify(getProgress(), null, 2);
    }

    function importProgressJSON(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            const merged = deepMerge(defaultProgress, imported);
            saveProgress(merged);
            return true;
        } catch (e) {
            console.error('SafeScape: Invalid progress JSON', e);
            return false;
        }
    }

    // --- Utility ---

    function deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    // Returns a promise that resolves when API initialization is complete
    function whenReady() {
        return _readyPromise;
    }

    // --- Public API ---
    return {
        // Core
        getProgress,
        saveProgress,
        resetProgress,

        // Sections
        completeSection,

        // Modules
        isModuleUnlocked,
        isModuleCompleted,
        getModuleProgress,

        // Student
        setStudentName,
        getStudentName,

        // Certificate
        awardCertificate,
        isCertified,

        // API Integration
        exportProgressJSON,
        importProgressJSON,
        syncToAPI,
        submitQuizResult,
        fetchProgressFromAPI,
        initializeFromAPI,

        // Ready gate
        whenReady,
        _resolveReady: () => _readyResolve(),

        // Auth helpers
        isAuthenticated,
        getUserId,
        getUserName
    };
})();

// Make available globally
window.SafeScapeProgress = SafeScapeProgress;

// Auto-initialize from API when loaded in iframe with userId
document.addEventListener('DOMContentLoaded', async function () {
    if (SafeScapeProgress.isAuthenticated()) {
        await SafeScapeProgress.initializeFromAPI();
    }
    // Signal that initialization is complete (even if not authenticated)
    SafeScapeProgress._resolveReady();
});