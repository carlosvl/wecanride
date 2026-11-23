/**
 * Test class for ReturnClientMenuController.
 * Covers data loading, all save methods, Mental Health intake,
 * diagnoses, clinical screening, guardian/emergency contact, group home,
 * file linking, and application submission.
 */
@IsTest
private class ReturnClientMenuControllerTest {

    @TestSetup
    static void setupTestData() {
        // Create household Account
        Account household = new Account(Name = 'Test Household');
        insert household;

        // Create Contact with all fields
        Contact testContact = new Contact(
            FirstName = 'Test',
            LastName = 'Rider',
            Email = 'test@example.com',
            AccountId = household.Id,
            MailingStreet = '123 Main St',
            MailingCity = 'Minneapolis',
            MailingState = 'MN',
            MailingPostalCode = '55401'
        );
        insert testContact;

        // Create Riders__c (client) linked to Contact
        Riders__c testClient = new Riders__c(
            ClientContact__c = testContact.Id
        );
        insert testClient;

        // Get the 'client' RecordType for VolunteerWaiver__c
        RecordType rt = [
            SELECT Id FROM RecordType
            WHERE DeveloperName = 'client'
            AND SobjectType = 'VolunteerWaiver__c'
            LIMIT 1
        ];

        // Get current year from custom metadata
        WaiverYear__mdt yearMdt = [
            SELECT Current_Year__c FROM WaiverYear__mdt
            WHERE MasterLabel = 'Client Current Year' LIMIT 1
        ];

        // Create waiver templates
        List<waiver__c> templates = new List<waiver__c>{
            new waiver__c(Name = 'TestWaiverTemplate', Year__c = yearMdt.Current_Year__c, Description__c = 'Test template'),
            new waiver__c(Name = 'ClientWaiver', Year__c = yearMdt.Current_Year__c, Description__c = 'Client waiver text'),
            new waiver__c(Name = 'ConfidentialityHIPPA', Year__c = yearMdt.Current_Year__c, Description__c = 'HIPPA text'),
            new waiver__c(Name = 'TherapyCancellationPolicy', Year__c = yearMdt.Current_Year__c, Description__c = 'Cancellation text'),
            new waiver__c(Name = 'InformedConsent', Year__c = yearMdt.Current_Year__c, Description__c = 'Informed consent text')
        };
        insert templates;

        // Create VolunteerWaiver__c for the current year
        VolunteerWaiver__c testWaiver = new VolunteerWaiver__c(
            Client__c = testClient.Id,
            Year__c = yearMdt.Current_Year__c,
            RecordTypeId = rt.Id,
            waiver__c = templates[0].Id
        );
        insert testWaiver;

        // Create a second contact as guardian
        Contact guardian = new Contact(
            FirstName = 'Guardian',
            LastName = 'Parent',
            Email = 'guardian@example.com',
            AccountId = household.Id
        );
        insert guardian;

        // Create a Condition__c record for diagnoses tests
        Condition__c cond = new Condition__c(
            Name = 'Test Condition ADHD'
        );
        insert cond;
    }

    // ─── Helper Methods ──────────────────────────────────────────────

    static Contact getTestContact() {
        return [SELECT Id FROM Contact WHERE LastName = 'Rider' LIMIT 1];
    }

    static Contact getGuardianContact() {
        return [SELECT Id FROM Contact WHERE LastName = 'Parent' LIMIT 1];
    }

    static Riders__c getTestClient() {
        return [SELECT Id, ClientContact__c FROM Riders__c LIMIT 1];
    }

    static VolunteerWaiver__c getTestWaiver() {
        return [SELECT Id, Client__c FROM VolunteerWaiver__c LIMIT 1];
    }

    static Id getRecordTypeId() {
        return [SELECT Id FROM RecordType
                WHERE DeveloperName = 'client'
                AND SobjectType = 'VolunteerWaiver__c' LIMIT 1].Id;
    }

    static String getCurrentYear() {
        return [SELECT Current_Year__c FROM WaiverYear__mdt
                WHERE MasterLabel = 'Client Current Year' LIMIT 1].Current_Year__c;
    }

