import { LightningElement, api, wire } from 'lwc';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';
import WAIVER_OBJECT from '@salesforce/schema/VolunteerWaiver__c';
import DIAGNOSES_FIELD from '@salesforce/schema/VolunteerWaiver__c.Diagnoses__c';
import saveDiagnoses from '@salesforce/apex/ReturnClientMenuController.saveDiagnoses';

export default class ReturnClientDiagnoses extends LightningElement {
    @api waiverId;
    @api clientId;
    @api contactId;
    @api currentYear;
    @api waiver;

    selectedDiagnoses = [];
    additionalNotes = '';
    isSaving = false;
    error;
    diagnosisOptions = [];
    _objectInfoRecordTypeId;

    // Get object info to retrieve the default record type ID
    @wire(getObjectInfo, { objectApiName: WAIVER_OBJECT })
    wiredObjectInfo({ data }) {
        if (data) {
            this._objectInfoRecordTypeId = data.defaultRecordTypeId;
        }
    }

    // Get picklist values for Diagnoses__c
    @wire(getPicklistValues, { recordTypeId: '$_objectInfoRecordTypeId', fieldApiName: DIAGNOSES_FIELD })
    wiredPicklistValues({ data, error }) {
        if (data) {
            this.diagnosisOptions = data.values.map(item => ({
                label: item.label,
                value: item.value
            }));
        } else if (error) {
            console.error('Error loading diagnosis options:', error);
        }
    }

    get isCompleted() {
        return this.waiver?.Diagnoses_Info__c === 'Completed';
    }

    get canSave() {
        return this.selectedDiagnoses.length > 0;
    }

    get saveButtonLabel() {
        if (this.selectedDiagnoses.length === 0) {
            return 'Select at least one diagnosis';
        }
        return 'Save & Continue';
    }

    get hasOptions() {
        return this.diagnosisOptions.length > 0;
    }

    connectedCallback() {
        // Pre-populate from existing waiver data if available
        if (this.waiver?.Diagnoses__c) {
            this.selectedDiagnoses = this.waiver.Diagnoses__c.split(';');
        }
    }

    handleDiagnosesChange(event) {
        this.selectedDiagnoses = event.detail.value;
    }

    handleNotesChange(event) {
        this.additionalNotes = event.detail.value;
    }

    async handleSave() {
        if (!this.canSave) return;

        this.isSaving = true;
        this.error = undefined;

        try {
            const diagnosesStr = this.selectedDiagnoses.join(';');

            const result = await saveDiagnoses({
                waiverId: this.waiverId,
                clientId: this.clientId,
                diagnoses: diagnosesStr,
                additionalNotes: this.additionalNotes
            });

            if (result.success) {
                this.dispatchEvent(new CustomEvent('formcomplete', {
                    detail: { stepKey: 'diagnoses', formsCompleted: result.formsCompleted },
                    bubbles: true,
                    composed: true
                }));
            } else {
                this.error = result.errorMessage;
            }
        } catch (err) {
            this.error = err.body ? err.body.message : err.message;
        } finally {
            this.isSaving = false;
        }
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('formcancel'));
    }
}
