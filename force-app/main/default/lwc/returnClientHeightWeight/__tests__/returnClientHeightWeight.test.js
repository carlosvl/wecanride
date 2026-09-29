import { createElement } from 'lwc';
import ReturnClientHeightWeight from 'c/returnClientHeightWeight';
import saveHeightWeight from '@salesforce/apex/ReturnClientMenuController.saveHeightWeight';

jest.mock('@salesforce/apex/ReturnClientMenuController.saveHeightWeight',
    () => ({ default: jest.fn() }), { virtual: true });

const MOCK_WAIVER = { Id: 'a1j000000000001', WeightHeight__c: null };
const MOCK_WAIVER_COMPLETED = { Id: 'a1j000000000001', WeightHeight__c: 'Completed' };
const MOCK_CONTACT = { Id: '003000000000001', Name: 'Test Contact', Height__c: '5\'6"', Weight__c: 150 };

function findButton(element, label) {
    return [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.label === label);
}

function createComponent(props = {}) {
    const element = createElement('c-return-client-height-weight', { is: ReturnClientHeightWeight });
    Object.assign(element, {
        waiverId: 'a1j000000000001', clientId: 'a0o000000000001',
        contactId: '003000000000001', currentYear: '2024', waiver: MOCK_WAIVER, ...props
    });
    document.body.appendChild(element);
    return element;
}

function flushPromises() { return new Promise((resolve) => setTimeout(resolve, 0)); }

describe('c-return-client-height-weight', () => {
    afterEach(() => {
        while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
        jest.clearAllMocks();
    });

    it('renders height and weight fields', () => {
        const element = createComponent();
        const inputs = element.shadowRoot.querySelectorAll('lightning-input');
        expect(inputs.length).toBe(2);

        const heightInput = element.shadowRoot.querySelector('[data-field="height"]');
        const weightInput = element.shadowRoot.querySelector('[data-field="weight"]');
        expect(heightInput).not.toBeNull();
        expect(weightInput).not.toBeNull();
    });

    it('shows completed banner when waiver is completed', () => {
        const element = createComponent({ waiver: MOCK_WAIVER_COMPLETED });
        const alert = element.shadowRoot.querySelector('[role="alert"]');
        expect(alert).not.toBeNull();
        expect(alert.textContent).toContain('Height and weight have been recorded');
    });

    it('pre-populates from contactRecord', async () => {
        const element = createComponent({ contactRecord: MOCK_CONTACT });
        await flushPromises();

        const heightInput = element.shadowRoot.querySelector('[data-field="height"]');
        const weightInput = element.shadowRoot.querySelector('[data-field="weight"]');
        expect(heightInput.value).toBe('5\'6"');
        expect(weightInput.value).toBe(150);
    });

    it('parses weight as decimal on change', async () => {
        saveHeightWeight.mockResolvedValue({ success: true, formsCompleted: 1 });

        const element = createComponent();
        const handler = jest.fn();
        element.addEventListener('formcomplete', handler);

        // Set height
        const heightInput = element.shadowRoot.querySelector('[data-field="height"]');
        heightInput.dispatchEvent(new CustomEvent('change', { detail: { value: '5\'8"' } }));

        // Set weight with decimal
        const weightInput = element.shadowRoot.querySelector('[data-field="weight"]');
        weightInput.dispatchEvent(new CustomEvent('change', { detail: { value: '165.5' } }));
        await flushPromises();

        // Mock validity
        element.shadowRoot.querySelectorAll('lightning-input').forEach(el => {
            el.reportValidity = jest.fn(() => true);
            el.checkValidity = jest.fn(() => true);
        });

        const saveBtn = findButton(element, 'Save & Continue');
        saveBtn.click();
        await flushPromises();

        expect(saveHeightWeight).toHaveBeenCalledWith({
            waiverId: 'a1j000000000001',
            contactId: '003000000000001',
            height: '5\'8"',
            weight: 165.5
        });
    });

    it('dispatches formcomplete on successful save', async () => {
        saveHeightWeight.mockResolvedValue({ success: true, formsCompleted: 1 });

        const element = createComponent();
        const handler = jest.fn();
        element.addEventListener('formcomplete', handler);

        // Mock validity
        element.shadowRoot.querySelectorAll('lightning-input').forEach(el => {
            el.reportValidity = jest.fn(() => true);
            el.checkValidity = jest.fn(() => true);
        });

        const saveBtn = findButton(element, 'Save & Continue');
        saveBtn.click();
        await flushPromises();

        expect(handler).toHaveBeenCalled();
        expect(handler.mock.calls[0][0].detail.stepKey).toBe('heightWeight');
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
        saveHeightWeight.mockResolvedValue({ success: true, formsCompleted: 1 });

        const element = createComponent();
        let eventBubbles = false;
        let eventComposed = false;
        element.addEventListener('formcomplete', (e) => {
            eventBubbles = e.bubbles;
            eventComposed = e.composed;
        });

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
