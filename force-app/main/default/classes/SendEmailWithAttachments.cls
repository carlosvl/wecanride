/**
 * Invocable Apex action for sending emails with file attachments from Flows.
 * Used by the "Screening Complete" flow to send welcome emails with 6 PDF documents.
 *
 * Queries ContentVersion by document titles (not hardcoded IDs) for org portability.
 * Supports CC addresses and OrgWideEmailAddress sender.
 */
public with sharing class SendEmailWithAttachments {

    public class EmailRequest {
        @InvocableVariable(label='To Email Address' required=true)
        public String toAddress;

        @InvocableVariable(label='CC Email Address')
        public String ccAddress;

        @InvocableVariable(label='Email Subject' required=true)
        public String subject;

        @InvocableVariable(label='HTML Body' required=true)
        public String htmlBody;

        @InvocableVariable(label='Org-Wide Email Address (address string)')
        public String orgWideEmailAddress;

        @InvocableVariable(label='Document Titles (comma-separated)')
        public String documentTitles;
    }

    public class EmailResult {
        @InvocableVariable(label='Success')
        public Boolean success;

        @InvocableVariable(label='Error Message')
        public String errorMessage;
    }

    @InvocableMethod(label='Send Email With Attachments' description='Sends an email with PDF attachments from Salesforce Files')
    public static List<EmailResult> sendEmails(List<EmailRequest> requests) {
        List<EmailResult> results = new List<EmailResult>();

        for (EmailRequest req : requests) {
            EmailResult result = new EmailResult();
            try {
                Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();

                // Set recipients
                mail.setToAddresses(new List<String>{ req.toAddress });

                // Set CC if provided
                if (String.isNotBlank(req.ccAddress)) {
                    mail.setCcAddresses(new List<String>{ req.ccAddress });
                }

                // Set sender via OrgWideEmailAddress
                if (String.isNotBlank(req.orgWideEmailAddress)) {
                    List<OrgWideEmailAddress> owea = [
                        SELECT Id FROM OrgWideEmailAddress
                        WHERE Address = :req.orgWideEmailAddress
                        LIMIT 1
                    ];
                    if (!owea.isEmpty()) {
                        mail.setOrgWideEmailAddressId(owea[0].Id);
                    }
                }

                // Set content
                mail.setSubject(req.subject);
                mail.setHtmlBody(req.htmlBody);

                // Attach documents by title
                if (String.isNotBlank(req.documentTitles)) {
                    List<String> titles = req.documentTitles.split(',');
                    List<String> trimmedTitles = new List<String>();
                    for (String t : titles) {
                        trimmedTitles.add(t.trim());
                    }

                    List<ContentVersion> versions = [
                        SELECT Title, VersionData, FileExtension, FileType
                        FROM ContentVersion
                        WHERE Title IN :trimmedTitles
                        AND IsLatest = true
                        ORDER BY Title
                    ];

                    List<Messaging.EmailFileAttachment> attachments = new List<Messaging.EmailFileAttachment>();
                    for (ContentVersion cv : versions) {
                        Messaging.EmailFileAttachment efa = new Messaging.EmailFileAttachment();
                        String ext = String.isNotBlank(cv.FileExtension) ? '.' + cv.FileExtension : '';
                        efa.setFileName(cv.Title + ext);
                        efa.setBody(cv.VersionData);
                        efa.setContentType(getContentType(cv.FileType, cv.FileExtension));
                        attachments.add(efa);
                    }

                    if (!attachments.isEmpty()) {
                        mail.setFileAttachments(attachments);
                    }
                }

                Messaging.sendEmail(new List<Messaging.SingleEmailMessage>{ mail });
                result.success = true;

            } catch (Exception e) {
                result.success = false;
                result.errorMessage = e.getMessage();
            }
            results.add(result);
        }

        return results;
    }

    private static String getContentType(String fileType, String fileExtension) {
        if (fileType == 'PDF' || fileExtension == 'pdf') return 'application/pdf';
        if (fileType == 'WORD_X' || fileExtension == 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (fileType == 'WORD' || fileExtension == 'doc') return 'application/msword';
        if (fileType == 'EXCEL_X' || fileExtension == 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        if (fileType == 'PNG' || fileExtension == 'png') return 'image/png';
        if (fileType == 'JPG' || fileExtension == 'jpg') return 'image/jpeg';
        return 'application/octet-stream';
    }
}