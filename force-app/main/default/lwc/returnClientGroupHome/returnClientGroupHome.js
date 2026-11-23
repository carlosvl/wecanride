import { LightningElement, api, track } from 'lwc';
import getGroupHomeData from '@salesforce/apex/ReturnClientMenuController.getGroupHomeData';
import saveGroupHome from '@salesforce/apex/ReturnClientMenuController.saveGroupHome';
import submitGroupHomeRequest from '@salesforce/apex/ReturnClientMenuController.submitGroupHomeRequest';
import searchGroupHomes from '@salesforce/apex/ReturnClientMenuController.searchGroupHomes';
import stampFormCompletion from '@salesforce/apex/ReturnClientMenuController.stampFormCompletion';

export default class ReturnClientGroupHome extends LightningElement {
    @api waiverId;
    @api clientId;
    @api contactId;
    @api currentYear;
    @api waiver;

    @track currentView = 'loading'; // loading | overview | search | requestNew | pendingRequest
    @track groupHomeData = {};
    isLoading = true;
    isSaving = false;

    // Search state
    @track searchResults = [];
    searchTerm = '';
    selectedAccountId = null;
    isSearching = false;

    // Request form fields
    requestName = '';
    requestPhone = '';
    requestStreet = '';
    requestCity = '';
    requestState = '';
    requestPostalCode = '';
    requestContactPerson = '';
    requestEmail = '';

    // Submission message
    @track submissionMessage = '';

    connectedCallback() {
        this.loadGroupHomeData();
    }

    async loadGroupHomeData() {
        this.isLoading = true;
        try {
            this.groupHomeData = await getGroupHomeData({
                contactId: this.contactId,
                clientId: this.clientId
            });

            // Determine initial view based on data
            if (this.groupHomeData.currentGroupHome) {
                this.currentView = 'overview';
            } else if (this.groupHomeData.pendingRequest) {
                this.currentView = 'pendingRequest';
            } else {
                this.currentView = 'search';
            }
        } catch (error) {
            console.error('Error loading group home data:', JSON.stringify(error));
            this.currentView = 'search';
        } finally {
            this.isLoading = false;
        }
    }

    // ── View Getters ──────────────────────────────────────

    get isLoadingView() { return this.currentView === 'loading'; }
    get isOverview() { return this.currentView === 'overview'; }
    get isSearch() { return this.currentView === 'search'; }
    get isRequestNew() { return this.currentView === 'requestNew'; }
    get isPendingRequest() { return this.currentView === 'pendingRequest'; }

    // ── Overview Data Getters ─────────────────────────────

    get hasCurrentGroupHome() {
        return this.groupHomeData?.currentGroupHome != null;
    }

    get currentGroupHomeName() {
        return this.groupHomeData?.currentGroupHome?.Name || '';
    }

    get currentGroupHomePhone() {
        return this.groupHomeData?.currentGroupHome?.Phone || 'Not provided';
    }

    get currentGroupHomeAddress() {
        const home = this.groupHomeData?.currentGroupHome;
        if (!home) return 'Not provided';
        const parts = [
            home.BillingStreet,
            home.BillingCity,
            home.BillingState,
            home.BillingPostalCode
        ].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : 'Not provided';
    }

    // ── Pending Request Getters ───────────────────────────

    get hasPendingRequest() {
        return this.groupHomeData?.pendingRequest != null;
    }

    get pendingRequestName() {
        return this.groupHomeData?.pendingRequest?.Name || '';
    }

    get pendingRequestStatus() {
        return this.groupHomeData?.pendingRequest?.Status__c || 'Pending';
    }

    get pendingRequestDate() {
        const d = this.groupHomeData?.pendingRequest?.CreatedDate;
        if (!d) return '';
        return new Date(d).toLocaleDateString();
    }

    get pendingRequestAddress() {
        const req = this.groupHomeData?.pendingRequest;
        if (!req) return '';
        const parts = [
            req.Street__c,
            req.City__c,
            req.State__c,
            req.Postal_Code__c
        ].filter(Boolean);
        return parts.join(', ');
    }

    get pendingRequestPhone() {
        return this.groupHomeData?.pendingRequest?.Phone__c || 'Not provided';
    }

    // ── Search Getters ────────────────────────────────────

