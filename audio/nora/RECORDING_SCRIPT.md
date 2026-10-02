# Nora — recording pack

Purpose: real Norwegian Bokmål recordings for Norsk Eventyr. These files must be recorded by a real speaker with permission to use the recordings in the app.

## Recording style
- Speaker: one consistent adult Norwegian female voice for Nora.
- Language: natural Bokmål / ordinary Eastern Norwegian pronunciation is preferred.
- Delivery: warm, natural, adult, not exaggerated “language-course” speech.
- Record each line separately.
- Clean room, no music, no reverb, no noise reduction artifacts.
- WAV master preferred; app delivery can be MP3/Opus.
- Do not over-articulate. Natural pauses are desirable.

## Priority 1 — core Nora lines

001 — Hei! Jeg heter Nora. Hva heter du?
002 — Hyggelig å møte deg!
003 — Hvor kommer du fra?
004 — Hvor bor du nå?
005 — Hvordan har du det i dag?
006 — Hva skal du gjøre i dag?
007 — Jobber du i dag?
008 — Hva jobber du med?
009 — Har du tid til en kaffe?
010 — Skal vi gå til kaféen?
011 — Hva vil du ha?
012 — Kan du si det en gang til?
013 — Jeg forstår. Fortell litt mer.
014 — Bra! Det var mye bedre.
015 — Nesten. Prøv en gang til.
016 — Det går fint. Ta den tiden du trenger.
017 — Hva mener du?
018 — Hvorfor?
019 — Hva skjedde etterpå?
020 — Hva synes du om det?

## Priority 2 — everyday situations

021 — Unnskyld, når går bussen?
022 — Hvor mye koster det?
023 — Kan jeg hjelpe deg?
024 — Har du en avtale?
025 — Vent litt, så skal jeg sjekke.
026 — Kan du fylle ut dette skjemaet?
027 — Har du med legitimasjon?
028 — Hvordan kan jeg komme meg dit?
029 — Jeg kommer litt senere.
030 — Vi sees i morgen.

## File naming

Use:
`001-hei-jeg-heter-nora.mp3`
`002-hyggelig-a-mote-deg.mp3`
etc.

After the files are added to `/audio/nora/`, register exact text → file path in `voice-pack.js`. The app will then automatically use the human clip first and fall back to AI only for unrecorded dynamic lines.
