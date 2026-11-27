/*
CIT2011 Web Programming - Group Project
Group Members:
1. Shemar Lindo - 2401825 [Student 4] - Friday, 8:00 AM
2. Justin Francis - 2508413 [Student 5] - Friday, 8:00 AM
3. Sashkea Angrin - 2403272 [Student 1] - Friday, 8:00 AM
4. Dejahnae Fairclough - 2406846 [Student 3] - Friday, 8:00 AM
5. Kofi Foster - 2403233 [Student 2] - Friday, 8:00 AM
Lab: Friday, 8:00 AM
*/

const SCHOOL_NAME = "Meadowbrook High School";
const COURSEWORK_MAX = 40;
const EXAM_MAX = 60;
const PASS_MARK = 50;
const TERM_LIST = ["Term 1", "Term 2", "Term 3"];

const GRADE_SCALE = [
    { minimum: 80, letter: "A", points: 4.0, remark: "Excellent" },
    { minimum: 70, letter: "B", points: 3.0, remark: "Very Good" },
    { minimum: 60, letter: "C", points: 2.0, remark: "Good" },
    { minimum: 50, letter: "D", points: 1.0, remark: "Satisfactory" },
    { minimum: 0, letter: "F", points: 0.0, remark: "Needs Improvement" }
];

const STATUS_LABELS = {
    saved: "Saved",
    unsaved: "Not saved",
    invalid: "Fix errors",
    empty: "Not graded"
};

const panelState = {
    teacher: null,
    selectedSubject: null,
    selectedClass: "",
    selectedTerm: "",
    classStudents: [],
    hasUnsavedChanges: false
};

/* ---------- Storage & Data Helpers ---------- */

function readList(key) {
    try {
        const data = JSON.parse(localStorage.getItem(key));
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function writeList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
}

function getSubjectByCode(code) {
    return readList(PORTAL_KEYS.subjects).find((s) => s.code === code);
}

function normaliseStudent(r) {
    const fullName = r.name || `${r.firstName || ""} ${r.lastName || ""}`.trim() || "(no name)";
    const match = String(r.className || r.studentClass || "").match(/\d+/);
    const gradeLevel = Number(r.gradeLevel) || (match ? Number(match[0]) : 0);

    return {
        id: String(r.id),
        fullName,
        gradeLevel,
        className: r.className || r.studentClass || `Grade ${gradeLevel}`,
        cohort: r.cohort || "",
        status: r.status || "Active"
    };
}

function readStudents() {
    return readList(PORTAL_KEYS.students).map(normaliseStudent).filter((s) => s.status !== "Inactive");
}

function getStudentById(id) {
    return readStudents().find((s) => s.id === id);
}

function findGrade(list, studentId, subjectCode, term) {
    return list.find((g) => g.studentId === studentId && g.subjectCode === subjectCode && g.term === term);
}

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
}

/* ---------- Grade & Score Helpers ---------- */

const getGradeBand = (total) => GRADE_SCALE.find((band) => total >= band.minimum) || GRADE_SCALE.at(-1);

const averageOf = (nums) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null);

const fmtNum = (val) => (val === null ? "-" : String(Math.round(val * 10) / 10));

function checkScore(rawText, max) {
    const text = rawText.trim();
    if (!text) return { isBlank: true, isValid: true, value: null, message: "" };

    const num = Number(text);
    if (Number.isNaN(num)) return { isBlank: false, isValid: false, value: null, message: "Numbers only" };
    if (num < 0 || num > max) return { isBlank: false, isValid: false, value: null, message: `Must be 0 - ${max}` };
    if (num * 2 !== Math.floor(num * 2)) return { isBlank: false, isValid: false, value: null, message: "Use whole or half marks" };

    return { isBlank: false, isValid: true, value: num, message: "" };
}

/* ---------- Auth & Session ---------- */

