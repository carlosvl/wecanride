import { LightningElement, api } from 'lwc';

/**
 * Displays form completion progress: a donut-style progress ring
 * plus a categorized grid of step cards with status badges.
 * Adapts displayed steps based on program type (Riding vs Mental Health).
 */

const RIDING_STEPS = [
    { key: 'mainInfo',              label: 'Main Info',              icon: 'utility:identity',        category: 'Profile' },
    { key: 'parentGuardian',        label: 'Parent/Guardian',        icon: 'utility:people',          category: 'Profile' },
    { key: 'emergencyContact',      label: 'Emergency Contact',      icon: 'utility:alert',           category: 'Profile' },
    { key: 'groupHome',             label: 'Group Home',             icon: 'utility:home',            category: 'Profile' },
    { key: 'photoRelease',          label: 'Photo Release',          icon: 'utility:photo',           category: 'Required' },
    { key: 'emergencyTreatment',    label: 'Emergency Treatment',    icon: 'utility:warning',         category: 'Required' },
    { key: 'clientWaiver',          label: 'Client Waiver',          icon: 'utility:edit_form',       category: 'Required' },
    { key: 'medicalHistory',        label: 'Medical History',        icon: 'utility:file',            category: 'Required' },
    { key: 'paymentInfo',           label: 'Payment Info',           icon: 'utility:money',           category: 'Required' },
    { key: 'heightWeight',          label: 'Height & Weight',        icon: 'utility:metric',          category: 'Required' },
    { key: 'downSyndrome',          label: 'Down Syndrome',          icon: 'utility:upload',          category: 'Diagnosis' },
    { key: 'seizureForm',           label: 'Seizure Form',           icon: 'utility:upload',          category: 'Diagnosis' },
    { key: 'scoliosis',             label: 'Scoliosis',             icon: 'utility:upload',          category: 'Diagnosis' },
    { key: 'confidentialityHippa',  label: 'Confidentiality/HIPPA', icon: 'utility:lock',            category: 'Specialty' },
    { key: 'therapyCancellation',   label: 'Therapy Cancellation',  icon: 'utility:record_delete',   category: 'Specialty' }
];

const MENTAL_HEALTH_STEPS = [
    { key: 'mainInfo',              label: 'Main Info',              icon: 'utility:identity',        category: 'Profile' },
    { key: 'parentGuardian',        label: 'Parent/Guardian',        icon: 'utility:people',          category: 'Profile' },
    { key: 'emergencyContact',      label: 'Emergency Contact',      icon: 'utility:alert',           category: 'Profile' },
    { key: 'groupHome',             label: 'Group Home',             icon: 'utility:home',            category: 'Profile' },
    { key: 'photoRelease',          label: 'Photo Release',          icon: 'utility:photo',           category: 'Required' },
    { key: 'emergencyTreatment',    label: 'Emergency Treatment',    icon: 'utility:warning',         category: 'Required' },
    { key: 'clientWaiver',          label: 'Client Waiver',          icon: 'utility:edit_form',       category: 'Required' },
    { key: 'paymentInfo',           label: 'Payment Info',           icon: 'utility:money',           category: 'Required' },
    { key: 'diagnoses',             label: 'Diagnoses',              icon: 'utility:record',          category: 'Required' },
    { key: 'informedConsent',       label: 'Informed Consent',       icon: 'utility:agreement',       category: 'Required' },
    { key: 'confidentialityHippa',  label: 'Confidentiality/HIPPA', icon: 'utility:lock',            category: 'Specialty' },
    { key: 'therapyCancellation',   label: 'Therapy Cancellation',  icon: 'utility:record_delete',   category: 'Specialty' }
];

export default class WaiverFormProgress extends LightningElement {
    @api completionStatus = {};   // Map of stepKey → 'Completed' | 'Not Started'
    @api programType = 'Riding';
    @api formsCompleted = 0;
    @api totalForms = 0;

    get percentComplete() {
        return this.totalForms > 0
            ? Math.round((this.formsCompleted / this.totalForms) * 100)
            : 0;
    }

    get progressLabel() {
        return `${this.formsCompleted} / ${this.totalForms}`;
    }

    get progressVariant() {
        const pct = this.percentComplete;
        if (pct === 100) return 'slds-progress-ring_complete';
        if (pct >= 50) return 'slds-progress-ring_warning';
        return '';
    }

    get ringStyle() {
        // SVG-based ring: calculate dash offset for percentage
        const circumference = 2 * Math.PI * 45; // radius = 45
        const offset = circumference - (this.percentComplete / 100) * circumference;
        return `stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset};`;
    }

    get ringColor() {
        const pct = this.percentComplete;
        if (pct === 100) return '#2e844a'; // green
        if (pct >= 50) return '#fe9339';   // orange/warning
        return '#0070d2';                   // blue/brand
    }

    /**
     * Returns steps organized into categories, each step decorated
     * with its completion status from the parent.
     */
    get categorizedSteps() {
        const steps = this.programType === 'Mental Health' ? MENTAL_HEALTH_STEPS : RIDING_STEPS;
        const categories = {};

        steps.forEach(step => {
            if (!categories[step.category]) {
                categories[step.category] = {
                    name: step.category,
                    key: step.category,
                    steps: []
                };
            }
            const status = this.completionStatus[step.key] || 'Not Started';
            const isComplete = status !== 'Not Started' && status !== '';
            categories[step.category].steps.push({
                ...step,
                status,
                isComplete,
                statusBadgeClass: isComplete
                    ? 'slds-badge slds-badge_success'
                    : 'slds-badge slds-badge_lightest',
                statusLabel: isComplete ? '✓ Done' : '○ Pending',
                cardClass: isComplete
                    ? 'slds-box slds-box_x-small step-card step-complete'
                    : 'slds-box slds-box_x-small step-card step-pending'
            });
        });

        return Object.values(categories);
    }
}
