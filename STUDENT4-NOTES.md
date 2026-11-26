# Teacher Module (Student 4): notes for the group
Meadowbrook High School, 2 Meadowbrook Avenue, Kingston 19

## Files
- `teacher.html`: Teacher Module Panel page
- `css/teacher.css`: styles for this page (colours are variables at the top)
- `js/teacher.js`: filters, grade entry, report card engine
- `js/mock-data.js`: test data, written only if the keys are missing

## Shared storage
- Key names come from Student 2's `STORAGE_KEYS` (in `storage.js`) when it is loaded **before** `mock-data.js`.
  Any key it leaves out falls back to the defaults below. In `teacher.html`, uncomment the `storage.js` line.
- Student records are accepted in **either** shape:
  - Student 3's admin page: `{ id, name, studentClass: "Grade 10", status }`
  - Seed data: `{ id, firstName, lastName, gradeLevel, className: "10A", cohort }` (also includes `name`, `studentClass`, `status`)
- Students with `status: "Inactive"` are not shown for grading.

## Default storage format
| Key | Where | Shape |
|---|---|---|
| `portal_students` | localStorage | either shape above |
| `portal_subjects` | localStorage | `{ code, name, gradeLevels: [7,8,...] }` |
| `portal_teachers` | localStorage | `{ username, fullName, subjects: ["MATH", ...] }` |
| `portal_grades` | localStorage | `{ studentId, subjectCode, term, coursework, exam, total, enteredBy, updatedAt }` |
| `portal_reportComments` | localStorage | `{ studentId, term, comment, enteredBy, updatedAt }` |
| `portal_currentUser` | **sessionStorage** | `{ username, role: "teacher", fullName }` |

- **Student 2:** after a teacher logs in, save `portal_currentUser` and redirect to `teacher.html`.
  Once login works, remove the "Continue as demo teacher" button (teacher.html) and `signInAsDemoTeacher()` (teacher.js).
- **Student 3:** the admin Academic Matrix can read and write the same `portal_grades` records.
- **Student 5:** `compileReportCard(studentId, term)` in teacher.js returns all report-card numbers without touching the page, so the read-only viewer can reuse it.

## Grading rules
Coursework /40 + Exam /60 = Total /100. A 80+, B 70+, C 60+, D 50+, F below 50 (pass mark 50).
GPA points: A 4, B 3, C 2, D 1, F 0.

To reset test data: run `localStorage.clear()` in the browser console, then reload.