function getSignedInTeacher() {
    try {
        const user = JSON.parse(sessionStorage.getItem(PORTAL_KEYS.currentUser));
        if (!user || user.role !== "teacher") return null;
        return readList(PORTAL_KEYS.teachers).find((t) => t.username === user.username) || null;
    } catch {
        return null;
    }
}

/* TESTING ONLY: remove once login.html handles teacher sign-in */
function signInAsDemoTeacher() {
    const demo = readList(PORTAL_KEYS.teachers)[0];
    sessionStorage.setItem(PORTAL_KEYS.currentUser, JSON.stringify({
        username: demo.username, role: "teacher", fullName: demo.fullName
    }));
    location.reload();
}

function logOut() {
    if (panelState.hasUnsavedChanges && !confirm("You have unsaved grades. Log out anyway?")) return;
    panelState.hasUnsavedChanges = false;
    sessionStorage.removeItem(PORTAL_KEYS.currentUser);
    location.href = "login.html";
}

/* ---------- Cascading Filters ---------- */

const subjectSelect = document.getElementById("subjectSelect");
const gradeLevelSelect = document.getElementById("gradeLevelSelect");
const classSelect = document.getElementById("classSelect");
const termSelect = document.getElementById("termSelect");
const loadStudentsButton = document.getElementById("loadStudentsButton");

function fillDropdown(select, options) {
    const placeholder = select.options[0];
    select.replaceChildren(placeholder);
    options.forEach(({ value, label }) => {
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = label;
        select.appendChild(opt);
    });
    select.value = "";
}

function resetDropdown(select) {
    fillDropdown(select, []);
    select.disabled = true;
}

function updateStepTracker(step) {
    document.querySelectorAll("#stepTracker li").forEach((li) => {
        const n = Number(li.dataset.step);
        li.classList.toggle("step-done", n < step);
        li.classList.toggle("step-active", n === step);
    });
}

function canLeaveClass() {
    return !panelState.hasUnsavedChanges || confirm("You have unsaved grades for this class. Discard them?");
}

function hideClassSections() {
    document.getElementById("gradeEntrySection").hidden = true;
    document.getElementById("reportSection").hidden = true;
    document.getElementById("reportCard").hidden = true;
    panelState.hasUnsavedChanges = false;
}

function fillSubjectDropdown() {
    const opts = panelState.teacher.subjects
        .map(getSubjectByCode)
        .filter(Boolean)
        .map((s) => ({ value: s.code, label: s.name }));
    fillDropdown(subjectSelect, opts);
}

function handleSubjectChange() {
    [gradeLevelSelect, classSelect, termSelect].forEach(resetDropdown);
    loadStudentsButton.disabled = true;
    panelState.selectedSubject = getSubjectByCode(subjectSelect.value) || null;

    if (!panelState.selectedSubject) return updateStepTracker(1);

    const students = readStudents();
    const levels = panelState.selectedSubject.gradeLevels
        .filter((lvl) => students.some((s) => s.gradeLevel === lvl))
        .map((lvl) => ({ value: String(lvl), label: `Grade ${lvl}` }));

    fillDropdown(gradeLevelSelect, levels);
    gradeLevelSelect.disabled = false;
    updateStepTracker(2);
}

function handleGradeLevelChange() {
    [classSelect, termSelect].forEach(resetDropdown);
    loadStudentsButton.disabled = true;
    if (!gradeLevelSelect.value) return updateStepTracker(2);

    const level = Number(gradeLevelSelect.value);
    const classes = [...new Set(
        readStudents().filter((s) => s.gradeLevel === level).map((s) => s.className)
    )].sort();

    fillDropdown(classSelect, classes.map((c) => ({ value: c, label: `Class ${c}` })));
    classSelect.disabled = false;
    updateStepTracker(3);
}

function handleClassChange() {
    resetDropdown(termSelect);
    loadStudentsButton.disabled = true;
    if (!classSelect.value) return updateStepTracker(3);

    fillDropdown(termSelect, TERM_LIST.map((t) => ({ value: t, label: t })));
    termSelect.disabled = false;
    updateStepTracker(4);
}

