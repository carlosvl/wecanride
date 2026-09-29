import { LightningElement, api, track } from 'lwc';
import getGuardianData from '@salesforce/apex/ReturnClientMenuController.getGuardianData';
import saveGuardian from '@salesforce/apex/ReturnClientMenuController.saveGuardian';
import removeGuardian from '@salesforce/apex/ReturnClientMenuController.removeGuardian';
import stampFormCompletion from '@salesforce/apex/ReturnClientMenuController.stampFormCompletion';

export default class ReturnClientParentGuardian extends LightningElement {
    @api waiverId;
    @api clientId;
    @api contactId;
    @api currentYear;
    @api waiver;

    @track currentView = 'overview'; // overview | editFirst | editSecond | selectFirst | selectSecond | addFirst | addSecond
    @track guardianData = {};
    isLoading = true;
    isSaving = false;

    // Edit/Add form fields
    firstName = '';
    lastName = '';
    email = '';
    phone = '';
    employer = '';
    selectedContactId = null;

    connectedCallback() {
        this.loadGuardianData();
    }

    async loadGuardianData() {
        this.isLoading = true;
        try {
            this.guardianData = await getGuardianData({
                contactId: this.contactId,
                clientId: this.clientId
            });
        } catch (error) {
            console.error('Error loading guardian data:', JSON.stringify(error));
        } finally {
            this.isLoading = false;
        }
    }

    // ── View Getters ──────────────────────────────────────

    get isOverview() { return this.currentView === 'overview'; }
    get isEditFirst() { return this.currentView === 'editFirst'; }
    get isEditSecond() { return this.currentView === 'editSecond'; }
    get isSelectFirst() { return this.currentView === 'selectFirst'; }
    get isSelectSecond() { return this.currentView === 'selectSecond'; }
    get isAddFirst() { return this.currentView === 'addFirst'; }
    get isAddSecond() { return this.currentView === 'addSecond'; }

    get isEditView() {
        return this.isEditFirst || this.isEditSecond;
    }

    get isSelectView() {
        return this.isSelectFirst || this.isSelectSecond;
    }

    get isAddView() {
        return this.isAddFirst || this.isAddSecond;
    }

    get editFormTitle() {
        if (this.isEditFirst) return 'Edit 1st Guardian';
        if (this.isEditSecond) return 'Edit 2nd Guardian';
        return 'Edit Guardian';
    }

    get addFormTitle() {
        if (this.isAddFirst) return 'Add 1st Guardian';
        if (this.isAddSecond) return 'Add 2nd Guardian';
        return 'Add Guardian';
    }

    // ── Guardian Data Getters ─────────────────────────────

    get hasFirstGuardian() {
        return this.guardianData?.firstGuardian != null;
    }

    get hasSecondGuardian() {
        return this.guardianData?.secondGuardian != null;
    }

    get firstGuardianName() {
        const g = this.guardianData?.firstGuardian;
        return g ? `${g.FirstName || ''} ${g.LastName || ''}`.trim() : '';
    }

    get firstGuardianEmail() {
        return this.guardianData?.firstGuardian?.Email || 'Not provided';
    }

    get firstGuardianPhone() {
        return this.guardianData?.firstGuardian?.MobilePhone || 'Not provided';
    }

    get firstGuardianEmployer() {
        return this.guardianData?.firstGuardian?.Business__c || 'Not provided';
    }

    get secondGuardianName() {
        const g = this.guardianData?.secondGuardian;
        return g ? `${g.FirstName || ''} ${g.LastName || ''}`.trim() : '';
    }

    get secondGuardianEmail() {
        return this.guardianData?.secondGuardian?.Email || 'Not provided';
    }

    get secondGuardianPhone() {
        return this.guardianData?.secondGuardian?.MobilePhone || 'Not provided';
    }

    get secondGuardianEmployer() {
        return this.guardianData?.secondGuardian?.Business__c || 'Not provided';
    }

    get householdContactOptions() {
        const contacts = this.guardianData?.householdContacts || [];
        const options = contacts.map(c => ({
            label: `${c.FirstName || ''} ${c.LastName || ''}`.trim(),
            value: c.Id
        }));
        options.push({ label: 'New Contact', value: 'NEW' });
        return options;
    }

    // ── Navigation Handlers ──────────────────────────────

