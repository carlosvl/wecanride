import { createElement } from 'lwc';
import ReturnClientMenu from 'c/returnClientMenu';
import getClientData from '@salesforce/apex/ReturnClientMenuController.getClientData';
import getContactIdForUser from '@salesforce/apex/ReturnClientMenuController.getContactIdForUser';
import submitApplication from '@salesforce/apex/ReturnClientMenuController.submitApplication';
import getWaiverTemplates from '@salesforce/apex/ReturnClientMenuController.getWaiverTemplates';

// ─── Mocks ──────────────────────────────────────────────────────────────
jest.mock('@salesforce/user/Id', () => ({ default: '005000000000001' }), { virtual: true });

jest.mock('@salesforce/apex/ReturnClientMenuController.getClientData',
    () => ({ default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/ReturnClientMenuController.getContactIdForUser',
    () => ({ default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/ReturnClientMenuController.submitApplication',
    () => ({ default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/ReturnClientMenuController.getWaiverTemplates',
    () => ({ default: jest.fn() }), { virtual: true });

// Mock ShowToastEvent — must return real CustomEvent for dispatchEvent to work
jest.mock('lightning/platformShowToastEvent', () => {
    return {
        ShowToastEvent: function(config) {
            return new CustomEvent('showtoast', { detail: config });
        }
    };
}, { virtual: true });

// ─── Test Data ──────────────────────────────────────────────────────────

const MOCK_CLIENT_DATA = {
    client: { Id: 'a0o000000000001', Name: 'Test Client', ClientContact__c: '003000000000001' },
    waiver: {
        Id: 'a1j000000000001', Year__c: '2024',
        Photo_Release__c: null, Auth_for_Emerg_Med_Treatment__c: null,
        Client_Waiver__c: null, Medical_History_Form_PL__c: null,
        Payer_Info__c: null, WeightHeight__c: null,
        Down_Syndrome__c: null, Seizure_Form__c: null, ScoliosisForm__c: null,
        Confidentiality_HIPPA__c: null, Hippotherapy_Cancellation_Policy__c: null,
        Application_Submitted__c: null
    },
    contact: {
        Id: '003000000000001', Name: 'Test Contact', Height__c: null, Weight__c: null,
        FirstName: 'Test', LastName: 'Contact', Gender__c: null, Birthdate: null,
        MailingStreet: null, MailingCity: null, MailingState: null, MailingPostalCode: null,
        Email: null, npe01__WorkEmail__c: null, HomePhone: null, MobilePhone: null,
        AccountId: null, Volunteer__c: false
    },
    currentYear: '2024',
    completionStatus: {
        mainInfo: 'Not Started', parentGuardian: 'Not Started', emergencyContact: 'Not Started',
        photoRelease: 'Not Started', emergencyTreatment: 'Not Started',
        clientWaiver: 'Not Started', medicalHistory: 'Not Started',
        paymentInfo: 'Not Started', heightWeight: 'Not Started',
        downSyndrome: 'Not Started', seizureForm: 'Not Started',
        scoliosis: 'Not Started', confidentialityHippa: 'Not Started',
        therapyCancellation: 'Not Started'
    },
    waiverRecordTypeId: '012000000000001'
};

function buildClientDataWithCompletions(completedKeys) {
    const status = { ...MOCK_CLIENT_DATA.completionStatus };
    completedKeys.forEach(k => { status[k] = 'Completed'; });
    return { ...MOCK_CLIENT_DATA, completionStatus: status };
}

function buildSubmittedClientData() {
    const data = { ...MOCK_CLIENT_DATA };
    data.waiver = { ...data.waiver, Application_Submitted__c: 'Yes' };
    return data;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function findButton(element, label) {
    return [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.label === label);
}

function createComponent(props = {}) {
    const element = createElement('c-return-client-menu', { is: ReturnClientMenu });
    Object.assign(element, props);
    document.body.appendChild(element);
    return element;
}

// Flush all micro-tasks (promises) to completion
function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe('c-return-client-menu', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    // ── 1. Loading State ────────────────────────────────────────────────

    it('renders spinner while loading', () => {
        // Don't resolve the promise — keep loading state
        getContactIdForUser.mockResolvedValue('003000000000001');
        getClientData.mockReturnValue(new Promise(() => {})); // Never resolves

        const element = createComponent();

        const spinner = element.shadowRoot.querySelector('lightning-spinner');
        expect(spinner).not.toBeNull();
    });

    // ── 2. Error State ──────────────────────────────────────────────────

    it('renders error state when Apex fails', async () => {
        getContactIdForUser.mockResolvedValue('003000000000001');
        getClientData.mockRejectedValue({ body: { message: 'Test error message' } });

        const element = createComponent();
        await flushPromises();

        const alert = element.shadowRoot.querySelector('[role="alert"]');
        expect(alert).not.toBeNull();
        expect(alert.textContent).toContain('Test error message');
    });

    // ── 3. No Client Found ──────────────────────────────────────────────

    it('renders no-client-found state', async () => {
        getContactIdForUser.mockResolvedValue('003000000000001');
        getClientData.mockResolvedValue({ client: null, waiver: null, completionStatus: {} });

        const element = createComponent();
        await flushPromises();

        const heading = element.shadowRoot.querySelector('h3');
        expect(heading).not.toBeNull();
        expect(heading.textContent).toContain('No Active Client Record Found');
    });

    // ── 4. Menu Renders 14 Cards ────────────────────────────────────────

    it('renders menu with 14 form cards after data loads', async () => {
        getContactIdForUser.mockResolvedValue('003000000000001');
        getClientData.mockResolvedValue(MOCK_CLIENT_DATA);
        getWaiverTemplates.mockResolvedValue({});

        const element = createComponent();
        await flushPromises();

        const buttons = element.shadowRoot.querySelectorAll('lightning-button[data-step]');
        expect(buttons.length).toBe(14);
    });

    // ── 5. Completion Badges ────────────────────────────────────────────

    it('shows correct completion badges', async () => {
        const data = buildClientDataWithCompletions(['photoRelease', 'emergencyTreatment']);
        getContactIdForUser.mockResolvedValue('003000000000001');
        getClientData.mockResolvedValue(data);
        getWaiverTemplates.mockResolvedValue({});

        const element = createComponent();
        await flushPromises();

        const badges = element.shadowRoot.querySelectorAll('.slds-badge');
        const completedBadges = [...badges].filter(b => b.textContent === 'Completed');
        const notStartedBadges = [...badges].filter(b => b.textContent === 'Not Started');

        expect(completedBadges.length).toBe(2);
        expect(notStartedBadges.length).toBe(12);
    });

    // ── 6. Progress Bar ─────────────────────────────────────────────────

    it('progress bar reflects completion count', async () => {
        const data = buildClientDataWithCompletions(['photoRelease', 'emergencyTreatment', 'clientWaiver']);
        getContactIdForUser.mockResolvedValue('003000000000001');
        getClientData.mockResolvedValue(data);
        getWaiverTemplates.mockResolvedValue({});

        const element = createComponent();
        await flushPromises();

        const progressLabel = element.shadowRoot.querySelector('.slds-text-title_caps');
        expect(progressLabel.textContent).toContain('3 of 14 forms completed');
    });

    // ── 7. Opens Form View ──────────────────────────────────────────────

    it('opens form view when card button is clicked', async () => {
        getContactIdForUser.mockResolvedValue('003000000000001');
        getClientData.mockResolvedValue(MOCK_CLIENT_DATA);
        getWaiverTemplates.mockResolvedValue({});

        const element = createComponent();
        await flushPromises();

        const photoReleaseBtn = element.shadowRoot.querySelector('lightning-button[data-step="photoRelease"]');
        photoReleaseBtn.click();
        await flushPromises();

        // Menu should be gone, form header should be visible
        const backButton = findButton(element, '← Back to Menu');
        expect(backButton).not.toBeNull();

        // Child component should be rendered
        const childComponent = element.shadowRoot.querySelector('c-return-client-photo-release');
        expect(childComponent).not.toBeNull();
    });

    // ── 8. Back to Menu ─────────────────────────────────────────────────

    it('navigates back to menu when back button is clicked', async () => {
        getContactIdForUser.mockResolvedValue('003000000000001');
        getClientData.mockResolvedValue(MOCK_CLIENT_DATA);
        getWaiverTemplates.mockResolvedValue({});

        const element = createComponent();
        await flushPromises();

        // Open a form
        const btn = element.shadowRoot.querySelector('lightning-button[data-step="photoRelease"]');
        btn.click();
        await flushPromises();

        // Click back
        // After navigating, getClientData is called again for refresh
        getClientData.mockResolvedValue(MOCK_CLIENT_DATA);
        const backBtn = findButton(element, '← Back to Menu');
        backBtn.click();
        await flushPromises();

        // Should be back on menu
        const formCards = element.shadowRoot.querySelectorAll('lightning-button[data-step]');
        expect(formCards.length).toBe(14);
    });

    // ── 9. handleFormComplete ────────────────────────────────────────────

    it('updates completion status and navigates to menu on formcomplete', async () => {
        getContactIdForUser.mockResolvedValue('003000000000001');
        getClientData.mockResolvedValue(MOCK_CLIENT_DATA);
        getWaiverTemplates.mockResolvedValue({});

        const element = createComponent();
        await flushPromises();

        // Open photo release form
        const btn = element.shadowRoot.querySelector('lightning-button[data-step="photoRelease"]');
        btn.click();
        await flushPromises();

        // Mock refresh call
        const updatedData = buildClientDataWithCompletions(['photoRelease']);
        getClientData.mockResolvedValue(updatedData);

        // Simulate formcomplete event from child
        const childComponent = element.shadowRoot.querySelector('c-return-client-photo-release');
        childComponent.dispatchEvent(new CustomEvent('formcomplete', {
            detail: { stepKey: 'photoRelease', formsCompleted: 1 },
            bubbles: true,
            composed: true
        }));
        await flushPromises();

        // Should be back on menu
        const formCards = element.shadowRoot.querySelectorAll('lightning-button[data-step]');
        expect(formCards.length).toBe(14);

        // Verify refreshData was called
        expect(getClientData).toHaveBeenCalledTimes(2); // initial + refresh
    });

    // ── 10. handleFormCancel ─────────────────────────────────────────────

    it('navigates back to menu on formcancel', async () => {
        getContactIdForUser.mockResolvedValue('003000000000001');
        getClientData.mockResolvedValue(MOCK_CLIENT_DATA);
        getWaiverTemplates.mockResolvedValue({});

        const element = createComponent();
        await flushPromises();

        // Open a form
        const btn = element.shadowRoot.querySelector('lightning-button[data-step="emergencyTreatment"]');
        btn.click();
        await flushPromises();

        // Simulate cancel
        const childComponent = element.shadowRoot.querySelector('c-return-client-emergency-treatment');
        childComponent.dispatchEvent(new CustomEvent('formcancel'));
        await flushPromises();

        // Should be back on menu — no refresh call for cancel
        const formCards = element.shadowRoot.querySelectorAll('lightning-button[data-step]');
        expect(formCards.length).toBe(14);
    });

    // ── 11. Submit Button Disabled ───────────────────────────────────────

    it('submit button disabled until 6 forms completed', async () => {
        getContactIdForUser.mockResolvedValue('003000000000001');
        getClientData.mockResolvedValue(MOCK_CLIENT_DATA);
        getWaiverTemplates.mockResolvedValue({});

        const element = createComponent();
        await flushPromises();

        const submitBtn = [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.variant === 'success');
        // With 0 completed, button label should show remaining count
        expect(submitBtn.disabled).toBe(true);
    });

    // ── 12. Submit Button Enabled with 6+ Completions ───────────────────

    it('submit button enabled when 6 or more forms are completed', async () => {
        const data = buildClientDataWithCompletions([
            'photoRelease', 'emergencyTreatment', 'clientWaiver',
            'medicalHistory', 'paymentInfo', 'heightWeight'
        ]);
        getContactIdForUser.mockResolvedValue('003000000000001');
        getClientData.mockResolvedValue(data);
        getWaiverTemplates.mockResolvedValue({});

        const element = createComponent();
        await flushPromises();

        const submitBtn = [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.variant === 'success');
        expect(submitBtn.disabled).toBe(false);
        expect(submitBtn.label).toBe('Submit Application');
    });

    // ── 13. Already Submitted Banner ────────────────────────────────────

    it('shows already submitted banner', async () => {
        getContactIdForUser.mockResolvedValue('003000000000001');
        getClientData.mockResolvedValue(buildSubmittedClientData());
        getWaiverTemplates.mockResolvedValue({});

        const element = createComponent();
        await flushPromises();

        const banner = element.shadowRoot.querySelector('.slds-alert_success');
        expect(banner).not.toBeNull();
        expect(banner.textContent).toContain('application has been submitted');
    });

    // ── 14. Contact ID Resolution ───────────────────────────────────────

    it('resolves contact ID from user when not provided as prop', async () => {
        getContactIdForUser.mockResolvedValue('003000000000001');
        getClientData.mockResolvedValue(MOCK_CLIENT_DATA);
        getWaiverTemplates.mockResolvedValue({});

        createComponent();
        await flushPromises();

        expect(getContactIdForUser).toHaveBeenCalledWith({ userId: '005000000000001' });
        expect(getClientData).toHaveBeenCalledWith({ contactId: '003000000000001' });
    });

    it('uses contactId prop directly when provided', async () => {
        getClientData.mockResolvedValue(MOCK_CLIENT_DATA);
        getWaiverTemplates.mockResolvedValue({});

        createComponent({ contactId: '003PROPCONTACT01' });
        await flushPromises();

        expect(getContactIdForUser).not.toHaveBeenCalled();
        expect(getClientData).toHaveBeenCalledWith({ contactId: '003PROPCONTACT01' });
    });

    // ── 15. Submit Application Calls Apex ────────────────────────────────

    it('submits application successfully', async () => {
        const data = buildClientDataWithCompletions([
            'photoRelease', 'emergencyTreatment', 'clientWaiver',
            'medicalHistory', 'paymentInfo', 'heightWeight'
        ]);
        getContactIdForUser.mockResolvedValue('003000000000001');
        getClientData.mockResolvedValue(data);
        getWaiverTemplates.mockResolvedValue({});
        submitApplication.mockResolvedValue({ success: true, formsCompleted: 6 });

        const element = createComponent();
        await flushPromises();

        const submitBtn = [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.variant === 'success');
        submitBtn.click();
        await flushPromises();

        expect(submitApplication).toHaveBeenCalledWith({ waiverId: 'a1j000000000001' });
    });

    // ── 16. Each form step renders its child component ───────────────────

    const STEP_COMPONENT_MAP = {
        mainInfo: 'c-return-client-main-info',
        parentGuardian: 'c-return-client-parent-guardian',
        emergencyContact: 'c-return-client-emergency-contact',
        photoRelease: 'c-return-client-photo-release',
        emergencyTreatment: 'c-return-client-emergency-treatment',
        clientWaiver: 'c-return-client-waiver',
        medicalHistory: 'c-return-client-medical-history',
        paymentInfo: 'c-return-client-payment',
        heightWeight: 'c-return-client-height-weight',
        downSyndrome: 'c-return-client-down-syndrome',
        seizureForm: 'c-return-client-seizure',
        scoliosis: 'c-return-client-scoliosis',
        confidentialityHippa: 'c-return-client-confidentiality-hippa',
        therapyCancellation: 'c-return-client-therapy-cancellation'
    };

    Object.entries(STEP_COMPONENT_MAP).forEach(([stepKey, tagName]) => {
        it(`renders ${tagName} when ${stepKey} form is opened`, async () => {
            getContactIdForUser.mockResolvedValue('003000000000001');
            getClientData.mockResolvedValue(MOCK_CLIENT_DATA);
            getWaiverTemplates.mockResolvedValue({});

            const element = createComponent();
            await flushPromises();

            const btn = element.shadowRoot.querySelector(`lightning-button[data-step="${stepKey}"]`);
            btn.click();
            await flushPromises();

            const child = element.shadowRoot.querySelector(tagName);
            expect(child).not.toBeNull();
        });
    });
});