function handleTermChange() {
    const ready = termSelect.value !== "";
    loadStudentsButton.disabled = !ready;
    updateStepTracker(ready ? 5 : 4);
}

function guardFilterChange(select, handler) {
    let prev = select.value;
    select.addEventListener("focus", () => { prev = select.value; });
    select.addEventListener("change", () => {
        if (!canLeaveClass()) {
            select.value = prev;
            return;
        }
        hideClassSections();
        prev = select.value;
        handler();
    });
}

function handleFilterSubmit(e) {
    e.preventDefault();
    if (!panelState.selectedSubject || !classSelect.value || !termSelect.value || !canLeaveClass()) return;

    panelState.selectedClass = classSelect.value;
    panelState.selectedTerm = termSelect.value;
    panelState.classStudents = readStudents()
        .filter((s) => s.className === panelState.selectedClass)
        .sort((a, b) => a.fullName.localeCompare(b.fullName));

    renderGradeTable();
    fillDropdown(reportStudentSelect, panelState.classStudents.map((s) => ({
        value: s.id, label: `${s.fullName} (${s.id})`
    })));

    document.getElementById("gradeEntrySection").hidden = false;
    document.getElementById("reportSection").hidden = false;
    document.getElementById("reportCard").hidden = true;
    document.getElementById("gradeEntrySection").scrollIntoView({ behavior: "smooth" });
}

/* ---------- Grade Entry Table ---------- */

const gradeTableBody = document.getElementById("gradeTableBody");

function setFieldError(input, msg) {
    input.nextElementSibling.textContent = msg;
    input.classList.toggle("input-invalid", Boolean(msg));
    input.setAttribute("aria-invalid", msg ? "true" : "false");
}

function setRowStatus(row, status) {
    const tag = row.querySelector(".status-tag");
    tag.textContent = STATUS_LABELS[status];
    tag.className = `status-tag status-${status}`;
    row.dataset.status = status;
}

function updateRow(row, statusOverride) {
    const cwInput = row.querySelector('[data-field="coursework"]');
    const exInput = row.querySelector('[data-field="exam"]');
    const cw = checkScore(cwInput.value, COURSEWORK_MAX);
    const ex = checkScore(exInput.value, EXAM_MAX);

    setFieldError(cwInput, cw.message);
    setFieldError(exInput, ex.message);

    let valid = cw.isValid && ex.isValid;
    if (valid && cw.isBlank !== ex.isBlank) {
        valid = false;
        setFieldError(cw.isBlank ? cwInput : exInput, "Enter both scores");
    }

    const totalCell = row.querySelector(".total-cell");
    const badge = row.querySelector(".grade-badge");

    if (valid && !cw.isBlank) {
        const total = cw.value + ex.value;
        const band = getGradeBand(total);
        totalCell.textContent = fmtNum(total);
        badge.textContent = band.letter;
        badge.className = `grade-badge grade-${band.letter}`;
        row.dataset.total = total;
    } else {
        totalCell.textContent = "-";
        badge.textContent = "-";
        badge.className = "grade-badge";
        delete row.dataset.total;
    }

    setRowStatus(row, statusOverride || (valid ? "unsaved" : "invalid"));
    return valid;
}

function updateClassSummary() {
    const totals = [...gradeTableBody.querySelectorAll("tr[data-student-id]")]
        .filter((r) => r.dataset.total !== undefined)
        .map((r) => Number(r.dataset.total));

    const passed = totals.filter((t) => t >= PASS_MARK).length;
    document.getElementById("summaryGraded").textContent = `${totals.length} / ${panelState.classStudents.length}`;
    document.getElementById("summaryAverage").textContent = fmtNum(averageOf(totals));
    document.getElementById("summaryHighest").textContent = totals.length ? fmtNum(Math.max(...totals)) : "-";
    document.getElementById("summaryPassRate").textContent = totals.length ? `${Math.round((passed / totals.length) * 100)}%` : "-";
}

