import { LightningElement, api } from 'lwc';
import saveMainInfo from '@salesforce/apex/ReturnClientMenuController.saveMainInfo';

const GENDER_OPTIONS = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Non-Binary', value: 'Non-Binary' },
    { label: 'Prefer not to say', value: 'Prefer not to say' }
];

export default class ReturnClientMainInfo extends LightningElement {
    @api waiverId;
    @api clientId;
    @api contactId;
    @api currentYear;
    @api waiver;
    @api contactRecord;
    @api clientRecord;
    @api programType = '';

    firstName = '';
    lastName = '';
    gender = '';
    dateOfBirth = null;
    height = '';
    weight = null;
    street = '';
    city = '';
    state = '';
    zip = '';
    email = '';
    workEmail = '';
    phone = '';
    mobilePhone = '';
    isSaving = false;
    weightWarning = '';

    genderOptions = GENDER_OPTIONS;

    connectedCallback() {
        // Pre-populate from Contact and Client records
        if (this.contactRecord) {
            this.firstName = this.contactRecord.FirstName || '';
            this.lastName = this.contactRecord.LastName || '';
            this.gender = this.contactRecord.Gender__c || '';
            this.dateOfBirth = this.contactRecord.Birthdate || null;
            this.height = this.contactRecord.Height__c || '';
            this.weight = this.contactRecord.Weight__c || null;
            this.street = this.contactRecord.MailingStreet || '';
            this.city = this.contactRecord.MailingCity || '';
            this.state = this.contactRecord.MailingState || '';
            this.zip = this.contactRecord.MailingPostalCode || '';
            this.email = this.contactRecord.Email || '';
            this.workEmail = this.contactRecord.npe01__WorkEmail__c || '';
            this.phone = this.contactRecord.HomePhone || '';
            this.mobilePhone = this.contactRecord.MobilePhone || '';
        }
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        if (field === 'weight') {
            this.weight = parseFloat(event.detail.value) || null;
            // Weight limit check
            if (this.weight && this.weight > 200) {
                this.weightWarning = 'Please note: Our weight limit for riders is 200 lbs. If your weight exceeds this limit, please contact us to discuss options.';
            } else {
                this.weightWarning = '';
            }
        } else {
            this[field] = event.detail.value;
        }
    }

    handleGenderChange(event) {
        this.gender = event.detail.value;
    }

    get isMentalHealth() {
        return this.programType === 'Mental Health';
    }

    get heightWeightRequired() {
        return this.programType !== 'Mental Health';
    }

    get heightLabel() {
        return this.isMentalHealth ? 'Height (optional)' : 'Height';
    }

    get weightLabel() {
        return this.isMentalHealth ? 'Weight — lbs (optional)' : 'Weight (lbs)';
    }

    get showWeightWarning() {
        return this.weightWarning !== '' && this.programType !== 'Mental Health';
    }

    async handleSave() {
        // Validate required fields
        const allValid = [
            ...this.template.querySelectorAll('lightning-input'),
            ...this.template.querySelectorAll('lightning-combobox')
        ].reduce((validSoFar, input) => {
            input.reportValidity();
            return validSoFar && input.checkValidity();
        }, true);

        if (!allValid) return;

        this.isSaving = true;
        try {
            const result = await saveMainInfo({
                contactId: this.contactId,
                clientId: this.clientId,
                waiverId: this.waiverId,
                firstName: this.firstName,
                lastName: this.lastName,
                gender: this.gender,
                dateOfBirth: this.dateOfBirth,
                height: this.height,
                weight: this.weight,
                street: this.street,
                city: this.city,
                state: this.state,
                zip: this.zip,
                email: this.email,
                workEmail: this.workEmail,
                phone: this.phone,
                mobilePhone: this.mobilePhone
            });
            if (result.success) {
                this.dispatchEvent(new CustomEvent('formcomplete', {
                    detail: { stepKey: 'mainInfo' },
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
