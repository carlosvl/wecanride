import { LightningElement, api } from 'lwc';
import saveClientWaiver from '@salesforce/apex/ReturnClientMenuController.saveClientWaiver';

export default class ReturnClientWaiver extends LightningElement {
    @api waiverId;
    @api clientId;
    @api contactId;
    @api currentYear;
    @api recordTypeId;
    @api waiver;

    signatureName = '';
    acknowledged = false;
    isSaving = false;

    get isCompleted() {
        return this.waiver?.Client_Waiver__c === 'Completed';
    }

    handleSignatureChange(event) {
        this.signatureName = event.detail.value;
    }

    handleAcknowledge(event) {
        this.acknowledged = event.target.checked;
    }

    async handleSave() {
        if (!this.signatureName || !this.acknowledged) {
            return;
        }
        this.isSaving = true;
        try {
            const result = await saveClientWaiver({
                waiverId: this.waiverId,
                clientId: this.clientId,
                signatureName: this.signatureName,
                year: this.currentYear,
                recordTypeId: this.recordTypeId
            });
            if (result.success) {
                this.dispatchEvent(new CustomEvent('formcomplete', {
                    detail: { stepKey: 'clientWaiver', formsCompleted: result.formsCompleted },
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