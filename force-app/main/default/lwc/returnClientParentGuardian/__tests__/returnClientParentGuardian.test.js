import { createElement } from 'lwc';
import ReturnClientParentGuardian from 'c/returnClientParentGuardian';
import getGuardianData from '@salesforce/apex/ReturnClientMenuController.getGuardianData';
import saveGuardian from '@salesforce/apex/ReturnClientMenuController.saveGuardian';

// Mock Apex
jest.mock(
    '@salesforce/apex/ReturnClientMenuController.getGuardianData',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/ReturnClientMenuController.saveGuardian',
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

describe('c-return-client-parent-guardian', () => {
    let element;

    const MOCK_GUARDIAN_DATA = {
        firstGuardian: {
            Id: '003xx000010',
            FirstName: 'John',
            LastName: 'Smith',
            Email: 'john@test.com',
            MobilePhone: '612-555-0001',
            Business__c: 'Acme Corp'
        },
        secondGuardian: {
            Id: '003xx000011',
            FirstName: 'Mary',
            LastName: 'Smith',
            Email: 'mary@test.com',
            MobilePhone: '612-555-0002',
            Business__c: 'Tech Inc'
        },
        householdContacts: [
            { Id: '003xx000020', FirstName: 'Bob', LastName: 'Jones' },
            { Id: '003xx000021', FirstName: 'Sue', LastName: 'Jones' }
        ],
        isGroupHome: false
    };

    const MOCK_NO_GUARDIANS = {
        firstGuardian: null,
        secondGuardian: null,
        householdContacts: [],
        isGroupHome: false
    };

    beforeEach(() => {
        element = createElement('c-return-client-parent-guardian', {
            is: ReturnClientParentGuardian
        });
        element.waiverId = 'a0Qxx000001';
        element.clientId = 'a0Oxx000001';
        element.contactId = '003xx000001';
        element.currentYear = '2025';
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('renders overview with both guardians when data is loaded', async () => {
        getGuardianData.mockResolvedValue(MOCK_GUARDIAN_DATA);
        document.body.appendChild(element);
        await flushPromises();

        const heading = element.shadowRoot.querySelector('h2');
        expect(heading.textContent).toBe('Parent / Guardian Information');

        // Both guardian cards should be present with names
        const paragraphs = element.shadowRoot.querySelectorAll('p.slds-text-body_regular');
        const textContents = [...paragraphs].map(p => p.textContent);
        expect(textContents).toContain('John Smith');
        expect(textContents).toContain('Mary Smith');
    });

    it('shows "No guardian" message when no guardians assigned', async () => {
        getGuardianData.mockResolvedValue(MOCK_NO_GUARDIANS);
        document.body.appendChild(element);
        await flushPromises();

        const weakTexts = element.shadowRoot.querySelectorAll('p.slds-text-color_weak');
        const messages = [...weakTexts].map(p => p.textContent);
        expect(messages).toContain('No 1st guardian assigned.');
        expect(messages).toContain('No 2nd guardian assigned.');
    });

    it('shows Add buttons when no guardians assigned', async () => {
        getGuardianData.mockResolvedValue(MOCK_NO_GUARDIANS);
        document.body.appendChild(element);
        await flushPromises();

        const addFirstBtn = findButton(element, 'Add 1st Guardian');
        const addSecondBtn = findButton(element, 'Add 2nd Guardian');
        expect(addFirstBtn).not.toBeUndefined();
        expect(addSecondBtn).not.toBeUndefined();
    });

    it('navigates to edit view when Edit is clicked for first guardian', async () => {
        getGuardianData.mockResolvedValue(MOCK_GUARDIAN_DATA);
        document.body.appendChild(element);
        await flushPromises();

        const editButtons = [...element.shadowRoot.querySelectorAll('lightning-button')]
            .filter(b => b.label === 'Edit');
        // Click the first Edit button (1st guardian)
        editButtons[0].click();
        await flushPromises();

        const editHeading = element.shadowRoot.querySelector('h3');
        expect(editHeading.textContent).toBe('Edit 1st Guardian');

        // Form fields should be populated
        const inputs = element.shadowRoot.querySelectorAll('lightning-input');
        const firstNameInput = [...inputs].find(i => i.label === 'First Name');
        expect(firstNameInput.value).toBe('John');
    });

    it('navigates to select view when Add is clicked and household contacts exist', async () => {
        getGuardianData.mockResolvedValue({
            ...MOCK_NO_GUARDIANS,
            householdContacts: MOCK_GUARDIAN_DATA.householdContacts
        });
        document.body.appendChild(element);
        await flushPromises();

        const addBtn = findButton(element, 'Add 1st Guardian');
        addBtn.click();
        await flushPromises();

        const selectHeading = element.shadowRoot.querySelector('h3');
        expect(selectHeading.textContent).toBe('Select a Contact');

        // Radio group should be present
        const radioGroup = element.shadowRoot.querySelector('lightning-radio-group');
        expect(radioGroup).not.toBeNull();
        // Options = household contacts + "New Contact"
        expect(radioGroup.options.length).toBe(3);
    });

    it('dispatches formcomplete on Done click', async () => {
        getGuardianData.mockResolvedValue(MOCK_GUARDIAN_DATA);
        document.body.appendChild(element);
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('formcomplete', handler);

        const doneBtn = findButton(element, 'Done');
        doneBtn.click();

        expect(handler).toHaveBeenCalled();
        expect(handler.mock.calls[0][0].detail.stepKey).toBe('parentGuardian');
    });

    it('formcomplete event bubbles and is composed', async () => {
        getGuardianData.mockResolvedValue(MOCK_GUARDIAN_DATA);
        document.body.appendChild(element);
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('formcomplete', handler);

        const doneBtn = findButton(element, 'Done');
        doneBtn.click();

        const event = handler.mock.calls[0][0];
        expect(event.bubbles).toBe(true);
        expect(event.composed).toBe(true);
    });

    it('dispatches formcancel on Cancel click', async () => {
        getGuardianData.mockResolvedValue(MOCK_GUARDIAN_DATA);
        document.body.appendChild(element);
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('formcancel', handler);

        const cancelBtn = findButton(element, 'Cancel');
        cancelBtn.click();

        expect(handler).toHaveBeenCalled();
    });

    it('renders Cancel and Done buttons in overview', async () => {
        getGuardianData.mockResolvedValue(MOCK_GUARDIAN_DATA);
        document.body.appendChild(element);
        await flushPromises();

        const cancelBtn = findButton(element, 'Cancel');
        const doneBtn = findButton(element, 'Done');
        expect(cancelBtn).not.toBeUndefined();
        expect(doneBtn).not.toBeUndefined();
        expect(doneBtn.variant).toBe('brand');
    });

    it('returns to overview when Back is clicked from edit view', async () => {
        getGuardianData.mockResolvedValue(MOCK_GUARDIAN_DATA);
        document.body.appendChild(element);
        await flushPromises();

        // Go to edit view
        const editButtons = [...element.shadowRoot.querySelectorAll('lightning-button')]
            .filter(b => b.label === 'Edit');
        editButtons[0].click();
        await flushPromises();

        // Click Back
        const backBtn = findButton(element, 'Back');
        backBtn.click();
        await flushPromises();

        // Should be back on overview with Done button visible
        const doneBtn = findButton(element, 'Done');
        expect(doneBtn).not.toBeUndefined();
    });
});
