import { createElement } from 'lwc';
import ReturnClientPhotoRelease from 'c/returnClientPhotoRelease';
import savePhotoRelease from '@salesforce/apex/ReturnClientMenuController.savePhotoRelease';

jest.mock('@salesforce/apex/ReturnClientMenuController.savePhotoRelease',
    () => ({ default: jest.fn() }), { virtual: true });

const MOCK_WAIVER = { Id: 'a1j000000000001', Photo_Release__c: null };
const MOCK_WAIVER_COMPLETED = { Id: 'a1j000000000001', Photo_Release__c: 'Yes' };

function findButton(element, label) {
    return [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.label === label);
}

function createComponent(props = {}) {
    const element = createElement('c-return-client-photo-release', { is: ReturnClientPhotoRelease });
    Object.assign(element, {
        waiverId: 'a1j000000000001',
        clientId: 'a0o000000000001',
        contactId: '003000000000001',
        currentYear: '2024',
        waiver: MOCK_WAIVER,
        ...props
    });
    document.body.appendChild(element);
    return element;
}

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('c-return-client-photo-release', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('renders radio group with 4 consent options', () => {
        const element = createComponent();
        const radioGroup = element.shadowRoot.querySelector('lightning-radio-group');
        expect(radioGroup).not.toBeNull();
        expect(radioGroup.options.length).toBe(4);
        expect(radioGroup.options[0].value).toBe('Yes');
        expect(radioGroup.options[1].value).toBe('No');
    });

    it('shows completed banner when waiver is completed', () => {
        const element = createComponent({ waiver: MOCK_WAIVER_COMPLETED });
        const alert = element.shadowRoot.querySelector('[role="alert"]');
        expect(alert).not.toBeNull();
        expect(alert.textContent).toContain('already been completed');
    });

    it('does not save when no consent is selected', async () => {
        const element = createComponent();

        const saveBtn = findButton(element, 'Save & Continue');
        saveBtn.click();
        await flushPromises();

        expect(savePhotoRelease).not.toHaveBeenCalled();
    });

    it('dispatches formcomplete on successful save', async () => {
        savePhotoRelease.mockResolvedValue({ success: true, formsCompleted: 1 });

        const element = createComponent();
        const handler = jest.fn();
        element.addEventListener('formcomplete', handler);

        // Simulate selecting consent
        const radioGroup = element.shadowRoot.querySelector('lightning-radio-group');
        radioGroup.dispatchEvent(new CustomEvent('change', { detail: { value: 'Yes' } }));
        await flushPromises();

        // Click save
        const saveBtn = findButton(element, 'Save & Continue');
        saveBtn.click();
        await flushPromises();

        expect(savePhotoRelease).toHaveBeenCalledWith({
            waiverId: 'a1j000000000001',
            consent: 'Yes'
        });
        expect(handler).toHaveBeenCalled();
        expect(handler.mock.calls[0][0].detail.stepKey).toBe('photoRelease');
    });

    it('dispatches formcancel on cancel', () => {
        const element = createComponent();
        const handler = jest.fn();
        element.addEventListener('formcancel', handler);

        const cancelBtn = findButton(element, 'Cancel');
        cancelBtn.click();

        expect(handler).toHaveBeenCalled();
    });

    it('pre-populates consent from existing waiver data', async () => {
        const element = createComponent({ waiver: MOCK_WAIVER_COMPLETED });
        await flushPromises();

        const radioGroup = element.shadowRoot.querySelector('lightning-radio-group');
        expect(radioGroup.value).toBe('Yes');
    });

    it('shows saving spinner during save', async () => {
        savePhotoRelease.mockReturnValue(new Promise(() => {})); // Never resolves

        const element = createComponent();

        // Select consent
        const radioGroup = element.shadowRoot.querySelector('lightning-radio-group');
        radioGroup.dispatchEvent(new CustomEvent('change', { detail: { value: 'Yes' } }));
        await flushPromises();

        // Click save
        const saveBtn = findButton(element, 'Save & Continue');
        saveBtn.click();
        await flushPromises();

        const spinner = element.shadowRoot.querySelector('lightning-spinner');
        expect(spinner).not.toBeNull();
    });
});
