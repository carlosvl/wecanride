import { createElement } from 'lwc';
import ReturnClientDownSyndrome from 'c/returnClientDownSyndrome';
import saveDownSyndrome from '@salesforce/apex/ReturnClientMenuController.saveDownSyndrome';
import linkUploadedFiles from '@salesforce/apex/ReturnClientMenuController.linkUploadedFiles';

jest.mock('@salesforce/apex/ReturnClientMenuController.saveDownSyndrome',
    () => ({ default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/ReturnClientMenuController.linkUploadedFiles',
    () => ({ default: jest.fn() }), { virtual: true });

const MOCK_WAIVER = { Id: 'a1j000000000001', Down_Syndrome__c: null };
const MOCK_WAIVER_COMPLETED = { Id: 'a1j000000000001', Down_Syndrome__c: 'Completed' };

function findButton(element, label) {
    return [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.label === label);
}

function createComponent(props = {}) {
    const element = createElement('c-return-client-down-syndrome', { is: ReturnClientDownSyndrome });
    Object.assign(element, {
        waiverId: 'a1j000000000001', clientId: 'a0o000000000001',
        contactId: '003000000000001', currentYear: '2024', waiver: MOCK_WAIVER, ...props
    });
    document.body.appendChild(element);
    return element;
}

function flushPromises() { return new Promise((resolve) => setTimeout(resolve, 0)); }

describe('c-return-client-down-syndrome', () => {
    afterEach(() => {
        while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
        jest.clearAllMocks();
    });

    it('renders file upload and download link', () => {
        const element = createComponent();
        const fileUpload = element.shadowRoot.querySelector('lightning-file-upload');
        expect(fileUpload).not.toBeNull();

        const downloadLink = element.shadowRoot.querySelector('a[target="_blank"]');
        expect(downloadLink).not.toBeNull();
        expect(downloadLink.textContent).toContain('Download Down Syndrome Form');
    });

    it('shows completed banner when waiver is completed', () => {
        const element = createComponent({ waiver: MOCK_WAIVER_COMPLETED });
        const alert = element.shadowRoot.querySelector('[role="alert"]');
        expect(alert).not.toBeNull();
        expect(alert.textContent).toContain('already been uploaded');
    });

    it('does not save without file upload when not completed', async () => {
        const element = createComponent();

        const saveBtn = findButton(element, 'Save & Continue');
        saveBtn.click();
        await flushPromises();

        expect(saveDownSyndrome).not.toHaveBeenCalled();
    });

    it('dispatches formcomplete on successful save after file upload', async () => {
        linkUploadedFiles.mockResolvedValue(undefined);
        saveDownSyndrome.mockResolvedValue({ success: true, formsCompleted: 1 });

        const element = createComponent();
        const handler = jest.fn();
        element.addEventListener('formcomplete', handler);

        // Simulate file upload
        const fileUpload = element.shadowRoot.querySelector('lightning-file-upload');
        fileUpload.dispatchEvent(new CustomEvent('uploadfinished', {
            detail: { files: [{ documentId: '069000000000002' }] }
        }));
        await flushPromises();

        const saveBtn = findButton(element, 'Save & Continue');
        saveBtn.click();
        await flushPromises();

        expect(linkUploadedFiles).toHaveBeenCalledWith({
            contentDocumentIds: ['069000000000002'],
            waiverId: 'a1j000000000001',
            clientId: 'a0o000000000001'
        });
        expect(saveDownSyndrome).toHaveBeenCalledWith({ waiverId: 'a1j000000000001' });
        expect(handler).toHaveBeenCalled();
        expect(handler.mock.calls[0][0].detail.stepKey).toBe('downSyndrome');
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
        linkUploadedFiles.mockResolvedValue(undefined);
        saveDownSyndrome.mockResolvedValue({ success: true, formsCompleted: 1 });

        const element = createComponent();
        let eventBubbles = false;
        let eventComposed = false;
        element.addEventListener('formcomplete', (e) => {
            eventBubbles = e.bubbles;
            eventComposed = e.composed;
        });

        const fileUpload = element.shadowRoot.querySelector('lightning-file-upload');
        fileUpload.dispatchEvent(new CustomEvent('uploadfinished', {
            detail: { files: [{ documentId: '069000000000002' }] }
        }));
        await flushPromises();

        const saveBtn = findButton(element, 'Save & Continue');
        saveBtn.click();
        await flushPromises();

        expect(eventBubbles).toBe(true);
        expect(eventComposed).toBe(true);
    });
});
