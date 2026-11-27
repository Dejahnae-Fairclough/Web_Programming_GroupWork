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

const STUDENT_STORAGE_KEY = (typeof STORAGE_KEYS !== "undefined" && STORAGE_KEYS.STUDENTS) || "portal_students";
const FALLBACK_STUDENTS = typeof DEFAULT_STUDENTS !== "undefined" ? DEFAULT_STUDENTS : [];

let students = typeof loadFromStorage === "function"
    ? loadFromStorage(STUDENT_STORAGE_KEY, FALLBACK_STUDENTS)
    : JSON.parse(localStorage.getItem(STUDENT_STORAGE_KEY) || "[]");

const studentForm = document.getElementById("studentForm");
const studentTable = document.getElementById("studentTable");
const saveButton = document.getElementById("saveButton");
let editIndex = -1;

function saveRecords() {
    if (typeof saveToStorage === "function") {
        saveToStorage(STUDENT_STORAGE_KEY, students);
    } else {
        localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(students));
    }
}

function displayStudents() {
    if (!studentTable) return;
    studentTable.innerHTML = "";

    students.forEach((student, index) => {
        const row = studentTable.insertRow();
        row.insertCell(0).textContent = student.id;
        row.insertCell(1).textContent = student.name;
        row.insertCell(2).textContent = student.studentClass || `Grade ${student.gradeLevel || 7}`;
        row.insertCell(3).textContent = student.status || "Active";

        const actions = row.insertCell(4);

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.textContent = "Edit";
        editBtn.onclick = () => editStudent(index);

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.textContent = "Delete";
        deleteBtn.onclick = () => deleteStudent(index);

        actions.append(editBtn, deleteBtn);
    });
}

function saveStudent(event) {
    event.preventDefault();

    const id = document.getElementById("studentID").value.trim().toUpperCase();
    const name = document.getElementById("studentName").value.trim();
    const studentClass = document.getElementById("studentClass").value;
    const status = document.getElementById("studentStatus").value;

    const isDuplicate = students.some((s, i) => String(s.id).toUpperCase() === id && i !== editIndex);
    if (isDuplicate) {
        alert("Student ID already exists!");
        return;
    }

    const gradeLevel = Number((studentClass.match(/\d+/) || [7])[0]);
    const nameParts = name.split(/\s+/);
    const existing = editIndex !== -1 ? students[editIndex] : {};

    const studentRecord = {
        ...existing,
        id,
        name,
        firstName: nameParts[0] || name,
        lastName: nameParts.slice(1).join(" "),
        gradeLevel,
        className: existing.className && existing.gradeLevel === gradeLevel ? existing.className : `${gradeLevel}A`,
        studentClass,
        status,
        cohort: existing.cohort || "2026/2027 - Semester 1"
    };

    if (editIndex === -1) {
        students.push(studentRecord);
        alert("Student added successfully!");
    } else {
        students[editIndex] = studentRecord;
        alert("Student updated successfully!");
    }

    saveRecords();
    studentForm.reset();
    editIndex = -1;
    saveButton.textContent = "Add Student";
    displayStudents();
}

function editStudent(index) {
    const s = students[index];
    document.getElementById("studentID").value = s.id;
    document.getElementById("studentName").value = s.name;
    document.getElementById("studentClass").value = s.studentClass || `Grade ${s.gradeLevel || 7}`;
    document.getElementById("studentStatus").value = s.status || "Active";

    editIndex = index;
    saveButton.textContent = "Update Student";
}

function deleteStudent(index) {
    if (confirm("Are you sure you want to delete this student?")) {
        students.splice(index, 1);
        saveRecords();
        displayStudents();
        alert("Student deleted successfully!");
    }
}

if (studentForm) {
    studentForm.addEventListener("submit", saveStudent);
    displayStudents();
}