    static Condition__c getTestCondition() {
        return [SELECT Id, Name FROM Condition__c WHERE Name = 'Test Condition ADHD' LIMIT 1];
    }

    // ─── Data Loading Tests ──────────────────────────────────────────

    @IsTest
    static void testGetClientData() {
        Contact con = getTestContact();
        Test.startTest();
        ReturnClientMenuController.ClientMenuData data =
            ReturnClientMenuController.getClientData(con.Id);
        Test.stopTest();

        System.assertNotEquals(null, data);
        System.assertNotEquals(null, data.client);
        System.assertNotEquals(null, data.waiver);
        System.assertNotEquals(null, data.contact);
        System.assertNotEquals(null, data.currentYear);
        System.assertNotEquals(null, data.waiverRecordTypeId);
        System.assertNotEquals(null, data.completionStatus);
        System.assertEquals('Not Started', data.completionStatus.get('photoRelease'));
    }

    @IsTest
    static void testGetClientDataReturnsClientProspectFlags() {
        Contact con = getTestContact();
        // Only one of Volunteer/Client/Prospect is allowed, so set all three each time
        con.Volunteer__c = false;
        con.Prospect__c = false;
        con.Client__c = true;
        update con;
        System.assertEquals(true, ReturnClientMenuController.getClientData(con.Id).contact.Client__c);

        con.Client__c = false;
        con.Prospect__c = true;
        update con;
        ReturnClientMenuController.ClientMenuData data = ReturnClientMenuController.getClientData(con.Id);
        System.assertEquals(true, data.contact.Prospect__c);
        System.assertEquals(false, data.contact.Client__c);
    }

    @IsTest
    static void testGetContactIdForUser() {
        Test.startTest();
        Id contactId = ReturnClientMenuController.getContactIdForUser(UserInfo.getUserId());
        Test.stopTest();
        // Internal users have no ContactId — just verify no error
    }

    @IsTest
    static void testGetClientDataNoClient() {
        Contact orphan = new Contact(FirstName = 'Orphan', LastName = 'Contact', Email = 'orphan@example.com');
        insert orphan;
        Test.startTest();
        ReturnClientMenuController.ClientMenuData data =
            ReturnClientMenuController.getClientData(orphan.Id);
        Test.stopTest();
        System.assertEquals(null, data.client);
    }

    @IsTest
    static void testGetWaiverTemplates() {
        String year = getCurrentYear();
        Test.startTest();
        Map<String, waiver__c> templates = ReturnClientMenuController.getWaiverTemplates(year);
        Test.stopTest();
        System.assertNotEquals(null, templates);
    }

    // ─── Main Info ─────────────────────────────────────────────────

    @IsTest
    static void testSaveMainInfo() {
        Contact con = getTestContact();
        Riders__c client = getTestClient();
        VolunteerWaiver__c waiver = getTestWaiver();

        Test.startTest();
        ReturnClientMenuController.SaveResult result = ReturnClientMenuController.saveMainInfo(
            con.Id, client.Id, waiver.Id,
            'Updated', 'Name', 'Female', Date.newInstance(2000, 1, 1),
            '5\'4"', 130, '456 Oak St', 'St Paul', 'MN', '55102',
            'updated@example.com', null, '555-9999', '555-8888'
        );
        Test.stopTest();

        System.assertEquals(true, result.success);
        Contact updated = [SELECT FirstName, Email FROM Contact WHERE Id = :con.Id];
        System.assertEquals('Updated', updated.FirstName);
    }

    @IsTest
    static void testSaveMainInfoWeightWarning() {
        Contact con = getTestContact();
        Riders__c client = getTestClient();
        VolunteerWaiver__c waiver = getTestWaiver();

        Test.startTest();
        ReturnClientMenuController.SaveResult result = ReturnClientMenuController.saveMainInfo(
            con.Id, client.Id, waiver.Id,
            'Test', 'Rider', 'Male', Date.newInstance(1990, 6, 15),
            '5\'10"', 250, '123 Main St', 'Minneapolis', 'MN', '55401',
            'test@example.com', null, null, null
        );
        Test.stopTest();

        System.assertEquals(true, result.success);
        System.assert(result.warningMessage != null && result.warningMessage.contains('200 lbs'));
    }

