import { LightningElement, api } from 'lwc';
import savePaymentInfo from '@salesforce/apex/ReturnClientMenuController.savePaymentInfo';

export default class ReturnClientPayment extends LightningElement {
    @api waiverId;
    @api clientId;
    @api contactId;
    @api currentYear;
    @api waiver;

    payerName = '';
    payerStreet = '';
    payerCity = '';
    payerState = '';
    payerZip = '';
    payerPhone = '';
    payerEmail = '';
    signatureName = '';
    hasThirdParty = false;
    thirdPartyName = '';
    thirdPartyStreet = '';
    thirdPartyCity = '';
    thirdPartyState = '';
    thirdPartyZip = '';
    thirdPartyContact = '';
    thirdPartyEmail = '';
    isSaving = false;

    get isCompleted() {
        return this.waiver?.Payer_Info__c === 'Completed';
    }

    get payerAddress() {
        const parts = [this.payerStreet, `${this.payerCity}, ${this.payerState}`, this.payerZip];
        return parts.filter(p => p && p.trim()).join('\n');
    }

    get thirdPartyAddress() {
        if (!this.hasThirdParty) return '';
        const parts = [this.thirdPartyStreet, `${this.thirdPartyCity}, ${this.thirdPartyState}`, this.thirdPartyZip];
        return parts.filter(p => p && p.trim()).join('\n');
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        this[field] = event.detail.value;
    }

    handleThirdPartyToggle(event) {
        this.hasThirdParty = event.target.checked;
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
            const result = await savePaymentInfo({
                waiverId: this.waiverId,
                payerName: this.payerName,
                payerAddress: this.payerAddress,
                payerPhone: this.payerPhone,
                payerEmail: this.payerEmail,
                signatureName: this.signatureName,
                thirdPartyName: this.hasThirdParty ? this.thirdPartyName : '',
                thirdPartyAddress: this.hasThirdParty ? this.thirdPartyAddress : '',
                thirdPartyContact: this.hasThirdParty ? this.thirdPartyContact : '',
                thirdPartyEmail: this.hasThirdParty ? this.thirdPartyEmail : ''
            });
            if (result.success) {
                this.dispatchEvent(new CustomEvent('formcomplete', {
                    detail: { stepKey: 'paymentInfo', formsCompleted: result.formsCompleted },
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