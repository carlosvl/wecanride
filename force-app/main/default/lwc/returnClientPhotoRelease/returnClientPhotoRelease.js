import { LightningElement, api } from 'lwc';
import savePhotoRelease from '@salesforce/apex/ReturnClientMenuController.savePhotoRelease';

const CONSENT_OPTIONS = [
    { label: 'Yes', value: 'Yes' },
    { label: 'No - Cognitive', value: 'No' },
    { label: 'No - Emotional', value: 'No - Emotional' },
    { label: 'No - Physical', value: 'No - Physical' }
];

export default class ReturnClientPhotoRelease extends LightningElement {
    @api waiverId;
    @api clientId;
    @api contactId;
    @api currentYear;
    @api waiver;

    consent = '';
    isSaving = false;

    get consentOptions() {
        return CONSENT_OPTIONS;
    }

    get isCompleted() {
        return this.waiver?.Photo_Release__c && this.waiver.Photo_Release__c !== '';
    }

    get existingConsent() {
        return this.waiver?.Photo_Release__c || '';
    }

    connectedCallback() {
        if (this.existingConsent) {
            this.consent = this.existingConsent;
        }
    }

    handleConsentChange(event) {
        this.consent = event.detail.value;
    }

    async handleSave() {
        if (!this.consent) {
            this.showValidationError('Please select a photo release option.');
            return;
        }
        this.isSaving = true;
        try {
            const result = await savePhotoRelease({
                waiverId: this.waiverId,
                consent: this.consent
            });
            if (result.success) {
                this.dispatchEvent(new CustomEvent('formcomplete', {
                    detail: { stepKey: 'photoRelease', formsCompleted: result.formsCompleted },
                    bubbles: true,
                    composed: true
                }));
            } else {
                this.showValidationError(result.errorMessage);
            }
        } catch (error) {
            this.showValidationError(error.body?.message || error.message);
        } finally {
            this.isSaving = false;
        }
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('formcancel'));
    }

    showValidationError(msg) {
        // Simple inline error — could be enhanced with a toast
        const el = this.template.querySelector('.error-message');
        if (el) el.textContent = msg;
    }
}