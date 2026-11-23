import { LightningElement, api } from 'lwc';
import saveScoliosis from '@salesforce/apex/ReturnClientMenuController.saveScoliosis';
import linkUploadedFiles from '@salesforce/apex/ReturnClientMenuController.linkUploadedFiles';

export default class ReturnClientScoliosis extends LightningElement {
    @api waiverId;
    @api clientId;
    @api contactId;
    @api currentYear;
    @api waiver;

    uploadedDocumentIds = [];
    isSaving = false;
    fileUploaded = false;

    get isCompleted() {
        return this.waiver?.ScoliosisForm__c === 'Completed';
    }

    get acceptedFormats() {
        return ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];
    }

    get uploadLabel() {
        return `Scoliosis Form - ${this.currentYear}`;
    }

    handleUploadFinished(event) {
        const uploadedFiles = event.detail.files;
        this.uploadedDocumentIds = uploadedFiles.map(f => f.documentId);
        this.fileUploaded = true;
    }

    async handleSave() {
        if (!this.fileUploaded && !this.isCompleted) return;
        this.isSaving = true;
        try {
            if (this.uploadedDocumentIds.length > 0) {
                await linkUploadedFiles({
                    contentDocumentIds: this.uploadedDocumentIds,
                    waiverId: this.waiverId,
                    clientId: this.clientId
                });
            }
            const result = await saveScoliosis({ waiverId: this.waiverId });
            if (result.success) {
                this.dispatchEvent(new CustomEvent('formcomplete', {
                    detail: { stepKey: 'scoliosis', formsCompleted: result.formsCompleted },
                    bubbles: true,
                    composed: true
                }));
            }
        } catch (error) {
            console.error('Save error:', error);
        } finally {
            this.isSaving = false;
        }
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('formcancel'));
    }
}