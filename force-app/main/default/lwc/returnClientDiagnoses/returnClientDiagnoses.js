import { LightningElement, api, track } from 'lwc';
import getDiagnosesForClient from '@salesforce/apex/ReturnClientMenuController.getDiagnosesForClient';
import getConditionOptions from '@salesforce/apex/ReturnClientMenuController.getConditionOptions';
import addDiagnosis from '@salesforce/apex/ReturnClientMenuController.addDiagnosis';
import deleteDiagnosis from '@salesforce/apex/ReturnClientMenuController.deleteDiagnosis';
import completeDiagnosesStep from '@salesforce/apex/ReturnClientMenuController.completeDiagnosesStep';

export default class ReturnClientDiagnoses extends LightningElement {
    @api waiverId;
    @api clientId;
    @api contactId;
    @api currentYear;
    @api waiver;

    @track diagnoses = [];
    @track conditionOptions = [];
    @track filteredOptions = [];

    selectedConditionId = '';
    selectedConditionLabel = '';
    diagDate = null;
    searchTerm = '';

    isLoading = true;
    isSaving = false;
    isAdding = false;
    error;
    deleteConfirmId = null;
    deleteConfirmName = '';
    showDropdown = false;

    get isCompleted() {
        return this.waiver?.Diagnoses_Info__c === 'Completed';
    }

    get hasDiagnoses() {
        return this.diagnoses.length > 0;
    }

    get diagnosisCount() {
        return this.diagnoses.length;
    }

    get canComplete() {
        return this.diagnoses.length > 0 && !this.isSaving;
    }

    get cannotComplete() {
        return !this.canComplete;
    }

    get canAdd() {
        return this.selectedConditionId && !this.isAdding;
    }

    get cannotAdd() {
        return !this.canAdd;
    }

    get showDeleteConfirm() {
        return this.deleteConfirmId != null;
    }

    get showNaOption() {
        return this.diagnoses.length === 0 && !this.isLoading;
    }

    get completeButtonLabel() {
        if (this.diagnoses.length === 0) {
            return 'Add at least one diagnosis';
        }
        return 'Save & Continue';
    }

    get columns() {
        return [
            { label: 'Condition', fieldName: 'conditionName', type: 'text', wrapText: true },
            { label: 'Date', fieldName: 'diagDate', type: 'date' },
            {
                type: 'action',
                typeAttributes: {
                    rowActions: [{ label: 'Delete', name: 'delete', iconName: 'utility:delete' }]
                }
            }
        ];
    }

    async connectedCallback() {
        await this.loadData();
    }

    async loadData() {
        this.isLoading = true;
        this.error = undefined;
        try {
            const [diagnoses, options] = await Promise.all([
                getDiagnosesForClient({ clientId: this.clientId }),
                getConditionOptions()
            ]);
            this.diagnoses = diagnoses || [];
            this.conditionOptions = options || [];
            this.filteredOptions = [...this.conditionOptions];
        } catch (err) {
            this.error = err.body ? err.body.message : err.message;
        } finally {
            this.isLoading = false;
        }
    }

    // ─── Search / Select Condition ──────────────────────────────

    handleSearchChange(event) {
        this.searchTerm = event.target.value;
        this.showDropdown = true;
        const term = this.searchTerm.toLowerCase();
        if (term.length === 0) {
            this.filteredOptions = [...this.conditionOptions];
        } else {
            this.filteredOptions = this.conditionOptions.filter(opt =>
                opt.label.toLowerCase().includes(term)
            );
        }
        // Clear selection if user is typing
        this.selectedConditionId = '';
        this.selectedConditionLabel = '';
    }

    handleSearchFocus() {
        this.showDropdown = true;
        if (!this.searchTerm) {
            this.filteredOptions = [...this.conditionOptions];
        }
    }

    handleSearchBlur() {
        // Delay to allow click on dropdown item
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this.showDropdown = false;
        }, 250);
    }

    handleSelectCondition(event) {
        const condId = event.currentTarget.dataset.id;
        const condLabel = event.currentTarget.dataset.label;
        this.selectedConditionId = condId;
        this.selectedConditionLabel = condLabel;
        this.searchTerm = condLabel;
        this.showDropdown = false;
    }

    handleDateChange(event) {
        this.diagDate = event.target.value;
    }

    // ─── Add Diagnosis ──────────────────────────────────────────

    async handleAdd() {
        if (!this.canAdd) return;

        this.isAdding = true;
        this.error = undefined;

        try {
            const result = await addDiagnosis({
                clientId: this.clientId,
                conditionId: this.selectedConditionId,
                diagDate: this.diagDate || null
            });

            if (result.success) {
                // Reset form
                this.selectedConditionId = '';
                this.selectedConditionLabel = '';
                this.searchTerm = '';
                this.diagDate = null;
                // Refresh list
                this.diagnoses = await getDiagnosesForClient({ clientId: this.clientId });
            } else {
                this.error = result.errorMessage;
            }
        } catch (err) {
            this.error = err.body ? err.body.message : err.message;
        } finally {
            this.isAdding = false;
        }
    }

    // ─── Delete Diagnosis ───────────────────────────────────────

    handleRowAction(event) {
        const action = event.detail.action;
        const row = event.detail.row;
        if (action.name === 'delete') {
            this.deleteConfirmId = row.id;
            this.deleteConfirmName = row.conditionName;
        }
    }

    handleCancelDelete() {
        this.deleteConfirmId = null;
        this.deleteConfirmName = '';
    }

    async handleConfirmDelete() {
        if (!this.deleteConfirmId) return;

        this.isSaving = true;
        this.error = undefined;

        try {
            const result = await deleteDiagnosis({ diagnosisId: this.deleteConfirmId });
            if (result.success) {
                this.deleteConfirmId = null;
                this.deleteConfirmName = '';
                this.diagnoses = await getDiagnosesForClient({ clientId: this.clientId });
            } else {
                this.error = result.errorMessage;
            }
        } catch (err) {
            this.error = err.body ? err.body.message : err.message;
        } finally {
            this.isSaving = false;
        }
    }

    // ─── Complete Step ──────────────────────────────────────────

    async handleComplete() {
        if (!this.canComplete) return;

        this.isSaving = true;
        this.error = undefined;

        try {
            const result = await completeDiagnosesStep({
                waiverId: this.waiverId,
                clientId: this.clientId,
                isNa: false
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

    async handleMarkNa() {
        this.isSaving = true;
        this.error = undefined;

        try {
            const result = await completeDiagnosesStep({
                waiverId: this.waiverId,
                clientId: this.clientId,
                isNa: true
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
