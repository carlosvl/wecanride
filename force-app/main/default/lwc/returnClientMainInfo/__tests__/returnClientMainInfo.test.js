import { createElement } from 'lwc';
import ReturnClientMainInfo from 'c/returnClientMainInfo';
import saveMainInfo from '@salesforce/apex/ReturnClientMenuController.saveMainInfo';

// Mock Apex
jest.mock(
    '@salesforce/apex/ReturnClientMenuController.saveMainInfo',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

// Helper: find a button by label
function findButton(element, label) {
    return [...element.shadowRoot.querySelectorAll('lightning-button')]
        .find(b => b.label === label);
}

// Flush all microtasks
function flushPromises() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

describe('c-return-client-main-info', () => {
    let element;

    const MOCK_CONTACT = {
        Id: '003xx000001',
        FirstName: 'Jane',
        LastName: 'Doe',
        Gender__c: 'Female',
        Birthdate: '2005-06-15',
        Height__c: "5'4",
        Weight__c: 120,
        MailingStreet: '123 Oak St',
        MailingCity: 'Minneapolis',
        MailingState: 'MN',
        MailingPostalCode: '55401',
        Email: 'jane@test.com',
        npe01__WorkEmail__c: 'jane@work.com',
        HomePhone: '612-555-1234',
        MobilePhone: '612-555-5678'
    };

    beforeEach(() => {
        element = createElement('c-return-client-main-info', { is: ReturnClientMainInfo });
        element.waiverId = 'a0Qxx000001';
        element.clientId = 'a0Oxx000001';
        element.contactId = '003xx000001';
        element.currentYear = '2025';
        element.contactRecord = MOCK_CONTACT;
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('renders all form fields', () => {
        document.body.appendChild(element);

        return Promise.resolve().then(() => {
            const inputs = element.shadowRoot.querySelectorAll('lightning-input');
            const combos = element.shadowRoot.querySelectorAll('lightning-combobox');
            // 13 lightning-input + 1 lightning-combobox (gender)
            expect(inputs.length).toBe(13);
            expect(combos.length).toBe(1);
        });
    });

    it('pre-populates fields from contactRecord', () => {
        document.body.appendChild(element);

        return Promise.resolve().then(() => {
            const inputs = element.shadowRoot.querySelectorAll('lightning-input');
            const firstNameInput = [...inputs].find(i => i.label === 'First Name');
            expect(firstNameInput.value).toBe('Jane');

            const lastNameInput = [...inputs].find(i => i.label === 'Last Name');
            expect(lastNameInput.value).toBe('Doe');
        });
    });

    it('renders gender combobox with options', () => {
        document.body.appendChild(element);

        return Promise.resolve().then(() => {
            const combo = element.shadowRoot.querySelector('lightning-combobox');
            expect(combo.options.length).toBe(4);
            expect(combo.options[0].label).toBe('Male');
            expect(combo.value).toBe('Female');
        });
    });

    it('shows weight warning when weight exceeds 200', () => {
        document.body.appendChild(element);

        return Promise.resolve().then(() => {
            const weightInput = [...element.shadowRoot.querySelectorAll('lightning-input')]
                .find(i => i.label === 'Weight (lbs)');

            weightInput.dispatchEvent(new CustomEvent('change', {
                detail: { value: '250' }
            }));

            return Promise.resolve().then(() => {
                const warning = element.shadowRoot.querySelector('.slds-alert_warning');
                expect(warning).not.toBeNull();
            });
        });
    });

    it('dispatches formcomplete on successful save', async () => {
        saveMainInfo.mockResolvedValue({ success: true });
        document.body.appendChild(element);

        const handler = jest.fn();
        element.addEventListener('formcomplete', handler);

        await flushPromises();

        // Mock validation methods on all inputs and comboboxes
        element.shadowRoot.querySelectorAll('lightning-input').forEach(input => {
            input.reportValidity = jest.fn();
            input.checkValidity = jest.fn(() => true);
        });
        element.shadowRoot.querySelectorAll('lightning-combobox').forEach(cb => {
            cb.reportValidity = jest.fn();
            cb.checkValidity = jest.fn(() => true);
        });

        const saveButton = findButton(element, 'Save & Continue');
        saveButton.click();

        // Wait for async save to complete
        await flushPromises();

        expect(handler).toHaveBeenCalled();
        expect(handler.mock.calls[0][0].detail.stepKey).toBe('mainInfo');
    });

    it('dispatches formcancel on cancel', () => {
        document.body.appendChild(element);

        const handler = jest.fn();
        element.addEventListener('formcancel', handler);

        return Promise.resolve().then(() => {
            const cancelButton = findButton(element, 'Cancel');
            cancelButton.click();
            expect(handler).toHaveBeenCalled();
        });
    });

    it('formcomplete event bubbles and is composed', async () => {
        saveMainInfo.mockResolvedValue({ success: true });
        document.body.appendChild(element);

        const handler = jest.fn();
        element.addEventListener('formcomplete', handler);

        await flushPromises();

        // Mock validation methods on all inputs and comboboxes
        element.shadowRoot.querySelectorAll('lightning-input').forEach(input => {
            input.reportValidity = jest.fn();
            input.checkValidity = jest.fn(() => true);
        });
        element.shadowRoot.querySelectorAll('lightning-combobox').forEach(cb => {
            cb.reportValidity = jest.fn();
            cb.checkValidity = jest.fn(() => true);
        });

        const saveButton = findButton(element, 'Save & Continue');
        saveButton.click();

        // Wait for async save to complete
        await flushPromises();

        const event = handler.mock.calls[0][0];
        expect(event.bubbles).toBe(true);
        expect(event.composed).toBe(true);
    });

    it('renders Save & Continue button', () => {
        document.body.appendChild(element);

        return Promise.resolve().then(() => {
            const saveButton = findButton(element, 'Save & Continue');
            expect(saveButton).not.toBeUndefined();
            expect(saveButton.variant).toBe('brand');
        });
    });
});
