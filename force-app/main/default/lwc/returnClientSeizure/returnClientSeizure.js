import { LightningElement, api } from 'lwc';
import saveSeizureForm from '@salesforce/apex/ReturnClientMenuController.saveSeizureForm';
import linkUploadedFiles from '@salesforce/apex/ReturnClientMenuController.linkUploadedFiles';

const LAST_SEIZURE_OPTIONS = [
    { label: '< 5 years', value: 'less5' },
    { label: '5 years or more', value: '5ormore' }
];

const YES_NO_OPTIONS = [
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' }
];

export default class ReturnClientSeizure extends LightningElement {
    @api waiverId;
    @api clientId;
    @api contactId;
    @api currentYear;
    @api waiver;

    lastSeizure = '';
    lastThreeYears = '';
    seizureType = '';
    auraPreSeizure = '';
    motorActivity = '';
    avgDuration = '';
    frequency = '';
    lastSeizureDate = null;
    recoveryBehavior = '';
    whatToDoAtCenter = '';
    uploadedDocumentIds = [];
    fileUploaded = false;
    isSaving = false;

    get isCompleted() {
        return this.waiver?.Seizure_Form__c === 'Completed';
    }

    get lastSeizureOptions() { return LAST_SEIZURE_OPTIONS; }
    get yesNoOptions() { return YES_NO_OPTIONS; }

    get acceptedFormats() {
        return ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];
    }

    get uploadLabel() {
        return `Seizure Form - ${this.currentYear}`;
    }

    // Branching logic from the original flow
    get showLast3Question() {
        return this.lastSeizure === 'less5';
    }

    get showNoFormNeeded() {
        return this.lastSeizure === '5ormore';
    }

    get showFileUpload() {
        return this.lastSeizure === 'less5' && this.lastThreeYears === 'yes';
    }

    get showDetailFields() {
        return this.lastSeizure === 'less5' && this.lastThreeYears === 'no';
    }

    get canSave() {
        // Can save if: 5+ years (no form needed), or file uploaded, or detail fields filled
        if (this.lastSeizure === '5ormore') return true;
        if (this.showFileUpload && this.fileUploaded) return true;
        if (this.showDetailFields) return true;
        if (this.isCompleted) return true;
        return false;
    }

    handleLastSeizureChange(event) {
        this.lastSeizure = event.detail.value;
        this.lastThreeYears = ''; // Reset dependent
    }

    handleLast3Change(event) {
        this.lastThreeYears = event.detail.value;
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        this[field] = event.detail.value;
    }

    handleUploadFinished(event) {
        const uploadedFiles = event.detail.files;
        this.uploadedDocumentIds = uploadedFiles.map(f => f.documentId);
        this.fileUploaded = true;
    }

    buildSeizureInfo() {
        if (this.lastSeizure === '5ormore') return '';
        if (this.showFileUpload) return '';
        // Build rich text summary from detail fields
        let info = '';
        info += `<p><strong>Type of seizure:</strong> ${this.seizureType || ''}</p>`;
        info += `<p><strong>Typical aura pre seizure sensations or behaviors during seizure:</strong> ${this.auraPreSeizure || ''}</p>`;
        info += `<p><strong>Typical motor activity during seizure:</strong> ${this.motorActivity || ''}</p>`;
        info += `<p><strong>Average duration of seizure:</strong> ${this.avgDuration || ''}</p>`;
        info += `<p><strong>Current frequency of seizures:</strong> ${this.frequency || ''}</p>`;
        info += `<p><strong>Date of last seizure:</strong> ${this.lastSeizureDate || ''}</p>`;
        info += `<p><strong>Description of behavior during the recovery state and its duration:</strong> ${this.recoveryBehavior || ''}</p>`;
        info += `<p><strong>What to do if seizure occurs at center:</strong> ${this.whatToDoAtCenter || ''}</p>`;
        return info;
    }

    async handleSave() {
        this.isSaving = true;
        try {
            if (this.uploadedDocumentIds.length > 0) {
                await linkUploadedFiles({
                    contentDocumentIds: this.uploadedDocumentIds,
                    waiverId: this.waiverId,
                    clientId: this.clientId
                });
            }

            const seizureInfo = this.buildSeizureInfo();
            const result = await saveSeizureForm({
                waiverId: this.waiverId,
                seizureInfo: seizureInfo
            });
            if (result.success) {
                this.dispatchEvent(new CustomEvent('formcomplete', {
                    detail: { stepKey: 'seizureForm', formsCompleted: result.formsCompleted },
                    bubbles: true,
                    composed: true
                }));
            }
        } catch (error) {
            console.error('Save error:', error);
        } finally {
            this.isSaving = false;
        }
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('formcancel'));
    }
}