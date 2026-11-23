import { LightningElement, api } from 'lwc';

/**
 * Displays clinical safety flags and screening status.
 * Shows a warning banner when the client has been flagged.
 * Data comes from the Riders__c record + waiver screening fields.
 */
export default class WaiverClinicalFlags extends LightningElement {
    @api clinicalData; // ClinicalData wrapper from Apex

    get hasClinicalData() {
        return this.clinicalData != null;
    }

    get isFlagged() {
        return this.clinicalData && this.clinicalData.isFlagged;
    }

    get isIntakePaused() {
        return this.clinicalData && this.clinicalData.intakePaused;
    }

    get screeningStatus() {
        if (!this.clinicalData || !this.clinicalData.screeningStatus) return 'Not Completed';
        return this.clinicalData.screeningStatus;
    }

    get screeningBadgeClass() {
        const status = this.screeningStatus;
        if (status === 'Flagged') return 'slds-badge slds-badge_error';
        if (status === 'Completed') return 'slds-badge slds-badge_success';
        return 'slds-badge slds-badge_lightest';
    }

    get safetyFlags() {
        if (!this.clinicalData || !this.clinicalData.safetyFlags) return [];
        return this.clinicalData.safetyFlags.split(';').map((flag, idx) => ({
            key: `flag-${idx}`,
            label: flag.trim()
        }));
    }

    get hasSafetyFlags() {
        return this.safetyFlags.length > 0;
    }

    get safetyDetail() {
        return this.clinicalData ? (this.clinicalData.safetyDetail || '') : '';
    }

    get hasSafetyDetail() {
        return this.safetyDetail.length > 0;
    }

    get serviceType() {
        return this.clinicalData ? (this.clinicalData.serviceType || '—') : '—';
    }

    get diagnosesInfo() {
        return this.clinicalData ? (this.clinicalData.diagnosesInfo || 'Not Completed') : 'Not Completed';
    }

    get showAlertBanner() {
        return this.isFlagged || this.isIntakePaused;
    }

    get alertMessage() {
        if (this.isFlagged && this.isIntakePaused) {
            return 'Clinical safety flags raised — intake is paused.';
        }
        if (this.isFlagged) {
            return 'Clinical safety flags have been raised for this client.';
        }
        if (this.isIntakePaused) {
            return 'Client intake is currently paused.';
        }
        return '';
    }
}
