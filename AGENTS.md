# Architecture Rules

- Supported UI languages are Turkish (`tr`), English (`en`), Arabic (`ar`), and European Portuguese (`pt`, `pt-PT`), and Spain Spanish (`es`, `es-ES`); keep locale dictionaries structurally aligned because language selection persists across web and native clients.
- Full-screen and fixed mobile UI must use shared dynamic-viewport and safe-area utilities so iOS status bars, notches, and home indicators never cover controls.