function renderGradeTable() {
    const grades = readList(PORTAL_KEYS.grades);
    gradeTableBody.innerHTML = "";
    document.getElementById("gradeEntryContext").textContent =
        `${panelState.selectedSubject.name} | Class ${panelState.selectedClass} | ${panelState.selectedTerm}`;

    if (!panelState.classStudents.length) {
        gradeTableBody.innerHTML = '<tr><td colspan="7" class="empty-cell">No students are registered in this class yet.</td></tr>';
        updateClassSummary();
        return;
    }

    panelState.classStudents.forEach((student) => {
        const saved = findGrade(grades, student.id, panelState.selectedSubject.code, panelState.selectedTerm);
        const safeName = escapeHtml(student.fullName);
        const row = document.createElement("tr");
        row.dataset.studentId = student.id;
        row.innerHTML = `
            <td data-label="ID">${escapeHtml(student.id)}</td>
            <td data-label="Student">${safeName}</td>
            <td data-label="Coursework /40">
                <input type="number" class="score-input" data-field="coursework" min="0" max="${COURSEWORK_MAX}" step="0.5" inputmode="decimal" aria-label="Coursework for ${safeName}">
                <span class="field-error"></span>
            </td>
            <td data-label="Exam /60">
                <input type="number" class="score-input" data-field="exam" min="0" max="${EXAM_MAX}" step="0.5" inputmode="decimal" aria-label="Exam for ${safeName}">
                <span class="field-error"></span>
            </td>
            <td data-label="Total /100" class="total-cell">-</td>
            <td data-label="Grade"><span class="grade-badge">-</span></td>
            <td data-label="Status"><span class="status-tag"></span></td>
        `;

        if (saved) {
            row.querySelector('[data-field="coursework"]').value = saved.coursework;
            row.querySelector('[data-field="exam"]').value = saved.exam;
        }
        gradeTableBody.appendChild(row);
        updateRow(row, saved ? "saved" : "empty");
    });

    panelState.hasUnsavedChanges = false;
    document.getElementById("saveMessage").textContent = "";
    updateClassSummary();
}

function handleScoreInput(e) {
    if (!e.target.classList.contains("score-input")) return;
    updateRow(e.target.closest("tr"));
    panelState.hasUnsavedChanges = true;
    document.getElementById("saveMessage").textContent = "";
    updateClassSummary();
}

function handleScoreKeydown(e) {
    if (e.key !== "Enter" || !e.target.classList.contains("score-input")) return;
    e.preventDefault();
    const nextRow = e.target.closest("tr").nextElementSibling;
    nextRow?.querySelector(`[data-field="${e.target.dataset.field}"]`)?.focus();
}

function saveAllGrades() {
    const saveMsg = document.getElementById("saveMessage");
    const rows = [...gradeTableBody.querySelectorAll("tr[data-student-id]")];

    const invalidRows = rows.filter((r) => !updateRow(r, r.dataset.status === "invalid" ? undefined : r.dataset.status));
    if (invalidRows.length) {
        invalidRows.forEach((r) => setRowStatus(r, "invalid"));
        saveMsg.textContent = `${invalidRows.length} row(s) need fixing before saving.`;
        saveMsg.className = "form-message message-error";
        invalidRows[0].querySelector(".input-invalid")?.focus();
        return;
    }

    const grades = readList(PORTAL_KEYS.grades);
    const { code: subjectCode } = panelState.selectedSubject;
    const term = panelState.selectedTerm;
    let savedCount = 0;
    let removedCount = 0;

    rows.forEach((row) => {
        const studentId = row.dataset.studentId;
        const cwText = row.querySelector('[data-field="coursework"]').value.trim();
        const exText = row.querySelector('[data-field="exam"]').value.trim();
        const idx = grades.findIndex((g) => g.studentId === studentId && g.subjectCode === subjectCode && g.term === term);

        if (!cwText && !exText) {
            if (idx !== -1) {
                grades.splice(idx, 1);
                removedCount++;
            }
            setRowStatus(row, "empty");
            return;
        }

        const coursework = Number(cwText);
        const exam = Number(exText);
        const record = {
            studentId, subjectCode, term, coursework, exam,
            total: coursework + exam,
            enteredBy: panelState.teacher.username,
            updatedAt: new Date().toISOString()
        };

        if (idx === -1) grades.push(record);
        else grades[idx] = record;

        savedCount++;
        setRowStatus(row, "saved");
    });

    writeList(PORTAL_KEYS.grades, grades);
    panelState.hasUnsavedChanges = false;
    saveMsg.textContent = `Saved ${savedCount} grade(s) for ${panelState.selectedSubject.name}.` +
        (removedCount ? ` Removed ${removedCount} cleared grade(s).` : "");
    saveMsg.className = "form-message message-success";

    if (!document.getElementById("reportCard").hidden) generateReportCard();
}

