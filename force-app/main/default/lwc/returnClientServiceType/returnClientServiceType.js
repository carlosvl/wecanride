import { LightningElement, api } from 'lwc';
import saveServiceType from '@salesforce/apex/ReturnClientMenuController.saveServiceType';

const PROGRAM_OPTIONS = [
    { label: 'Riding', value: 'Riding' },
    { label: 'Mental Health', value: 'Mental Health' }
];

const SERVICE_TYPE_OPTIONS = [
    { label: 'Individual Therapy (18+)', value: 'Individual Therapy (18+)' },
    { label: 'Couples Therapy', value: 'Couples Therapy' },
    { label: 'Group Therapy', value: 'Group Therapy' },
    { label: 'Family Therapy (for families, including children)', value: 'Family Therapy' }
];

export default class ReturnClientServiceType extends LightningElement {
    @api waiverId;
    @api clientId;
    @api contactId;
    @api currentYear;

    selectedProgram = '';
    selectedServices = [];
    isSaving = false;
    error;

    get programOptions() {
        return PROGRAM_OPTIONS;
    }

    get serviceTypeOptions() {
        return SERVICE_TYPE_OPTIONS;
    }

    get isMentalHealth() {
        return this.selectedProgram === 'Mental Health';
    }

    get isRiding() {
        return this.selectedProgram === 'Riding';
    }

    get hasProgramSelected() {
        return this.selectedProgram !== '';
    }

    get canSave() {
        if (!this.selectedProgram) return false;
        if (this.isMentalHealth && this.selectedServices.length === 0) return false;
        return true;
    }

    get saveButtonLabel() {
        if (!this.selectedProgram) return 'Select a program to continue';
        if (this.isMentalHealth && this.selectedServices.length === 0) return 'Select at least one service';
        return 'Continue';
    }

    handleProgramChange(event) {
        this.selectedProgram = event.detail.value;
        // Reset services when switching programs
        if (!this.isMentalHealth) {
            this.selectedServices = [];
        }
    }

    handleServiceChange(event) {
        this.selectedServices = event.detail.value;
    }

    async handleSave() {
        if (!this.canSave) return;

        this.isSaving = true;
        this.error = undefined;

        try {
            const serviceTypesStr = this.isMentalHealth
                ? this.selectedServices.join(';')
                : '';

            const result = await saveServiceType({
                waiverId: this.waiverId,
                clientId: this.clientId,
                programType: this.selectedProgram,
                serviceTypes: serviceTypesStr
            });

            if (result.success) {
                this.dispatchEvent(new CustomEvent('servicetypeselected', {
                    detail: {
                        programType: this.selectedProgram,
                        serviceTypes: serviceTypesStr
                    },
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