    handleEditFirst() {
        const g = this.guardianData.firstGuardian;
        this.firstName = g?.FirstName || '';
        this.lastName = g?.LastName || '';
        this.email = g?.Email || '';
        this.phone = g?.MobilePhone || '';
        this.employer = g?.Business__c || '';
        this.currentView = 'editFirst';
    }

    handleEditSecond() {
        const g = this.guardianData.secondGuardian;
        this.firstName = g?.FirstName || '';
        this.lastName = g?.LastName || '';
        this.email = g?.Email || '';
        this.phone = g?.MobilePhone || '';
        this.employer = g?.Business__c || '';
        this.currentView = 'editSecond';
    }

    async handleRemoveFirst() {
        this.isSaving = true;
        try {
            const result = await removeGuardian({
                clientId: this.clientId,
                guardianType: 'first'
            });
            if (result.success) {
                await this.loadGuardianData();
            } else {
                console.error('Remove guardian error:', result.errorMessage);
            }
        } catch (error) {
            console.error('Remove guardian error:', JSON.stringify(error));
        } finally {
            this.isSaving = false;
        }
    }

    async handleRemoveSecond() {
        this.isSaving = true;
        try {
            const result = await removeGuardian({
                clientId: this.clientId,
                guardianType: 'second'
            });
            if (result.success) {
                await this.loadGuardianData();
            } else {
                console.error('Remove guardian error:', result.errorMessage);
            }
        } catch (error) {
            console.error('Remove guardian error:', JSON.stringify(error));
        } finally {
            this.isSaving = false;
        }
    }

    handleAddFirst() {
        if (this.guardianData?.householdContacts?.length > 0) {
            this.currentView = 'selectFirst';
        } else {
            this.clearFormFields();
            this.currentView = 'addFirst';
        }
    }

    handleAddSecond() {
        if (this.guardianData?.householdContacts?.length > 0) {
            this.currentView = 'selectSecond';
        } else {
            this.clearFormFields();
            this.currentView = 'addSecond';
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
            this.currentView = this.isSelectFirst ? 'addFirst' : 'addSecond';
        } else if (this.selectedContactId) {
            this.saveGuardianAction(false, this.selectedContactId);
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
        this.email = '';
        this.phone = '';
        this.employer = '';
        this.selectedContactId = null;
    }

    // ── Save Handlers ─────────────────────────────────────

    handleSaveEdit() {
        if (!this.validateForm()) return;

        const guardianType = this.isEditFirst ? 'first' : 'second';
        const guardianContactId = guardianType === 'first'
            ? this.guardianData.firstGuardian?.Id
            : this.guardianData.secondGuardian?.Id;

        this.saveGuardianAction(false, null, guardianContactId);
    }

    handleSaveNew() {
        if (!this.validateForm()) return;
        this.saveGuardianAction(true, null);
    }

    async saveGuardianAction(isNew, existingContactId, guardianContactId) {
        this.isSaving = true;
        const guardianType = (this.currentView.includes('First') || this.currentView.includes('first'))
            ? 'first' : 'second';

        try {
            const result = await saveGuardian({
                clientId: this.clientId,
                contactId: this.contactId,
                waiverId: this.waiverId,
                guardianContactId: guardianContactId || null,
                guardianType: guardianType,
                firstName: this.firstName,
                lastName: this.lastName,
                email: this.email,
                phone: this.phone,
                employer: this.employer,
                isNew: isNew,
                existingContactId: existingContactId || null
            });

            if (result.success) {
                await this.loadGuardianData();
                this.currentView = 'overview';
            } else {
                console.error('Save guardian error:', result.errorMessage);
            }
        } catch (error) {
            console.error('Save guardian error:', JSON.stringify(error));
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

    async handleDone() {
        // Always stamp the waiver so completion persists across page refreshes,
        // even if the user only reviewed (didn't edit) guardians.
        if (this.waiverId) {
            try {
                await stampFormCompletion({
                    waiverId: this.waiverId,
                    fieldName: 'Parent_Guardian_Info__c',
                    value: 'Completed'
                });
            } catch (error) {
                console.error('Stamp error:', JSON.stringify(error));
            }
        }
        this.dispatchEvent(new CustomEvent('formcomplete', {
            detail: { stepKey: 'parentGuardian' },
            bubbles: true,
            composed: true
        }));
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('formcancel'));
    }
}