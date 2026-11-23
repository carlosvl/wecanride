import { createElement } from 'lwc';
import ReturnClientEmergencyContact from 'c/returnClientEmergencyContact';
import getEmergencyContactData from '@salesforce/apex/ReturnClientMenuController.getEmergencyContactData';
import saveEmergencyContact from '@salesforce/apex/ReturnClientMenuController.saveEmergencyContact';

// Mock Apex
jest.mock(
    '@salesforce/apex/ReturnClientMenuController.getEmergencyContactData',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/ReturnClientMenuController.saveEmergencyContact',
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

describe('c-return-client-emergency-contact', () => {
    let element;

    const MOCK_WITH_CONTACT = {
        emergencyContact: {
            Id: '003xx000030',
            FirstName: 'Alice',
            LastName: 'Brown',
            MobilePhone: '612-555-9999',
            Email: 'alice@test.com'
        },
        isVolunteer: false,
        householdContacts: [
            { Id: '003xx000040', FirstName: 'Tom', LastName: 'Green' }
        ]
    };

    const MOCK_WITHOUT_CONTACT = {
        emergencyContact: null,
        isVolunteer: false,
        householdContacts: [],
    };

    beforeEach(() => {
        element = createElement('c-return-client-emergency-contact', {
            is: ReturnClientEmergencyContact
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

    it('renders overview with emergency contact info when contact exists', async () => {
        getEmergencyContactData.mockResolvedValue(MOCK_WITH_CONTACT);
        document.body.appendChild(element);
        await flushPromises();

        const heading = element.shadowRoot.querySelector('h2');
        expect(heading.textContent).toBe('Emergency Contact');

        const paragraphs = element.shadowRoot.querySelectorAll('p.slds-text-body_regular');
        const textContents = [...paragraphs].map(p => p.textContent);
        expect(textContents).toContain('Alice Brown');
        expect(textContents).toContain('612-555-9999');
        expect(textContents).toContain('alice@test.com');
    });

    it('shows "No emergency contact" message when none assigned', async () => {
        getEmergencyContactData.mockResolvedValue(MOCK_WITHOUT_CONTACT);
        document.body.appendChild(element);
        await flushPromises();

        const weakTexts = element.shadowRoot.querySelectorAll('p.slds-text-color_weak');
        const messages = [...weakTexts].map(p => p.textContent);
        expect(messages).toContain('No emergency contact assigned.');
    });

    it('shows Add Emergency Contact button when none assigned', async () => {
        getEmergencyContactData.mockResolvedValue(MOCK_WITHOUT_CONTACT);
        document.body.appendChild(element);
        await flushPromises();

        const addBtn = findButton(element, 'Add Emergency Contact');
        expect(addBtn).not.toBeUndefined();
        expect(addBtn.variant).toBe('brand');
    });

    it('shows Edit and Remove buttons when contact exists', async () => {
        getEmergencyContactData.mockResolvedValue(MOCK_WITH_CONTACT);
        document.body.appendChild(element);
        await flushPromises();

        const editBtn = findButton(element, 'Edit');
        const removeBtn = findButton(element, 'Remove Contact');
        expect(editBtn).not.toBeUndefined();
        expect(removeBtn).not.toBeUndefined();
        expect(removeBtn.variant).toBe('destructive-text');
    });

    it('navigates to edit view and pre-populates fields on Edit click', async () => {
        getEmergencyContactData.mockResolvedValue(MOCK_WITH_CONTACT);
        document.body.appendChild(element);
        await flushPromises();

        const editBtn = findButton(element, 'Edit');
        editBtn.click();
        await flushPromises();

        const editHeading = element.shadowRoot.querySelector('h3');
        expect(editHeading.textContent).toBe('Edit Emergency Contact');

        const inputs = element.shadowRoot.querySelectorAll('lightning-input');
        const firstNameInput = [...inputs].find(i => i.label === 'First Name');
        expect(firstNameInput.value).toBe('Alice');

        const lastNameInput = [...inputs].find(i => i.label === 'Last Name');
        expect(lastNameInput.value).toBe('Brown');
    });

    it('navigates to add-new view when Add is clicked and no household contacts', async () => {
        getEmergencyContactData.mockResolvedValue(MOCK_WITHOUT_CONTACT);
        document.body.appendChild(element);
        await flushPromises();

        const addBtn = findButton(element, 'Add Emergency Contact');
        addBtn.click();
        await flushPromises();

        const addHeading = element.shadowRoot.querySelector('h3');
        expect(addHeading.textContent).toBe('New Emergency Contact');

        // Should have 4 form inputs (First Name, Last Name, Phone, Email)
        const inputs = element.shadowRoot.querySelectorAll('lightning-input');
        expect(inputs.length).toBe(4);
    });

    it('navigates to select view when Add is clicked and household contacts exist', async () => {
        getEmergencyContactData.mockResolvedValue({
            ...MOCK_WITHOUT_CONTACT,
            householdContacts: MOCK_WITH_CONTACT.householdContacts
        });
        document.body.appendChild(element);
        await flushPromises();

        const addBtn = findButton(element, 'Add Emergency Contact');
        addBtn.click();
        await flushPromises();

        const selectHeading = element.shadowRoot.querySelector('h3');
        expect(selectHeading.textContent).toBe('Select Emergency Contact');

        const radioGroup = element.shadowRoot.querySelector('lightning-radio-group');
        expect(radioGroup).not.toBeNull();
        // 1 household contact + "New Contact"
        expect(radioGroup.options.length).toBe(2);
    });

    it('dispatches formcomplete on Done click', async () => {
        getEmergencyContactData.mockResolvedValue(MOCK_WITH_CONTACT);
        document.body.appendChild(element);
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('formcomplete', handler);

        const doneBtn = findButton(element, 'Done');
        doneBtn.click();

        expect(handler).toHaveBeenCalled();
        expect(handler.mock.calls[0][0].detail.stepKey).toBe('emergencyContact');
    });

    it('formcomplete event bubbles and is composed', async () => {
        getEmergencyContactData.mockResolvedValue(MOCK_WITH_CONTACT);
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
        getEmergencyContactData.mockResolvedValue(MOCK_WITH_CONTACT);
        document.body.appendChild(element);
        await flushPromises();

        const handler = jest.fn();
        element.addEventListener('formcancel', handler);

        const cancelBtn = findButton(element, 'Cancel');
        cancelBtn.click();

        expect(handler).toHaveBeenCalled();
    });

    it('returns to overview when Back is clicked from edit view', async () => {
        getEmergencyContactData.mockResolvedValue(MOCK_WITH_CONTACT);
        document.body.appendChild(element);
        await flushPromises();

        // Go to edit view
        const editBtn = findButton(element, 'Edit');
        editBtn.click();
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
