import { createElement } from 'lwc';
import ReturnClientSeizure from 'c/returnClientSeizure';
import saveSeizureForm from '@salesforce/apex/ReturnClientMenuController.saveSeizureForm';
import linkUploadedFiles from '@salesforce/apex/ReturnClientMenuController.linkUploadedFiles';

jest.mock('@salesforce/apex/ReturnClientMenuController.saveSeizureForm',
    () => ({ default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/ReturnClientMenuController.linkUploadedFiles',
    () => ({ default: jest.fn() }), { virtual: true });

const MOCK_WAIVER = { Id: 'a1j000000000001', Seizure_Form__c: null };
const MOCK_WAIVER_COMPLETED = { Id: 'a1j000000000001', Seizure_Form__c: 'Completed' };

function findButton(element, label) {
    return [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.label === label);
}

function createComponent(props = {}) {
    const element = createElement('c-return-client-seizure', { is: ReturnClientSeizure });
    Object.assign(element, {
        waiverId: 'a1j000000000001', clientId: 'a0o000000000001',
        contactId: '003000000000001', currentYear: '2024', waiver: MOCK_WAIVER, ...props
    });
    document.body.appendChild(element);
    return element;
}

function flushPromises() { return new Promise((resolve) => setTimeout(resolve, 0)); }

describe('c-return-client-seizure', () => {
    afterEach(() => {
        while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
        jest.clearAllMocks();
    });

    it('renders last seizure combobox', () => {
        const element = createComponent();
        const combobox = element.shadowRoot.querySelector('lightning-combobox');
        expect(combobox).not.toBeNull();
        expect(combobox.label).toBe('Last Seizure');
    });

    it('shows completed banner when waiver is completed', () => {
        const element = createComponent({ waiver: MOCK_WAIVER_COMPLETED });
        const alert = element.shadowRoot.querySelector('[role="alert"]');
        expect(alert).not.toBeNull();
        expect(alert.textContent).toContain('already been completed');
    });

    it('shows no-form-needed message for 5+ years', async () => {
        const element = createComponent();

        // Select 5+ years
        const combobox = element.shadowRoot.querySelector('lightning-combobox');
        combobox.dispatchEvent(new CustomEvent('change', { detail: { value: '5ormore' } }));
        await flushPromises();

        const noFormMessage = element.shadowRoot.querySelector('.slds-box');
        expect(noFormMessage).not.toBeNull();
        expect(noFormMessage.textContent).toContain('do not need to fill out');
    });

    it('shows last-3-years question for less than 5 years', async () => {
        const element = createComponent();

        const combobox = element.shadowRoot.querySelector('lightning-combobox');
        combobox.dispatchEvent(new CustomEvent('change', { detail: { value: 'less5' } }));
        await flushPromises();

        const comboboxes = element.shadowRoot.querySelectorAll('lightning-combobox');
        expect(comboboxes.length).toBe(2); // Last seizure + last 3 years
    });

    it('shows file upload for less-5 AND last-3-years yes', async () => {
        const element = createComponent();

        // Select less than 5
        const combobox = element.shadowRoot.querySelector('lightning-combobox');
        combobox.dispatchEvent(new CustomEvent('change', { detail: { value: 'less5' } }));
        await flushPromises();

        // Select yes for last 3 years
        const comboboxes = element.shadowRoot.querySelectorAll('lightning-combobox');
        const last3Combobox = comboboxes[1];
        last3Combobox.dispatchEvent(new CustomEvent('change', { detail: { value: 'yes' } }));
        await flushPromises();

        const fileUpload = element.shadowRoot.querySelector('lightning-file-upload');
        expect(fileUpload).not.toBeNull();
    });

    it('shows detail fields for less-5 AND last-3-years no', async () => {
        const element = createComponent();

        // Select less than 5
        const combobox = element.shadowRoot.querySelector('lightning-combobox');
        combobox.dispatchEvent(new CustomEvent('change', { detail: { value: 'less5' } }));
        await flushPromises();

        // Select no for last 3 years
        const comboboxes = element.shadowRoot.querySelectorAll('lightning-combobox');
        const last3Combobox = comboboxes[1];
        last3Combobox.dispatchEvent(new CustomEvent('change', { detail: { value: 'no' } }));
        await flushPromises();

        // Detail fields should appear
        const seizureTypeInput = element.shadowRoot.querySelector('[data-field="seizureType"]');
        expect(seizureTypeInput).not.toBeNull();

        const textareas = element.shadowRoot.querySelectorAll('lightning-textarea');
        expect(textareas.length).toBeGreaterThanOrEqual(3);
    });

    it('dispatches formcomplete on save with 5+ years', async () => {
        saveSeizureForm.mockResolvedValue({ success: true, formsCompleted: 1 });

        const element = createComponent();
        const handler = jest.fn();
        element.addEventListener('formcomplete', handler);

        // Select 5+ years (no form needed, can save immediately)
        const combobox = element.shadowRoot.querySelector('lightning-combobox');
        combobox.dispatchEvent(new CustomEvent('change', { detail: { value: '5ormore' } }));
        await flushPromises();

        const saveBtn = findButton(element, 'Save & Continue');
        saveBtn.click();
        await flushPromises();

        expect(saveSeizureForm).toHaveBeenCalledWith({
            waiverId: 'a1j000000000001',
            seizureInfo: ''
        });
        expect(handler).toHaveBeenCalled();
        expect(handler.mock.calls[0][0].detail.stepKey).toBe('seizureForm');
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
        saveSeizureForm.mockResolvedValue({ success: true, formsCompleted: 1 });

        const element = createComponent();
        let eventBubbles = false;
        let eventComposed = false;
        element.addEventListener('formcomplete', (e) => {
            eventBubbles = e.bubbles;
            eventComposed = e.composed;
        });

        // Select 5+ years path (simplest save path)
        const combobox = element.shadowRoot.querySelector('lightning-combobox');
        combobox.dispatchEvent(new CustomEvent('change', { detail: { value: '5ormore' } }));
        await flushPromises();

        const saveBtn = findButton(element, 'Save & Continue');
        saveBtn.click();
        await flushPromises();

        expect(eventBubbles).toBe(true);
        expect(eventComposed).toBe(true);
    });
});