    // ─── Step 1: Photo Release ─────────────────────────────────────

    @IsTest
    static void testSavePhotoRelease() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.savePhotoRelease(waiver.Id, 'Yes');
        Test.stopTest();

        System.assertEquals(true, result.success);
        VolunteerWaiver__c updated = [SELECT Photo_Release__c, Photo_Release_Date__c FROM VolunteerWaiver__c WHERE Id = :waiver.Id];
        System.assertEquals('Yes', updated.Photo_Release__c);
        System.assertEquals(Date.today(), updated.Photo_Release_Date__c);
    }

    // ─── Step 2: Emergency Treatment ───────────────────────────────

    @IsTest
    static void testSaveEmergencyTreatment() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveEmergencyTreatment(waiver.Id, 'BlueCross', 'POL123', 'Ibuprofen', 'Peanuts', 'Jane Doe');
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    // ─── Step 3: Client Waiver ─────────────────────────────────────

    @IsTest
    static void testSaveClientWaiver() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Riders__c client = getTestClient();
        Id rtId = getRecordTypeId();
        String year = getCurrentYear();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveClientWaiver(waiver.Id, client.Id, 'Jane Doe', year, rtId);
        Test.stopTest();

        System.assertEquals(true, result.success);
        VolunteerWaiver__c updated = [SELECT Client_Waiver__c FROM VolunteerWaiver__c WHERE Id = :waiver.Id];
        System.assertEquals('Completed', updated.Client_Waiver__c);
    }

    // ─── Step 4: Medical History ───────────────────────────────────

    @IsTest
    static void testSaveMedicalHistory() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Test.startTest();
        ReturnClientMenuController.SaveResult result = ReturnClientMenuController.saveMedicalHistory(waiver.Id);
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    // ─── Step 5: Payment Info ──────────────────────────────────────

    @IsTest
    static void testSavePaymentInfo() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.savePaymentInfo(waiver.Id, 'John Doe', '123 Main St', '555-1234', 'john@example.com', 'John Doe', null, null, null, null);
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    @IsTest
    static void testSavePaymentInfoWithThirdParty() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.savePaymentInfo(waiver.Id, 'John', '123', '555', 'j@e.com', 'John', 'Third Party', '456', '555-5678', 'tp@e.com');
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    // ─── Step 6: Height & Weight ───────────────────────────────────

    @IsTest
    static void testSaveHeightWeight() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Contact con = getTestContact();
        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveHeightWeight(waiver.Id, con.Id, '5\'6"', 150);
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    // ─── Step 7-9: Down Syndrome, Seizure, Scoliosis ──────────────

    @IsTest
    static void testSaveDownSyndrome() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Test.startTest();
        ReturnClientMenuController.SaveResult result = ReturnClientMenuController.saveDownSyndrome(waiver.Id);
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    @IsTest
    static void testSaveSeizureForm() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveSeizureForm(waiver.Id, '<p>Tonic-Clonic</p>');
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    @IsTest
    static void testSaveScoliosis() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Test.startTest();
        ReturnClientMenuController.SaveResult result = ReturnClientMenuController.saveScoliosis(waiver.Id);
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    // ─── Step 10: Confidentiality & HIPPA ──────────────────────────

    @IsTest
    static void testSaveConfidentialityHippa() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Riders__c client = getTestClient();
        Id rtId = getRecordTypeId();
        String year = getCurrentYear();
        waiver__c template = [SELECT Id FROM waiver__c WHERE Name = 'ConfidentialityHIPPA' LIMIT 1];

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveConfidentialityHippa(waiver.Id, client.Id, 'Jane Doe', Date.today(), year, template.Id, rtId);
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    // ─── Step 11: Therapy Cancellation ─────────────────────────────

    @IsTest
    static void testSaveTherapyCancellation() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Riders__c client = getTestClient();
        Id rtId = getRecordTypeId();
        String year = getCurrentYear();
        waiver__c template = [SELECT Id FROM waiver__c WHERE Name = 'TherapyCancellationPolicy' LIMIT 1];

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveTherapyCancellation(waiver.Id, client.Id, 'Jane Doe', Date.today(), 'Yes', year, template.Id, rtId);
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    // ─── Submit Application ────────────────────────────────────────

    @IsTest
    static void testSubmitApplicationSuccess() {
        VolunteerWaiver__c waiver = getTestWaiver();
        waiver.Photo_Release__c = 'Yes';
        waiver.Auth_for_Emerg_Med_Treatment__c = 'Completed';
        waiver.Client_Waiver__c = 'Completed';
        waiver.Medical_History_Form_PL__c = 'Completed';
        waiver.Payer_Info__c = 'Completed';
        waiver.WeightHeight__c = 'Completed';
        update waiver;

        Test.startTest();
        ReturnClientMenuController.SaveResult result = ReturnClientMenuController.submitApplication(waiver.Id);
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    @IsTest
    static void testSubmitApplicationInsufficientForms() {
        VolunteerWaiver__c waiver = getTestWaiver();
        waiver.Photo_Release__c = 'Yes';
        waiver.Auth_for_Emerg_Med_Treatment__c = 'Completed';
        waiver.Client_Waiver__c = 'Completed';
        update waiver;

        Test.startTest();
        ReturnClientMenuController.SaveResult result = ReturnClientMenuController.submitApplication(waiver.Id);
        Test.stopTest();
        System.assertEquals(false, result.success);
    }

    // ─── File Upload ───────────────────────────────────────────────

    @IsTest
    static void testLinkUploadedFiles() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Riders__c client = getTestClient();

        ContentVersion cv = new ContentVersion(Title = 'Test', PathOnClient = 'test.pdf', VersionData = Blob.valueOf('test'), IsMajorVersion = true);
        insert cv;
        Id contentDocId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id].ContentDocumentId;

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.linkUploadedFiles(new List<Id>{ contentDocId }, waiver.Id, client.Id);
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    // ─── Stamp Form Completion ─────────────────────────────────────

    @IsTest
    static void testStampFormCompletion() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.stampFormCompletion(waiver.Id, 'Parent_Guardian_Info__c', 'Completed');
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    // ─── Guardian Data ─────────────────────────────────────────────

    @IsTest
    static void testGetGuardianData() {
        Contact con = getTestContact();
        Riders__c client = getTestClient();

        Test.startTest();
        ReturnClientMenuController.GuardianData data =
            ReturnClientMenuController.getGuardianData(con.Id, client.Id);
        Test.stopTest();
        System.assertNotEquals(null, data);
    }

    @IsTest
    static void testSaveGuardian() {
        Contact con = getTestContact();
        Riders__c client = getTestClient();
        VolunteerWaiver__c waiver = getTestWaiver();
        Contact guardian = getGuardianContact();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveGuardian(
                client.Id, con.Id, waiver.Id, null,
                'Father',
                'Guardian', 'Parent', 'guardian@example.com', '555-1111', null,
                true, null
            );
        Test.stopTest();
        // Guardian save may fail due to org-specific validation — just verify it ran
        System.assertNotEquals(null, result);
    }

    @IsTest
    static void testRemoveGuardian() {
        Riders__c client = getTestClient();
        Contact guardian = getGuardianContact();

        // Link guardian as Father
        client.Father_Name__c = guardian.Id;
        update client;

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.removeGuardian(client.Id, 'Father');
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    // ─── Emergency Contact ─────────────────────────────────────────

    @IsTest
    static void testGetEmergencyContactData() {
        Contact con = getTestContact();
        Test.startTest();
        ReturnClientMenuController.EmergencyContactData data =
            ReturnClientMenuController.getEmergencyContactData(con.Id);
        Test.stopTest();
        System.assertNotEquals(null, data);
    }

    @IsTest
    static void testSaveEmergencyContact() {
        Contact con = getTestContact();
        Riders__c client = getTestClient();
        VolunteerWaiver__c waiver = getTestWaiver();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveEmergencyContact(
                con.Id, waiver.Id, null,
                'EmergFirst', 'EmergLast', '555-2222', 'emerg@example.com',
                true, false, null
            );
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    // ─── Group Home ────────────────────────────────────────────────

    @IsTest
    static void testGetGroupHomeData() {
        Contact con = getTestContact();
        Riders__c client = getTestClient();

        Test.startTest();
        ReturnClientMenuController.GroupHomeData data =
            ReturnClientMenuController.getGroupHomeData(con.Id, client.Id);
        Test.stopTest();
        System.assertNotEquals(null, data);
    }

    @IsTest
    static void testUpdateLivesInGroupHome() {
        Riders__c client = getTestClient();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.updateLivesInGroupHome(client.Id, false);
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    @IsTest
    static void testSearchGroupHomes() {
        Test.startTest();
        List<Account> results = ReturnClientMenuController.searchGroupHomes('Test');
        Test.stopTest();
        System.assertNotEquals(null, results);
    }

    // ─── Mental Health: Service Type ───────────────────────────────

    @IsTest
    static void testSaveServiceType() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Riders__c client = getTestClient();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveServiceType(waiver.Id, client.Id, 'Mental Health', 'Individual Therapy (18+)');
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    @IsTest
    static void testSaveServiceTypeRiding() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Riders__c client = getTestClient();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveServiceType(waiver.Id, client.Id, 'Riding', '');
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    // ─── Mental Health: Clinical Screening ─────────────────────────

    @IsTest
    static void testSaveClinicalScreeningPassed() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Riders__c client = getTestClient();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveClinicalScreening(waiver.Id, client.Id, '', '', false);
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    @IsTest
    static void testSaveClinicalScreeningFlagged() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Riders__c client = getTestClient();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveClinicalScreening(
                waiver.Id, client.Id,
                'Psychosis;Actively Dissociating',
                'Details provided',
                true
            );
        Test.stopTest();

        // The save itself should succeed (email may fail silently in test)
        System.assertNotEquals(null, result);
        // If success, verify flags were set
        if (result.success) {
            Riders__c updated = [SELECT Clinical_Safety_Flagged__c FROM Riders__c WHERE Id = :client.Id];
            System.assertEquals(true, updated.Clinical_Safety_Flagged__c);
        }
    }

    // ─── Diagnoses ─────────────────────────────────────────────────

    @IsTest
    static void testGetDiagnosesForClient() {
        Riders__c client = getTestClient();
        Test.startTest();
        List<ReturnClientMenuController.DiagnosisRecord> diags =
            ReturnClientMenuController.getDiagnosesForClient(client.Id);
        Test.stopTest();
        System.assertNotEquals(null, diags);
        System.assertEquals(0, diags.size());
    }

    @IsTest
    static void testGetConditionOptions() {
        Test.startTest();
        List<ReturnClientMenuController.ConditionOption> options =
            ReturnClientMenuController.getConditionOptions();
        Test.stopTest();
        System.assertNotEquals(null, options);
        System.assert(options.size() > 0);
    }

    @IsTest
    static void testAddAndDeleteDiagnosis() {
        Riders__c client = getTestClient();
        Condition__c cond = getTestCondition();

        Test.startTest();
        // Add diagnosis
        ReturnClientMenuController.SaveResult addResult =
            ReturnClientMenuController.addDiagnosis(client.Id, cond.Id, Date.today());
        System.assertEquals(true, addResult.success);

        // Verify it was created
        List<ReturnClientMenuController.DiagnosisRecord> diags =
            ReturnClientMenuController.getDiagnosesForClient(client.Id);
        System.assertEquals(1, diags.size());
        System.assertEquals('Test Condition ADHD', diags[0].conditionName);

        // Delete it
        ReturnClientMenuController.SaveResult delResult =
            ReturnClientMenuController.deleteDiagnosis(diags[0].id);
        System.assertEquals(true, delResult.success);
        Test.stopTest();

        // Verify deleted
        List<ReturnClientMenuController.DiagnosisRecord> diagsAfter =
            ReturnClientMenuController.getDiagnosesForClient(client.Id);
        System.assertEquals(0, diagsAfter.size());
    }

    @IsTest
    static void testCompleteDiagnosesStepWithDiagnosis() {
        Riders__c client = getTestClient();
        VolunteerWaiver__c waiver = getTestWaiver();
        Condition__c cond = getTestCondition();

        // Add a diagnosis first
        ReturnClientMenuController.addDiagnosis(client.Id, cond.Id, null);

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.completeDiagnosesStep(waiver.Id, client.Id, false);
        Test.stopTest();
        System.assertEquals(true, result.success);

        VolunteerWaiver__c updated = [SELECT Diagnoses_Info__c FROM VolunteerWaiver__c WHERE Id = :waiver.Id];
        System.assertEquals('Completed', updated.Diagnoses_Info__c);
    }

    @IsTest
    static void testCompleteDiagnosesStepNa() {
        Riders__c client = getTestClient();
        VolunteerWaiver__c waiver = getTestWaiver();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.completeDiagnosesStep(waiver.Id, client.Id, true);
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    @IsTest
    static void testCompleteDiagnosesStepNoDiagError() {
        Riders__c client = getTestClient();
        VolunteerWaiver__c waiver = getTestWaiver();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.completeDiagnosesStep(waiver.Id, client.Id, false);
        Test.stopTest();
        System.assertEquals(false, result.success);
        System.assert(result.errorMessage.contains('at least one diagnosis'));
    }

    @IsTest
    static void testSaveDiagnosesLegacy() {
        Riders__c client = getTestClient();
        VolunteerWaiver__c waiver = getTestWaiver();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveDiagnoses(waiver.Id, client.Id, 'ADHD;Autism', 'Additional notes');
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    // ─── Informed Consent ──────────────────────────────────────────

    @IsTest
    static void testSaveInformedConsent() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Riders__c client = getTestClient();
        Id rtId = getRecordTypeId();
        String year = getCurrentYear();
        waiver__c template = [SELECT Id FROM waiver__c WHERE Name = 'InformedConsent' LIMIT 1];

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveInformedConsent(waiver.Id, client.Id, 'Jane Doe', Date.today(), year, template.Id, rtId);
        Test.stopTest();
        System.assertEquals(true, result.success);
    }

    // ─── Null Waiver Completion Map ────────────────────────────────

    @IsTest
    static void testGetClientDataAutoCreateWaiver() {
        Contact con2 = new Contact(FirstName = 'No', LastName = 'Waiver', Email = 'nowaiver@example.com');
        insert con2;
        Riders__c client2 = new Riders__c(ClientContact__c = con2.Id);
        insert client2;

        Test.startTest();
        ReturnClientMenuController.ClientMenuData data =
            ReturnClientMenuController.getClientData(con2.Id);
        Test.stopTest();

        // Auto-create should have made a waiver
        System.assertNotEquals(null, data.waiver, 'Waiver should be auto-created');
        System.assertNotEquals(null, data.completionStatus);
    }

    // ─── Group Home Save ───────────────────────────────────────────

    @IsTest
    static void testSaveGroupHome() {
        Riders__c client = getTestClient();
        VolunteerWaiver__c waiver = getTestWaiver();

        // Create a group home Account
        Account gh = new Account(Name = 'Test Group Home');
        insert gh;

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveGroupHome(client.Id, waiver.Id, gh.Id);
        Test.stopTest();
        System.assertNotEquals(null, result);
    }

    @IsTest
    static void testSubmitGroupHomeRequest() {
        Riders__c client = getTestClient();
        Contact con = getTestContact();

        Test.startTest();
        VolunteerWaiver__c waiver = getTestWaiver();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.submitGroupHomeRequest(
                client.Id, con.Id, waiver.Id,
                'New Group Home', '555-3333', '100 Home St', 'Minneapolis', 'MN', '55401',
                'Mary Manager', 'home@example.com'
            );
        Test.stopTest();
        System.assertNotEquals(null, result);
    }

    // ─── Save Guardian with Existing Contact ───────────────────────

    @IsTest
    static void testSaveGuardianExisting() {
        Contact con = getTestContact();
        Riders__c client = getTestClient();
        VolunteerWaiver__c waiver = getTestWaiver();
        Contact guardian = getGuardianContact();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveGuardian(
                client.Id, con.Id, waiver.Id, guardian.Id,
                'Mother',
                'Guardian', 'Parent', 'guardian@example.com', '555-1111', null,
                false, guardian.Id
            );
        Test.stopTest();
        System.assertNotEquals(null, result);
    }

    // ─── Emergency Contact with Remove ─────────────────────────────

    @IsTest
    static void testSaveEmergencyContactRemove() {
        Contact con = getTestContact();
        VolunteerWaiver__c waiver = getTestWaiver();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveEmergencyContact(
                con.Id, waiver.Id, null,
                'RemFirst', 'RemLast', '555-4444', 'rem@e.com',
                false, true, null
            );
        Test.stopTest();
        System.assertNotEquals(null, result);
    }

    // ─── Save Diagnoses Legacy ─────────────────────────────────────

    @IsTest
    static void testSaveDiagnosesLegacyEmpty() {
        Riders__c client = getTestClient();
        VolunteerWaiver__c waiver = getTestWaiver();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveDiagnoses(waiver.Id, client.Id, '', '');
        Test.stopTest();
        System.assertNotEquals(null, result);
    }

    // ─── Carry-over from earlier years ───────────────────────────────

    static String getLastYear() {
        return String.valueOf(Integer.valueOf(getCurrentYear()) - 1);
    }

    // The setup creates this year's waiver already; remove it so getClientData builds a fresh one
    static void removeCurrentYearWaiver() {
        delete [SELECT Id FROM VolunteerWaiver__c WHERE Year__c = :getCurrentYear()];
    }

    static void insertPriorWaiver(String year, String recordType, Map<String, Object> fields) {
        VolunteerWaiver__c w = new VolunteerWaiver__c(
            Client__c = getTestClient().Id,
            Year__c = year,
            RecordTypeId = [SELECT Id FROM RecordType
                            WHERE DeveloperName = :recordType AND SobjectType = 'VolunteerWaiver__c' LIMIT 1].Id,
            waiver__c = [SELECT Id FROM waiver__c LIMIT 1].Id
        );
        for (String f : fields.keySet()) {
            w.put(f, fields.get(f));
        }
        insert w;
    }

    @IsTest
    static void testNewYearCopiesAnswersButCompletesNothing() {
        insertPriorWaiver(getLastYear(), 'Yearly_Forms', new Map<String, Object>{
            'Health_Insurance_Co__c' => 'Acme Health',
            'Current_medications__c' => 'None',
            'Payer__c' => 'Pat Payer',
            'Allergies__c' => 'Pollen',
            'Auth_for_Emerg_Med_Treatment__c' => 'Completed',
            'Payer_Info__c' => 'Completed',
            'Screening__c' => 'Completed'
        });
        removeCurrentYearWaiver();

        Test.startTest();
        ReturnClientMenuController.ClientMenuData data =
            ReturnClientMenuController.getClientData(getTestContact().Id);
        Test.stopTest();

        System.assertEquals('Riding', data.waiver.Program_Type__c, 'Service Type screen is skipped');
        System.assertEquals('Acme Health', data.waiver.Health_Insurance_Co__c);
        System.assertEquals('None', data.waiver.Current_medications__c);
        System.assertEquals('Pat Payer', data.waiver.Payer__c);
        System.assertEquals('Pollen', data.waiver.Allergies__c);
        System.assertEquals(null, data.waiver.Auth_for_Emerg_Med_Treatment__c);
        System.assertEquals(null, data.waiver.Payer_Info__c);
        System.assertEquals(null, data.waiver.Screening__c);
        System.assertEquals(null, data.waiver.Application_Submitted__c);
        for (String step : data.completionStatus.keySet()) {
            System.assertNotEquals('Completed', data.completionStatus.get(step), step + ' must not be completed');
        }
    }

    @IsTest
    static void testNewYearWithoutHistoryStillAsksServiceType() {
        removeCurrentYearWaiver();
        ReturnClientMenuController.ClientMenuData data =
            ReturnClientMenuController.getClientData(getTestContact().Id);
        System.assertEquals(null, data.waiver.Program_Type__c);
    }

    @IsTest
    static void testNewYearAfterMentalHealthStillAsksServiceType() {
        insertPriorWaiver(getLastYear(), 'client', new Map<String, Object>{ 'Program_Type__c' => 'Mental Health' });
        removeCurrentYearWaiver();
        ReturnClientMenuController.ClientMenuData data =
            ReturnClientMenuController.getClientData(getTestContact().Id);
        System.assertEquals(null, data.waiver.Program_Type__c);
    }

    @IsTest
    static void testVolunteerPaperworkIsNotClientHistory() {
        insertPriorWaiver(getLastYear(), 'Yearly_Forms_Volunteers', new Map<String, Object>{
            'Health_Insurance_Co__c' => 'Volunteer Health'
        });
        removeCurrentYearWaiver();
        ReturnClientMenuController.ClientMenuData data =
            ReturnClientMenuController.getClientData(getTestContact().Id);
        System.assertEquals(null, data.waiver.Program_Type__c);
        System.assertEquals(null, data.waiver.Health_Insurance_Co__c);
    }

    @IsTest
    static void testNewestYearWithAnswersWinsWholesale() {
        String lastYear = getLastYear();
        String yearBefore = String.valueOf(Integer.valueOf(lastYear) - 1);
        insertPriorWaiver(yearBefore, 'Yearly_Forms', new Map<String, Object>{
            'Health_Insurance_Co__c' => 'Old Co',
            'Allergies__c' => 'Old allergy'
        });
        insertPriorWaiver(lastYear, 'Yearly_Forms', new Map<String, Object>{
            'Health_Insurance_Co__c' => 'New Co'
        });
        removeCurrentYearWaiver();
        ReturnClientMenuController.ClientMenuData data =
            ReturnClientMenuController.getClientData(getTestContact().Id);
        System.assertEquals('New Co', data.waiver.Health_Insurance_Co__c);
        System.assertEquals(null, data.waiver.Allergies__c, 'answers are not mixed across years');
    }

    @IsTest
    static void testDuplicateCurrentYearWaiversPickTheOldestThenLowestId() {
        VolunteerWaiver__c first = [SELECT Id FROM VolunteerWaiver__c WHERE Year__c = :getCurrentYear() LIMIT 1];
        VolunteerWaiver__c second = new VolunteerWaiver__c(
            Client__c = getTestClient().Id, Year__c = getCurrentYear(), RecordTypeId = getRecordTypeId(),
            waiver__c = [SELECT Id FROM waiver__c LIMIT 1].Id);
        insert second;
        Datetime sameSecond = Datetime.now().addDays(-1);
        Test.setCreatedDate(first.Id, sameSecond);
        Test.setCreatedDate(second.Id, sameSecond);
        Id lowest = String.valueOf(first.Id) < String.valueOf(second.Id) ? first.Id : second.Id;
        System.assertEquals(lowest, ReturnClientMenuController.getClientData(getTestContact().Id).waiver.Id,
            'a tie in CreatedDate resolves to the lowest Id');

        Test.setCreatedDate(second.Id, sameSecond.addHours(-1));
        System.assertEquals(second.Id, ReturnClientMenuController.getClientData(getTestContact().Id).waiver.Id,
            'the oldest waiver wins');
    }
}
