import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getClientData from '@salesforce/apex/ReturnClientMenuController.getClientData';
import getContactIdForUser from '@salesforce/apex/ReturnClientMenuController.getContactIdForUser';
import submitApplication from '@salesforce/apex/ReturnClientMenuController.submitApplication';
import getWaiverTemplates from '@salesforce/apex/ReturnClientMenuController.getWaiverTemplates';
import updateLivesInGroupHome from '@salesforce/apex/ReturnClientMenuController.updateLivesInGroupHome';
import USER_ID from '@salesforce/user/Id';

/**
 * RIDING_FORM_STEPS — the original 15-step Riding program registration.
 * Unchanged from the original FORM_STEPS.
 */
const RIDING_FORM_STEPS = [
    // ── Profile / Info Forms ──────────────────────────────
    { key: 'mainInfo',            label: 'Main Info',              icon: 'utility:identity',    category: 'profile', order: 1 },
    { key: 'parentGuardian',      label: 'Parent/Guardian',        icon: 'utility:people',      category: 'profile', order: 2 },
    { key: 'emergencyContact',    label: 'Emergency Contact',      icon: 'utility:alert',       category: 'profile', order: 3 },
    { key: 'groupHome',           label: 'Group Home',             icon: 'utility:home',        category: 'profile', order: 4, conditional: 'groupHome' },
    // ── Required Forms ──────────────────────────────────
    { key: 'photoRelease',        label: 'Photo Release',          icon: 'utility:photo',       category: 'required', order: 5 },
    { key: 'emergencyTreatment',  label: 'Emergency Treatment',    icon: 'utility:warning',     category: 'required', order: 6 },
    { key: 'clientWaiver',        label: 'Client Waiver',          icon: 'utility:edit_form',   category: 'required', order: 7 },
    { key: 'medicalHistory',      label: 'Medical History',        icon: 'utility:file',        category: 'required', order: 8 },
    { key: 'paymentInfo',         label: 'Payment Info',           icon: 'utility:money',       category: 'required', order: 9 },
    { key: 'heightWeight',        label: 'Height & Weight',        icon: 'utility:metric',      category: 'required', order: 10 },
    // ── Diagnosis Forms (conditional) ───────────────────
    { key: 'downSyndrome',        label: 'Down Syndrome',          icon: 'utility:upload',      category: 'diagnosis', order: 11 },
    { key: 'seizureForm',         label: 'Seizure Form',           icon: 'utility:upload',      category: 'diagnosis', order: 12 },
    { key: 'scoliosis',           label: 'Scoliosis',             icon: 'utility:upload',      category: 'diagnosis', order: 13 },
    // ── Specialty Forms ─────────────────────────────────
    { key: 'confidentialityHippa', label: 'Confidentiality/HIPPA', icon: 'utility:lock',        category: 'specialty', order: 14 },
    { key: 'therapyCancellation',  label: 'Therapy Cancellation',  icon: 'utility:record_delete', category: 'specialty', order: 15 }
];

/**
 * MENTAL_HEALTH_FORM_STEPS — Mental Health Therapy program registration.
 * Removes: medicalHistory, heightWeight, downSyndrome, seizureForm, scoliosis
 * Adds: diagnoses, informedConsent
 */
const MENTAL_HEALTH_FORM_STEPS = [
    // ── Profile / Info Forms ──────────────────────────────
    { key: 'mainInfo',            label: 'Main Info',              icon: 'utility:identity',    category: 'profile', order: 1 },
    { key: 'parentGuardian',      label: 'Parent/Guardian',        icon: 'utility:people',      category: 'profile', order: 2 },
    { key: 'emergencyContact',    label: 'Emergency Contact',      icon: 'utility:alert',       category: 'profile', order: 3 },
    { key: 'groupHome',           label: 'Group Home',             icon: 'utility:home',        category: 'profile', order: 4, conditional: 'groupHome' },
    // ── Required Forms ──────────────────────────────────
    { key: 'photoRelease',        label: 'Photo Release',          icon: 'utility:photo',       category: 'required', order: 5 },
    { key: 'emergencyTreatment',  label: 'Emergency Treatment',    icon: 'utility:warning',     category: 'required', order: 6 },
    { key: 'clientWaiver',        label: 'Client Waiver',          icon: 'utility:edit_form',   category: 'required', order: 7 },
    { key: 'paymentInfo',         label: 'Payment Info',           icon: 'utility:money',       category: 'required', order: 8 },
    // ── Mental Health Specific ──────────────────────────
    { key: 'diagnoses',           label: 'Diagnoses',              icon: 'utility:record',      category: 'required', order: 9 },
    { key: 'informedConsent',     label: 'Informed Consent',       icon: 'utility:agreement',   category: 'required', order: 10 },
    // ── Specialty Forms ─────────────────────────────────
    { key: 'confidentialityHippa', label: 'Confidentiality/HIPPA', icon: 'utility:lock',        category: 'specialty', order: 11 },
    { key: 'therapyCancellation',  label: 'Therapy Cancellation',  icon: 'utility:record_delete', category: 'specialty', order: 12 }
];

