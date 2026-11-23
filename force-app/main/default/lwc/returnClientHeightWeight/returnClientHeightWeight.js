import { LightningElement, api } from 'lwc';
import saveHeightWeight from '@salesforce/apex/ReturnClientMenuController.saveHeightWeight';

export default class ReturnClientHeightWeight extends LightningElement {
    @api waiverId;
    @api clientId;
    @api contactId;
    @api currentYear;
    @api contactRecord;
    @api waiver;

    height = '';
    weight = null;
    isSaving = false;

    get isCompleted() {
        return this.waiver?.WeightHeight__c === 'Completed';
    }

    connectedCallback() {
        // Pre-populate from Contact record
        if (this.contactRecord) {
            this.height = this.contactRecord.Height__c || '';
            this.weight = this.contactRecord.Weight__c || null;
        }
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        if (field === 'weight') {
            this.weight = parseFloat(event.detail.value) || null;
        } else {
            this[field] = event.detail.value;
        }
    }

    async handleSave() {
        const allValid = [...this.template.querySelectorAll('lightning-input')]
            .reduce((validSoFar, input) => {
                input.reportValidity();
                return validSoFar && input.checkValidity();
            }, true);

        if (!allValid) return;

        this.isSaving = true;
        try {
            const result = await saveHeightWeight({
                waiverId: this.waiverId,
                contactId: this.contactId,
                height: this.height,
                weight: this.weight
            });
            if (result.success) {
                this.dispatchEvent(new CustomEvent('formcomplete', {
                    detail: { stepKey: 'heightWeight', formsCompleted: result.formsCompleted },
                    bubbles: true,
                    composed: true
                }));
            } else {
                console.error('Save returned error:', result.errorMessage);
            }
        } catch (error) {
            console.error('Save error:', JSON.stringify(error));
        } finally {
            this.isSaving = false;
        }
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('formcancel'));
    }
}