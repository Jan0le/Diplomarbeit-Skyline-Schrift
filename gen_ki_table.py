# -*- coding: utf-8 -*-
import openpyxl
from datetime import datetime

# Entries to exclude (Git, simple sync, etc.)
EXCLUDE_ZWECK = [
    'Git-Push', 'Git-Commit', 'Git-Sync', 'Versionierung', 'Branch-Synchronisation',
    'Klarstellung Push-Scope', 'Branch-Merge', 'Commit + Merge', 'Git-Synchronisation'
]
EXCLUDE_PROMPT = [
    'auf Ole-Branch', 'auf Main-Branch', 'alles', 'ausführen'
]

def should_exclude(zweck, prompt):
    if not zweck: return True
    z = str(zweck).lower()
    p = str(prompt).lower() if prompt else ''
    for x in EXCLUDE_ZWECK:
        if x.lower() in z: return True
    for x in EXCLUDE_PROMPT:
        if x.lower() in p and len(p) < 50: return True
    # Exclude pure "push/merge" type
    if z in ['git-push', 'git-commit', 'git-sync / projektstand']: return True
    return False

def umlaut_expand(s):
    """Umlaute ausschreiben: ae, oe, ue, ss"""
    if not s: return s
    s = str(s)
    for c, r in [('ä', 'ae'), ('ö', 'oe'), ('ü', 'ue'), ('ß', 'ss'),
                 ('Ä', 'Ae'), ('Ö', 'Oe'), ('Ü', 'Ue')]:
        s = s.replace(c, r)
    return s

def escape(s):
    if s is None or (isinstance(s, float) and str(s) == 'nan'): return ''
    s = str(s)
    s = umlaut_expand(s)
    for c, r in [('&', '\\&'), ('%', '\\%'), ('#', '\\#'), ('_', '\\_')]:
        s = s.replace(c, r)
    s = s.replace('\n', ' ').strip()
    return s

def fmt_date(v):
    if v is None: return ''
    s = str(v)
    if '2025-' in s or '2026-' in s: return s[:10]
    return s[:10] if len(s) >= 10 else s

def parse_date(v):
    try:
        s = str(v)
        if '2025-' in s or '2026-' in s:
            return datetime.strptime(s[:10], '%Y-%m-%d')
    except: pass
    return datetime.max

wb = openpyxl.load_workbook('A6_EINSATZ_VON_KI_TOOLS_600 (1).xlsx', read_only=True, data_only=True)
sheet = wb.active
rows = list(sheet.iter_rows(values_only=True))
data = []
for r in rows[1:]:
    if len(r) < 6: continue
    nr, tool, model, dat, prompt, zweck = r[0], r[1], r[2], r[3], r[4], r[5]
    if should_exclude(zweck, prompt): continue
    data.append((parse_date(dat), nr or 0, tool, dat, prompt, zweck))

data.sort(key=lambda x: x[0])

with open('diplomarbeit_inhaltsverzeichnis/diplomarbeit_inhaltsverzeichnis/DA_Vorlage-main/DA_Vorlage-main/6_appendix/ki_table.tex', 'w', encoding='utf-8') as f:
    for i, (_, nr, tool, dat, prompt, zweck) in enumerate(data):
        f.write('%d & %s & %s & %s & %s \\\\\n\\hline\n' % (
            i + 1, escape(tool), escape(fmt_date(dat)), escape(zweck), escape(prompt)
        ))

print('Wrote', len(data), 'rows (filtered, sorted by date)')
