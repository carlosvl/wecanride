import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import adminUpdateWaiverFields from '@salesforce/apex/ClientWaiverDashboardController.adminUpdateWaiverFields';

/**
 * Accordion-based detail panel showing waiver data organized by section:
 * Signatures, Payment Info, Medical Info, Diagnoses.
 * Supports inline editing via pencil icon → edit → save/cancel.
 */
export default class WaiverDetailPanel extends LightningElement {
    @api waiverId;
    @api waiver;        // Full VolunteerWaiver__c record
    @api signatures;    // List<SignatureInfo> from Apex

    @track editingField = null;  // Field API name currently being edited
    @track editValue = '';       // Temporary edited value
    @track isSaving = false;

    // ── Computed: Signatures Table ──────────────────────

    get hasSignatures() {
        return this.signatures && this.signatures.length > 0;
    }

    get signatureRows() {
        if (!this.signatures) return [];
        return this.signatures.map((sig, idx) => ({
            ...sig,
            key: `sig-${idx}`,
            formattedDate: sig.signedDate || '—',
            displayName: sig.signedName || '—'
        }));
    }

    // ── Computed: Payment Section ────────────────────────

    get hasPaymentData() {
        if (!this.waiver) return false;
        return this.waiver.Payer_Info__c === 'Completed';
    }

    get paymentFields() {
        if (!this.waiver) return [];
        return [
            { key: 'payer', label: 'Payer Name', apiName: 'Payer__c', value: this.waiver.Payer__c, editable: true },
            { key: 'payerAddr', label: 'Payer Address', apiName: 'Payer_Address__c', value: this.waiver.Payer_Address__c, editable: true },
            { key: 'payerPhone', label: 'Payer Phone', apiName: 'Payer_Phone__c', value: this.waiver.Payer_Phone__c, editable: true },
            { key: 'payerEmail', label: 'Payer Email', apiName: 'Payer_email__c', value: this.waiver.Payer_email__c, editable: true },
            { key: 'payerSig', label: 'Payment Signature', apiName: 'Payment_Signature_Name__c', value: this.waiver.Payment_Signature_Name__c, editable: false },
            { key: 'tp_name', label: '3rd Party Name', apiName: 'Third_Party_Payer_Waiver_Name__c', value: this.waiver.Third_Party_Payer_Waiver_Name__c, editable: true },
            { key: 'tp_addr', label: '3rd Party Address', apiName: 'Third_Party_Address__c', value: this.waiver.Third_Party_Address__c, editable: true },
            { key: 'tp_contact', label: '3rd Party Contact', apiName: 'Third_Party_Contact__c', value: this.waiver.Third_Party_Contact__c, editable: true },
            { key: 'tp_email', label: '3rd Party Email', apiName: 'Third_Party_email__c', value: this.waiver.Third_Party_email__c, editable: true }
        ].map(f => ({
            ...f,
            displayValue: f.value || '—',
            isEditing: this.editingField === f.apiName,
            showEdit: f.editable && this.editingField !== f.apiName
        }));
    }

    // ── Computed: Medical Section ────────────────────────

    get hasMedicalData() {
        if (!this.waiver) return false;
        return this.waiver.Auth_for_Emerg_Med_Treatment__c === 'Completed' ||
               this.waiver.Down_Syndrome__c === 'Completed' ||
               this.waiver.Seizure_Form__c === 'Completed' ||
               this.waiver.ScoliosisForm__c === 'Completed';
    }

    get medicalFields() {
        if (!this.waiver) return [];
        return [
            { key: 'insurance', label: 'Health Insurance', apiName: 'Health_Insurance_Co__c', value: this.waiver.Health_Insurance_Co__c, editable: true },
            { key: 'policy', label: 'Policy Number', apiName: 'Insurance_Policy__c', value: this.waiver.Insurance_Policy__c, editable: true },
            { key: 'meds', label: 'Current Medications', apiName: 'Current_medications__c', value: this.waiver.Current_medications__c, editable: true },
            { key: 'allergies', label: 'Allergies', apiName: 'Allergies_to_medications__c', value: this.waiver.Allergies_to_medications__c, editable: true },
            { key: 'seizure', label: 'Seizure Information', apiName: 'Seizure_Information__c', value: this.waiver.Seizure_Information__c, editable: true }
        ].map(f => ({
            ...f,
            displayValue: f.value || '—',
            isEditing: this.editingField === f.apiName,
            showEdit: f.editable && this.editingField !== f.apiName
        }));
    }

    // ── Computed: Diagnoses Section ──────────────────────

    get hasDiagnosesData() {
        if (!this.waiver) return false;
        return this.waiver.Diagnoses_Info__c === 'Completed' ||
               this.waiver.Diagnoses__c != null;
    }

    get diagnosesValue() {
        return this.waiver ? (this.waiver.Diagnoses__c || '—') : '—';
    }

    // ── Computed: Application Status ────────────────────

    get applicationStatus() {
        if (!this.waiver) return '—';
        return this.waiver.Application_Submitted__c === 'Yes' ? 'Submitted' : 'Not Submitted';
    }

    get applicationBadgeClass() {
        if (!this.waiver) return 'slds-badge';
        return this.waiver.Application_Submitted__c === 'Yes'
            ? 'slds-badge slds-badge_success'
            : 'slds-badge slds-badge_lightest';
    }

    // ── Inline Edit Handlers ────────────────────────────

    handleEditClick(event) {
        const fieldName = event.currentTarget.dataset.field;
        this.editingField = fieldName;
        // Get the current value for pre-populating the input
        this.editValue = this.getFieldValue(fieldName) || '';
    }

    handleEditChange(event) {
        this.editValue = event.target.value;
    }

    handleEditCancel() {
        this.editingField = null;
        this.editValue = '';
    }

    async handleEditSave() {
        if (!this.editingField || !this.waiverId) return;

        this.isSaving = true;
        try {
            const fieldValues = {};
            fieldValues[this.editingField] = this.editValue;
            const result = await adminUpdateWaiverFields({
                waiverId: this.waiverId,
                fieldValues: fieldValues
            });

            if (result.success) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Saved',
                    message: 'Field updated successfully.',
                    variant: 'success'
                }));
                this.editingField = null;
                this.editValue = '';
                // Tell parent to refresh data
                this.dispatchEvent(new CustomEvent('fieldupdate'));
            } else {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error',
                    message: result.errorMessage,
                    variant: 'error'
                }));
            }
        } catch (err) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: err.body ? err.body.message : err.message,
                variant: 'error'
            }));
        } finally {
            this.isSaving = false;
        }
    }

    // ── Helpers ──────────────────────────────────────────

    getFieldValue(fieldName) {
        return this.waiver ? this.waiver[fieldName] : null;
    }
}
