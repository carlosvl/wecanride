---
title: Flows Registry
type: manifest
category: flows
sources:
  - force-app/main/default/flows/
last_verified: 2026-07-13
status: current
tags: [manifest, flows, registry]
---

# Flows Registry

Dense routing table for all 68 screen flows. One line per flow — see entity pages for detail.

## Client — New Registration

| Flow | Hook |
|------|------|
| `Client_Registration` | [[entities/flows/client-registration]] — main new client wizard |
| `New_Client_Menu` | Form checklist router for new clients |
| `New_Client_Diagnosis` | Diagnosis entry |
| `Complete_Client_Application` | Final application submission |
| `Client_Class_Type` | Class type selection |
| `Client_Class_Status` | Class status selection |
| `Client_Client_Medical_History` | Medical history form upload |
| `Client_Authorization_for_Emergency_Medical_Treatment` | Emergency medical authorization |
| `Client_Waiver` | Client waiver |
| `Client_Photo_Release` | Photo release |
| `Confidentiality_HIPPA` | HIPAA confidentiality |
| `ClientFileUpload_Down` | Down syndrome file upload |
| `client_seizure` | Seizure form upload |
| `client_file_upload_Scoliosis` | Scoliosis file upload |
| `Client_UploadAnyFile` | Generic file upload |
| `Upload_Client_File` | Client file upload |
| `Therapy_Cancellation_Policy` | Therapy cancellation policy |

## Client — Returning

| Flow | Hook |
|------|------|
| `Returning` | [[entities/flows/returning]] — parent router |
| `Return_Client_Menu` | Returning form checklist |
| `Returning_Emergency` | [[entities/flows/returning-emergency]] — emergency contacts |
| `Returning_Main_Info` | Main info update |
| `Returning_Parent_Guardian` | Parent/guardian update |
| `Returning_Height_Weight` | Height/weight update |
| `Returning_Client_Client_Medical_History` | Medical history renewal |
| `Returning_Seizure_Form` | Seizure form renewal |
| `Returning_Down_Syndrome` | Down syndrome form renewal |
| `Returning_File_Upload_Scoliosis` | Scoliosis form renewal |
| `Returning_Client_Waiver` | Waiver renewal |
| `Returning_Authorization_Emergency_Medical_Treatment` | Emergency auth renewal |
| `Returning_Confidentiality_HIPPA` | HIPAA renewal |
| `Returning_Photo_Release` | Photo release renewal |
| `Returning_Payment` | Payment policy |
| `Returning_Schedule` | Schedule form upload |
| `Returning_Schedule_Selection` | Schedule selection |
| `Returning_Riding_Lesson_Registration` | Riding lesson registration |
| `Returning_Therapy_Cancellation_Policy` | Cancellation policy |
| `Returning_GroupHome` | Group home info |

## Volunteer

| Flow | Hook |
|------|------|
| `volunteer_registration` | New volunteer registration |
| `volunteer_handbook` | Handbook acknowledgment |
| `volunteer_Interest` | Volunteer interest form |
| `Volunteering_Schedule_Selection` | Schedule selection |
| `Volunteer_Confirmation_email` | Confirmation email trigger |
| `Volunteer_Attendance` | Attendance tracking |
| `ReturningVol` | Returning volunteer paperwork |
| `Return_Volunteer_ONLY_Menu` | Non-riding volunteer menu |
| `Return_Volunteer_Riding_Menu` | Riding volunteer menu |
| `Returning_Volunteer_Schedule` | Volunteer schedule renewal |
| `Returning_Volunteer_Liability_Waiver` | Liability waiver renewal |

## Community & Account

| Flow | Hook |
|------|------|
| `NewCommunityUser` | [[entities/flows/new-community-user]] — account creation |
| `NewContact` | Contact creation |
| `New_Registration_Confirmation` | Registration confirmation |
| `Community_MessageSender` | Community messaging |

## Class Management

| Flow | Hook |
|------|------|
| `Class_Management` | Class management (internal) |
| `Class_Management_Volunteer` | Volunteer class management |
| `Class_Registration_Emails` | Registration email triggers |
| `ClassTimes` | Class time management |
| `CreateClassTimes2` | Class time creation |
| `Create_Attendance` | Attendance record creation |
| `RidersInClass` | Riders in class view |

## Record Updates

| Flow | Hook |
|------|------|
| `UpdateContact` | Contact update |
| `UpdateContact_VolunteerRider` | Volunteer/rider contact update |
| `Update_Client_Record_Name` | Client record name update |
| `Update_Support_Team` | Support team update |

## Utilities & Packages

| Flow | Hook |
|------|------|
| `Datatable_Configuration_Wizard4` | Datatable config wizard |
| `onemergefree__OneMerge_Account_Before_Save` | OneMerge account dedup |
| `onemergefree__OneMerge_Contact_Before_Save` | OneMerge contact dedup |
| `onemergefree__OneMerge_Lead_Before_Save` | OneMerge lead dedup |
| `onemergefree__OneMerge_Rollback_Merge_Result` | OneMerge rollback |
