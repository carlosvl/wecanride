/**
 * Apex controller for the Admin Client Waiver Dashboard LWC.
 * Provides read-only summaries (all years), detail views, inline-edit,
 * and reset capabilities for admins viewing a Riders__c record page.
 *
 * Runs without sharing to match the original ReturnClientMenuController
 * behavior and give admins full visibility.
 */
public without sharing class ClientWaiverDashboardController {

    // ─── Wrapper Classes ───────────────────────────────────────────────

    /**
     * Lightweight per-year waiver summary returned by getWaiverSummaries.
     */
    public class WaiverSummary {
        @AuraEnabled public Id waiverId;
        @AuraEnabled public String year;
        @AuraEnabled public String programType;
        @AuraEnabled public Integer formsCompleted;
        @AuraEnabled public Integer totalForms;
        @AuraEnabled public Boolean applicationSubmitted;
        @AuraEnabled public Date createdDate;
        @AuraEnabled public Map<String, String> completionStatus;
    }

    /**
     * Full detail view for a single waiver record.
     */
    public class WaiverDetail {
        @AuraEnabled public VolunteerWaiver__c waiver;
        @AuraEnabled public List<SignatureInfo> signatures;
        @AuraEnabled public ClinicalData clinicalData;
        @AuraEnabled public Map<String, String> completionStatus;
    }

    /**
     * Extracted signature info from stamp fields.
     */
    public class SignatureInfo {
        @AuraEnabled public String formName;
        @AuraEnabled public String signedName;
        @AuraEnabled public Date signedDate;
        @AuraEnabled public String status;
    }

    /**
     * Clinical safety data aggregated from the Riders__c record
     * and the waiver's screening fields.
     */
    public class ClinicalData {
        @AuraEnabled public Boolean isFlagged;
        @AuraEnabled public String safetyFlags;
        @AuraEnabled public String safetyDetail;
        @AuraEnabled public String screeningStatus;
        @AuraEnabled public String diagnosesInfo;
        @AuraEnabled public String serviceType;
        @AuraEnabled public Boolean intakePaused;
    }

    /**
     * Generic result wrapper (matches ReturnClientMenuController.SaveResult).
     */
    public class SaveResult {
        @AuraEnabled public Boolean success;
        @AuraEnabled public String errorMessage;
        @AuraEnabled public Integer formsCompleted;
    }

    // ─── Step → Field Mappings ─────────────────────────────────────────

    /**
     * Maps each form step key to the waiver field(s) that should be
     * cleared when an admin resets that step.
     */
    private static final Map<String, List<String>> STEP_RESET_FIELDS = new Map<String, List<String>>{
        'mainInfo'              => new List<String>{ 'Main_Info__c' },
        'parentGuardian'        => new List<String>{ 'Parent_Guardian_Info__c' },
        'emergencyContact'      => new List<String>{ 'Emergency_Contact_Info__c' },
        'groupHome'             => new List<String>{ 'Group_Home_Info__c' },
        'photoRelease'          => new List<String>{ 'Photo_Release__c', 'Photo_Release_Name__c', 'Photo_Release_Date__c' },
        'emergencyTreatment'    => new List<String>{ 'Auth_for_Emerg_Med_Treatment__c', 'Auth_for_Emerg_Treatment_Date__c', 'Auth_for_Emerg_Treatment_Name__c' },
        'clientWaiver'          => new List<String>{ 'Client_Waiver__c', 'Client_Waiver_Date__c' },
        'medicalHistory'        => new List<String>{ 'Medical_History_Form_PL__c', 'Medical_History_Form__c' },
        'paymentInfo'           => new List<String>{ 'Payer_Info__c', 'Payer__c', 'Payer_Address__c', 'Payer_Phone__c', 'Payer_email__c', 'Payment_Signature_Name__c', 'Third_Party_Payer_Waiver_Name__c', 'Third_Party_Address__c', 'Third_Party_Contact__c', 'Third_Party_email__c' },
        'heightWeight'          => new List<String>{ 'WeightHeight__c' },
        'downSyndrome'          => new List<String>{ 'Down_Syndrome__c', 'Down_Syndrome_Date__c' },
        'seizureForm'           => new List<String>{ 'Seizure_Form__c', 'Seizure_Form_Date__c', 'Seizure_Information__c' },
        'scoliosis'             => new List<String>{ 'ScoliosisForm__c', 'Scoliosis_Form__c' },
        'confidentialityHippa'  => new List<String>{ 'Confidentiality_HIPPA__c', 'Confidentiality_HIPPA_Date__c' },
        'therapyCancellation'   => new List<String>{ 'Hippotherapy_Cancellation_Policy__c', 'Hippotherapy_Cancellation_Policy_Date__c' },
        'diagnoses'             => new List<String>{ 'Diagnoses_Info__c', 'Diagnoses__c' },
        'informedConsent'       => new List<String>{ 'Informed_Consent__c', 'Informed_Consent_Name__c', 'Informed_Consent_Date__c' }
    };

    /**
     * Allow-list of fields admins can update via inline edit.
     * Prevents arbitrary field writes.
     */
    private static final Set<String> ADMIN_EDITABLE_FIELDS = new Set<String>{
        // Stamp / status fields
        'Photo_Release__c', 'Photo_Release_Name__c', 'Photo_Release_Date__c',
        'Auth_for_Emerg_Med_Treatment__c',
        'Client_Waiver__c',
        'Medical_History_Form_PL__c',
        'Payer_Info__c', 'Payer__c', 'Payer_Address__c', 'Payer_Phone__c',
        'Payer_email__c', 'Payment_Signature_Name__c',
        'Third_Party_Payer_Waiver_Name__c', 'Third_Party_Address__c',
        'Third_Party_Contact__c', 'Third_Party_email__c',
        'WeightHeight__c',
        'Down_Syndrome__c', 'Down_Syndrome_Date__c',
        'Seizure_Form__c', 'Seizure_Form_Date__c', 'Seizure_Information__c',
        'ScoliosisForm__c', 'Scoliosis_Form__c',
        'Confidentiality_HIPPA__c', 'Confidentiality_HIPPA_Date__c',
        'Hippotherapy_Cancellation_Policy__c', 'Hippotherapy_Cancellation_Policy_Date__c',
        'Group_Home_Info__c',
        'Main_Info__c', 'Parent_Guardian_Info__c', 'Emergency_Contact_Info__c',
        'Program_Type__c', 'Service_Type__c', 'Clinical_Screening__c',
        'Informed_Consent__c', 'Informed_Consent_Name__c', 'Informed_Consent_Date__c',
        'Diagnoses_Info__c', 'Diagnoses__c',
        'Application_Submitted__c',
        // Insurance / medical
        'Health_Insurance_Co__c', 'Insurance_Policy__c',
        'Current_medications__c', 'Allergies_to_medications__c',
        'Schedule_Completed_PL__c'
    };

    // ─── Waiver field list (shared by queries) ─────────────────────────

    private static final String WAIVER_FIELDS =
        'Id, Client__c, Year__c, CreatedDate, Forms_Completed__c, ' +
        'Application_Submitted__c, ' +
        'Photo_Release__c, Photo_Release_Name__c, Photo_Release_Date__c, ' +
        'Auth_for_Emerg_Med_Treatment__c, Auth_for_Emerg_Treatment_Date__c, Auth_for_Emerg_Treatment_Name__c, ' +
        'Client_Waiver__c, Client_Waiver_Date__c, ' +
        'Medical_History_Form_PL__c, Medical_History_Form__c, ' +
        'Payer_Info__c, Payer__c, Payer_Address__c, Payer_Phone__c, ' +
        'Payer_email__c, Payment_Signature_Name__c, ' +
        'Third_Party_Payer_Waiver_Name__c, Third_Party_Address__c, ' +
        'Third_Party_Contact__c, Third_Party_email__c, ' +
        'WeightHeight__c, ' +
        'Down_Syndrome__c, Down_Syndrome_Date__c, ' +
        'Seizure_Form__c, Seizure_Form_Date__c, Seizure_Information__c, ' +
        'ScoliosisForm__c, Scoliosis_Form__c, ' +
        'Confidentiality_HIPPA__c, Confidentiality_HIPPA_Date__c, ' +
        'Hippotherapy_Cancellation_Policy__c, Hippotherapy_Cancellation_Policy_Date__c, ' +
        'Group_Home_Info__c, ' +
        'Main_Info__c, Parent_Guardian_Info__c, Emergency_Contact_Info__c, ' +
        'Program_Type__c, Service_Type__c, Clinical_Screening__c, ' +
        'Informed_Consent__c, Informed_Consent_Date__c, Informed_Consent_Name__c, ' +
        'Diagnoses_Info__c, Diagnoses__c, ' +
        'Health_Insurance_Co__c, Insurance_Policy__c, ' +
        'Current_medications__c, Allergies_to_medications__c, ' +
        'Schedule_Completed_PL__c, ' +
        'Signed_Name__c, Signed_Dated__c';

    // ─── Data Loading ──────────────────────────────────────────────────

    /**
     * Returns a lightweight summary for every VolunteerWaiver__c
     * belonging to the given Riders__c client, across ALL years.
     *
     * @param clientId  The Riders__c record Id (from recordId on the page)
     * @return List<WaiverSummary> ordered by year descending
     */
    @AuraEnabled(cacheable=true)
    public static List<WaiverSummary> getWaiverSummaries(Id clientId) {
        // Get the Client RecordType Id
        RecordType rt = [
            SELECT Id
            FROM RecordType
            WHERE DeveloperName = 'client'
            AND SobjectType = 'VolunteerWaiver__c'
            LIMIT 1
        ];

        // Riding step keys
        Set<String> ridingKeys = new Set<String>{
            'mainInfo', 'parentGuardian', 'emergencyContact', 'groupHome',
            'photoRelease', 'emergencyTreatment', 'clientWaiver',
            'medicalHistory', 'paymentInfo', 'heightWeight',
            'downSyndrome', 'seizureForm', 'scoliosis',
            'confidentialityHippa', 'therapyCancellation'
        };

        // Mental Health step keys
        Set<String> mentalHealthKeys = new Set<String>{
            'mainInfo', 'parentGuardian', 'emergencyContact', 'groupHome',
            'photoRelease', 'emergencyTreatment', 'clientWaiver',
            'paymentInfo', 'diagnoses', 'informedConsent',
            'confidentialityHippa', 'therapyCancellation'
        };

        List<VolunteerWaiver__c> waivers = [
            SELECT Id, Client__c, Year__c, CreatedDate, Forms_Completed__c,
                   Application_Submitted__c,
                   Photo_Release__c, Auth_for_Emerg_Med_Treatment__c,
                   Client_Waiver__c, Medical_History_Form_PL__c,
                   Payer_Info__c, WeightHeight__c,
                   Down_Syndrome__c, Seizure_Form__c, ScoliosisForm__c,
                   Confidentiality_HIPPA__c, Hippotherapy_Cancellation_Policy__c,
                   Group_Home_Info__c,
                   Main_Info__c, Parent_Guardian_Info__c, Emergency_Contact_Info__c,
                   Diagnoses_Info__c, Informed_Consent__c,
                   Program_Type__c, Service_Type__c, Clinical_Screening__c,
                   Schedule_Completed_PL__c
            FROM VolunteerWaiver__c
            WHERE Client__c = :clientId
            AND RecordTypeId = :rt.Id
            ORDER BY Year__c DESC, CreatedDate DESC
        ];

        List<WaiverSummary> summaries = new List<WaiverSummary>();
        for (VolunteerWaiver__c w : waivers) {
            WaiverSummary s = new WaiverSummary();
            s.waiverId = w.Id;
            s.year = w.Year__c;
            s.programType = String.isNotBlank(w.Program_Type__c) ? w.Program_Type__c : 'Riding';
            s.applicationSubmitted = (w.Application_Submitted__c == 'Yes');
            s.createdDate = w.CreatedDate.date();

            // Build completion map and count
            Map<String, String> statusMap = buildCompletionMap(w);
            s.completionStatus = statusMap;

            // Count completed vs total for the relevant program
            Set<String> relevantKeys = (s.programType == 'Mental Health') ? mentalHealthKeys : ridingKeys;
            s.totalForms = relevantKeys.size();
            Integer completed = 0;
            for (String key : relevantKeys) {
                String status = statusMap.get(key);
                if (status != null && status != '' && status != 'Not Started') {
                    completed++;
                }
            }
            s.formsCompleted = completed;

            summaries.add(s);
        }

        return summaries;
    }

    /**
     * Returns full detail for a single waiver record, including
     * extracted signatures and clinical data from the Riders__c parent.
     *
     * @param waiverId  The VolunteerWaiver__c Id
     * @return WaiverDetail with full field data
     */
    @AuraEnabled
    public static WaiverDetail getWaiverDetail(Id waiverId) {
        VolunteerWaiver__c waiver = [
            SELECT Id, Client__c, Year__c, CreatedDate, Forms_Completed__c,
                   Application_Submitted__c,
                   Photo_Release__c, Photo_Release_Name__c, Photo_Release_Date__c,
                   Auth_for_Emerg_Med_Treatment__c, Auth_for_Emerg_Treatment_Date__c, Auth_for_Emerg_Treatment_Name__c,
                   Client_Waiver__c, Client_Waiver_Date__c,
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
                   Program_Type__c, Service_Type__c, Clinical_Screening__c,
                   Informed_Consent__c, Informed_Consent_Date__c, Informed_Consent_Name__c,
                   Diagnoses_Info__c, Diagnoses__c,
                   Health_Insurance_Co__c, Insurance_Policy__c,
                   Current_medications__c, Allergies_to_medications__c,
                   Schedule_Completed_PL__c,
                   Signed_Name__c, Signed_Dated__c
            FROM VolunteerWaiver__c
            WHERE Id = :waiverId
            LIMIT 1
        ];

        WaiverDetail detail = new WaiverDetail();
        detail.waiver = waiver;
        detail.completionStatus = buildCompletionMap(waiver);

        // Extract signatures from stamp fields
        detail.signatures = extractSignatures(waiver);

        // Get clinical data from the parent Riders__c record
        detail.clinicalData = getClinicalDataForClient(waiver.Client__c, waiver);

        return detail;
    }

    // ─── Admin Actions ─────────────────────────────────────────────────

    /**
     * Resets a single form step by clearing its stamp field(s) to null.
     *
     * @param waiverId  The VolunteerWaiver__c Id
     * @param stepKey   The form step key (e.g., 'photoRelease', 'clientWaiver')
     * @return SaveResult
     */
    @AuraEnabled
    public static SaveResult resetFormStep(Id waiverId, String stepKey) {
        if (!STEP_RESET_FIELDS.containsKey(stepKey)) {
            return buildError('Invalid step key: ' + stepKey);
        }

        try {
            VolunteerWaiver__c waiver = new VolunteerWaiver__c(Id = waiverId);
            for (String field : STEP_RESET_FIELDS.get(stepKey)) {
                waiver.put(field, null);
            }
            update waiver;

            return buildSuccess(waiverId);
        } catch (Exception e) {
            return buildError(e.getMessage());
        }
    }

    /**
     * Resets ALL form steps on a waiver record.
     *
     * @param waiverId  The VolunteerWaiver__c Id
     * @return SaveResult
     */
    @AuraEnabled
    public static SaveResult resetAllFormSteps(Id waiverId) {
        try {
            VolunteerWaiver__c waiver = new VolunteerWaiver__c(Id = waiverId);
            for (String stepKey : STEP_RESET_FIELDS.keySet()) {
                for (String field : STEP_RESET_FIELDS.get(stepKey)) {
                    waiver.put(field, null);
                }
            }
            update waiver;

            return buildSuccess(waiverId);
        } catch (Exception e) {
            return buildError(e.getMessage());
        }
    }

    /**
     * Reopens a submitted application by setting Application_Submitted__c to null.
     *
     * @param waiverId  The VolunteerWaiver__c Id
     * @return SaveResult
     */
    @AuraEnabled
    public static SaveResult reopenApplication(Id waiverId) {
        try {
            VolunteerWaiver__c waiver = new VolunteerWaiver__c(
                Id = waiverId,
                Application_Submitted__c = null
            );
            update waiver;

            return buildSuccess(waiverId);
        } catch (Exception e) {
            return buildError(e.getMessage());
        }
    }

    /**
     * Inline-edit: updates one or more admin-editable fields on a waiver.
     * Validates each field name against ADMIN_EDITABLE_FIELDS allow-list.
     *
     * @param waiverId    The VolunteerWaiver__c Id
     * @param fieldValues Map of field API name → new value (JSON-serialized from LWC)
     * @return SaveResult
     */
    @AuraEnabled
    public static SaveResult adminUpdateWaiverFields(Id waiverId, Map<String, Object> fieldValues) {
        // Validate every field is on the allow-list
        for (String fieldName : fieldValues.keySet()) {
            if (!ADMIN_EDITABLE_FIELDS.contains(fieldName)) {
                return buildError('Field not editable: ' + fieldName);
            }
        }

        try {
            VolunteerWaiver__c waiver = new VolunteerWaiver__c(Id = waiverId);
            for (String fieldName : fieldValues.keySet()) {
                waiver.put(fieldName, fieldValues.get(fieldName));
            }
            update waiver;

            return buildSuccess(waiverId);
        } catch (Exception e) {
            return buildError(e.getMessage());
        }
    }

    // ─── Private Helpers ───────────────────────────────────────────────

    /**
     * Builds a map of form step → completion status from waiver stamp fields.
     * Mirrors the logic in ReturnClientMenuController.buildCompletionMap.
     */
    private static Map<String, String> buildCompletionMap(VolunteerWaiver__c waiver) {
        Map<String, String> statusMap = new Map<String, String>();

        // Profile forms
        statusMap.put('mainInfo',
            waiver != null && waiver.Main_Info__c == 'Completed' ? 'Completed' : 'Not Started');
        statusMap.put('parentGuardian',
            waiver != null && waiver.Parent_Guardian_Info__c == 'Completed' ? 'Completed' : 'Not Started');
        statusMap.put('emergencyContact',
            waiver != null && waiver.Emergency_Contact_Info__c == 'Completed' ? 'Completed' : 'Not Started');

        if (waiver == null) {
            for (String key : new List<String>{
                'groupHome', 'photoRelease', 'emergencyTreatment', 'clientWaiver',
                'medicalHistory', 'paymentInfo', 'heightWeight', 'downSyndrome',
                'seizureForm', 'scoliosis', 'confidentialityHippa', 'therapyCancellation',
                'diagnoses', 'informedConsent'
            }) {
                statusMap.put(key, 'Not Started');
            }
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

        // Mental Health specific
        statusMap.put('diagnoses',
            waiver.Diagnoses_Info__c == 'Completed' ? 'Completed' : 'Not Started');
        statusMap.put('informedConsent',
            waiver.Informed_Consent__c == 'Completed' ? 'Completed' : 'Not Started');

        return statusMap;
    }

    /**
     * Extracts signature information from the various stamp fields.
     */
    private static List<SignatureInfo> extractSignatures(VolunteerWaiver__c w) {
        List<SignatureInfo> sigs = new List<SignatureInfo>();

        // Photo Release
        if (String.isNotBlank(w.Photo_Release_Name__c)) {
            sigs.add(createSig('Photo Release', w.Photo_Release_Name__c, w.Photo_Release_Date__c, w.Photo_Release__c));
        }

        // Emergency Treatment
        if (String.isNotBlank(w.Auth_for_Emerg_Treatment_Name__c)) {
            sigs.add(createSig('Emergency Treatment', w.Auth_for_Emerg_Treatment_Name__c, w.Auth_for_Emerg_Treatment_Date__c, w.Auth_for_Emerg_Med_Treatment__c));
        }

        // Client Waiver
        if (w.Client_Waiver__c == 'Completed') {
            sigs.add(createSig('Client Waiver', w.Signed_Name__c, w.Client_Waiver_Date__c, 'Completed'));
        }

        // Payment / Payer
        if (String.isNotBlank(w.Payment_Signature_Name__c)) {
            sigs.add(createSig('Payment Info', w.Payment_Signature_Name__c, null, w.Payer_Info__c));
        }

        // Confidentiality / HIPPA
        if (w.Confidentiality_HIPPA__c == 'Yes') {
            sigs.add(createSig('Confidentiality/HIPPA', null, w.Confidentiality_HIPPA_Date__c, 'Completed'));
        }

        // Therapy Cancellation
        if (w.Hippotherapy_Cancellation_Policy__c == 'Yes') {
            sigs.add(createSig('Therapy Cancellation', null, w.Hippotherapy_Cancellation_Policy_Date__c, 'Completed'));
        }

        // Informed Consent (Mental Health)
        if (String.isNotBlank(w.Informed_Consent_Name__c)) {
            sigs.add(createSig('Informed Consent', w.Informed_Consent_Name__c, w.Informed_Consent_Date__c, w.Informed_Consent__c));
        }

        return sigs;
    }

    private static SignatureInfo createSig(String formName, String name, Date signedDate, String status) {
        SignatureInfo sig = new SignatureInfo();
        sig.formName = formName;
        sig.signedName = name;
        sig.signedDate = signedDate;
        sig.status = status;
        return sig;
    }

    /**
     * Loads clinical/safety data from the Riders__c parent record
     * combined with waiver-level screening fields.
     */
    private static ClinicalData getClinicalDataForClient(Id clientId, VolunteerWaiver__c waiver) {
        Riders__c client = [
            SELECT Id, Clinical_Safety_Flagged__c, Clinical_Safety_Flags__c,
                   Clinical_Safety_Detail__c, Intake_Paused__c,
                   Service_Type__c
            FROM Riders__c
            WHERE Id = :clientId
            LIMIT 1
        ];

        ClinicalData cd = new ClinicalData();
        cd.isFlagged = client.Clinical_Safety_Flagged__c;
        cd.safetyFlags = client.Clinical_Safety_Flags__c;
        cd.safetyDetail = client.Clinical_Safety_Detail__c;
        cd.intakePaused = client.Intake_Paused__c;
        cd.serviceType = client.Service_Type__c;

        if (waiver != null) {
            cd.screeningStatus = waiver.Clinical_Screening__c;
            cd.diagnosesInfo = waiver.Diagnoses_Info__c;
        }

        return cd;
    }

    private static SaveResult buildSuccess(Id waiverId) {
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

    private static SaveResult buildError(String message) {
        SaveResult result = new SaveResult();
        result.success = false;
        result.errorMessage = message;
        return result;
    }
}
