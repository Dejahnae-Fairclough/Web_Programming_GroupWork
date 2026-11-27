//Name:Dejahnae Fairclough
//Date: November 24, 2026
//ID#: 2406846
// Assignment: School Portal Web Application
// Module: CIT2011 Web Programming

// Get student records from shared storage
let students = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.students)
) || DEFAULT_STUDENTS;


// Get the HTML elements
let studentForm = document.getElementById("studentForm");
let studentTable = document.getElementById("studentTable");
let saveButton = document.getElementById("saveButton");


// Keep track of the student being edited
let editIndex = -1;


// Save student records
function saveRecords() {

    localStorage.setItem(
        STORAGE_KEYS.students,
        JSON.stringify(students)
    );

}


// Display student records
function displayStudents() {

    studentTable.innerHTML = "";

    for (let i = 0; i < students.length; i++) {

        let row = studentTable.insertRow();

        row.insertCell(0).textContent = students[i].id;
        row.insertCell(1).textContent = students[i].name;
        row.insertCell(2).textContent = students[i].studentClass;
        row.insertCell(3).textContent = students[i].status;

        let actions = row.insertCell(4);

        // Create Edit button
        let editButton = document.createElement("button");

        editButton.textContent = "Edit";

        editButton.onclick = function () {
            editStudent(i);
        };


        // Create Delete button
        let deleteButton = document.createElement("button");

        deleteButton.textContent = "Delete";

        deleteButton.onclick = function () {
            deleteStudent(i);
        };


        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

    }

}


// Add or update a student
function saveStudent(event) {

    event.preventDefault();

    let id = document.getElementById("studentID").value.trim();
    let name = document.getElementById("studentName").value.trim();
    let studentClass = document.getElementById("studentClass").value;
    let status = document.getElementById("studentStatus").value;


    // Check if the student ID already exists
    let duplicate = students.some(function (student, index) {

        return String(student.id) === id && index !== editIndex;

    });


    if (duplicate) {

        alert("Student ID already exists!");
        return;

    }


    // Store the student information
    let student = {

        id: id,
        name: name,
        studentClass: studentClass,
        status: status

    };


    // Check if adding or editing
    if (editIndex === -1) {

        students.push(student);

        alert("Student added successfully!");

    } else {

        students[editIndex] = student;

        alert("Student updated successfully!");

    }


    // Save changes
    saveRecords();


    // Clear the form
    studentForm.reset();

    editIndex = -1;

    saveButton.textContent = "Add Student";


    // Refresh the table
    displayStudents();

}


// Edit student information
function editStudent(index) {

    document.getElementById("studentID").value = students[index].id;

    document.getElementById("studentName").value = students[index].name;

    document.getElementById("studentClass").value = students[index].studentClass;

    document.getElementById("studentStatus").value = students[index].status;


    editIndex = index;

    saveButton.textContent = "Update Student";

}


// Delete a student
function deleteStudent(index) {

    let confirmDelete = confirm(
        "Are you sure you want to delete this student?"
    );


    if (confirmDelete) {

        students.splice(index, 1);

        saveRecords();

        displayStudents();

        alert("Student deleted successfully!");

    }

}


// Listen for form submissions
studentForm.addEventListener("submit", saveStudent);


// Display saved students when the page opens
displayStudents();
