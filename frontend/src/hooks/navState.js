// Lightweight cross-page state — lets FindDoctors pre-select a doctor for BookAppointment
let _doctor = null;
export function setNavDoctor(d)  { _doctor = d; }
export function popNavDoctor()   { const d = _doctor; _doctor = null; return d; }
