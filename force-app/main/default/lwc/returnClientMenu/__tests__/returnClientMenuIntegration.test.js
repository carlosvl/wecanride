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

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

// ─── Integration Tests ──────────────────────────────────────────────────

describe('c-return-client-menu — Integration', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    // ── 1. Photo Release complete → menu updates ──────────────────────
    it('photo release formcomplete refreshes data and returns to menu', async () => {
        getContactIdForUser.mockResolvedValue('003000000000001');
        getClientData.mockResolvedValue(MOCK_CLIENT_DATA);
        getWaiverTemplates.mockResolvedValue({});

        const element = createComponent();
        await flushPromises();

        // Open photo release form
        const btn = element.shadowRoot.querySelector('lightning-button[data-step="photoRelease"]');
        btn.click();
        await flushPromises();

        // Verify child component rendered
        const childComponent = element.shadowRoot.querySelector('c-return-client-photo-release');
        expect(childComponent).not.toBeNull();

        // Mock refreshed data after save
        const updatedData = buildClientDataWithCompletions(['photoRelease']);
        getClientData.mockResolvedValue(updatedData);

        // Simulate formcomplete event from child (bubbles + composed)
        childComponent.dispatchEvent(new CustomEvent('formcomplete', {
            detail: { stepKey: 'photoRelease', formsCompleted: 1 },
            bubbles: true,
            composed: true
        }));
        await flushPromises();

        // Should be back on menu
        const formCards = element.shadowRoot.querySelectorAll('lightning-button[data-step]');
        expect(formCards.length).toBe(14);

        // getClientData should have been called again for refresh
        expect(getClientData).toHaveBeenCalledTimes(2);
    });

    // ── 2. Height & Weight event propagation ──────────────────────────
    it('height-weight formcomplete event propagates with bubbles and composed', async () => {
        getContactIdForUser.mockResolvedValue('003000000000001');
        getClientData.mockResolvedValue(MOCK_CLIENT_DATA);
        getWaiverTemplates.mockResolvedValue({});

        const element = createComponent();
        await flushPromises();

        // Open height/weight form
        const btn = element.shadowRoot.querySelector('lightning-button[data-step="heightWeight"]');
        btn.click();
        await flushPromises();

        const childComponent = element.shadowRoot.querySelector('c-return-client-height-weight');
        expect(childComponent).not.toBeNull();

        // Mock refreshed data
        const updatedData = buildClientDataWithCompletions(['heightWeight']);
        getClientData.mockResolvedValue(updatedData);

        // Dispatch event with bubbles + composed (the fix we applied)
        childComponent.dispatchEvent(new CustomEvent('formcomplete', {
            detail: { stepKey: 'heightWeight', formsCompleted: 1 },
            bubbles: true,
            composed: true
        }));
        await flushPromises();

        // Should be back on menu (proves event crossed shadow DOM)
        const formCards = element.shadowRoot.querySelectorAll('lightning-button[data-step]');
        expect(formCards.length).toBe(14);
    });

    // ── 3. Client Waiver event propagation ────────────────────────────
    it('client-waiver formcomplete event propagates with bubbles and composed', async () => {
        getContactIdForUser.mockResolvedValue('003000000000001');
        getClientData.mockResolvedValue(MOCK_CLIENT_DATA);
        getWaiverTemplates.mockResolvedValue({});

        const element = createComponent();
        await flushPromises();

        // Open client waiver form
        const btn = element.shadowRoot.querySelector('lightning-button[data-step="clientWaiver"]');
        btn.click();
        await flushPromises();

        const childComponent = element.shadowRoot.querySelector('c-return-client-waiver');
        expect(childComponent).not.toBeNull();

        // Mock refreshed data
        const updatedData = buildClientDataWithCompletions(['clientWaiver']);
        getClientData.mockResolvedValue(updatedData);

        childComponent.dispatchEvent(new CustomEvent('formcomplete', {
            detail: { stepKey: 'clientWaiver', formsCompleted: 1 },
            bubbles: true,
            composed: true
        }));
        await flushPromises();

        // Should be back on menu
        const formCards = element.shadowRoot.querySelectorAll('lightning-button[data-step]');
        expect(formCards.length).toBe(14);
    });

    // ── 4. All 14 forms complete → submit enabled ────────────────────
    it('submit button enables when all 14 forms are completed', async () => {
        const allKeys = [
            'mainInfo', 'parentGuardian', 'emergencyContact',
            'photoRelease', 'emergencyTreatment', 'clientWaiver',
            'medicalHistory', 'paymentInfo', 'heightWeight',
            'downSyndrome', 'seizureForm', 'scoliosis',
            'confidentialityHippa', 'therapyCancellation'
        ];
        const data = buildClientDataWithCompletions(allKeys);
        getContactIdForUser.mockResolvedValue('003000000000001');
        getClientData.mockResolvedValue(data);
        getWaiverTemplates.mockResolvedValue({});

        const element = createComponent();
        await flushPromises();

        const submitBtn = [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.variant === 'success');
        expect(submitBtn.disabled).toBe(false);
        expect(submitBtn.label).toBe('Submit Application');

        // Progress should show 14 of 14
        const progressLabel = element.shadowRoot.querySelector('.slds-text-title_caps');
        expect(progressLabel.textContent).toContain('14 of 14 forms completed');
    });

    // ── 5. Cancel from any form returns to menu ──────────────────────
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
        it(`cancel from ${stepKey} returns to menu`, async () => {
            getContactIdForUser.mockResolvedValue('003000000000001');
            getClientData.mockResolvedValue(MOCK_CLIENT_DATA);
            getWaiverTemplates.mockResolvedValue({});

            const element = createComponent();
            await flushPromises();

            // Open form
            const btn = element.shadowRoot.querySelector(`lightning-button[data-step="${stepKey}"]`);
            btn.click();
            await flushPromises();

            // Verify child is rendered
            const child = element.shadowRoot.querySelector(tagName);
            expect(child).not.toBeNull();

            // Dispatch formcancel
            child.dispatchEvent(new CustomEvent('formcancel'));
            await flushPromises();

            // Should be back on menu
            const formCards = element.shadowRoot.querySelectorAll('lightning-button[data-step]');
            expect(formCards.length).toBe(14);
        });
    });
});
