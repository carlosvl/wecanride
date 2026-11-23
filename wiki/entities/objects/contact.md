---
title: Contact
type: entity
category: objects
sources:
  - force-app/main/default/objects/Contact/
last_verified: 2026-08-26
status: current
tags: [object, contact, npsp]
---

# Contact

Standard Salesforce Contact object, heavily extended for nonprofit and volunteer management.

**Source:** `force-app/main/default/objects/Contact/`

## Package extensions

| Package | Fields / features |
|---------|-------------------|
| NPSP (`npsp__`, `npe01__`, `npo02__`) | Donations, affiliations, soft credits, membership dates |
| GW Volunteers (`GW_Volunteers__`) | Skills, availability, last volunteer date, signup field sets |
| OneMerge (`onemergefree__`) | Merge tracking, duplicate detection |
| DupCheck (`dupcheck__`) | Merge web links |

## WCR-specific fields

- `Client__c` — flags client contacts
- `Volunteer__c` — flags volunteer contacts
- `Prospect__c` — third role checkbox (used at community user creation; not a license type)
- `Age__c`, `Employer_Address__c`, `Donation_Capacity__c`
- Various WCR custom fields used in registration flows

A community user can have more than one of Client / Volunteer / Prospect checked. License estimates that split by role should treat overlap as its own bucket. See [[community-login-license-estimate]].

Deactivated community users do not expose `User.ContactId` in the API; match `User.Email` to `Contact.Email` if you need these flags historically.

## Role in flows

- Emergency contact records created/linked in [[returning-emergency]]
- Community user accounts linked via [[new-community-user]]
- Volunteer signup via GW Volunteers field sets

## Related

- [[riders]] — client records link to Contact
- [[volunteer-info]] — volunteer records reference Contact
- [[community-access]]
