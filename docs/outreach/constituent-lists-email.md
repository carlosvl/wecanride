# Constituent lists email

Reusable note for the two Salesforce lists Maryn uses for mailings and thank-you calls.

Template: `constituent-lists-email.html` in this folder. Replace every `{{TOKEN}}` listed in the comment at the top of that file, attach the two CSV files, and send.

## What the lists include

Window for the mailing list: the prior two years, ending on the day the lists are pulled.

- **Clients:** enrolled in a class whose start date falls in the window. Waitlist, requested, and declined spots stay off the list.
- **Volunteers:** enrolled on a class whose start date falls in the window.
- **Donors:** closed-won donations in the window. Grants stay off the list. If the gift has no person, the organization is included with a blank Contact Id and the account address.

A person who is a client, a volunteer, and a donor appears once. The Roles column shows every reason they are on the list.

The thank-you file ranks closed-won donations for the current calendar year. When several donors tie at the cutoff, keep all of them so the last rank is not an arbitrary cut.

Every row has name, Contact Id, email, phone, and address. Phone is the first of mobile, phone, then home.

## Prepared send

October 22, 2026, addressed to maryn@wecanride.org. Snapshot date October 21, 2026. The message was not delivered: the mail tool did not complete the send. Counts and list rules are on the wiki page for constituent mailing and thank-you lists. The filled message is in `.tmp/gratitude-reports/email-to-maryn.html`, next to the two CSV files. Those files stay out of this folder because they contain contact details.
