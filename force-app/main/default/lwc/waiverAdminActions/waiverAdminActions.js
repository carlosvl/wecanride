import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import resetFormStep from '@salesforce/apex/ClientWaiverDashboardController.resetFormStep';
import resetAllFormSteps from '@salesforce/apex/ClientWaiverDashboardController.resetAllFormSteps';
import reopenApplication from '@salesforce/apex/ClientWaiverDashboardController.reopenApplication';

/**
 * Step label lookup — same order as the form progress component.
 */
const STEP_LABELS = {
    mainInfo:              'Main Info',
    parentGuardian:        'Parent/Guardian',
    emergencyContact:      'Emergency Contact',
    groupHome:             'Group Home',
    photoRelease:          'Photo Release',
    emergencyTreatment:    'Emergency Treatment',
    clientWaiver:          'Client Waiver',
    medicalHistory:        'Medical History',
    paymentInfo:           'Payment Info',
    heightWeight:          'Height & Weight',
    downSyndrome:          'Down Syndrome',
    seizureForm:           'Seizure Form',
    scoliosis:             'Scoliosis',
    confidentialityHippa:  'Confidentiality/HIPPA',
    therapyCancellation:   'Therapy Cancellation',
    diagnoses:             'Diagnoses',
    informedConsent:       'Informed Consent'
};

/**
 * Riding program step keys
 */
const RIDING_KEYS = [
    'mainInfo', 'parentGuardian', 'emergencyContact', 'groupHome',
    'photoRelease', 'emergencyTreatment', 'clientWaiver',
    'medicalHistory', 'paymentInfo', 'heightWeight',
    'downSyndrome', 'seizureForm', 'scoliosis',
    'confidentialityHippa', 'therapyCancellation'
];

/**
 * Mental Health program step keys
 */
const MENTAL_HEALTH_KEYS = [
    'mainInfo', 'parentGuardian', 'emergencyContact', 'groupHome',
    'photoRelease', 'emergencyTreatment', 'clientWaiver',
    'paymentInfo', 'diagnoses', 'informedConsent',
    'confidentialityHippa', 'therapyCancellation'
];

export default class WaiverAdminActions extends LightningElement {
    @api waiverId;
    @api completionStatus = {};  // stepKey → 'Completed' | 'Not Started'
    @api programType = 'Riding';
    @api applicationSubmitted = false;

    @track isProcessing = false;
    @track showResetConfirm = false;
    @track showResetAllConfirm = false;
    @track showReopenConfirm = false;
    @track selectedStepKey = '';

    // ── Computed: Step options for the Reset dropdown ────

    get resetStepOptions() {
        const keys = this.programType === 'Mental Health' ? MENTAL_HEALTH_KEYS : RIDING_KEYS;
        return keys
            .filter(key => {
                const status = this.completionStatus[key];
                return status && status !== 'Not Started' && status !== '';
            })
            .map(key => ({
                label: STEP_LABELS[key] || key,
                value: key
            }));
    }

    get hasCompletedSteps() {
        return this.resetStepOptions.length > 0;
    }

    get selectedStepLabel() {
        return STEP_LABELS[this.selectedStepKey] || this.selectedStepKey;
    }

    get resetConfirmMessage() {
        return `Are you sure you want to reset "${this.selectedStepLabel}"? This will clear all completion data for this form step.`;
    }

    // ── Event Handlers ──────────────────────────────────

    handleStepSelect(event) {
        this.selectedStepKey = event.detail.value;
        this.showResetConfirm = true;
    }

    handleResetAllClick() {
        this.showResetAllConfirm = true;
    }

    handleReopenClick() {
        this.showReopenConfirm = true;
    }

    // ── Confirm / Cancel Handlers ───────────────────────

    handleCancelReset() {
        this.showResetConfirm = false;
        this.selectedStepKey = '';
    }

    handleCancelResetAll() {
        this.showResetAllConfirm = false;
    }

    handleCancelReopen() {
        this.showReopenConfirm = false;
    }

    async handleConfirmReset() {
        this.showResetConfirm = false;
        this.isProcessing = true;

        try {
            const result = await resetFormStep({
                waiverId: this.waiverId,
                stepKey: this.selectedStepKey
            });

            if (result.success) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Form Reset',
                    message: `${this.selectedStepLabel} has been reset.`,
                    variant: 'success'
                }));
                this.dispatchEvent(new CustomEvent('formreset'));
            } else {
                this.showError(result.errorMessage);
            }
        } catch (err) {
            this.showError(this.reduceError(err));
        } finally {
            this.isProcessing = false;
            this.selectedStepKey = '';
        }
    }

    async handleConfirmResetAll() {
        this.showResetAllConfirm = false;
        this.isProcessing = true;

        try {
            const result = await resetAllFormSteps({ waiverId: this.waiverId });

            if (result.success) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'All Forms Reset',
                    message: 'All form steps have been reset.',
                    variant: 'success'
                }));
                this.dispatchEvent(new CustomEvent('formreset'));
            } else {
                this.showError(result.errorMessage);
            }
        } catch (err) {
            this.showError(this.reduceError(err));
        } finally {
            this.isProcessing = false;
        }
    }

    async handleConfirmReopen() {
        this.showReopenConfirm = false;
        this.isProcessing = true;

        try {
            const result = await reopenApplication({ waiverId: this.waiverId });

            if (result.success) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Application Reopened',
                    message: 'The application has been reopened for editing.',
                    variant: 'success'
                }));
                this.dispatchEvent(new CustomEvent('applicationreopened'));
            } else {
                this.showError(result.errorMessage);
            }
        } catch (err) {
            this.showError(this.reduceError(err));
        } finally {
            this.isProcessing = false;
        }
    }

    // ── Helpers ──────────────────────────────────────────

    showError(message) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Error',
            message: message || 'An unknown error occurred.',
            variant: 'error'
        }));
    }

    reduceError(error) {
        if (typeof error === 'string') return error;
        if (error?.body?.message) return error.body.message;
        if (error?.message) return error.message;
        return 'An unknown error occurred.';
    }
}
