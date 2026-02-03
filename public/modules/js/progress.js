/**
 * SafeScape Course Progress Tracker
 * Handles localStorage persistence and provides API-ready methods for Node.js integration
 * Now includes real-time sync with the Next.js backend API
 */

const SafeScapeProgress = (function () {
    const STORAGE_KEY = 'safescape_progress';
    const API_ENDPOINT = '/api/kids/safescape/progress';

    // Get userId from URL params (passed from Next.js wrapper)
    function getUserIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('userId');
    }

    function getUserNameFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('userName') || 'Future Hero';
    }

    // Check if we're in an authenticated session (userId present)
    function isAuthenticated() {
        return !!getUserIdFromUrl();
    }

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

    // --- Core Functions ---

    function getProgress() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults to handle any missing fields from updates
                return deepMerge(defaultProgress, parsed);
            }
        } catch (e) {
            console.error('SafeScape: Error reading progress', e);
        }
        return JSON.parse(JSON.stringify(defaultProgress));
    }

    function saveProgress(progress) {
        try {
            progress.lastAccessed = new Date().toISOString();
            progress.overallProgress = calculateOverallProgress(progress);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));

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
        localStorage.removeItem(STORAGE_KEY);
        window.dispatchEvent(new CustomEvent('safescape-progress-update', { detail: defaultProgress }));
        return JSON.parse(JSON.stringify(defaultProgress));
    }

    // --- API Sync Functions ---

    async function syncToAPI(moduleNum, sectionData, completed) {
        if (!isAuthenticated()) {
            return false;
        }

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Include cookies for auth
                body: JSON.stringify({ moduleNum, sectionData, completed })
            });

            if (response.ok) {
                // Notify parent window
                if (window.parent !== window) {
                    window.parent.postMessage({
                        type: 'SAFESCAPE_SECTION_COMPLETE',
                        moduleNum,
                        sectionData,
                        completed
                    }, '*');
                }
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

    // Initialize: merge API progress with local on page load
    async function initializeFromAPI() {
        const apiData = await fetchProgressFromAPI();
        if (apiData && apiData.progress) {
            const localProgress = getProgress();

            // Merge API progress into local progress
            for (let i = 1; i <= 5; i++) {
                if (apiData.progress[i]) {
                    const moduleKey = `module${i}`;
                    localProgress[moduleKey].completed = apiData.progress[i].completed;
                    localProgress[moduleKey].unlocked = i === 1 || apiData.progress[i - 1]?.completed;

                    // Merge section data
                    if (apiData.progress[i].sectionData) {
                        localProgress[moduleKey].sections = {
                            ...localProgress[moduleKey].sections,
                            ...apiData.progress[i].sectionData
                        };
                    }
                }
            }

            // Update student name from URL
            const userName = getUserNameFromUrl();
            if (userName && userName !== 'Future Hero') {
                localProgress.studentName = userName;
            }

            saveProgress(localProgress);
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
        fetchProgressFromAPI,
        initializeFromAPI,

        // Auth helpers
        isAuthenticated,
        getUserIdFromUrl,
        getUserNameFromUrl,

        // Constants
        STORAGE_KEY
    };
})();

// Make available globally
window.SafeScapeProgress = SafeScapeProgress;

// Auto-initialize from API when loaded in iframe with userId
document.addEventListener('DOMContentLoaded', function () {
    if (SafeScapeProgress.isAuthenticated()) {
        SafeScapeProgress.initializeFromAPI();
    }
});