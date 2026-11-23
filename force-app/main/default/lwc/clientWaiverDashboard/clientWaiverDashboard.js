import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getWaiverSummaries from '@salesforce/apex/ClientWaiverDashboardController.getWaiverSummaries';
import getWaiverDetail from '@salesforce/apex/ClientWaiverDashboardController.getWaiverDetail';

/**
 * Parent orchestrator for the Admin Client Waiver Dashboard.
 * Sits on the Riders__c record page. Loads all waiver years,
 * defaults to the most recent, and passes data to child components.
 */
export default class ClientWaiverDashboard extends LightningElement {
    // ── Public API ──────────────────────────────────────
    @api recordId; // Riders__c record Id from Lightning page

    // ── Tracked State ───────────────────────────────────
    @track selectedYear = '';
    @track selectedWaiverId = '';
    @track waiverDetail = null;
    @track isLoadingDetail = false;
    @track error;

    // ── Wired Data ──────────────────────────────────────
    _wiredSummaries;
    summaries = [];

    @wire(getWaiverSummaries, { clientId: '$recordId' })
    wiredSummaries(result) {
        this._wiredSummaries = result;
        const { data, error } = result;
        if (data) {
            this.summaries = data;
            this.error = undefined;
            // Auto-select the most recent year if none selected
            if (data.length > 0 && !this.selectedYear) {
                this.selectedYear = data[0].year;
                this.selectedWaiverId = data[0].waiverId;
                this.loadWaiverDetail();
            }
        } else if (error) {
            this.error = this.reduceErrors(error);
            this.summaries = [];
        }
    }

    // ── Computed Properties ──────────────────────────────

    get hasSummaries() {
        return this.summaries && this.summaries.length > 0;
    }

    get availableYears() {
        return this.summaries.map(s => ({
            year: s.year,
            waiverId: s.waiverId,
            formsCompleted: s.formsCompleted,
            totalForms: s.totalForms,
            applicationSubmitted: s.applicationSubmitted,
            percentComplete: s.totalForms > 0
                ? Math.round((s.formsCompleted / s.totalForms) * 100)
                : 0
        }));
    }

    get selectedSummary() {
        if (!this.summaries || !this.selectedWaiverId) return null;
        return this.summaries.find(s => s.waiverId === this.selectedWaiverId) || null;
    }

    get selectedWaiverStatus() {
        return this.selectedSummary ? this.selectedSummary.completionStatus : {};
    }

    get selectedProgramType() {
        return this.selectedSummary ? this.selectedSummary.programType : 'Riding';
    }

    get formsCompletedCount() {
        return this.selectedSummary ? this.selectedSummary.formsCompleted : 0;
    }

    get totalFormsCount() {
        return this.selectedSummary ? this.selectedSummary.totalForms : 0;
    }

    get clinicalData() {
        return this.waiverDetail ? this.waiverDetail.clinicalData : null;
    }

    get signatures() {
        return this.waiverDetail ? this.waiverDetail.signatures : [];
    }

    get diagnosisRecords() {
        return this.waiverDetail ? this.waiverDetail.diagnoses : [];
    }

    get waiverRecord() {
        return this.waiverDetail ? this.waiverDetail.waiver : null;
    }

    get isApplicationSubmitted() {
        return this.selectedSummary ? this.selectedSummary.applicationSubmitted : false;
    }

    get dashboardTitle() {
        return this.selectedYear
            ? `Registration Dashboard — ${this.selectedYear}`
            : 'Registration Dashboard';
    }

    get showEmptyState() {
        return !this.hasSummaries && !this.error;
    }

    // ── Event Handlers ──────────────────────────────────

    handleYearChange(event) {
        const { year, waiverId } = event.detail;
        this.selectedYear = year;
        this.selectedWaiverId = waiverId;
        this.loadWaiverDetail();
    }

    handleFormReset() {
        this.refreshAll();
    }

    handleFieldUpdate() {
        this.refreshAll();
    }

    handleApplicationReopened() {
        this.refreshAll();
    }

    // ── Data Loading ────────────────────────────────────

    async loadWaiverDetail() {
        if (!this.selectedWaiverId) return;
        this.isLoadingDetail = true;
        try {
            this.waiverDetail = await getWaiverDetail({ waiverId: this.selectedWaiverId });
            this.error = undefined;
        } catch (err) {
            this.error = this.reduceErrors(err);
        } finally {
            this.isLoadingDetail = false;
        }
    }

    async refreshAll() {
        try {
            await refreshApex(this._wiredSummaries);
            if (this.selectedWaiverId) {
                await this.loadWaiverDetail();
            }
        } catch (err) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Refresh Error',
                    message: this.reduceErrors(err),
                    variant: 'error'
                })
            );
        }
    }

    // ── Helpers ──────────────────────────────────────────

    reduceErrors(error) {
        if (typeof error === 'string') return error;
        if (error?.body?.message) return error.body.message;
        if (error?.message) return error.message;
        if (Array.isArray(error?.body)) {
            return error.body.map(e => e.message).join(', ');
        }
        return 'An unknown error occurred.';
    }
}
