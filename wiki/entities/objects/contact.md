---
title: Contact
type: entity
category: objects
sources:
  - force-app/main/default/objects/Contact/
last_verified: 2026-07-13
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

- `Volunteer__c` — flags volunteer contacts
- `Age__c`, `Employer_Address__c`, `Donation_Capacity__c`
- Various WCR custom fields used in registration flows

## Role in flows

- Emergency contact records created/linked in [[returning-emergency]]
- Community user accounts linked via [[new-community-user]]
- Volunteer signup via GW Volunteers field sets

## Related

- [[riders]] — client records link to Contact
- [[volunteer-info]] — volunteer records reference Contact
- [[community-access]]