// Categories that MUST be fully completed before submitting
const REQUIRED_CATEGORIES = ['profile', 'required'];

export default class ReturnClientMenu extends LightningElement {
    // ── Public API ──────────────────────────────────────
    @api recordId;     // If placed on a record page
    @api contactId;    // Passed from Experience Cloud page or design attribute

    // ── Tracked State ───────────────────────────────────
    @track currentView = 'serviceType';   // Start at service type selector
    @track completionStatus = {};
    @track isLoading = true;
    @track error;
    @track _livesInGroupHome = false;
    @track isGroupHomeToggleSaving = false;
    @track programType = '';               // 'Riding' | 'Mental Health'
    @track clinicalScreeningStatus = '';    // '' | 'Completed' | 'Flagged'
    @track intakePaused = false;

    // Data from Apex
    clientData;
    waiverTemplates;
    _resolvedContactId;

    // ─── Lifecycle: Resolve Contact ID then load data ───
    connectedCallback() {
        this.initializeData();
    }

    async initializeData() {
        try {
            // If contactId was passed as a property, use it directly
            let contactId = this.contactId || this.recordId;

            // Otherwise, resolve from the logged-in user
            if (!contactId && USER_ID) {
                contactId = await getContactIdForUser({ userId: USER_ID });
            }

            this._resolvedContactId = contactId;

            if (!contactId) {
                this.error = 'Unable to determine your contact record. Please contact support.';
                this.isLoading = false;
                return;
            }

            // Load client data
            const data = await getClientData({ contactId: contactId });
            this.clientData = data;
            this.completionStatus = data.completionStatus || {};
            this._livesInGroupHome = data.client?.Lives_in_Group_Home__c === true;

            // Restore program type from waiver if previously saved
            const savedProgramType = data.waiver?.Program_Type__c;
            if (savedProgramType) {
                this.programType = savedProgramType;
                // Check clinical screening status for Mental Health
                if (savedProgramType === 'Mental Health') {
                    const screeningStatus = data.waiver?.Clinical_Screening__c || '';
                    this.clinicalScreeningStatus = screeningStatus;
                    if (screeningStatus === 'Flagged') {
                        this.intakePaused = true;
                        this.currentView = 'paused';
                    } else if (screeningStatus === 'Completed') {
                        this.currentView = 'menu';
                    } else {
                        // Not yet screened — go to clinical screening after service type
                        this.currentView = 'menu';
                    }
                } else {
                    // Riding — go straight to menu
                    this.currentView = 'menu';
                }
            } else {
                // No program type saved yet — show service type selector
                this.currentView = 'serviceType';
            }
            this.error = undefined;
            this.isLoading = false;

            // Load waiver templates if we have a year
            if (data.currentYear) {
                const templates = await getWaiverTemplates({ year: data.currentYear });
                this.waiverTemplates = templates;
            }
        } catch (err) {
            console.error('[ReturnClientMenu] initializeData ERROR:', err);
            console.error('[ReturnClientMenu] error body:', JSON.stringify(err.body));
            this.error = err.body ? err.body.message : err.message;
            this.isLoading = false;
        }
    }

    // ─── Computed Properties ────────────────────────────

    get resolvedContactId() {
        return this._resolvedContactId;
    }

    get currentYear() {
        return this.clientData ? this.clientData.currentYear : null;
    }

    get hasClientData() {
        return this.clientData && this.clientData.client && this.clientData.waiver;
    }

    get noClientFound() {
        return !this.isLoading && this.clientData && !this.clientData.client;
    }

    get waiverId() {
        return this.clientData?.waiver?.Id;
    }

    get clientId() {
        return this.clientData?.client?.Id;
    }

    get waiverRecordTypeId() {
        return this.clientData?.waiverRecordTypeId;
    }

    get contact() {
        return this.clientData?.contact;
    }

    get waiver() {
        return this.clientData?.waiver;
    }

    get livesInGroupHome() {
        return this._livesInGroupHome;
    }

    // ── View State ──────────────────────────────────────

    get isServiceTypeView() {
        return this.currentView === 'serviceType';
    }

    get isClinicalScreeningView() {
        return this.currentView === 'clinicalScreening';
    }

    get isPausedView() {
        return this.currentView === 'paused';
    }

    get isMenuView() {
        return this.currentView === 'menu';
    }

    get isFormView() {
        return this.currentView !== 'menu'
            && this.currentView !== 'serviceType'
            && this.currentView !== 'clinicalScreening'
            && this.currentView !== 'paused';
    }

