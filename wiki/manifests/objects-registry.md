---
title: Objects Registry
type: manifest
category: objects
sources:
  - force-app/main/default/objects/
last_verified: 2026-07-13
status: current
tags: [manifest, objects, registry]
---

# Objects Registry

Dense routing table for custom objects and metadata types.

## Core business objects

| Object | Hook |
|--------|------|
| `Riders__c` | [[entities/objects/riders]] — client/rider records |
| `Volunteer_Info__c` | [[entities/objects/volunteer-info]] — volunteer training and contacts |
| `VolunteerWaiver__c` | Volunteer waiver and medical form tracking |
| `Contact` | [[entities/objects/contact]] — person records (NPSP + GW Volunteers) |
| `Diagnosis__c` | Client diagnosis records |
| `waiver__c` | Waiver template records |

## Scheduling & attendance

| Object | Hook |
|--------|------|
| `Rider_Schedule__c` | Client class schedule assignments |
| `Volunteer_Schedule__c` | Volunteer schedule assignments |
| `Volunteer_Class__c` | Class definitions |
| `Volunteer_Attendance__c` | Volunteer class attendance |
| `New_Attendance__c` | Client attendance records |
| `Volunteer_Log_Sheet__c` | Volunteer time logging |

## Assessment & notes

| Object | Hook |
|--------|------|
| `Pre_and_Post_Test__c` | Riding skill assessments (L1–L6 levels) |
| `Rider_Notes__c` | Instructor session notes and goals |

## Configuration

| Object | Hook |
|--------|------|
| `ers_datatableConfig__c` | Flow datatable column configuration |
| `WaiverYear__mdt` | Waiver year custom metadata |
| `We_Can_Ride_Constants__mdt` | Org-wide constants custom metadata |
