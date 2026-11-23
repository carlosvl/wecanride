import { LightningElement, api } from 'lwc';
import savePaymentInfo from '@salesforce/apex/ReturnClientMenuController.savePaymentInfo';

// Reverse of the payerAddress getter ("street\ncity, state\nzip"). Any other shape is kept whole in the
// street box so nothing is lost; the required City/State/ZIP boxes then ask the client to fill them in.
function splitAddress(text) {
    const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean);
    const cityState = lines[1] ? lines[1].split(',') : [];
    if (lines.length === 3 && cityState.length === 2) {
        return { street: lines[0], city: cityState[0].trim(), state: cityState[1].trim(), zip: lines[2] };
    }
    return { street: lines.join(', '), city: '', state: '', zip: '' };
}

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

    // Document IDs for payment policy PDFs
    get adaptiveRidingPolicyUrl() {
        return '/sfc/servlet.shepherd/document/download/0696T00000MLuaCQAT';
    }
    get volunteerLessonsPolicyUrl() {
        return '/sfc/servlet.shepherd/document/download/069j1000000FCwwAAG';
    }

    // Earlier years' answers arrive on the new waiver; the signature is always typed fresh
    connectedCallback() {
        const w = this.waiver;
        if (!w) return;
        const payer = splitAddress(w.Payer_Address__c);
        this.payerName = w.Payer__c || '';
        this.payerPhone = w.Payer_Phone__c || '';
        this.payerEmail = w.Payer_email__c || '';
        this.payerStreet = payer.street;
        this.payerCity = payer.city;
        this.payerState = payer.state;
        this.payerZip = payer.zip;
        // Old paperwork repeated the payer's address in the third-party box, so only a named third party counts
        if (w.Third_Party_Payer_Waiver_Name__c) {
            const third = splitAddress(w.Third_Party_Address__c);
            this.hasThirdParty = true;
            this.thirdPartyName = w.Third_Party_Payer_Waiver_Name__c;
            this.thirdPartyContact = w.Third_Party_Contact__c || '';
            this.thirdPartyEmail = w.Third_Party_email__c || '';
            this.thirdPartyStreet = third.street;
            this.thirdPartyCity = third.city;
            this.thirdPartyState = third.state;
            this.thirdPartyZip = third.zip;
        }
    }

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