    // ── Program-Aware Form Steps ────────────────────────

    get activeFormSteps() {
        if (this.programType === 'Mental Health') {
            return MENTAL_HEALTH_FORM_STEPS;
        }
        return RIDING_FORM_STEPS;
    }

    get currentFormLabel() {
        const step = this.activeFormSteps.find(s => s.key === this.currentView);
        return step ? step.label : '';
    }

    get currentStepNumber() {
        const step = this.activeFormSteps.find(s => s.key === this.currentView);
        return step ? step.order : 0;
    }

    get totalSteps() {
        return this.visibleSteps.length;
    }

    // ── Form Cards ───────────────────────────────────────

    get visibleSteps() {
        return this.activeFormSteps
            .filter(step => {
                // Group Home is only visible if the toggle is ON
                if (step.conditional === 'groupHome') {
                    return this._livesInGroupHome === true;
                }
                return true;
            })
            .map(step => ({
                ...step,
                isCompleted: this.isStepCompleted(step.key),
                statusLabel: this.isStepCompleted(step.key) ? 'Completed' : 'Not Started',
                statusClass: this.isStepCompleted(step.key)
                    ? 'slds-badge slds-badge_success'
                    : 'slds-badge',
                buttonLabel: this.isStepCompleted(step.key) ? 'Review' : 'Start',
                buttonVariant: this.isStepCompleted(step.key) ? 'neutral' : 'brand',
                cardClass: this.isStepCompleted(step.key)
                    ? 'slds-card form-card form-card--completed'
                    : 'slds-card form-card'
            }));
    }

    get profileForms() {
        return this.visibleSteps.filter(s => s.category === 'profile');
    }

    get requiredForms() {
        return this.visibleSteps.filter(s => s.category === 'required');
    }

    get diagnosisForms() {
        return this.visibleSteps.filter(s => s.category === 'diagnosis');
    }

    get specialtyForms() {
        return this.visibleSteps.filter(s => s.category === 'specialty');
    }

    get hasDiagnosisForms() {
        return this.diagnosisForms.length > 0;
    }

    // ── Progress ─────────────────────────────────────────

    get completedCount() {
        let count = 0;
        for (const key in this.completionStatus) {
            if (this.completionStatus[key] && this.completionStatus[key] !== 'Not Started') {
                // Only count steps that are in the active form steps
                const isActiveStep = this.activeFormSteps.some(s => s.key === key);
                if (isActiveStep) {
                    count++;
                }
            }
        }
        return count;
    }

    get progressPercent() {
        const total = this.visibleSteps.length;
        return total > 0 ? Math.round((this.completedCount / total) * 100) : 0;
    }

    get progressLabel() {
        return `${this.completedCount} of ${this.visibleSteps.length} forms completed`;
    }

    get requiredSteps() {
        return this.visibleSteps.filter(s => REQUIRED_CATEGORIES.includes(s.category));
    }

    get incompleteRequiredCount() {
        return this.requiredSteps.filter(s => !s.isCompleted).length;
    }

    get canSubmit() {
        return this.incompleteRequiredCount === 0;
    }

    get submitButtonLabel() {
        if (this.canSubmit) {
            return 'Submit Application';
        }
        return `Complete ${this.incompleteRequiredCount} more form(s) to submit`;
    }

    get isAlreadySubmitted() {
        return this.clientData?.waiver?.Application_Submitted__c === 'Yes';
    }

    get progressBarStyle() {
        return `width: ${this.progressPercent}%`;
    }

    get cannotSubmit() {
        return !this.canSubmit || this.isAlreadySubmitted;
    }

    // ── Form Step Visibility (which child component to show) ──

    get isMainInfo()            { return this.currentView === 'mainInfo'; }
    get isParentGuardian()      { return this.currentView === 'parentGuardian'; }
    get isEmergencyContact()    { return this.currentView === 'emergencyContact'; }
    get isGroupHome()           { return this.currentView === 'groupHome'; }
    get isPhotoRelease()        { return this.currentView === 'photoRelease'; }
    get isEmergencyTreatment()  { return this.currentView === 'emergencyTreatment'; }
    get isClientWaiver()        { return this.currentView === 'clientWaiver'; }
    get isMedicalHistory()      { return this.currentView === 'medicalHistory'; }
    get isPaymentInfo()         { return this.currentView === 'paymentInfo'; }
    get isHeightWeight()        { return this.currentView === 'heightWeight'; }
    get isDownSyndrome()        { return this.currentView === 'downSyndrome'; }
    get isSeizureForm()         { return this.currentView === 'seizureForm'; }
    get isScoliosis()           { return this.currentView === 'scoliosis'; }
    get isConfidentialityHippa() { return this.currentView === 'confidentialityHippa'; }
    get isTherapyCancellation() { return this.currentView === 'therapyCancellation'; }
    // Mental Health specific
    get isDiagnoses()           { return this.currentView === 'diagnoses'; }
    get isInformedConsent()     { return this.currentView === 'informedConsent'; }