function undoUnsavedChanges() {
    if (panelState.hasUnsavedChanges && confirm("Undo all changes since the last save?")) {
        renderGradeTable();
    }
}

function applyBatchScores() {
    const batchMsg = document.getElementById("batchMessage");
    const lines = document.getElementById("batchInput").value.split("\n");
    let filled = 0;
    const badLines = [];

    lines.forEach((line, idx) => {
        if (!line.trim()) return;
        const parts = line.trim().split(/[\s,;]+/);
        const row = gradeTableBody.querySelector(`tr[data-student-id="${(parts[0] || "").toUpperCase()}"]`);
        if (parts.length !== 3 || !row) return badLines.push(idx + 1);

        row.querySelector('[data-field="coursework"]').value = parts[1];
        row.querySelector('[data-field="exam"]').value = parts[2];
        updateRow(row);
        filled++;
    });

    if (filled) {
        panelState.hasUnsavedChanges = true;
        updateClassSummary();
        document.getElementById("saveMessage").textContent = "";
    }

    batchMsg.textContent = `Filled ${filled} row(s).` +
        (badLines.length ? ` Could not read line(s): ${badLines.join(", ")}.` : "") +
        (filled ? " Check the table, then click Save all grades." : "");
    batchMsg.className = `form-message ${badLines.length ? "message-error" : "message-success"}`;
}

/* ---------- Report Card Engine ---------- */

const reportStudentSelect = document.getElementById("reportStudentSelect");
const reportCardElement = document.getElementById("reportCard");

function getTermAverage(grades, studentId, term) {
    return averageOf(
        grades.filter((g) => g.studentId === studentId && g.term === term).map((g) => g.total)
    );
}

function compileReportCard(studentId, term) {
    const student = getStudentById(studentId);
    const grades = readList(PORTAL_KEYS.grades);
    const classmates = readStudents().filter((s) => s.className === student.className);
    const subjects = readList(PORTAL_KEYS.subjects).filter((s) => s.gradeLevels.includes(student.gradeLevel));

    const subjectRows = [];
    const missingSubjects = [];

    subjects.forEach((subject) => {
        const rec = findGrade(grades, studentId, subject.code, term);
        if (!rec) return missingSubjects.push(subject.name);

        const classTotals = classmates
            .map((cm) => findGrade(grades, cm.id, subject.code, term)?.total)
            .filter((t) => typeof t === "number");

        const band = getGradeBand(rec.total);
        subjectRows.push({
            subjectName: subject.name,
            coursework: rec.coursework,
            exam: rec.exam,
            total: rec.total,
            letter: band.letter,
            points: band.points,
            remark: band.remark,
            classAverage: averageOf(classTotals)
        });
    });

    const totals = subjectRows.map((r) => r.total);
    const overallAverage = averageOf(totals);
    const gpa = averageOf(subjectRows.map((r) => r.points));
    const passedCount = totals.filter((t) => t >= PASS_MARK).length;
    const sorted = [...subjectRows].sort((a, b) => b.total - a.total);

    const rankedAvgs = classmates
        .map((cm) => ({ id: cm.id, avg: getTermAverage(grades, cm.id, term) }))
        .filter((x) => x.avg !== null);

    const classPosition = overallAverage === null
        ? null
        : rankedAvgs.filter((x) => x.avg > overallAverage).length + 1;

    return {
        student, term, subjectRows, missingSubjects, overallAverage,
        overallBand: overallAverage === null ? null : getGradeBand(overallAverage),
        gpa, passedCount,
        bestSubject: sorted[0] || null,
        weakestSubject: sorted.length > 1 ? sorted.at(-1) : null,
        classPosition,
        classSize: rankedAvgs.length
    };
}

