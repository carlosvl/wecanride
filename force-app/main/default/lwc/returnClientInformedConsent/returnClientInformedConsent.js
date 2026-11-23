import { LightningElement, api, wire } from 'lwc';
import saveInformedConsent from '@salesforce/apex/ReturnClientMenuController.saveInformedConsent';
import getWaiverTemplates from '@salesforce/apex/ReturnClientMenuController.getWaiverTemplates';

export default class ReturnClientInformedConsent extends LightningElement {
    @api waiverId;
    @api clientId;
    @api contactId;
    @api currentYear;
    @api recordTypeId;
    @api waiver;

    fullName = '';
    signedDate = null;
    acknowledgement = '';
    waiverTemplate;
    isSaving = false;
    error;

    get acknowledgementOptions() {
        return [
            { label: 'I acknowledge and consent', value: 'Yes' }
        ];
    }

    get isCompleted() {
        return this.waiver?.Informed_Consent__c === 'Completed';
    }

    get waiverDescription() {
        return this.waiverTemplate?.Description__c || 'Loading informed consent statement...';
    }

    get canSave() {
        return this.fullName.trim() !== '' && this.signedDate && this.acknowledgement === 'Yes';
    }

    @wire(getWaiverTemplates, { year: '$currentYear' })
    wiredTemplates({ data }) {
        if (data && data.InformedConsent) {
            this.waiverTemplate = data.InformedConsent;
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

        if (!allValid) return;

        this.isSaving = true;
        this.error = undefined;

        try {
            const result = await saveInformedConsent({
                waiverId: this.waiverId,
                clientId: this.clientId,
                fullName: this.fullName,
                signedDate: this.signedDate,
                year: this.currentYear,
                waiverTemplateId: this.waiverTemplate ? this.waiverTemplate.Id : null,
                recordTypeId: this.recordTypeId
            });

            if (result.success) {
                this.dispatchEvent(new CustomEvent('formcomplete', {
                    detail: { stepKey: 'informedConsent', formsCompleted: result.formsCompleted },
                    bubbles: true,
                    composed: true
                }));
            } else {
                this.error = result.errorMessage;
            }
        } catch (err) {
            this.error = err.body ? err.body.message : err.message;
        } finally {
            this.isSaving = false;
        }
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('formcancel'));
    }
}
