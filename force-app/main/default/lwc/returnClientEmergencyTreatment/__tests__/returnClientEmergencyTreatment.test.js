import { createElement } from 'lwc';
import ReturnClientEmergencyTreatment from 'c/returnClientEmergencyTreatment';
import saveEmergencyTreatment from '@salesforce/apex/ReturnClientMenuController.saveEmergencyTreatment';

jest.mock('@salesforce/apex/ReturnClientMenuController.saveEmergencyTreatment',
    () => ({ default: jest.fn() }), { virtual: true });

const MOCK_WAIVER = { Id: 'a1j000000000001', Auth_for_Emerg_Med_Treatment__c: null };
const MOCK_WAIVER_COMPLETED = { Id: 'a1j000000000001', Auth_for_Emerg_Med_Treatment__c: 'Completed' };

function findButton(element, label) {
    return [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.label === label);
}

function createComponent(props = {}) {
    const element = createElement('c-return-client-emergency-treatment', { is: ReturnClientEmergencyTreatment });
    Object.assign(element, {
        waiverId: 'a1j000000000001', clientId: 'a0o000000000001',
        contactId: '003000000000001', currentYear: '2024', waiver: MOCK_WAIVER, ...props
    });
    document.body.appendChild(element);
    return element;
}

function flushPromises() { return new Promise((resolve) => setTimeout(resolve, 0)); }

describe('c-return-client-emergency-treatment', () => {
    afterEach(() => {
        while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
        jest.clearAllMocks();
    });

    it('renders all 5 form fields', () => {
        const element = createComponent();
        const inputs = element.shadowRoot.querySelectorAll('lightning-input');
        const textareas = element.shadowRoot.querySelectorAll('lightning-textarea');
        // 3 inputs (insurance, policy, signature) + 2 textareas (meds, allergies)
        expect(inputs.length).toBe(3);
        expect(textareas.length).toBe(2);
    });

    it('shows completed banner when waiver is completed', () => {
        const element = createComponent({ waiver: MOCK_WAIVER_COMPLETED });
        const alert = element.shadowRoot.querySelector('[role="alert"]');
        expect(alert).not.toBeNull();
    });

    it('dispatches formcomplete on successful save', async () => {
        saveEmergencyTreatment.mockResolvedValue({ success: true, formsCompleted: 1 });

        const element = createComponent();
        const handler = jest.fn();
        element.addEventListener('formcomplete', handler);

        // Fill all fields via data-field
        const inputs = element.shadowRoot.querySelectorAll('lightning-input');
        inputs.forEach(input => {
            input.value = 'test value';
            input.reportValidity = jest.fn(() => true);
            input.checkValidity = jest.fn(() => true);
        });
        const textareas = element.shadowRoot.querySelectorAll('lightning-textarea');
        textareas.forEach(ta => {
            ta.value = 'test value';
            ta.reportValidity = jest.fn(() => true);
            ta.checkValidity = jest.fn(() => true);
        });

        // Set internal state directly via input change events
        const fieldMap = { insuranceCompany: 'Blue Cross', policyNumber: 'ABC123', signatureName: 'John Doe' };
        inputs.forEach(input => {
            const field = input.dataset.field;
            if (field && fieldMap[field]) {
                input.dispatchEvent(new CustomEvent('change', {
                    detail: { value: fieldMap[field] }
                }));
            }
        });

        const saveBtn = findButton(element, 'Save & Continue');
        saveBtn.click();
        await flushPromises();

        expect(handler).toHaveBeenCalled();
        expect(handler.mock.calls[0][0].detail.stepKey).toBe('emergencyTreatment');
    });

    it('dispatches formcancel on cancel', () => {
        const element = createComponent();
        const handler = jest.fn();
        element.addEventListener('formcancel', handler);

        const cancelBtn = findButton(element, 'Cancel');
        cancelBtn.click();

        expect(handler).toHaveBeenCalled();
    });

    it('formcomplete event has bubbles and composed true', async () => {
        saveEmergencyTreatment.mockResolvedValue({ success: true, formsCompleted: 1 });

        const element = createComponent();
        let eventBubbles = false;
        let eventComposed = false;
        element.addEventListener('formcomplete', (e) => {
            eventBubbles = e.bubbles;
            eventComposed = e.composed;
        });

        // Mock validation pass
        element.shadowRoot.querySelectorAll('lightning-input, lightning-textarea').forEach(el => {
            el.reportValidity = jest.fn(() => true);
            el.checkValidity = jest.fn(() => true);
        });

        const saveBtn = findButton(element, 'Save & Continue');
        saveBtn.click();
        await flushPromises();

        expect(eventBubbles).toBe(true);
        expect(eventComposed).toBe(true);
    });
});
