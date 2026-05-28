/* ============================================================
   modules/wizard.js — v5.0 (Production Safe - NO BLOCKING)
   
   PENTING: Wizard navigation TIDAK di-block sama sekali.
   User bisa pindah step freely tanpa validasi gating.
   ============================================================ */

'use strict';

import { buildSummary } from './summary.js';

export const TOTAL_STEPS = 6;
export let currentStep = 1;

/**
 * Pindah ke step tertentu (PRODUCTION SAFE - NEVER BLOCK)
 */
export function goToStep(step) {
    if (typeof step !== 'number' || step < 1 || step > TOTAL_STEPS) {
        console.warn('[wizard] goToStep: invalid step', step);
        return;
    }

    console.log('[wizard] goToStep', currentStep, '->', step);
    currentStep = step;
    window.currentStep = step;
    
    try {
        _updateWizardUI(step);
        
        const card = document.querySelector('.main-card');
        if (card) {
            setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
    } catch (e) {
        console.error('[wizard] _updateWizardUI error:', e);
    }
}

export function nextStep() { 
    console.log('[wizard] nextStep() from', currentStep);
    goToStep(currentStep + 1);
}

export function prevStep() { 
    console.log('[wizard] prevStep() from', currentStep);
    goToStep(currentStep - 1);
}

function _updateWizardUI(step) {
    try {
        // Panel visibility
        document.querySelectorAll('.step-panel').forEach((panel, idx) => {
            panel.classList.toggle('active', idx + 1 === step);
        });

        // Progress circles
        document.querySelectorAll('.wizard-step').forEach((el, idx) => {
            el.classList.remove('active', 'done');
            const s = idx + 1;
            if (s === step) el.classList.add('active');
            else if (s < step) el.classList.add('done');
        });

        // Connectors
        document.querySelectorAll('.wizard-connector').forEach((el, idx) => {
            el.classList.remove('done', 'active');
            if (idx + 1 < step) el.classList.add('done');
            if (idx + 1 === step) el.classList.add('active');
        });

        // Build summary on last step
        if (step === TOTAL_STEPS) {
            try { buildSummary(); } catch(e) { console.warn('[wizard] buildSummary error:', e); }
        }

        // Dispatch event
        document.dispatchEvent(new CustomEvent('codex:wizard-step-change', {
            detail: { step, total: TOTAL_STEPS },
        }));
    } catch (e) {
        console.error('[wizard] _updateWizardUI:', e);
    }
}

export function initWizard() {
    console.log('[wizard] initWizard()');
    currentStep = 1;
    window.currentStep = 1;
    _updateWizardUI(1);
}
