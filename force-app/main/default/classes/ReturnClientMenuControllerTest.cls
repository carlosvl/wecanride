/**
 * Test class for ReturnClientMenuController.
 * Covers all 11 save methods, data loading, file linking, and application submission.
 */
@IsTest
private class ReturnClientMenuControllerTest {

    @TestSetup
    static void setupTestData() {
        // Create Contact with Height/Weight fields
        Contact testContact = new Contact(
            FirstName = 'Test',
            LastName = 'Rider',
            Email = 'test@example.com'
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

        // Create a waiver template record (required lookup on VolunteerWaiver__c)
        waiver__c waiverTemplate = new waiver__c(
            Name = 'TestWaiverTemplate',
            Year__c = yearMdt.Current_Year__c,
            Description__c = 'Test waiver template description'
        );
        insert waiverTemplate;

        // Create VolunteerWaiver__c for the current year
        VolunteerWaiver__c testWaiver = new VolunteerWaiver__c(
            Client__c = testClient.Id,
            Year__c = yearMdt.Current_Year__c,
            RecordTypeId = rt.Id,
            waiver__c = waiverTemplate.Id
        );
        insert testWaiver;
    }

    // ─── Helper Methods ──────────────────────────────────────────────

    static Contact getTestContact() {
        return [SELECT Id FROM Contact WHERE LastName = 'Rider' LIMIT 1];
    }

    static Riders__c getTestClient() {
        return [SELECT Id FROM Riders__c LIMIT 1];
    }

    static VolunteerWaiver__c getTestWaiver() {
        return [SELECT Id FROM VolunteerWaiver__c LIMIT 1];
    }

    static Id getRecordTypeId() {
        return [SELECT Id FROM RecordType
                WHERE DeveloperName = 'client'
                AND SobjectType = 'VolunteerWaiver__c' LIMIT 1].Id;
    }

    // ─── Data Loading Tests ──────────────────────────────────────────

    @IsTest
    static void testGetClientData() {
        Contact con = getTestContact();

        Test.startTest();
        ReturnClientMenuController.ClientMenuData data =
            ReturnClientMenuController.getClientData(con.Id);
        Test.stopTest();

        System.assertNotEquals(null, data, 'ClientMenuData should not be null');
        System.assertNotEquals(null, data.client, 'Client should be loaded');
        System.assertNotEquals(null, data.waiver, 'Waiver should be loaded');
        System.assertNotEquals(null, data.contact, 'Contact should be loaded');
        System.assertNotEquals(null, data.currentYear, 'Current year should be set');
        System.assertNotEquals(null, data.waiverRecordTypeId, 'Record type Id should be set');
        System.assertNotEquals(null, data.completionStatus, 'Completion status map should be set');
        System.assertEquals('Not Started', data.completionStatus.get('photoRelease'),
            'Photo release should start as Not Started');
    }

    @IsTest
    static void testGetContactIdForUser() {
        // Test with the running user (internal user, no Contact)
        Test.startTest();
        Id contactId = ReturnClientMenuController.getContactIdForUser(UserInfo.getUserId());
        Test.stopTest();

        // Internal users typically have no ContactId, so this should be null
        // The method should still run without error
        // Community users would have a ContactId
    }

    @IsTest
    static void testGetClientDataNoClient() {
        // Create a Contact with no linked active client
        Contact orphanContact = new Contact(
            FirstName = 'Orphan',
            LastName = 'Contact',
            Email = 'orphan@example.com'
        );
        insert orphanContact;

        Test.startTest();
        ReturnClientMenuController.ClientMenuData data =
            ReturnClientMenuController.getClientData(orphanContact.Id);
        Test.stopTest();

        System.assertEquals(null, data.client, 'Client should be null for orphan contact');
    }

    @IsTest
    static void testGetWaiverTemplates() {
        WaiverYear__mdt yearMdt = [
            SELECT Current_Year__c FROM WaiverYear__mdt
            WHERE MasterLabel = 'Client Current Year' LIMIT 1
        ];

        Test.startTest();
        Map<String, waiver__c> templates =
            ReturnClientMenuController.getWaiverTemplates(yearMdt.Current_Year__c);
        Test.stopTest();

        // Templates may or may not exist in test context depending on org data
        System.assertNotEquals(null, templates, 'Templates map should not be null');
    }

    // ─── Step 1: Photo Release ───────────────────────────────────────

    @IsTest
    static void testSavePhotoRelease() {
        VolunteerWaiver__c waiver = getTestWaiver();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.savePhotoRelease(waiver.Id, 'Yes');
        Test.stopTest();

        System.assertEquals(true, result.success, 'Save should succeed');
        System.assert(result.formsCompleted >= 1, 'At least 1 form should be completed');

        VolunteerWaiver__c updated = [
            SELECT Photo_Release__c, Photo_Release_Date__c
            FROM VolunteerWaiver__c WHERE Id = :waiver.Id
        ];
        System.assertEquals('Yes', updated.Photo_Release__c);
        System.assertEquals(Date.today(), updated.Photo_Release_Date__c);
    }

    // ─── Step 2: Emergency Treatment ─────────────────────────────────

    @IsTest
    static void testSaveEmergencyTreatment() {
        VolunteerWaiver__c waiver = getTestWaiver();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveEmergencyTreatment(
                waiver.Id,
                'BlueCross',
                'POL123',
                'Ibuprofen',
                'Peanuts',
                'Jane Doe'
            );
        Test.stopTest();

        System.assertEquals(true, result.success);
    }

    // ─── Step 3: Client Waiver ───────────────────────────────────────

    @IsTest
    static void testSaveClientWaiver() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Riders__c client = getTestClient();
        Id rtId = getRecordTypeId();
        WaiverYear__mdt yearMdt = [
            SELECT Current_Year__c FROM WaiverYear__mdt
            WHERE MasterLabel = 'Client Current Year' LIMIT 1
        ];

        // Create the ClientWaiver template so the method can find it
        waiver__c clientWaiverTemplate = new waiver__c(
            Name = 'ClientWaiver',
            Year__c = yearMdt.Current_Year__c,
            Description__c = 'Test client waiver text'
        );
        insert clientWaiverTemplate;

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveClientWaiver(
                waiver.Id,
                client.Id,
                'Jane Doe',
                yearMdt.Current_Year__c,
                rtId
            );
        Test.stopTest();

        System.assertEquals(true, result.success, 'Client waiver save should succeed');

        // Verify parent waiver stamped
        VolunteerWaiver__c updated = [
            SELECT Client_Waiver__c FROM VolunteerWaiver__c WHERE Id = :waiver.Id
        ];
        System.assertEquals('Completed', updated.Client_Waiver__c);

        // Verify child waiver created
        List<VolunteerWaiver__c> children = [
            SELECT Id, Client_Waiver__c, Signed_Name__c
            FROM VolunteerWaiver__c
            WHERE Client__c = :client.Id
            AND Id != :waiver.Id
        ];
        System.assert(!children.isEmpty(), 'Child waiver should be created');
    }