    // ── Program Type Label ──────────────────────────────
    get programTypeLabel() {
        return this.programType || 'Registration';
    }

    get menuHeading() {
        if (this.programType === 'Mental Health') {
            return 'Mental Health Therapy Registration';
        }
        return 'Returning Client Registration';
    }

    get menuSubheading() {
        if (this.programType === 'Mental Health') {
            return 'Complete the forms below to register for the Mental Health Therapy program.';
        }
        return 'Complete the forms below to register for the upcoming session.';
    }

    // ── Paused View Properties ──────────────────────────
    get pausedMessage() {
        return 'Thank you for providing this information. Based on your response(s), we are pausing the remainder of the intake paperwork while we review your information to ensure we can safely and appropriately meet your needs. A member of our team will contact you to discuss next steps.';
    }

    // ─── Event Handlers ─────────────────────────────────

    handleOpenForm(event) {
        const stepKey = event.currentTarget.dataset.step;
        this.currentView = stepKey;
    }

    async handleGroupHomeToggle(event) {
        const checked = event.target.checked;
        this._livesInGroupHome = checked;
        this.isGroupHomeToggleSaving = true;
        try {
            const result = await updateLivesInGroupHome({
                clientId: this.clientId,
                livesInGroupHome: checked
            });
            if (!result.success) {
                // Revert on failure
                this._livesInGroupHome = !checked;
                this.showToast('Error', result.errorMessage || 'Could not update Group Home status.', 'error');
            }
        } catch (error) {
            // Revert on exception
            this._livesInGroupHome = !checked;
            try {
                this.showToast('Error', error.body?.message || error.message, 'error');
            } catch (e) {
                // Silently ignore toast errors in Experience Cloud
            }
        } finally {
            this.isGroupHomeToggleSaving = false;
        }
    }

    handleBackToMenu() {
        this.currentView = 'menu';
        this.refreshData();
    }

    handleFormComplete(event) {
        const { stepKey, formsCompleted } = event.detail;
        if (stepKey) {
            this.completionStatus = {
                ...this.completionStatus,
                [stepKey]: 'Completed'
            };
        }
        // Navigate back to menu first, then refresh
        this.currentView = 'menu';
        this.refreshData();
        // Toast may not work in Experience Cloud, so wrap in try/catch
        try {
            this.showToast('Success', `${this.getStepLabel(stepKey)} saved successfully.`, 'success');
        } catch (e) {
            // Silently ignore toast errors in Experience Cloud
        }
    }

    handleFormCancel() {
        this.currentView = 'menu';
    }

    // ── Service Type & Clinical Screening Handlers ──────

    handleServiceTypeSelected(event) {
        const { programType, serviceTypes } = event.detail;
        this.programType = programType;

        if (programType === 'Mental Health') {
            // Mental Health clients must go through clinical screening next
            this.currentView = 'clinicalScreening';
        } else {
            // Riding clients go straight to the form menu
            this.currentView = 'menu';
        }
    }

    handleScreeningComplete(event) {
        const { status } = event.detail;
        this.clinicalScreeningStatus = status;

        if (status === 'Flagged') {
            // Intake is paused — show the paused view
            this.intakePaused = true;
            this.currentView = 'paused';
        } else {
            // Screening passed — go to form menu
            this.currentView = 'menu';
        }
    }

    handleScreeningCancel() {
        // Go back to service type selection
        this.currentView = 'serviceType';
    }

    async handleSubmitApplication() {
        if (!this.canSubmit) return;
        this.isLoading = true;
        try {
            const result = await submitApplication({ waiverId: this.waiverId });
            if (result.success) {
                this.showToast('Application Submitted!',
                    'Your registration has been submitted successfully. Our team will be in touch.',
                    'success');
                this.refreshData();
            } else {
                this.showToast('Cannot Submit', result.errorMessage, 'warning');
            }
        } catch (error) {
            this.showToast('Error', error.body?.message || error.message, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    // ─── Utility ─────────────────────────────────────────

    isStepCompleted(key) {
        const status = this.completionStatus[key];
        return status && status !== 'Not Started' && status !== '';
    }

    getStepLabel(key) {
        const step = this.activeFormSteps.find(s => s.key === key);
        return step ? step.label : key;
    }

    refreshData() {
        this.isLoading = true;
        getClientData({ contactId: this._resolvedContactId })
            .then(data => {
                this.clientData = data;
                this.completionStatus = data.completionStatus || {};
                this._livesInGroupHome = data.client?.Lives_in_Group_Home__c === true;
                this.isLoading = false;
            })
            .catch(err => {
                this.error = err.body ? err.body.message : err.message;
                this.isLoading = false;
            });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
