import { createElement } from 'lwc';
import ReturnClientWaiver from 'c/returnClientWaiver';
import saveClientWaiver from '@salesforce/apex/ReturnClientMenuController.saveClientWaiver';

jest.mock('@salesforce/apex/ReturnClientMenuController.saveClientWaiver',
    () => ({ default: jest.fn() }), { virtual: true });

const MOCK_WAIVER = { Id: 'a1j000000000001', Client_Waiver__c: null };
const MOCK_WAIVER_COMPLETED = { Id: 'a1j000000000001', Client_Waiver__c: 'Completed' };

function findButton(element, label) {
    return [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.label === label);
}

function createComponent(props = {}) {
    const element = createElement('c-return-client-waiver', { is: ReturnClientWaiver });
    Object.assign(element, {
        waiverId: 'a1j000000000001', clientId: 'a0o000000000001',
        contactId: '003000000000001', currentYear: '2024',
        recordTypeId: '012000000000001', waiver: MOCK_WAIVER, ...props
    });
    document.body.appendChild(element);
    return element;
}

function flushPromises() { return new Promise((resolve) => setTimeout(resolve, 0)); }

describe('c-return-client-waiver', () => {
    afterEach(() => {
        while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
        jest.clearAllMocks();
    });

    it('renders waiver text and signature fields', () => {
        const element = createComponent();
        const waiverText = element.shadowRoot.querySelector('.waiver-text');
        expect(waiverText).not.toBeNull();

        const inputs = element.shadowRoot.querySelectorAll('lightning-input');
        // checkbox + signature input
        expect(inputs.length).toBe(2);
    });

    it('shows completed banner', () => {
        const element = createComponent({ waiver: MOCK_WAIVER_COMPLETED });
        const alert = element.shadowRoot.querySelector('[role="alert"]');
        expect(alert).not.toBeNull();
        expect(alert.textContent).toContain('already been signed');
    });

    it('does not save without signature and acknowledgement', async () => {
        const element = createComponent();

        const saveBtn = findButton(element, 'Save & Continue');
        saveBtn.click();
        await flushPromises();

        expect(saveClientWaiver).not.toHaveBeenCalled();
    });

    it('dispatches formcomplete on successful save', async () => {
        saveClientWaiver.mockResolvedValue({ success: true, formsCompleted: 1 });

        const element = createComponent();
        const handler = jest.fn();
        element.addEventListener('formcomplete', handler);

        // Fill signature — find by label property since attribute selectors don't work in LWC Jest
        const inputs = element.shadowRoot.querySelectorAll('lightning-input');
        const sigInput = [...inputs].find(i => i.label && i.label.includes('Signature'));
        sigInput.dispatchEvent(new CustomEvent('change', { detail: { value: 'John Doe' } }));

        // Check acknowledgement — find checkbox by type property
        const checkbox = [...inputs].find(i => i.type === 'checkbox');
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
        await flushPromises();

        const saveBtn = findButton(element, 'Save & Continue');
        saveBtn.click();
        await flushPromises();

        expect(saveClientWaiver).toHaveBeenCalledWith({
            waiverId: 'a1j000000000001',
            clientId: 'a0o000000000001',
            signatureName: 'John Doe',
            year: '2024',
            recordTypeId: '012000000000001'
        });
        expect(handler).toHaveBeenCalled();
        expect(handler.mock.calls[0][0].detail.stepKey).toBe('clientWaiver');
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
        saveClientWaiver.mockResolvedValue({ success: true, formsCompleted: 1 });

        const element = createComponent();
        let eventBubbles = false;
        let eventComposed = false;
        element.addEventListener('formcomplete', (e) => {
            eventBubbles = e.bubbles;
            eventComposed = e.composed;
        });

        // Fill fields — find by property since attribute selectors don't work in LWC Jest
        const inputs = element.shadowRoot.querySelectorAll('lightning-input');
        const sigInput = [...inputs].find(i => i.label && i.label.includes('Signature'));
        sigInput.dispatchEvent(new CustomEvent('change', { detail: { value: 'Test' } }));
        const checkbox = [...inputs].find(i => i.type === 'checkbox');
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
        await flushPromises();

        const saveBtn = findButton(element, 'Save & Continue');
        saveBtn.click();
        await flushPromises();

        expect(eventBubbles).toBe(true);
        expect(eventComposed).toBe(true);
    });
});