    // ─── Step 4: Medical History ─────────────────────────────────────

    @IsTest
    static void testSaveMedicalHistory() {
        VolunteerWaiver__c waiver = getTestWaiver();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveMedicalHistory(waiver.Id);
        Test.stopTest();

        System.assertEquals(true, result.success);

        VolunteerWaiver__c updated = [
            SELECT Medical_History_Form_PL__c FROM VolunteerWaiver__c WHERE Id = :waiver.Id
        ];
        System.assertEquals('Completed', updated.Medical_History_Form_PL__c);
    }

    // ─── Step 5: Payment Info ────────────────────────────────────────

    @IsTest
    static void testSavePaymentInfo() {
        VolunteerWaiver__c waiver = getTestWaiver();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.savePaymentInfo(
                waiver.Id,
                'John Doe',
                '123 Main St',
                '555-1234',
                'john@example.com',
                'John Doe',
                null, null, null, null
            );
        Test.stopTest();

        System.assertEquals(true, result.success);

        VolunteerWaiver__c updated = [
            SELECT Payer_Info__c, Payer__c FROM VolunteerWaiver__c WHERE Id = :waiver.Id
        ];
        System.assertEquals('Completed', updated.Payer_Info__c);
        System.assertEquals('John Doe', updated.Payer__c);
    }

    @IsTest
    static void testSavePaymentInfoWithThirdParty() {
        VolunteerWaiver__c waiver = getTestWaiver();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.savePaymentInfo(
                waiver.Id,
                'John Doe',
                '123 Main St',
                '555-1234',
                'john@example.com',
                'John Doe',
                'Third Party Inc',
                '456 Oak Ave',
                '555-5678',
                'third@example.com'
            );
        Test.stopTest();

        System.assertEquals(true, result.success);

        VolunteerWaiver__c updated = [
            SELECT Third_Party_Payer_Waiver_Name__c
            FROM VolunteerWaiver__c WHERE Id = :waiver.Id
        ];
        System.assertEquals('Third Party Inc', updated.Third_Party_Payer_Waiver_Name__c);
    }

