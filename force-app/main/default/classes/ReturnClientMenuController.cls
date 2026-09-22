/**
 * Consolidated Apex controller for the Return Client Menu LWC.
 * Replaces the logic from 11 sub-flows that each handle a single form step
 * in the returning client registration process.
 *
 * Runs without sharing to match the original flow behavior (SystemModeWithoutSharing).
 */
public without sharing class ReturnClientMenuController {

    // ─── Wrapper Classes ───────────────────────────────────────────────

    /**
     * All the data the parent LWC needs on initial load.
     */
    public class ClientMenuData {
        @AuraEnabled public Riders__c client;
        @AuraEnabled public VolunteerWaiver__c waiver;
        @AuraEnabled public Contact contact;
        @AuraEnabled public String currentYear;
        @AuraEnabled public Map<String, String> completionStatus;
        @AuraEnabled public Id waiverRecordTypeId;
    }

    /**
     * Generic result wrapper for save operations.
     */
    public class SaveResult {
        @AuraEnabled public Boolean success;
        @AuraEnabled public String errorMessage;
        @AuraEnabled public Integer formsCompleted;
        @AuraEnabled public String warningMessage;
    }

    /**
     * Data wrapper for the Parent/Guardian form.
     */
    public class GuardianData {
        @AuraEnabled public Contact firstGuardian;
        @AuraEnabled public Contact secondGuardian;
        @AuraEnabled public List<Contact> householdContacts;
        @AuraEnabled public Boolean isGroupHome;
    }

    /**
     * Data wrapper for the Emergency Contact form.
     */
    public class EmergencyContactData {
        @AuraEnabled public Contact emergencyContact;
        @AuraEnabled public Boolean isVolunteer;
        @AuraEnabled public Riders__c clientRecord;
        @AuraEnabled public Volunteer_Info__c volunteerInfo;
        @AuraEnabled public List<Contact> householdContacts;
    }

    /**
     * Data wrapper for the Group Home form.
     */
    public class GroupHomeData {
        @AuraEnabled public Account currentGroupHome;
        @AuraEnabled public Boolean livesInGroupHome;
        @AuraEnabled public List<Account> groupHomeAccounts;
        @AuraEnabled public Group_Home_Request__c pendingRequest;
        @AuraEnabled public Id groupHomeRecordTypeId;
    }

    // ─── Data Loading ──────────────────────────────────────────────────

    /**
     * Resolves the ContactId for the current logged-in community user.
     * In Experience Cloud, the User record has a ContactId field
     * for portal/community users.
     *
     * @param userId  The User Id (from @salesforce/user/Id)
     * @return The Contact Id associated with the user, or null
     */
    @AuraEnabled(cacheable=true)
    public static Id getContactIdForUser(Id userId) {
        List<User> users = [
            SELECT ContactId
            FROM User
            WHERE Id = :userId
            LIMIT 1
        ];
        if (!users.isEmpty() && users[0].ContactId != null) {
            return users[0].ContactId;
        }
        return null;
    }

    /**
     * Loads all data needed by the Return Client Menu LWC.
     * Mirrors the initialization chain in the original flow:
     * GetPolicy → GetCurrentYear → GetContact → GetClient → GetWaiver → etc.
     *
     * @param contactId  The Contact Id of the logged-in community user
     * @return ClientMenuData with client, waiver, contact, year, and completion map
     */
    @AuraEnabled
    public static ClientMenuData getClientData(Id contactId) {
        ClientMenuData data = new ClientMenuData();

        // Get current year from custom metadata
        WaiverYear__mdt yearMdt = [
            SELECT Current_Year__c
            FROM WaiverYear__mdt
            WHERE MasterLabel = 'Client Current Year'
            LIMIT 1
        ];
        data.currentYear = yearMdt.Current_Year__c;

        // Get the Contact record (for pre-population of Main Info + Height/Weight)
        data.contact = [
            SELECT Id, Name, FirstName, LastName, Gender__c, Birthdate,
                   Height__c, Weight__c,
                   MailingStreet, MailingCity, MailingState, MailingPostalCode,
                   Email, npe01__WorkEmail__c, HomePhone, MobilePhone,
                   AccountId, Volunteer__c
            FROM Contact
            WHERE Id = :contactId
            LIMIT 1
        ];

        // Get the Client (Riders__c) record linked to this Contact
        List<Riders__c> clients = [
            SELECT Id, Name, ClientContact__c,
                   CompletedForms__c,
                   Gender__c, Height__c, Weight__c,
                   Father_Name__c, Mother_Name__c, Emergency_Contact__c,
                   Group_Home__c, Lives_in_Group_Home__c,
                   Program_Type__c, Clinical_Safety_Flagged__c,
                   Clinical_Safety_Flags__c, Clinical_Safety_Detail__c,
                   Intake_Paused__c, Service_Type__c
            FROM Riders__c
            WHERE ClientContact__c = :contactId
            LIMIT 1
        ];

        if (clients.isEmpty()) {
            return data; // No active client found
        }
        data.client = clients[0];

        // Get the "client" RecordType for VolunteerWaiver__c
        RecordType rt = [
            SELECT Id
            FROM RecordType
            WHERE DeveloperName = 'client'
            AND SobjectType = 'VolunteerWaiver__c'
            LIMIT 1
        ];
        data.waiverRecordTypeId = rt.Id;

        // Get or create the waiver for the current year
        List<VolunteerWaiver__c> waivers = [
            SELECT Id, Client__c, Year__c, Forms_Completed__c,
                   Application_Submitted__c,
                   /* Completion stamp fields */
                   Photo_Release__c, Photo_Release_Name__c, Photo_Release_Date__c,
                   Auth_for_Emerg_Med_Treatment__c,
                   Client_Waiver__c,
                   Medical_History_Form_PL__c, Medical_History_Form__c,
                   Payer_Info__c, Payer__c, Payer_Address__c, Payer_Phone__c,
                   Payer_email__c, Payment_Signature_Name__c,
                   Third_Party_Payer_Waiver_Name__c, Third_Party_Address__c,
                   Third_Party_Contact__c, Third_Party_email__c,
                   WeightHeight__c,
                   Down_Syndrome__c, Down_Syndrome_Date__c,
                   Seizure_Form__c, Seizure_Form_Date__c, Seizure_Information__c,
                   ScoliosisForm__c, Scoliosis_Form__c,
                   Confidentiality_HIPPA__c, Confidentiality_HIPPA_Date__c,
                   Hippotherapy_Cancellation_Policy__c, Hippotherapy_Cancellation_Policy_Date__c,
                   Group_Home_Info__c,
                   Main_Info__c, Parent_Guardian_Info__c, Emergency_Contact_Info__c,
                   /* Mental Health fields */
                   Program_Type__c, Service_Type__c, Clinical_Screening__c,
                   Informed_Consent__c, Informed_Consent_Date__c, Informed_Consent_Name__c,
                   Diagnoses_Info__c,
                   /* Schedule */
                   Schedule_Completed_PL__c
            FROM VolunteerWaiver__c
            WHERE Client__c = :data.client.Id
            AND Year__c = :data.currentYear
            AND RecordTypeId = :rt.Id
            ORDER BY CreatedDate ASC
            LIMIT 1
        ];

        if (!waivers.isEmpty()) {
            data.waiver = waivers[0];
        }

        // Build completion status map from stamp fields
        data.completionStatus = buildCompletionMap(data.waiver);

        return data;
    }

    /**
     * Returns waiver template records (waiver__c) for Confidentiality/HIPPA
     * and Therapy Cancellation policies for the given year.
     */
    @AuraEnabled(cacheable=true)
    public static Map<String, waiver__c> getWaiverTemplates(String year) {
        Map<String, waiver__c> templates = new Map<String, waiver__c>();

        List<waiver__c> waiverTemplates = [
            SELECT Id, Name, Description__c, Year__c
            FROM waiver__c
            WHERE Year__c = :year
            AND Name IN ('ConfidentialityHIPPA', 'TherapyCancellationPolicy', 'InformedConsent')
        ];

        for (waiver__c w : waiverTemplates) {
            templates.put(w.Name, w);
        }
        return templates;
    }

    // ─── Save Methods ──────────────────────────────────────────────────

    /**
     * Step 1: Photo Release
     * Stamps: Photo_Release__c, Photo_Release_Name__c, Photo_Release_Date__c
     */
    @AuraEnabled
    public static SaveResult savePhotoRelease(Id waiverId, String consent) {
        return executeSave(waiverId, new Map<String, Object>{
            'Photo_Release__c' => consent,
            'Photo_Release_Name__c' => consent,
            'Photo_Release_Date__c' => Date.today()
        });
    }

    /**
     * Step 2: Emergency Treatment Authorization
     * The sub-flow collects insurance, meds, allergies via screen fields and
     * saves them to a rich-text template stored on the waiver. The exact fields
     * vary, but the completion stamp is Auth_for_Emerg_Med_Treatment__c.
     */
    @AuraEnabled
    public static SaveResult saveEmergencyTreatment(
        Id waiverId,
        String insuranceCompany,
        String policyNumber,
        String medications,
        String allergies,
        String signatureName
    ) {
        return executeSave(waiverId, new Map<String, Object>{
            'Auth_for_Emerg_Med_Treatment__c' => 'Completed',
            'Auth_for_Emerg_Treatment_Date__c' => Date.today(),
            'Auth_for_Emerg_Treatment_Name__c' => signatureName,
            'Health_Insurance_Co__c' => insuranceCompany,
            'Insurance_Policy__c' => policyNumber,
            'Current_medications__c' => medications,
            'Allergies_to_medications__c' => allergies
        });
    }

    /**
     * Step 3: Client Waiver
     * Creates a child VolunteerWaiver__c record and stamps the parent.
     */
    @AuraEnabled
    public static SaveResult saveClientWaiver(
        Id waiverId,
        Id clientId,
        String signatureName,
        String year,
        Id recordTypeId
    ) {
        try {
            // Stamp the parent waiver
            VolunteerWaiver__c parentWaiver = new VolunteerWaiver__c(
                Id = waiverId,
                Client_Waiver__c = 'Completed',
                Client_Waiver_Date__c = Date.today()
            );
            update parentWaiver;

            // Query the waiver template for ClientWaiver (same as original flow)
            List<waiver__c> templates = [
                SELECT Id FROM waiver__c
                WHERE Name LIKE '%ClientWaiver%'
                AND Year__c = :year
                LIMIT 1
            ];

            // Create child waiver record (same pattern as the original flow)
            VolunteerWaiver__c childWaiver = new VolunteerWaiver__c(
                Client__c = clientId,
                Client_Waiver__c = 'Completed',
                Signed_Name__c = signatureName,
                Signed_Dated__c = Date.today(),
                Year__c = year,
                RecordTypeId = recordTypeId,
                waiver__c = templates.isEmpty() ? null : templates[0].Id
            );
            insert childWaiver;

            return buildSuccessResult(waiverId);
        } catch (Exception e) {
            return buildErrorResult(e.getMessage());
        }
    }

    /**
     * Step 4: Medical History (file upload form)
     * The file upload is handled by the LWC using lightning-file-upload.
     * This method only stamps completion fields.
     */
    @AuraEnabled
    public static SaveResult saveMedicalHistory(Id waiverId) {
        return executeSave(waiverId, new Map<String, Object>{
            'Medical_History_Form_PL__c' => 'Completed',
            'Medical_History_Form__c' => Date.today()
        });
    }

    /**
     * Step 5: Payment Info
     */
    @AuraEnabled
    public static SaveResult savePaymentInfo(
        Id waiverId,
        String payerName,
        String payerAddress,
        String payerPhone,
        String payerEmail,
        String signatureName,
        String thirdPartyName,
        String thirdPartyAddress,
        String thirdPartyContact,
        String thirdPartyEmail
    ) {
        return executeSave(waiverId, new Map<String, Object>{
            'Payer_Info__c' => 'Completed',
            'Payer__c' => payerName,
            'Payer_Address__c' => payerAddress,
            'Payer_Phone__c' => payerPhone,
            'Payer_email__c' => payerEmail,
            'Payment_Signature_Name__c' => signatureName,
            'Third_Party_Payer_Waiver_Name__c' => thirdPartyName,
            'Third_Party_Address__c' => thirdPartyAddress,
            'Third_Party_Contact__c' => thirdPartyContact,
            'Third_Party_email__c' => thirdPartyEmail
        });
    }

    /**
     * Step 6: Height & Weight
     * Updates both the VolunteerWaiver__c and the Contact record.
     */
    @AuraEnabled
    public static SaveResult saveHeightWeight(
        Id waiverId,
        Id contactId,
        String height,
        Decimal weight
    ) {
        try {
            // Update waiver
            VolunteerWaiver__c waiver = new VolunteerWaiver__c(
                Id = waiverId,
                WeightHeight__c = 'Completed'
            );
            update waiver;

            // Update contact
            Contact con = new Contact(
                Id = contactId,
                Height__c = height,
                Weight__c = weight
            );
            update con;

            return buildSuccessResult(waiverId);
        } catch (Exception e) {
            return buildErrorResult(e.getMessage());
        }
    }

    /**
     * Step 7: Down Syndrome (file upload form)
     * File upload handled by LWC; this stamps completion.
     */
    @AuraEnabled
    public static SaveResult saveDownSyndrome(Id waiverId) {
        return executeSave(waiverId, new Map<String, Object>{
            'Down_Syndrome__c' => 'Completed',
            'Down_Syndrome_Date__c' => Date.today()
        });
    }

    /**
     * Step 8: Seizure Form
     * Branches: if seizure was < 5 years ago and in last 3 years → file upload + seizure info
     *           if seizure was < 5 years ago but NOT in last 3 → seizure detail fields
     *           if seizure was ≥ 5 years ago → no form needed, just stamp
     */
    @AuraEnabled
    public static SaveResult saveSeizureForm(Id waiverId, String seizureInfo) {
        return executeSave(waiverId, new Map<String, Object>{
            'Seizure_Form__c' => 'Completed',
            'Seizure_Form_Date__c' => Date.today(),
            'Seizure_Information__c' => seizureInfo
        });
    }

    /**
     * Step 9: Scoliosis (file upload form)
     */
    @AuraEnabled
    public static SaveResult saveScoliosis(Id waiverId) {
        return executeSave(waiverId, new Map<String, Object>{
            'ScoliosisForm__c' => 'Completed',
            'Scoliosis_Form__c' => Date.today()
        });
    }

    /**
     * Step 10: Confidentiality & HIPPA
     * Creates a child VolunteerWaiver__c record for the HIPPA waiver.
     */
    @AuraEnabled
    public static SaveResult saveConfidentialityHippa(
        Id waiverId,
        Id clientId,
        String fullName,
        Date signedDate,
        String year,
        Id waiverTemplateId,
        Id recordTypeId
    ) {
        try {
            // Stamp the parent waiver
            VolunteerWaiver__c parentWaiver = new VolunteerWaiver__c(
                Id = waiverId,
                Confidentiality_HIPPA__c = 'Yes',
                Confidentiality_HIPPA_Date__c = Date.today()
            );
            update parentWaiver;

            // Create child waiver record
            VolunteerWaiver__c childWaiver = new VolunteerWaiver__c(
                Client__c = clientId,
                Confidentiality_HIPPA__c = 'Yes',
                Confidentiality_HIPPA_Name__c = fullName,
                Signed_Dated__c = signedDate,
                Year__c = year,
                waiver__c = waiverTemplateId,
                RecordTypeId = recordTypeId
            );
            insert childWaiver;

            return buildSuccessResult(waiverId);
        } catch (Exception e) {
            return buildErrorResult(e.getMessage());
        }
    }

    /**
     * Step 11: Therapy Cancellation Policy
     * Creates a child VolunteerWaiver__c record for the policy.
     */
    @AuraEnabled
    public static SaveResult saveTherapyCancellation(
        Id waiverId,
        Id clientId,
        String fullName,
        Date signedDate,
        String authorization,
        String year,
        Id waiverTemplateId,
        Id recordTypeId
    ) {
        try {
            // Stamp the parent waiver
            VolunteerWaiver__c parentWaiver = new VolunteerWaiver__c(
                Id = waiverId,
                Hippotherapy_Cancellation_Policy__c = 'Yes',
                Hippotherapy_Cancellation_Policy_Date__c = Date.today()
            );
            update parentWaiver;

            // Create child waiver record
            VolunteerWaiver__c childWaiver = new VolunteerWaiver__c(
                Client__c = clientId,
                Hippotherapy_Cancellation_Policy__c = authorization,
                Signed_Name__c = fullName,
                Signed_Dated__c = signedDate,
                Year__c = year,
                waiver__c = waiverTemplateId,
                RecordTypeId = recordTypeId
            );
            insert childWaiver;

            return buildSuccessResult(waiverId);
        } catch (Exception e) {
            return buildErrorResult(e.getMessage());
        }
    }

    /**
     * Submit the application.
     * Validates minimum form count based on program type:
     *   Riding: at least 6 forms
     *   Mental Health: at least 6 forms (different form set but similar minimum)
     */
    @AuraEnabled
    public static SaveResult submitApplication(Id waiverId) {
        VolunteerWaiver__c waiver = [
            SELECT Id, Program_Type__c,
                   Photo_Release__c, Auth_for_Emerg_Med_Treatment__c,
                   Client_Waiver__c, Medical_History_Form_PL__c,
                   Payer_Info__c, WeightHeight__c,
                   Down_Syndrome__c, Seizure_Form__c, ScoliosisForm__c,
                   Confidentiality_HIPPA__c, Hippotherapy_Cancellation_Policy__c,
                   Group_Home_Info__c,
                   Main_Info__c, Parent_Guardian_Info__c, Emergency_Contact_Info__c,
                   Diagnoses_Info__c, Informed_Consent__c,
                   Schedule_Completed_PL__c
            FROM VolunteerWaiver__c
            WHERE Id = :waiverId
            LIMIT 1
        ];

        // Count completed forms relevant to this program type
        Map<String, String> statusMap = buildCompletionMap(waiver);

        // Determine which form keys are relevant based on program type
        Set<String> relevantKeys;
        if (waiver.Program_Type__c == 'Mental Health') {
            relevantKeys = new Set<String>{
                'mainInfo', 'parentGuardian', 'emergencyContact',
                'photoRelease', 'emergencyTreatment', 'clientWaiver',
                'paymentInfo', 'diagnoses', 'informedConsent',
                'confidentialityHippa', 'therapyCancellation'
            };
        } else {
            // Riding (default)
            relevantKeys = new Set<String>{
                'mainInfo', 'parentGuardian', 'emergencyContact',
                'photoRelease', 'emergencyTreatment', 'clientWaiver',
                'medicalHistory', 'paymentInfo', 'heightWeight',
                'confidentialityHippa', 'therapyCancellation'
            };
        }

        Integer completedCount = 0;
        for (String key : relevantKeys) {
            String status = statusMap.get(key);
            if (status != null && status != '' && status != 'Not Started') {
                completedCount++;
            }
        }

        Integer minimumForms = 6;
        if (completedCount < minimumForms) {
            SaveResult result = new SaveResult();
            result.success = false;
            result.errorMessage = 'Please complete at least ' + minimumForms + ' forms before submitting. You have completed ' + completedCount + ' so far.';
            result.formsCompleted = completedCount;
            return result;
        }

        waiver.Application_Submitted__c = 'Yes';
        update waiver;

        SaveResult result = new SaveResult();
        result.success = true;
        result.formsCompleted = completedCount;
        return result;
    }

    /**
     * Links uploaded file(s) to both the waiver and client records.
     * Uses ContentDocumentLink to attach files (standard Salesforce approach).
     * The LWC's lightning-file-upload already creates the ContentVersion
     * and links it to one record; this method creates additional links.
     *
     * @param contentDocumentIds  List of ContentDocument Ids from the upload
     * @param waiverId            The VolunteerWaiver__c Id
     * @param clientId            The Riders__c (client) Id
     */
    @AuraEnabled
    public static SaveResult linkUploadedFiles(
        List<Id> contentDocumentIds,
        Id waiverId,
        Id clientId
    ) {
        try {
            List<ContentDocumentLink> links = new List<ContentDocumentLink>();

            for (Id docId : contentDocumentIds) {
                // Link to waiver record
                links.add(new ContentDocumentLink(
                    ContentDocumentId = docId,
                    LinkedEntityId = waiverId,
                    ShareType = 'V',
                    Visibility = 'AllUsers'
                ));
                // Link to client record
                links.add(new ContentDocumentLink(
                    ContentDocumentId = docId,
                    LinkedEntityId = clientId,
                    ShareType = 'V',
                    Visibility = 'AllUsers'
                ));
            }

            if (!links.isEmpty()) {
                insert links;
            }

            return buildSuccessResult(waiverId);
        } catch (Exception e) {
            return buildErrorResult(e.getMessage());
        }
    }

    // ─── Profile / Info Form Methods ────────────────────────────────────

    /**
     * Saves Main Info (demographics) — updates Contact and Riders__c.
     * Mirrors the Returning_Main_Info flow.
     */
    @AuraEnabled
    public static SaveResult saveMainInfo(
        Id contactId,
        Id clientId,
        Id waiverId,
        String firstName,
        String lastName,
        String gender,
        Date dateOfBirth,
        String height,
        Decimal weight,
        String street,
        String city,
        String state,
        String zip,
        String email,
        String workEmail,
        String phone,
        String mobilePhone
    ) {
        try {
            SaveResult result = new SaveResult();

            // Weight limit warning (mirrors WeightLimitPage in the flow)
            if (weight != null && weight > 200) {
                result.warningMessage = 'Please note: Our weight limit for riders is 200 lbs. '
                    + 'If your weight exceeds this limit, please contact us to discuss options.';
            }

            // Update Contact
            Contact con = new Contact(
                Id = contactId,
                FirstName = firstName,
                LastName = lastName,
                Gender__c = gender,
                Birthdate = dateOfBirth,
                Height__c = height,
                Weight__c = weight,
                MailingStreet = street,
                MailingCity = city,
                MailingState = state,
                MailingPostalCode = zip,
                Email = email,
                npe01__WorkEmail__c = workEmail,
                HomePhone = phone,
                MobilePhone = mobilePhone
            );
            update con;

            // Update Riders__c
            Riders__c client = new Riders__c(
                Id = clientId,
                Gender__c = gender,
                Height__c = height,
                Weight__c = weight
            );
            update client;

            // Stamp the waiver for persistent completion tracking
            if (waiverId != null) {
                VolunteerWaiver__c waiverRec = new VolunteerWaiver__c(
                    Id = waiverId,
                    Main_Info__c = 'Completed'
                );
                update waiverRec;
            }

            result.success = true;
            return result;
        } catch (Exception e) {
            return buildErrorResult(e.getMessage());
        }
    }

    /**
     * Returns current guardian data for the Parent/Guardian form.
     * Mirrors the Returning_Parent_Guardian flow's record lookups.
     */
    @AuraEnabled
    public static GuardianData getGuardianData(Id contactId, Id clientId) {
        GuardianData data = new GuardianData();

        // Get client record to find guardian lookup IDs
        Riders__c client = [
            SELECT Id, Father_Name__c, Mother_Name__c, ClientContact__c
            FROM Riders__c
            WHERE Id = :clientId
            LIMIT 1
        ];

        // Get first guardian (Father_Name__c)
        if (client.Father_Name__c != null) {
            List<Contact> firstGuardians = [
                SELECT Id, FirstName, LastName, Email, MobilePhone, Business__c
                FROM Contact
                WHERE Id = :client.Father_Name__c
                LIMIT 1
            ];
            if (!firstGuardians.isEmpty()) {
                data.firstGuardian = firstGuardians[0];
            }
        }

        // Get second guardian (Mother_Name__c)
        if (client.Mother_Name__c != null) {
            List<Contact> secondGuardians = [
                SELECT Id, FirstName, LastName, Email, MobilePhone, Business__c
                FROM Contact
                WHERE Id = :client.Mother_Name__c
                LIMIT 1
            ];
            if (!secondGuardians.isEmpty()) {
                data.secondGuardian = secondGuardians[0];
            }
        }

        // Get the client's Contact to find their Account
        Contact clientContact = [
            SELECT Id, AccountId, Account.RecordType.DeveloperName
            FROM Contact
            WHERE Id = :contactId
            LIMIT 1
        ];

        // Check if Group Home
        data.isGroupHome = clientContact.Account?.RecordType?.DeveloperName == 'Group_Home';

        // Get all contacts in the household (for "select existing" option)
        if (clientContact.AccountId != null) {
            data.householdContacts = [
                SELECT Id, FirstName, LastName, Email, MobilePhone
                FROM Contact
                WHERE AccountId = :clientContact.AccountId
                AND Id != :contactId
                ORDER BY LastName, FirstName
            ];
        } else {
            data.householdContacts = new List<Contact>();
        }

        return data;
    }

    /**
     * Creates or updates a guardian Contact and links it to the Riders__c record.
     * Mirrors the Returning_Parent_Guardian flow's create/update/select logic.
     *
     * @param clientId          Riders__c Id
     * @param contactId         The client's own Contact Id (for Account lookup)
     * @param guardianContactId Existing guardian Contact Id (for edit mode), null for new/select
     * @param guardianType      'first' or 'second'
     * @param firstName         Guardian first name
     * @param lastName          Guardian last name
     * @param email             Guardian email
     * @param phone             Guardian phone
     * @param employer          Guardian employer (Business__c)
     * @param isNew             True if creating a brand new contact
     * @param existingContactId Contact Id when selecting from household
     */
    @AuraEnabled
    public static SaveResult saveGuardian(
        Id clientId,
        Id contactId,
        Id waiverId,
        Id guardianContactId,
        String guardianType,
        String firstName,
        String lastName,
        String email,
        String phone,
        String employer,
        Boolean isNew,
        Id existingContactId
    ) {
        try {
            Id guardianId;

            if (isNew) {
                // Create new Contact for guardian
                Contact clientContact = [
                    SELECT AccountId FROM Contact WHERE Id = :contactId LIMIT 1
                ];
                Contact newGuardian = new Contact(
                    AccountId = clientContact.AccountId,
                    FirstName = firstName,
                    LastName = lastName,
                    Email = email,
                    MobilePhone = phone,
                    Business__c = employer
                );
                insert newGuardian;
                guardianId = newGuardian.Id;
            } else if (existingContactId != null) {
                // Select existing contact from household
                guardianId = existingContactId;
            } else if (guardianContactId != null) {
                // Update existing guardian
                Contact guardian = new Contact(
                    Id = guardianContactId,
                    FirstName = firstName,
                    LastName = lastName,
                    Email = email,
                    MobilePhone = phone,
                    Business__c = employer
                );
                update guardian;
                guardianId = guardianContactId;
            }

            // Link guardian to Riders__c
            if (guardianId != null) {
                Riders__c client = new Riders__c(Id = clientId);
                if (guardianType == 'first') {
                    client.Father_Name__c = guardianId;
                } else {
                    client.Mother_Name__c = guardianId;
                }
                update client;
            }

            // Stamp the waiver for persistent completion tracking
            if (waiverId != null) {
                VolunteerWaiver__c waiverRec = new VolunteerWaiver__c(
                    Id = waiverId,
                    Parent_Guardian_Info__c = 'Completed'
                );
                update waiverRec;
            }

            SaveResult result = new SaveResult();
            result.success = true;
            return result;
        } catch (Exception e) {
            return buildErrorResult(e.getMessage());
        }
    }

    /**
     * Removes (unlinks) a guardian from the Riders__c record by clearing
     * the Father_Name__c or Mother_Name__c lookup.
     *
     * @param clientId      The Riders__c Id
     * @param guardianType  'first' clears Father_Name__c, 'second' clears Mother_Name__c
     * @return SaveResult   success/failure
     */
    @AuraEnabled
    public static SaveResult removeGuardian(Id clientId, String guardianType) {
        try {
            Riders__c client = new Riders__c(Id = clientId);
            if (guardianType == 'first') {
                client.Father_Name__c = null;
            } else {
                client.Mother_Name__c = null;
            }
            update client;

            SaveResult result = new SaveResult();
            result.success = true;
            return result;
        } catch (Exception e) {
            return buildErrorResult(e.getMessage());
        }
    }

    /**
     * Returns emergency contact data for the Emergency Contact form.
     * Mirrors the Returning_Emergency flow's record lookups.
     * Handles both clients (Riders__c) and volunteers (Volunteer_Info__c).
     */
    @AuraEnabled
    public static EmergencyContactData getEmergencyContactData(Id contactId) {
        EmergencyContactData data = new EmergencyContactData();

        // Get contact to determine if volunteer
        Contact con = [
            SELECT Id, Volunteer__c, AccountId
            FROM Contact
            WHERE Id = :contactId
            LIMIT 1
        ];
        data.isVolunteer = con.Volunteer__c;

        Id emergencyContactId;

        if (con.Volunteer__c) {
            // Volunteer path: look up via Volunteer_Info__c
            List<Volunteer_Info__c> volInfos = [
                SELECT Id, Emergency_Contact_LU__c, Volunteer_Name__c
                FROM Volunteer_Info__c
                WHERE Volunteer_Name__c = :contactId
                LIMIT 1
            ];
            if (!volInfos.isEmpty()) {
                data.volunteerInfo = volInfos[0];
                emergencyContactId = volInfos[0].Emergency_Contact_LU__c;
            }
        } else {
            // Client path: look up via Riders__c
            List<Riders__c> clients = [
                SELECT Id, Emergency_Contact__c, ClientContact__c
                FROM Riders__c
                WHERE ClientContact__c = :contactId
                LIMIT 1
            ];
            if (!clients.isEmpty()) {
                data.clientRecord = clients[0];
                emergencyContactId = clients[0].Emergency_Contact__c;
            }
        }

        // Get emergency contact details
        if (emergencyContactId != null) {
            List<Contact> emergencyContacts = [
                SELECT Id, FirstName, LastName, MobilePhone, Email
                FROM Contact
                WHERE Id = :emergencyContactId
                LIMIT 1
            ];
            if (!emergencyContacts.isEmpty()) {
                data.emergencyContact = emergencyContacts[0];
            }
        }

        // Get household contacts for "select existing" option
        if (con.AccountId != null) {
            data.householdContacts = [
                SELECT Id, FirstName, LastName, Email, MobilePhone
                FROM Contact
                WHERE AccountId = :con.AccountId
                AND Id != :contactId
                ORDER BY LastName, FirstName
            ];
        } else {
            data.householdContacts = new List<Contact>();
        }

        return data;
    }

    /**
     * Creates, updates, removes, or selects an emergency contact.
     * Mirrors the Returning_Emergency flow's decision logic.
     *
     * @param contactId          The user's Contact Id
     * @param emergencyContactId Existing emergency Contact Id (for edit), null for new
     * @param firstName          Emergency contact first name
     * @param lastName           Emergency contact last name
     * @param phone              Emergency contact phone
     * @param email              Emergency contact email
     * @param isNew              True if creating a new emergency contact
     * @param isRemove           True if removing the emergency contact
     * @param existingContactId  Contact Id when selecting from household
     */
    @AuraEnabled
    public static SaveResult saveEmergencyContact(
        Id contactId,
        Id waiverId,
        Id emergencyContactId,
        String firstName,
        String lastName,
        String phone,
        String email,
        Boolean isNew,
        Boolean isRemove,
        Id existingContactId
    ) {
        try {
            // Determine if volunteer or client
            Contact con = [
                SELECT Id, Volunteer__c, AccountId
                FROM Contact
                WHERE Id = :contactId
                LIMIT 1
            ];

            Id newEmergencyContactId;

            if (isRemove) {
                // Clear the emergency contact link
                newEmergencyContactId = null;
            } else if (isNew) {
                // Create new contact
                Contact newContact = new Contact(
                    AccountId = con.AccountId,
                    FirstName = firstName,
                    LastName = lastName,
                    MobilePhone = phone,
                    Email = email
                );
                insert newContact;
                newEmergencyContactId = newContact.Id;
            } else if (existingContactId != null) {
                // Select existing household contact
                newEmergencyContactId = existingContactId;
            } else if (emergencyContactId != null) {
                // Update existing emergency contact
                Contact emergencyContact = new Contact(
                    Id = emergencyContactId,
                    FirstName = firstName,
                    LastName = lastName,
                    MobilePhone = phone,
                    Email = email
                );
                update emergencyContact;
                newEmergencyContactId = emergencyContactId;
            }

            // Link to the appropriate parent record
            if (con.Volunteer__c) {
                // Volunteer path
                List<Volunteer_Info__c> volInfos = [
                    SELECT Id FROM Volunteer_Info__c
                    WHERE Volunteer_Name__c = :contactId
                    LIMIT 1
                ];
                if (!volInfos.isEmpty()) {
                    Volunteer_Info__c volInfo = new Volunteer_Info__c(
                        Id = volInfos[0].Id,
                        Emergency_Contact_LU__c = isRemove ? null : newEmergencyContactId
                    );
                    update volInfo;
                }
            } else {
                // Client path
                List<Riders__c> clients = [
                    SELECT Id FROM Riders__c
                    WHERE ClientContact__c = :contactId
                    LIMIT 1
                ];
                if (!clients.isEmpty()) {
                    Riders__c client = new Riders__c(
                        Id = clients[0].Id,
                        Emergency_Contact__c = isRemove ? null : newEmergencyContactId
                    );
                    update client;
                }
            }

            // Stamp the waiver for persistent completion tracking
            if (waiverId != null) {
                VolunteerWaiver__c waiverRec = new VolunteerWaiver__c(
                    Id = waiverId,
                    Emergency_Contact_Info__c = 'Completed'
                );
                update waiverRec;
            }

            SaveResult result = new SaveResult();
            result.success = true;
            return result;
        } catch (Exception e) {
            return buildErrorResult(e.getMessage());
        }
    }

    // ─── Group Home Methods ─────────────────────────────────────────────

    /**
     * Loads all data needed by the Group Home child LWC.
     *
     * @param contactId  The client's Contact Id
     * @param clientId   The Riders__c Id
     * @return GroupHomeData with current group home, available accounts, and pending requests
     */
    @AuraEnabled
    public static GroupHomeData getGroupHomeData(Id contactId, Id clientId) {
        GroupHomeData data = new GroupHomeData();

        // Get Group Home RecordType Id
        RecordType rt = [
            SELECT Id FROM RecordType
            WHERE DeveloperName = 'Group_Home' AND SobjectType = 'Account'
            LIMIT 1
        ];
        data.groupHomeRecordTypeId = rt.Id;

        // Get the client record with Group Home fields
        Riders__c client = [
            SELECT Id, Group_Home__c, Lives_in_Group_Home__c
            FROM Riders__c
            WHERE Id = :clientId
            LIMIT 1
        ];
        data.livesInGroupHome = client.Lives_in_Group_Home__c;

        // Load current Group Home Account if assigned
        if (client.Group_Home__c != null) {
            List<Account> homes = [
                SELECT Id, Name, Phone, BillingStreet, BillingCity, BillingState, BillingPostalCode
                FROM Account
                WHERE Id = :client.Group_Home__c
                LIMIT 1
            ];
            if (!homes.isEmpty()) {
                data.currentGroupHome = homes[0];
            }
        }

        // Load all Group Home accounts for the search/lookup
        data.groupHomeAccounts = [
            SELECT Id, Name, Phone, BillingStreet, BillingCity, BillingState, BillingPostalCode
            FROM Account
            WHERE RecordTypeId = :rt.Id
            ORDER BY Name
            LIMIT 200
        ];

        // Check for any pending request for this client
        List<Group_Home_Request__c> requests = [
            SELECT Id, Name, Phone__c, Street__c, City__c, State__c, Postal_Code__c,
                   Contact_Person__c, Email__c, Status__c, Rejection_Reason__c,
                   Created_Account__c, CreatedDate
            FROM Group_Home_Request__c
            WHERE Client__c = :clientId
            AND Status__c = 'Pending'
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];
        if (!requests.isEmpty()) {
            data.pendingRequest = requests[0];
        }

        return data;
    }

    /**
     * Saves an existing Group Home selection to the client record and stamps the waiver.
     *
     * @param clientId           Riders__c Id
     * @param waiverId           VolunteerWaiver__c Id
     * @param selectedAccountId  The selected Group Home Account Id
     */
    @AuraEnabled
    public static SaveResult saveGroupHome(Id clientId, Id waiverId, Id selectedAccountId) {
        try {
            // Update the Riders__c record
            Riders__c client = new Riders__c(
                Id = clientId,
                Group_Home__c = selectedAccountId,
                Lives_in_Group_Home__c = true
            );
            update client;

            // Stamp the waiver
            if (waiverId != null) {
                VolunteerWaiver__c waiver = new VolunteerWaiver__c(
                    Id = waiverId,
                    Group_Home_Info__c = 'Completed'
                );
                update waiver;
            }

            SaveResult result = new SaveResult();
            result.success = true;
            return result;
        } catch (Exception e) {
            return buildErrorResult(e.getMessage());
        }
    }

    /**
     * Updates whether a client lives in a Group Home.
     * Called when the user toggles the "I live in a Group Home" checkbox on the menu.
     *
     * @param clientId           Riders__c Id
     * @param livesInGroupHome   true/false
     */
    @AuraEnabled
    public static SaveResult updateLivesInGroupHome(Id clientId, Boolean livesInGroupHome) {
        try {
            Riders__c client = new Riders__c(
                Id = clientId,
                Lives_in_Group_Home__c = livesInGroupHome
            );
            update client;

            SaveResult result = new SaveResult();
            result.success = true;
            return result;
        } catch (Exception e) {
            return buildErrorResult(e.getMessage());
        }
    }

    /**
     * Submits a request for a new Group Home that doesn't exist yet.
     * Creates a Group_Home_Request__c record with Status = 'Pending'.
     *
     * @param clientId       Riders__c Id
     * @param contactId      Contact Id of the requester
     * @param name           Group Home name
     * @param phone          Phone number
     * @param street         Street address
     * @param city           City
     * @param state          State
     * @param postalCode     Postal code
     * @param contactPerson  Contact person name
     * @param email          Contact person email
     */
    @AuraEnabled
    public static SaveResult submitGroupHomeRequest(
        Id clientId,
        Id contactId,
        Id waiverId,
        String name,
        String phone,
        String street,
        String city,
        String state,
        String postalCode,
        String contactPerson,
        String email
    ) {
        try {
            Group_Home_Request__c request = new Group_Home_Request__c(
                Name = name,
                Phone__c = phone,
                Street__c = street,
                City__c = city,
                State__c = state,
                Postal_Code__c = postalCode,
                Contact_Person__c = contactPerson,
                Email__c = email,
                Status__c = 'Pending',
                Requested_By__c = contactId,
                Client__c = clientId
            );
            insert request;

            // Stamp the waiver for persistent completion tracking
            if (waiverId != null) {
                VolunteerWaiver__c waiverRec = new VolunteerWaiver__c(
                    Id = waiverId,
                    Group_Home_Info__c = 'Completed'
                );
                update waiverRec;
            }

            SaveResult result = new SaveResult();
            result.success = true;
            result.warningMessage = 'Your Group Home request has been submitted for review. You will be notified once it is approved.';
            return result;
        } catch (Exception e) {
            return buildErrorResult(e.getMessage());
        }
    }

    /**
     * Searches for Group Home accounts matching a search term.
     *
     * @param searchTerm  The search string to match against Account Name
     * @return List of matching Group Home Accounts
     */
    @AuraEnabled
    public static List<Account> searchGroupHomes(String searchTerm) {
        Id rtId = [
            SELECT Id FROM RecordType
            WHERE DeveloperName = 'Group_Home' AND SobjectType = 'Account'
            LIMIT 1
        ].Id;

        String likeStr = '%' + String.escapeSingleQuotes(searchTerm) + '%';
        return [
            SELECT Id, Name, Phone, BillingStreet, BillingCity, BillingState, BillingPostalCode
            FROM Account
            WHERE RecordTypeId = :rtId
            AND Name LIKE :likeStr
            ORDER BY Name
            LIMIT 50
        ];
    }

    /**
     * Generic method to stamp a completion field on the waiver.
     * Used by child LWC components (Parent/Guardian, Group Home) to ensure
     * the waiver is stamped when the user clicks "Done" after reviewing
     * (without making edits), so completion persists across page refreshes.
     *
     * @param waiverId   The VolunteerWaiver__c Id
     * @param fieldName  API name of the stamp field (e.g. 'Parent_Guardian_Info__c')
     * @param value      Value to set (e.g. 'Completed')
     */
    @AuraEnabled
    public static SaveResult stampFormCompletion(Id waiverId, String fieldName, String value) {
        try {
            // Only stamp if the field is not already set
            VolunteerWaiver__c waiver = [
                SELECT Id
                FROM VolunteerWaiver__c
                WHERE Id = :waiverId
                LIMIT 1
            ];
            waiver.put(fieldName, value);
            update waiver;
            return buildSuccessResult(waiverId);
        } catch (Exception e) {
            return buildErrorResult(e.getMessage());
        }
    }

    // ─── Private Helpers ───────────────────────────────────────────────

    /**
     * Builds a map of form step → completion status from waiver stamp fields.
     */
    private static Map<String, String> buildCompletionMap(VolunteerWaiver__c waiver) {
        Map<String, String> statusMap = new Map<String, String>();

        // Profile forms — read from waiver stamp fields
        statusMap.put('mainInfo',
            waiver != null && waiver.Main_Info__c == 'Completed' ? 'Completed' : 'Not Started');
        statusMap.put('parentGuardian',
            waiver != null && waiver.Parent_Guardian_Info__c == 'Completed' ? 'Completed' : 'Not Started');
        statusMap.put('emergencyContact',
            waiver != null && waiver.Emergency_Contact_Info__c == 'Completed' ? 'Completed' : 'Not Started');

        if (waiver == null) {
            statusMap.put('groupHome', 'Not Started');
            statusMap.put('photoRelease', 'Not Started');
            statusMap.put('emergencyTreatment', 'Not Started');
            statusMap.put('clientWaiver', 'Not Started');
            statusMap.put('medicalHistory', 'Not Started');
            statusMap.put('paymentInfo', 'Not Started');
            statusMap.put('heightWeight', 'Not Started');
            statusMap.put('downSyndrome', 'Not Started');
            statusMap.put('seizureForm', 'Not Started');
            statusMap.put('scoliosis', 'Not Started');
            statusMap.put('confidentialityHippa', 'Not Started');
            statusMap.put('therapyCancellation', 'Not Started');
            return statusMap;
        }

        statusMap.put('groupHome',
            waiver.Group_Home_Info__c == 'Completed' ? 'Completed' : 'Not Started');
        statusMap.put('photoRelease',
            String.isNotBlank(waiver.Photo_Release__c) ? waiver.Photo_Release__c : 'Not Started');
        statusMap.put('emergencyTreatment',
            waiver.Auth_for_Emerg_Med_Treatment__c == 'Completed' ? 'Completed' : 'Not Started');
        statusMap.put('clientWaiver',
            waiver.Client_Waiver__c == 'Completed' ? 'Completed' : 'Not Started');
        statusMap.put('medicalHistory',
            waiver.Medical_History_Form_PL__c == 'Completed' ? 'Completed' : 'Not Started');
        statusMap.put('paymentInfo',
            waiver.Payer_Info__c == 'Completed' ? 'Completed' : 'Not Started');
        statusMap.put('heightWeight',
            waiver.WeightHeight__c == 'Completed' ? 'Completed' : 'Not Started');
        statusMap.put('downSyndrome',
            waiver.Down_Syndrome__c == 'Completed' ? 'Completed' : 'Not Started');
        statusMap.put('seizureForm',
            waiver.Seizure_Form__c == 'Completed' ? 'Completed' : 'Not Started');
        statusMap.put('scoliosis',
            waiver.ScoliosisForm__c == 'Completed' ? 'Completed' : 'Not Started');
        statusMap.put('confidentialityHippa',
            waiver.Confidentiality_HIPPA__c == 'Yes' ? 'Completed' : 'Not Started');
        statusMap.put('therapyCancellation',
            waiver.Hippotherapy_Cancellation_Policy__c == 'Yes' ? 'Completed' : 'Not Started');

        // Mental Health specific steps
        statusMap.put('diagnoses',
            waiver.Diagnoses_Info__c == 'Completed' ? 'Completed' : 'Not Started');
        statusMap.put('informedConsent',
            waiver.Informed_Consent__c == 'Completed' ? 'Completed' : 'Not Started');

        return statusMap;
    }

    /**
     * Generic update helper: sets fields on the waiver, increments Forms_Completed__c,
     * and returns a SaveResult.
     */
    private static SaveResult executeSave(Id waiverId, Map<String, Object> fieldValues) {
        try {
            VolunteerWaiver__c waiver = new VolunteerWaiver__c(Id = waiverId);
            for (String fieldName : fieldValues.keySet()) {
                waiver.put(fieldName, fieldValues.get(fieldName));
            }
            update waiver;
            return buildSuccessResult(waiverId);
        } catch (Exception e) {
            return buildErrorResult(e.getMessage());
        }
    }

    private static SaveResult buildSuccessResult(Id waiverId) {
        // Re-query to get current completion count
        VolunteerWaiver__c waiver = [
            SELECT Id, Photo_Release__c, Auth_for_Emerg_Med_Treatment__c,
                   Client_Waiver__c, Medical_History_Form_PL__c,
                   Payer_Info__c, WeightHeight__c,
                   Down_Syndrome__c, Seizure_Form__c, ScoliosisForm__c,
                   Confidentiality_HIPPA__c, Hippotherapy_Cancellation_Policy__c,
                   Group_Home_Info__c,
                   Main_Info__c, Parent_Guardian_Info__c, Emergency_Contact_Info__c,
                   Diagnoses_Info__c, Informed_Consent__c
            FROM VolunteerWaiver__c
            WHERE Id = :waiverId
            LIMIT 1
        ];

        Map<String, String> statusMap = buildCompletionMap(waiver);
        Integer completedCount = 0;
        for (String status : statusMap.values()) {
            if (status != null && status != '' && status != 'Not Started') {
                completedCount++;
            }
        }

        SaveResult result = new SaveResult();
        result.success = true;
        result.formsCompleted = completedCount;
        return result;
    }

    // ─── Mental Health: Save Service Type ─────────────────────────────
    @AuraEnabled
    public static SaveResult saveServiceType(Id waiverId, Id clientId, String programType, String serviceTypes) {
        try {
            VolunteerWaiver__c waiver = [SELECT Id FROM VolunteerWaiver__c WHERE Id = :waiverId LIMIT 1];
            waiver.Program_Type__c = programType;
            if (String.isNotBlank(serviceTypes)) {
                waiver.Service_Type__c = serviceTypes;
            }
            update waiver;

            Riders__c client = [SELECT Id FROM Riders__c WHERE Id = :clientId LIMIT 1];
            client.Program_Type__c = programType;
            if (String.isNotBlank(serviceTypes)) {
                client.Service_Type__c = serviceTypes;
            }
            update client;

            SaveResult result = new SaveResult();
            result.success = true;
            return result;
        } catch (Exception e) {
            return buildErrorResult(e.getMessage());
        }
    }

    // ─── Mental Health: Save Clinical Screening ─────────────────────────
    @AuraEnabled
    public static SaveResult saveClinicalScreening(Id waiverId, Id clientId, String flags, String detail, Boolean isFlagged) {
        try {
            // Update waiver screening status
            VolunteerWaiver__c waiver = [SELECT Id FROM VolunteerWaiver__c WHERE Id = :waiverId LIMIT 1];
            waiver.Clinical_Screening__c = isFlagged ? 'Flagged' : 'Completed';
            update waiver;

            // Update client record with flag details
            Riders__c client = [SELECT Id, Name FROM Riders__c WHERE Id = :clientId LIMIT 1];
            client.Clinical_Safety_Flagged__c = isFlagged;
            if (String.isNotBlank(flags)) {
                client.Clinical_Safety_Flags__c = flags;
            }
            if (String.isNotBlank(detail)) {
                client.Clinical_Safety_Detail__c = detail;
            }
            if (isFlagged) {
                client.Intake_Paused__c = true;
            }
            update client;

            // Send email alert to staff when clinical safety flags are raised
            if (isFlagged) {
                sendClinicalSafetyAlert(client.Name, flags, detail);
            }

            SaveResult result = new SaveResult();
            result.success = true;
            return result;
        } catch (Exception e) {
            return buildErrorResult(e.getMessage());
        }
    }

    /**
     * Sends an email alert to We Can Ride staff when a Mental Health client
     * triggers clinical safety flags during intake screening.
     */
    private static void sendClinicalSafetyAlert(String clientName, String flags, String detail) {
        try {
            Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
            mail.setToAddresses(new String[]{ 'clients@wecanride.org' });

            // Use org-wide email address if available
            List<OrgWideEmailAddress> owea = [
                SELECT Id FROM OrgWideEmailAddress
                WHERE Address = 'clients@wecanride.org'
                LIMIT 1
            ];
            if (!owea.isEmpty()) {
                mail.setOrgWideEmailAddressId(owea[0].Id);
            }

            mail.setSubject('Clinical Safety Flag — ' + clientName);

            String flagList = '';
            if (String.isNotBlank(flags)) {
                for (String f : flags.split(';')) {
                    flagList += '  • ' + f.trim() + '\n';
                }
            }

            String body = 'A Mental Health Therapy intake client has triggered clinical safety flags.\n\n'
                + 'Client: ' + clientName + '\n\n'
                + 'Flags:\n' + flagList + '\n'
                + 'Detail provided by client:\n'
                + (String.isNotBlank(detail) ? detail : '(none)') + '\n\n'
                + 'The client\'s intake has been paused. Please review and contact the client to discuss next steps.';

            mail.setPlainTextBody(body);
            Messaging.sendEmail(new Messaging.SingleEmailMessage[]{ mail });
        } catch (Exception e) {
            // Log but don't fail the save — the screening data is already saved
            System.debug(LoggingLevel.ERROR, 'Failed to send clinical safety alert: ' + e.getMessage());
        }
    }

    // ─── Mental Health: Save Diagnoses ───────────────────────────────────
    @AuraEnabled
    public static SaveResult saveDiagnoses(Id waiverId, Id clientId, String diagnoses, String additionalNotes) {
        try {
            VolunteerWaiver__c waiver = [SELECT Id FROM VolunteerWaiver__c WHERE Id = :waiverId LIMIT 1];
            waiver.Diagnoses__c = diagnoses;
            waiver.Diagnoses_Info__c = 'Completed';
            update waiver;

            SaveResult result = new SaveResult();
            result.success = true;
            return result;
        } catch (Exception e) {
            return buildErrorResult(e.getMessage());
        }
    }

    // ─── Mental Health: Save Informed Consent ────────────────────────────
    @AuraEnabled
    public static SaveResult saveInformedConsent(Id waiverId, Id clientId, String fullName, Date signedDate, String year, Id waiverTemplateId, Id recordTypeId) {
        try {
            // Stamp the parent waiver
            VolunteerWaiver__c parentWaiver = new VolunteerWaiver__c(
                Id = waiverId,
                Informed_Consent__c = 'Completed',
                Informed_Consent_Name__c = fullName,
                Informed_Consent_Date__c = signedDate
            );
            update parentWaiver;

            // Create child waiver record (same pattern as ClientWaiver / ConfidentialityHippa)
            VolunteerWaiver__c childWaiver = new VolunteerWaiver__c(
                Client__c = clientId,
                Informed_Consent__c = 'Completed',
                Informed_Consent_Name__c = fullName,
                Informed_Consent_Date__c = signedDate,
                Signed_Name__c = fullName,
                Signed_Dated__c = signedDate,
                Year__c = year,
                RecordTypeId = recordTypeId,
                waiver__c = waiverTemplateId
            );
            insert childWaiver;

            return buildSuccessResult(waiverId);
        } catch (Exception e) {
            return buildErrorResult(e.getMessage());
        }
    }

    private static SaveResult buildErrorResult(String message) {
        SaveResult result = new SaveResult();
        result.success = false;
        result.errorMessage = message;
        return result;
    }
}