function toOrdinal(n) {
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
    return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
}

function getSavedComment(studentId, term) {
    return readList(PORTAL_KEYS.reportComments)
        .find((c) => c.studentId === studentId && c.term === term)?.comment || "";
}

function saveReportComment(studentId, term) {
    const comment = document.getElementById("teacherCommentInput").value.trim();
    const comments = readList(PORTAL_KEYS.reportComments);
    const idx = comments.findIndex((c) => c.studentId === studentId && c.term === term);
    const entry = {
        studentId, term, comment,
        enteredBy: panelState.teacher.username,
        updatedAt: new Date().toISOString()
    };

    if (idx === -1) comments.push(entry);
    else comments[idx] = entry;

    writeList(PORTAL_KEYS.reportComments, comments);
    const msg = document.getElementById("commentMessage");
    msg.textContent = "Comment saved.";
    msg.className = "form-message message-success";
}

function renderReportCard(report) {
    const { student } = report;
    const rowsHtml = report.subjectRows.length
        ? report.subjectRows.map((r) => `
            <tr>
                <td data-label="Subject">${escapeHtml(r.subjectName)}</td>
                <td data-label="Coursework /40">${fmtNum(r.coursework)}</td>
                <td data-label="Exam /60">${fmtNum(r.exam)}</td>
                <td data-label="Total /100"><strong>${fmtNum(r.total)}</strong></td>
                <td data-label="Grade"><span class="grade-badge grade-${r.letter}">${r.letter}</span></td>
                <td data-label="Class avg.">${fmtNum(r.classAverage)}</td>
                <td data-label="Remark">${r.remark}</td>
            </tr>`).join("")
        : '<tr><td colspan="7" class="empty-cell">No grades recorded for this term yet.</td></tr>';

    const missingHtml = report.missingSubjects.length
        ? `<p class="missing-note">Not yet graded: ${escapeHtml(report.missingSubjects.join(", "))}</p>`
        : "";

    reportCardElement.innerHTML = `
        <header class="report-header">
            <div>
                <p class="report-school">${SCHOOL_NAME}</p>
                <h3>Student Report Card - ${report.term}</h3>
            </div>
            <button type="button" id="printReportButton" class="button button-secondary no-print">Print</button>
        </header>
        <dl class="report-details">
            <div><dt>Student</dt><dd>${escapeHtml(student.fullName)}</dd></div>
            <div><dt>ID</dt><dd>${escapeHtml(student.id)}</dd></div>
            <div><dt>Class</dt><dd>${escapeHtml(student.className)}</dd></div>
            <div><dt>Cohort</dt><dd>${escapeHtml(student.cohort || "-")}</dd></div>
        </dl>
        <div class="table-wrapper">
            <table class="data-table report-table">
                <thead>
                    <tr>
                        <th scope="col">Subject</th><th scope="col">Coursework /40</th>
                        <th scope="col">Exam /60</th><th scope="col">Total /100</th>
                        <th scope="col">Grade</th><th scope="col">Class avg.</th><th scope="col">Remark</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>
        ${missingHtml}
        <dl class="summary-grid report-summary">
            <div><dt>Overall average</dt><dd>${fmtNum(report.overallAverage)}${report.overallBand ? ` (${report.overallBand.letter})` : ""}</dd></div>
            <div><dt>GPA (4.0 scale)</dt><dd>${report.gpa === null ? "-" : report.gpa.toFixed(2)}</dd></div>
            <div><dt>Class position</dt><dd>${report.classPosition ? `${toOrdinal(report.classPosition)} of ${report.classSize}` : "-"}</dd></div>
            <div><dt>Subjects passed</dt><dd>${report.passedCount} / ${report.subjectRows.length}</dd></div>
            <div><dt>Strongest subject</dt><dd>${report.bestSubject ? escapeHtml(report.bestSubject.subjectName) : "-"}</dd></div>
            <div><dt>Needs most work</dt><dd>${report.weakestSubject ? escapeHtml(report.weakestSubject.subjectName) : "-"}</dd></div>
        </dl>
        <p class="overall-remark">Overall: <strong>${report.overallBand ? report.overallBand.remark : "No grades yet"}</strong></p>
        <div class="form-field comment-field">
            <label for="teacherCommentInput">Teacher's comment</label>
            <textarea id="teacherCommentInput" rows="3" maxlength="300"></textarea>
            <div class="comment-actions no-print">
                <button type="button" id="saveCommentButton" class="button button-secondary">Save comment</button>
                <span id="commentMessage" class="form-message" role="status"></span>
            </div>
        </div>
        <p class="report-signature">Teacher: ${escapeHtml(panelState.teacher.fullName)}</p>
    `;

    document.getElementById("teacherCommentInput").value = getSavedComment(student.id, report.term);
    document.getElementById("printReportButton").addEventListener("click", () => window.print());
    document.getElementById("saveCommentButton").addEventListener("click", () => saveReportComment(student.id, report.term));
    reportCardElement.hidden = false;
}

