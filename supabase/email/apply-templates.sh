#!/usr/bin/env bash
# Uploads the Hebrew auth email templates + subjects in this folder to Supabase Auth.
# Needs SUPABASE_ACCESS_TOKEN, and Custom SMTP must already be on (free plan rule).
set -euo pipefail
cd "$(dirname "$0")"
python3 - <<'PY' > /tmp/auth-templates.json
import json
r = lambda f: open(f, encoding='utf-8').read()
print(json.dumps({
  "mailer_subjects_confirmation": "אישור ההרשמה לנפל האסימון",
  "mailer_subjects_recovery": "איפוס סיסמה בנפל האסימון",
  "mailer_subjects_magic_link": "קישור כניסה לנפל האסימון",
  "mailer_subjects_email_change": "אישור כתובת המייל החדשה",
  "mailer_templates_confirmation_content": r("confirmation.html"),
  "mailer_templates_recovery_content": r("recovery.html"),
  "mailer_templates_magic_link_content": r("magic_link.html"),
  "mailer_templates_email_change_content": r("email_change.html"),
}, ensure_ascii=False))
PY
curl -sf -X PATCH -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
  --data @/tmp/auth-templates.json https://api.supabase.com/v1/projects/chdzyvyvdypmjgupyrvg/config/auth > /dev/null && echo "templates applied"
