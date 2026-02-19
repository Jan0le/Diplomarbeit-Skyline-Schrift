Schreiben mit LaTeX (Kurz-Setup)

1) Vorlage-Ordner
   diplomarbeit_inhaltsverzeichnis/DA_Vorlage-main/DA_Vorlage-main

2) Hauptdatei
   DA_MainDocument.tex

3) Empfohlenes Tool (Windows)
   - MiKTeX (LaTeX-Distribution)
   - VS Code + LaTeX Workshop (optional)

4) Build (Terminal im Vorlagen-Ordner)
   latexmk -pdf DA_MainDocument.tex

5) Struktur der Inhalte
   2_content/section.tex steuert die Kapitelreihenfolge.
   Die Kapiteltexte liegen in:
   - 2_content/0_einleitung.tex
   - 2_content/1_weltkarte.tex
   - 2_content/2_import.tex
   - 2_content/3_notifications.tex
   - 2_content/4_datenverwaltung.tex
   - 2_content/5_recht.tex
   - 2_content/6_technik.tex
   - 2_content/7_projektumsetzung.tex

6) Hinweis
   Schreibe den Fliesstext direkt unter die jeweiligen Ueberschriften.