function generateReportCard() {
    if (!reportStudentSelect.value) {
        reportCardElement.hidden = true;
        return;
    }
    renderReportCard(compileReportCard(reportStudentSelect.value, panelState.selectedTerm));
}

/* ---------- Start-up ---------- */

function startTeacherPanel() {
    document.getElementById("demoLoginButton").addEventListener("click", signInAsDemoTeacher);
    document.getElementById("logoutButton").addEventListener("click", logOut);

    panelState.teacher = getSignedInTeacher();
    if (!panelState.teacher) {
        document.getElementById("accessNotice").hidden = false;
        document.getElementById("logoutButton").hidden = true;
        return;
    }

    document.getElementById("teacherPanel").hidden = false;
    document.getElementById("teacherNameText").textContent = panelState.teacher.fullName;
    document.getElementById("teacherSubjectsText").textContent = panelState.teacher.subjects
        .map(getSubjectByCode)
        .filter(Boolean)
        .map((s) => s.name)
        .join(", ");

    fillSubjectDropdown();

    guardFilterChange(subjectSelect, handleSubjectChange);
    guardFilterChange(gradeLevelSelect, handleGradeLevelChange);
    guardFilterChange(classSelect, handleClassChange);
    guardFilterChange(termSelect, handleTermChange);

    document.getElementById("filterForm").addEventListener("submit", handleFilterSubmit);
    gradeTableBody.addEventListener("input", handleScoreInput);
    gradeTableBody.addEventListener("keydown", handleScoreKeydown);
    document.getElementById("saveGradesButton").addEventListener("click", saveAllGrades);
    document.getElementById("resetGradesButton").addEventListener("click", undoUnsavedChanges);
    document.getElementById("applyBatchButton").addEventListener("click", applyBatchScores);
    document.getElementById("reportForm").addEventListener("submit", (e) => {
        e.preventDefault();
        generateReportCard();
    });

    window.addEventListener("beforeunload", (e) => {
        if (panelState.hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = "";
        }
    });
}

startTeacherPanel();