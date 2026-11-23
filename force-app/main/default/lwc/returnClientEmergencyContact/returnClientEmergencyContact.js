import { LightningElement, api, track } from 'lwc';
import getEmergencyContactData from '@salesforce/apex/ReturnClientMenuController.getEmergencyContactData';
import saveEmergencyContact from '@salesforce/apex/ReturnClientMenuController.saveEmergencyContact';

export default class ReturnClientEmergencyContact extends LightningElement {
    @api waiverId;
    @api clientId;
    @api contactId;
    @api currentYear;
    @api waiver;

    @track currentView = 'overview'; // overview | edit | selectContact | addNew
    @track emergencyData = {};
    isLoading = true;
    isSaving = false;

    // Form fields
    firstName = '';
    lastName = '';
    phone = '';
    email = '';
    selectedContactId = null;

    connectedCallback() {
        this.loadEmergencyData();
    }

    async loadEmergencyData() {
        this.isLoading = true;
        try {
            this.emergencyData = await getEmergencyContactData({
                contactId: this.contactId
            });
        } catch (error) {
            console.error('Error loading emergency contact data:', JSON.stringify(error));
        } finally {
            this.isLoading = false;
        }
    }

    // ── View Getters ──────────────────────────────────────

    get isOverview() { return this.currentView === 'overview'; }
    get isEdit() { return this.currentView === 'edit'; }
    get isSelectContact() { return this.currentView === 'selectContact'; }
    get isAddNew() { return this.currentView === 'addNew'; }

    // ── Data Getters ──────────────────────────────────────

    get hasEmergencyContact() {
        return this.emergencyData?.emergencyContact != null;
    }

    get emergencyContactName() {
        const c = this.emergencyData?.emergencyContact;
        return c ? `${c.FirstName || ''} ${c.LastName || ''}`.trim() : '';
    }

    get emergencyContactPhone() {
        return this.emergencyData?.emergencyContact?.MobilePhone || 'Not provided';
    }

    get emergencyContactEmail() {
        return this.emergencyData?.emergencyContact?.Email || 'Not provided';
    }

    get householdContactOptions() {
        const contacts = this.emergencyData?.householdContacts || [];
        const options = contacts.map(c => ({
            label: `${c.FirstName || ''} ${c.LastName || ''}`.trim(),
            value: c.Id
        }));
        options.push({ label: 'New Contact', value: 'NEW' });
        return options;
    }

    // ── Navigation Handlers ──────────────────────────────

    handleEdit() {
        const c = this.emergencyData.emergencyContact;
        this.firstName = c?.FirstName || '';
        this.lastName = c?.LastName || '';
        this.phone = c?.MobilePhone || '';
        this.email = c?.Email || '';
        this.currentView = 'edit';
    }

    handleAddContact() {
        if (this.emergencyData?.householdContacts?.length > 0) {
            this.currentView = 'selectContact';
        } else {
            this.clearFormFields();
            this.currentView = 'addNew';
        }
    }

    handleBackToOverview() {
        this.currentView = 'overview';
    }

    handleSelectContact(event) {
        this.selectedContactId = event.detail.value;
    }

    handleSelectSubmit() {
        if (this.selectedContactId === 'NEW') {
            this.clearFormFields();
            this.currentView = 'addNew';
        } else if (this.selectedContactId) {
            this.saveAction(false, false, this.selectedContactId);
        }
    }

    // ── Form Input Handler ────────────────────────────────

    handleInputChange(event) {
        const field = event.target.dataset.field;
        this[field] = event.detail.value;
    }

    clearFormFields() {
        this.firstName = '';
        this.lastName = '';
        this.phone = '';
        this.email = '';
        this.selectedContactId = null;
    }

    // ── Save Handlers ─────────────────────────────────────

    handleSaveEdit() {
        if (!this.validateForm()) return;
        this.saveAction(false, false, null);
    }

    handleSaveNew() {
        if (!this.validateForm()) return;
        this.saveAction(true, false, null);
    }

    async handleRemove() {
        this.isSaving = true;
        try {
            const result = await saveEmergencyContact({
                contactId: this.contactId,
                waiverId: this.waiverId,
                emergencyContactId: null,
                firstName: '',
                lastName: '',
                phone: '',
                email: '',
                isNew: false,
                isRemove: true,
                existingContactId: null
            });
            if (result.success) {
                await this.loadEmergencyData();
                this.currentView = 'overview';
            }
        } catch (error) {
            console.error('Remove error:', JSON.stringify(error));
        } finally {
            this.isSaving = false;
        }
    }

    async saveAction(isNew, isRemove, existingContactId) {
        this.isSaving = true;
        try {
            const result = await saveEmergencyContact({
                contactId: this.contactId,
                waiverId: this.waiverId,
                emergencyContactId: this.emergencyData?.emergencyContact?.Id || null,
                firstName: this.firstName,
                lastName: this.lastName,
                phone: this.phone,
                email: this.email,
                isNew: isNew,
                isRemove: isRemove,
                existingContactId: existingContactId
            });

            if (result.success) {
                await this.loadEmergencyData();
                this.currentView = 'overview';
            } else {
                console.error('Save error:', result.errorMessage);
            }
        } catch (error) {
            console.error('Save error:', JSON.stringify(error));
        } finally {
            this.isSaving = false;
        }
    }

    validateForm() {
        const allValid = [...this.template.querySelectorAll('lightning-input')]
            .reduce((validSoFar, input) => {
                input.reportValidity();
                return validSoFar && input.checkValidity();
            }, true);
        return allValid;
    }

    // ── Done / Cancel ─────────────────────────────────────

    handleDone() {
        this.dispatchEvent(new CustomEvent('formcomplete', {
            detail: { stepKey: 'emergencyContact' },
            bubbles: true,
            composed: true
        }));
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('formcancel'));
    }
}
