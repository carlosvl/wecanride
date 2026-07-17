#!/usr/bin/env bash
# Audits WaiverYear custom metadata access for community flow users.
set -euo pipefail

TARGET_ORG="${1:-WCRProd}"
FIELD="WaiverYear__mdt.Current_Year__c"

echo "=== WaiverYear access audit ($TARGET_ORG) ==="

echo ""
echo "--- Field permissions for $FIELD ---"
sf data query --target-org "$TARGET_ORG" --json --query \
  "SELECT Parent.Name, Parent.Label, PermissionsRead FROM FieldPermissions WHERE Field = '$FIELD'" \
  2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
recs=d.get('result',{}).get('records',[])
if not recs:
    print('NONE — this causes GetCurrentYear.Current_Year__c flow errors')
else:
    for r in recs:
        p=r.get('Parent',{})
        print(f\"  {p.get('Label','?')} ({p.get('Name','?')}): read={r.get('PermissionsRead')}\")
"

echo ""
echo "--- Community_WaiverYear_Access assignments (sample) ---"
sf data query --target-org "$TARGET_ORG" --json --query \
  "SELECT Assignee.Name, Assignee.Username FROM PermissionSetAssignment WHERE PermissionSet.Name = 'Community_WaiverYear_Access' LIMIT 5" \
  2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
for r in d.get('result',{}).get('records',[]):
    a=r.get('Assignee',{})
    print(f\"  {a.get('Name')} ({a.get('Username')})\")
"

echo ""
echo "--- Community_Returning_Flow_Access WaiverYear field perms ---"
sf data query --target-org "$TARGET_ORG" --json --query \
  "SELECT PermissionsRead FROM FieldPermissions WHERE Parent.Name = 'Community_Returning_Flow_Access' AND Field = '$FIELD'" \
  2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
recs=d.get('result',{}).get('records',[])
print('  read=true' if recs and recs[0].get('PermissionsRead') else '  MISSING — New_Client_Menu users with only this PS will fail')
"
