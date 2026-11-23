import { LightningElement, api, wire } from 'lwc';
import saveConfidentialityHippa from '@salesforce/apex/ReturnClientMenuController.saveConfidentialityHippa';
import getWaiverTemplates from '@salesforce/apex/ReturnClientMenuController.getWaiverTemplates';

export default class ReturnClientConfidentialityHippa extends LightningElement {
    @api waiverId;
    @api clientId;
    @api contactId;
    @api currentYear;
    @api recordTypeId;
    @api waiver;

    fullName = '';
    signedDate = null;
    authorization = '';
    waiverTemplate;
    isSaving = false;

    get authorizationOptions() {
        return [{ label: 'Yes', value: 'Yes' }];
    }

    get isCompleted() {
        return this.waiver?.Confidentiality_HIPPA__c === 'Yes';
    }

    get waiverDescription() {
        return this.waiverTemplate?.Description__c || 'Loading waiver text...';
    }

    @wire(getWaiverTemplates, { year: '$currentYear' })
    wiredTemplates({ data }) {
        if (data && data.ConfidentialityHIPPA) {
            this.waiverTemplate = data.ConfidentialityHIPPA;
        }
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        this[field] = event.detail.value;
    }

    async handleSave() {
        const allValid = [...this.template.querySelectorAll('lightning-input, lightning-combobox')]
            .reduce((validSoFar, input) => {
                input.reportValidity();
                return validSoFar && input.checkValidity();
            }, true);

        if (!allValid || !this.waiverTemplate) return;

        this.isSaving = true;
        try {
            const result = await saveConfidentialityHippa({
                waiverId: this.waiverId,
                clientId: this.clientId,
                fullName: this.fullName,
                signedDate: this.signedDate,
                year: this.currentYear,
                waiverTemplateId: this.waiverTemplate.Id,
                recordTypeId: this.recordTypeId
            });
            if (result.success) {
                this.dispatchEvent(new CustomEvent('formcomplete', {
                    detail: { stepKey: 'confidentialityHippa', formsCompleted: result.formsCompleted },
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