    get groupHomeResults() {
        const accounts = this.searchResults.length > 0
            ? this.searchResults
            : (this.groupHomeData?.groupHomeAccounts || []);

        return accounts.map(a => {
            const addrParts = [a.BillingStreet, a.BillingCity, a.BillingState, a.BillingPostalCode].filter(Boolean);
            return {
                id: a.Id,
                name: a.Name,
                phone: a.Phone || 'No phone',
                address: addrParts.length > 0 ? addrParts.join(', ') : 'No address',
                isSelected: a.Id === this.selectedAccountId,
                cardClass: a.Id === this.selectedAccountId
                    ? 'slds-box slds-m-bottom_xx-small slds-theme_shade result-card result-card--selected'
                    : 'slds-box slds-m-bottom_xx-small result-card'
            };
        });
    }

    get hasSearchResults() {
        return this.groupHomeResults.length > 0;
    }

    get canSelectGroupHome() {
        return this.selectedAccountId != null;
    }

    // ── Navigation Handlers ───────────────────────────────

    handleChangeGroupHome() {
        this.selectedAccountId = null;
        this.searchTerm = '';
        this.searchResults = [];
        this.currentView = 'search';
    }

    handleCantFindMine() {
        this.clearRequestFields();
        this.currentView = 'requestNew';
    }

    handleBackToOverview() {
        this.currentView = this.hasCurrentGroupHome ? 'overview' : 'search';
    }

    handleBackToSearch() {
        this.currentView = 'search';
    }

    // ── Search Handlers ───────────────────────────────────

    handleSearchInput(event) {
        this.searchTerm = event.target.value;
    }

    async handleSearch() {
        if (!this.searchTerm || this.searchTerm.length < 2) {
            this.searchResults = [];
            return;
        }
        this.isSearching = true;
        try {
            this.searchResults = await searchGroupHomes({
                searchTerm: this.searchTerm
            });
        } catch (error) {
            console.error('Search error:', JSON.stringify(error));
            this.searchResults = [];
        } finally {
            this.isSearching = false;
        }
    }

    handleSearchKeyUp(event) {
        if (event.key === 'Enter') {
            this.handleSearch();
        }
    }

    handleSelectGroupHome(event) {
        const accountId = event.currentTarget.dataset.id;
        this.selectedAccountId = accountId;
    }

    async handleConfirmSelection() {
        if (!this.selectedAccountId) return;
        this.isSaving = true;
        try {
            const result = await saveGroupHome({
                clientId: this.clientId,
                waiverId: this.waiverId,
                selectedAccountId: this.selectedAccountId
            });

            if (result.success) {
                await this.loadGroupHomeData();
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

    // ── Request Form Handlers ─────────────────────────────

    handleRequestInput(event) {
        const field = event.target.dataset.field;
        this[field] = event.detail.value;
    }

    clearRequestFields() {
        this.requestName = '';
        this.requestPhone = '';
        this.requestStreet = '';
        this.requestCity = '';
        this.requestState = '';
        this.requestPostalCode = '';
        this.requestContactPerson = '';
        this.requestEmail = '';
    }

    async handleSubmitRequest() {
        if (!this.validateRequestForm()) return;
        this.isSaving = true;
        try {
            const result = await submitGroupHomeRequest({
                clientId: this.clientId,
                contactId: this.contactId,
                waiverId: this.waiverId,
                name: this.requestName,
                phone: this.requestPhone,
                street: this.requestStreet,
                city: this.requestCity,
                state: this.requestState,
                postalCode: this.requestPostalCode,
                contactPerson: this.requestContactPerson,
                email: this.requestEmail
            });

            if (result.success) {
                this.submissionMessage = result.warningMessage || 'Your request has been submitted for review.';
                await this.loadGroupHomeData();
                this.currentView = 'pendingRequest';
            } else {
                console.error('Submit error:', result.errorMessage);
            }
        } catch (error) {
            console.error('Submit error:', JSON.stringify(error));
        } finally {
            this.isSaving = false;
        }
    }

    validateRequestForm() {
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
        // even if the user only reviewed (didn't edit) their group home.
        if (this.waiverId) {
            try {
                await stampFormCompletion({
                    waiverId: this.waiverId,
                    fieldName: 'Group_Home_Info__c',
                    value: 'Completed'
                });
            } catch (error) {
                console.error('Stamp error:', JSON.stringify(error));
            }
        }
        this.dispatchEvent(new CustomEvent('formcomplete', {
            detail: { stepKey: 'groupHome' },
            bubbles: true,
            composed: true
        }));
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('formcancel'));
    }
}