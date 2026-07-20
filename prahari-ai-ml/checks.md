1. Record yourself (or a friend) actually speaking 3-5 Kannada questions
   naturally — not reading robotically, normal pace, real phone/laptop mic,
   some background noise if possible (a real deployment environment won't
   be silent).
2. Feed each through the /chat/voice endpoint exactly as a real user would.
3. Record actual WER and semantic accuracy against what was really said
   (not what Sarvam's own TTS generated).
4. Update the benchmark table in the writeup with these real numbers,
   labeled clearly as "real speech test" vs the earlier "pipeline
   round-trip test" — keep both, don't discard the round-trip one, just
   don't let it stand in as if it were the real-world number.
5. If accuracy is meaningfully lower on real speech (expected), decide
   now whether that's acceptable for demo or needs a fallback (e.g.
   "type your question in Kannada" as a backup input mode) rather than
   discovering it live.