import { LightningElement, api, track } from 'lwc';
import saveClinicalScreening from '@salesforce/apex/ReturnClientMenuController.saveClinicalScreening';

const CLINICAL_FLAG_OPTIONS = [
    {
        label: 'Uncontrolled Seizures or Serious Uncontrolled Physical Issues (such as cardiac issues, untreated asthma, etc)',
        value: 'Uncontrolled Seizures or Physical Issues'
    },
    {
        label: 'History of Dangerous or Aggressive Behaviors',
        value: 'Dangerous or Aggressive Behaviors'
    },
    {
        label: 'History of Psychosis, Paranoia, Audio or Visual Hallucinations, Delusions, or Severe PTSD',
        value: 'Psychosis Paranoia Hallucinations or PTSD'
    },
    {
        label: 'Perpetrator of Sexual or Physical Violence',
        value: 'Sexual or Physical Violence'
    },
    {
        label: 'Actively using Drugs or Abusing Alcohol',
        value: 'Drug or Alcohol Abuse'
    },
    {
        label: 'Actively Suicidal/Homicidal',
        value: 'Actively Suicidal or Homicidal'
    },
    {
        label: 'Actively Dissociating',
        value: 'Actively Dissociating'
    },
    {
        label: 'History of Fire setting, Animal abuse, Hitting, Kicking, Yelling, Swearing',
        value: 'Fire Setting Animal Abuse Hitting Kicking'
    }
];

const PAUSED_MESSAGE = 'Thank you for providing this information. Based on your response(s), we are pausing the remainder of the intake paperwork while we review your information to ensure we can safely and appropriately meet your needs. A member of our team will contact you to discuss next steps.';

export default class ReturnClientClinicalScreening extends LightningElement {
    @api waiverId;
    @api clientId;
    @api contactId;
    @api currentYear;

    @track selectedFlags = [];
    detailText = '';
    isSaving = false;
    error;
    isPaused = false;

    get flagOptions() {
        return CLINICAL_FLAG_OPTIONS;
    }

    get hasFlags() {
        return this.selectedFlags.length > 0;
    }

    get pausedMessage() {
        return PAUSED_MESSAGE;
    }

    get canSave() {
        // If flags are checked, detail text is required
        if (this.hasFlags && !this.detailText.trim()) return false;
        return true;
    }

    get cannotSave() {
        return !this.canSave;
    }

    get saveButtonLabel() {
        if (this.hasFlags && !this.detailText.trim()) {
            return 'Please provide details above';
        }
        return this.hasFlags ? 'Submit' : 'Continue — No concerns';
    }

    handleFlagChange(event) {
        this.selectedFlags = event.detail.value;
    }

    handleDetailChange(event) {
        this.detailText = event.detail.value;
    }

    async handleSave() {
        if (!this.canSave) return;

        this.isSaving = true;
        this.error = undefined;

        try {
            const flagsStr = this.selectedFlags.join(';');
            const isFlagged = this.hasFlags;

            const result = await saveClinicalScreening({
                waiverId: this.waiverId,
                clientId: this.clientId,
                flags: flagsStr,
                detail: this.detailText,
                isFlagged: isFlagged
            });

            if (result.success) {
                if (isFlagged) {
                    // Show the paused message — do NOT navigate away
                    this.isPaused = true;
                } else {
                    // No flags — screening passed, go to form menu
                    this.dispatchEvent(new CustomEvent('screeningcomplete', {
                        detail: { status: 'Completed' },
                        bubbles: true,
                        composed: true
                    }));
                }
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
