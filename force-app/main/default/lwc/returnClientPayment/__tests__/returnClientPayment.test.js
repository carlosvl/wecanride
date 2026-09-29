import { createElement } from 'lwc';
import ReturnClientPayment from 'c/returnClientPayment';
import savePaymentInfo from '@salesforce/apex/ReturnClientMenuController.savePaymentInfo';

jest.mock('@salesforce/apex/ReturnClientMenuController.savePaymentInfo',
    () => ({ default: jest.fn() }), { virtual: true });

const MOCK_WAIVER = { Id: 'a1j000000000001', Payer_Info__c: null };
const MOCK_WAIVER_COMPLETED = { Id: 'a1j000000000001', Payer_Info__c: 'Completed' };

function findButton(element, label) {
    return [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.label === label);
}

function createComponent(props = {}) {
    const element = createElement('c-return-client-payment', { is: ReturnClientPayment });
    Object.assign(element, {
        waiverId: 'a1j000000000001', clientId: 'a0o000000000001',
        contactId: '003000000000001', currentYear: '2024', waiver: MOCK_WAIVER, ...props
    });
    document.body.appendChild(element);
    return element;
}

function flushPromises() { return new Promise((resolve) => setTimeout(resolve, 0)); }

describe('c-return-client-payment', () => {
    afterEach(() => {
        while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
        jest.clearAllMocks();
    });

    it('renders payer info fields', () => {
        const element = createComponent();
        const inputs = element.shadowRoot.querySelectorAll('lightning-input');
        // payerName, phone, street, city, state, zip, email, signature = 8 required fields
        expect(inputs.length).toBeGreaterThanOrEqual(8);
    });

    it('shows completed banner when waiver is completed', () => {
        const element = createComponent({ waiver: MOCK_WAIVER_COMPLETED });
        const alert = element.shadowRoot.querySelector('[role="alert"]');
        expect(alert).not.toBeNull();
        expect(alert.textContent).toContain('Payment info has been submitted');
    });

    it('third-party fields hidden by default', () => {
        const element = createComponent();
        // Third party section only shows when toggle is on
        const thirdPartyInputs = element.shadowRoot.querySelectorAll('[data-field="thirdPartyName"]');
        expect(thirdPartyInputs.length).toBe(0);
    });

    it('shows third-party fields when toggle is turned on', async () => {
        const element = createComponent();

        // Find toggle by type property since attribute selectors don't work in LWC Jest
        const inputs = element.shadowRoot.querySelectorAll('lightning-input');
        const toggle = [...inputs].find(i => i.type === 'toggle');
        expect(toggle).not.toBeNull();
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change'));
        await flushPromises();

        const thirdPartyInput = element.shadowRoot.querySelector('[data-field="thirdPartyName"]');
        expect(thirdPartyInput).not.toBeNull();
    });

    it('dispatches formcomplete on successful save', async () => {
        savePaymentInfo.mockResolvedValue({ success: true, formsCompleted: 1 });

        const element = createComponent();
        const handler = jest.fn();
        element.addEventListener('formcomplete', handler);

        // Fill required fields and mock validity
        const inputs = element.shadowRoot.querySelectorAll('lightning-input');
        inputs.forEach(input => {
            input.reportValidity = jest.fn(() => true);
            input.checkValidity = jest.fn(() => true);
        });

        // Set field values via change events
        const fieldValues = {
            payerName: 'John Doe', payerPhone: '555-1234',
            payerStreet: '123 Main St', payerCity: 'Anytown',
            payerState: 'MN', payerZip: '55401',
            payerEmail: 'john@example.com', signatureName: 'John Doe'
        };
        inputs.forEach(input => {
            const field = input.dataset.field;
            if (field && fieldValues[field]) {
                input.dispatchEvent(new CustomEvent('change', {
                    detail: { value: fieldValues[field] }
                }));
            }
        });

        const saveBtn = findButton(element, 'Save & Continue');
        saveBtn.click();
        await flushPromises();

        expect(handler).toHaveBeenCalled();
        expect(handler.mock.calls[0][0].detail.stepKey).toBe('paymentInfo');
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
        savePaymentInfo.mockResolvedValue({ success: true, formsCompleted: 1 });

        const element = createComponent();
        let eventBubbles = false;
        let eventComposed = false;
        element.addEventListener('formcomplete', (e) => {
            eventBubbles = e.bubbles;
            eventComposed = e.composed;
        });

        // Mock validity
        element.shadowRoot.querySelectorAll('lightning-input').forEach(el => {
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