    // ─── Step 6: Height & Weight ─────────────────────────────────────

    @IsTest
    static void testSaveHeightWeight() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Contact con = getTestContact();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveHeightWeight(
                waiver.Id,
                con.Id,
                '5\'6"',
                150
            );
        Test.stopTest();

        System.assertEquals(true, result.success);

        VolunteerWaiver__c updatedWaiver = [
            SELECT WeightHeight__c FROM VolunteerWaiver__c WHERE Id = :waiver.Id
        ];
        System.assertEquals('Completed', updatedWaiver.WeightHeight__c);
    }

    // ─── Step 7: Down Syndrome ───────────────────────────────────────

    @IsTest
    static void testSaveDownSyndrome() {
        VolunteerWaiver__c waiver = getTestWaiver();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveDownSyndrome(waiver.Id);
        Test.stopTest();

        System.assertEquals(true, result.success);

        VolunteerWaiver__c updated = [
            SELECT Down_Syndrome__c FROM VolunteerWaiver__c WHERE Id = :waiver.Id
        ];
        System.assertEquals('Completed', updated.Down_Syndrome__c);
    }

    // ─── Step 8: Seizure Form ────────────────────────────────────────

    @IsTest
    static void testSaveSeizureForm() {
        VolunteerWaiver__c waiver = getTestWaiver();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveSeizureForm(
                waiver.Id,
                '<p>Type: Tonic-Clonic</p><p>Duration: 2-3 minutes</p>'
            );
        Test.stopTest();

        System.assertEquals(true, result.success);

        VolunteerWaiver__c updated = [
            SELECT Seizure_Form__c, Seizure_Information__c
            FROM VolunteerWaiver__c WHERE Id = :waiver.Id
        ];
        System.assertEquals('Completed', updated.Seizure_Form__c);
        System.assert(updated.Seizure_Information__c.contains('Tonic-Clonic'));
    }

    // ─── Step 9: Scoliosis ──────────────────────────────────────────

    @IsTest
    static void testSaveScoliosis() {
        VolunteerWaiver__c waiver = getTestWaiver();

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveScoliosis(waiver.Id);
        Test.stopTest();

        System.assertEquals(true, result.success);

        VolunteerWaiver__c updated = [
            SELECT ScoliosisForm__c FROM VolunteerWaiver__c WHERE Id = :waiver.Id
        ];
        System.assertEquals('Completed', updated.ScoliosisForm__c);
    }

    // ─── Step 10: Confidentiality & HIPPA ────────────────────────────

    @IsTest
    static void testSaveConfidentialityHippa() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Riders__c client = getTestClient();
        Id rtId = getRecordTypeId();
        WaiverYear__mdt yearMdt = [
            SELECT Current_Year__c FROM WaiverYear__mdt
            WHERE MasterLabel = 'Client Current Year' LIMIT 1
        ];

        // Create a waiver template if needed (use a mock Id for the template)
        // In a real org, waiver__c templates would exist. For test, we create one.
        waiver__c template = new waiver__c(
            Name = 'ConfidentialityHIPPA',
            Year__c = yearMdt.Current_Year__c,
            Description__c = 'Test HIPPA Description'
        );
        insert template;

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveConfidentialityHippa(
                waiver.Id,
                client.Id,
                'Jane Doe',
                Date.today(),
                yearMdt.Current_Year__c,
                template.Id,
                rtId
            );
        Test.stopTest();

        System.assertEquals(true, result.success);

        VolunteerWaiver__c updated = [
            SELECT Confidentiality_HIPPA__c FROM VolunteerWaiver__c WHERE Id = :waiver.Id
        ];
        System.assertEquals('Yes', updated.Confidentiality_HIPPA__c);
    }

    // ─── Step 11: Therapy Cancellation ───────────────────────────────

    @IsTest
    static void testSaveTherapyCancellation() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Riders__c client = getTestClient();
        Id rtId = getRecordTypeId();
        WaiverYear__mdt yearMdt = [
            SELECT Current_Year__c FROM WaiverYear__mdt
            WHERE MasterLabel = 'Client Current Year' LIMIT 1
        ];

        waiver__c template = new waiver__c(
            Name = 'TherapyCancellationPolicy',
            Year__c = yearMdt.Current_Year__c,
            Description__c = 'Test Therapy Cancellation Description'
        );
        insert template;

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.saveTherapyCancellation(
                waiver.Id,
                client.Id,
                'Jane Doe',
                Date.today(),
                'Yes',
                yearMdt.Current_Year__c,
                template.Id,
                rtId
            );
        Test.stopTest();

        System.assertEquals(true, result.success);

        VolunteerWaiver__c updated = [
            SELECT Hippotherapy_Cancellation_Policy__c
            FROM VolunteerWaiver__c WHERE Id = :waiver.Id
        ];
        System.assertEquals('Yes', updated.Hippotherapy_Cancellation_Policy__c);
    }

    // ─── Submit Application Tests ────────────────────────────────────

    @IsTest
    static void testSubmitApplicationSuccess() {
        VolunteerWaiver__c waiver = getTestWaiver();

        // Complete 6 forms to meet minimum requirement
        waiver.Photo_Release__c = 'Yes';
        waiver.Auth_for_Emerg_Med_Treatment__c = 'Completed';
        waiver.Client_Waiver__c = 'Completed';
        waiver.Medical_History_Form_PL__c = 'Completed';
        waiver.Payer_Info__c = 'Completed';
        waiver.WeightHeight__c = 'Completed';
        update waiver;

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.submitApplication(waiver.Id);
        Test.stopTest();

        System.assertEquals(true, result.success, 'Submission should succeed with 6 forms');
        System.assertEquals(6, result.formsCompleted);

        VolunteerWaiver__c updated = [
            SELECT Application_Submitted__c FROM VolunteerWaiver__c WHERE Id = :waiver.Id
        ];
        System.assertEquals('Yes', updated.Application_Submitted__c);
    }

    @IsTest
    static void testSubmitApplicationInsufficientForms() {
        VolunteerWaiver__c waiver = getTestWaiver();

        // Only complete 3 forms (below minimum of 6)
        waiver.Photo_Release__c = 'Yes';
        waiver.Auth_for_Emerg_Med_Treatment__c = 'Completed';
        waiver.Client_Waiver__c = 'Completed';
        update waiver;

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.submitApplication(waiver.Id);
        Test.stopTest();

        System.assertEquals(false, result.success, 'Submission should fail with only 3 forms');
        System.assert(result.errorMessage.contains('at least 6'));
    }

    // ─── File Upload Link Tests ──────────────────────────────────────

    @IsTest
    static void testLinkUploadedFiles() {
        VolunteerWaiver__c waiver = getTestWaiver();
        Riders__c client = getTestClient();

        // Create a ContentVersion (which auto-creates ContentDocument)
        ContentVersion cv = new ContentVersion(
            Title = 'Test Medical Form',
            PathOnClient = 'test_medical.pdf',
            VersionData = Blob.valueOf('Test file content'),
            IsMajorVersion = true
        );
        insert cv;

        // Get the auto-created ContentDocument Id
        Id contentDocId = [
            SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id
        ].ContentDocumentId;

        Test.startTest();
        ReturnClientMenuController.SaveResult result =
            ReturnClientMenuController.linkUploadedFiles(
                new List<Id>{ contentDocId },
                waiver.Id,
                client.Id
            );
        Test.stopTest();

        System.assertEquals(true, result.success, 'File linking should succeed');

        // Verify ContentDocumentLinks were created
        List<ContentDocumentLink> links = [
            SELECT LinkedEntityId FROM ContentDocumentLink
            WHERE ContentDocumentId = :contentDocId
        ];
        // Should have at least 2 links (waiver + client) plus the original lib link
        System.assert(links.size() >= 2, 'Should have links to waiver and client');
    }

    // ─── Null Waiver Completion Map Test ─────────────────────────────

    @IsTest
    static void testGetClientDataNullWaiver() {
        // Create a contact with a client but no waiver for the year
        Contact con2 = new Contact(
            FirstName = 'No',
            LastName = 'Waiver',
            Email = 'nowaiver@example.com'
        );
        insert con2;

        Riders__c client2 = new Riders__c(
            ClientContact__c = con2.Id
        );
        insert client2;

        // Don't create a waiver — the method should still return with null waiver
        // but a populated completionStatus map of all 'Not Started'

        Test.startTest();
        ReturnClientMenuController.ClientMenuData data =
            ReturnClientMenuController.getClientData(con2.Id);
        Test.stopTest();

        System.assertNotEquals(null, data.completionStatus);
        // All steps should be 'Not Started' when no waiver exists
        for (String status : data.completionStatus.values()) {
            System.assertEquals('Not Started', status,
                'All steps should be Not Started when no waiver exists');
        }
    }
}
