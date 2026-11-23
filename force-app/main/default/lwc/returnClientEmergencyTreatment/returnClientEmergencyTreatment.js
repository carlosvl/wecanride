import { LightningElement, api } from 'lwc';
import saveEmergencyTreatment from '@salesforce/apex/ReturnClientMenuController.saveEmergencyTreatment';

export default class ReturnClientEmergencyTreatment extends LightningElement {
    @api waiverId;
    @api clientId;
    @api contactId;
    @api currentYear;
    @api waiver;

    insuranceCompany = '';
    policyNumber = '';
    medications = '';
    allergies = '';
    signatureName = '';
    isSaving = false;

    // Earlier years' answers arrive on the new waiver; the signature is always typed fresh
    connectedCallback() {
        this.insuranceCompany = this.waiver?.Health_Insurance_Co__c || '';
        this.policyNumber = this.waiver?.Insurance_Policy__c || '';
        this.medications = this.waiver?.Current_medications__c || '';
        this.allergies = this.waiver?.Allergies_to_medications__c || '';
    }

    get isCompleted() {
        return this.waiver?.Auth_for_Emerg_Med_Treatment__c === 'Completed';
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        this[field] = event.detail.value;
    }

    async handleSave() {
        // Validate required fields
        const allValid = [...this.template.querySelectorAll('lightning-input, lightning-textarea')]
            .reduce((validSoFar, input) => {
                input.reportValidity();
                return validSoFar && input.checkValidity();
            }, true);

        if (!allValid) return;

        this.isSaving = true;
        try {
            const result = await saveEmergencyTreatment({
                waiverId: this.waiverId,
                insuranceCompany: this.insuranceCompany,
                policyNumber: this.policyNumber,
                medications: this.medications,
                allergies: this.allergies,
                signatureName: this.signatureName
            });
            if (result.success) {
                this.dispatchEvent(new CustomEvent('formcomplete', {
                    detail: { stepKey: 'emergencyTreatment', formsCompleted: result.formsCompleted },
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