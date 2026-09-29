import { LightningElement, api } from 'lwc';

/**
 * Horizontal pill-button selector for switching between waiver years.
 * Each pill shows the year and a completion percentage badge.
 * Fires 'yearchange' event with { year, waiverId }.
 */
export default class WaiverYearSelector extends LightningElement {
    @api years = [];       // Array of { year, waiverId, formsCompleted, totalForms, percentComplete, applicationSubmitted }
    @api selectedYear = '';

    get yearPills() {
        return this.years.map(y => ({
            ...y,
            isSelected: y.year === this.selectedYear,
            pillClass: y.year === this.selectedYear
                ? 'slds-badge slds-badge_inverse slds-m-right_x-small year-pill selected'
                : 'slds-badge slds-m-right_x-small year-pill',
            badgeLabel: `${y.percentComplete}%`,
            badgeVariant: y.applicationSubmitted ? 'success' : (y.percentComplete >= 50 ? 'warning' : 'default'),
            badgeClass: y.applicationSubmitted
                ? 'slds-badge slds-badge_success slds-m-left_xx-small'
                : 'slds-badge slds-m-left_xx-small',
            statusIcon: y.applicationSubmitted ? 'utility:check' : null,
            ariaLabel: `${y.year} — ${y.percentComplete}% complete${y.applicationSubmitted ? ', submitted' : ''}`
        }));
    }

    handleYearClick(event) {
        const year = event.currentTarget.dataset.year;
        const waiverId = event.currentTarget.dataset.waiverid;
        this.dispatchEvent(new CustomEvent('yearchange', {
            detail: { year, waiverId }
        }));
    }
}
