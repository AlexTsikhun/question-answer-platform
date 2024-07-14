document.addEventListener("DOMContentLoaded", function () {
  const qaContainer = document.getElementById("qaContainer");
  const addQuestionForm = document.getElementById("addQuestionForm");
  const editIdInput = document.getElementById("editId");
  const clearButton = document.getElementById("clearButton");

  const fileInput = document.getElementById("fileInput");
  const processFileBtn = document.getElementById("processFileBtn");

  processFileBtn.addEventListener("click", handleProcessFile);

  function handleProcessFile() {
    const file = fileInput.files[0];
    if (!file) {
      alert("Please select a file.");
      return;
    }

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: function (results) {
        saveDataToIndexedDB(results.data);
      },
      error: function (error) {
        console.error("CSV parsing error:", error);
      },
    });
  }

  function saveDataToIndexedDB(data) {
    // let dbName = 'Python Core'; // Adjust according to your database name
    const dbVersion = 1; // Adjust according to your database version
    let db;

    const request = indexedDB.open(currentDbName, dbVersion);

    request.onupgradeneeded = function (event) {
      db = event.target.result;
      if (!db.objectStoreNames.contains("questions")) {
        db.createObjectStore("questions", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = function (event) {
      db = event.target.result;

      const transaction = db.transaction(["questions"], "readwrite");
      const store = transaction.objectStore("questions");

      data.forEach(function (row) {
        const newQuestion = {
          topic: row.topic,
          keywords: row.keywords,

          answer: row.answer,
        };
        store.add(newQuestion);
      });

      transaction.oncomplete = function () {
        console.log(`Data saved to IndexdDB ${currentDbName} successfully.`);
        renderQuestions();
      };

      transaction.onerror = function (event) {
        console.error("Transaction error:", event.target.errorCode);
      };
    };

    request.onerror = function (event) {
      console.error("Database error:", event.target.errorCode);
    };
  }

  function renderQuestions() {
    // Implement your rendering logic to display questions from IndexedDB
    // This function should retrieve data from IndexedDB and update the UI
  }

  let dbName = ""; // Default database name
  const dbVersion = 1;
  let db;

  // // Open (or create) the database
  // const request = indexedDB.open(dbName, dbVersion);
  //
  // request.onupgradeneeded = function(event) {
  //   db = event.target.result;
  //   if (!db.objectStoreNames.contains('questions')) {
  //     db.createObjectStore('questions', { keyPath: 'id', autoIncrement: true });
  //   }
  // };
  //
  // request.onsuccess = function(event) {
  //   db = event.target.result;
  //   renderQuestions();
  // };
  //
  // request.onerror = function(event) {
  //   console.error('Database error:', event.target.errorCode);
  // };

  // Function to add or update a question
  function saveQuestion(id, topic, keywords, answer) {
    const transaction = db.transaction(["questions"], "readwrite");
    const store = transaction.objectStore("questions");

    if (id) {
      // Update existing record
      const updatedQuestion = { id, topic, keywords, answer };
      store.put(updatedQuestion);
    } else {
      // Add new record
      const newQuestion = { topic, keywords, answer };
      store.add(newQuestion);
    }

    transaction.oncomplete = function () {
      renderQuestions();
      addQuestionForm.reset();
      editIdInput.value = ""; // Clear the edit ID
    };

    transaction.onerror = function (event) {
      console.error("Transaction error:", event.target.errorCode);
    };
  }

  // Function to render questions from IndexedDB
  function renderQuestions() {
    const transaction = db.transaction(["questions"], "readonly");
    const store = transaction.objectStore("questions");
    const request = store.getAll();

    request.onsuccess = function () {
      const questions = request.result;
      qaContainer.innerHTML = ""; // Clear the container before rendering
      questions.forEach((question) => {
        const qaTableEntry = document.createElement("div");
        qaTableEntry.classList.add("qa-table");
        qaTableEntry.dataset.id = question.id; // Set data-id attribute for easy access

        // Create new question HTML structure
        const qaRow = document.createElement("div");
        qaRow.classList.add("qa-row");
        qaRow.innerHTML = `
          <div class="topic-cell"><b>${question.topic}</b></div>
          <div class="keywords-cell">${question.keywords}</div>
        `;

        const qaAnswer = document.createElement("div");
        qaAnswer.classList.add("qa-answer", "hidden");
        qaAnswer.innerHTML = `
          <div>${question.answer}</div>
          <button class="edit-answer-btn">Edit Answer</button>
          <button class="delete-answer-btn">Delete Answer</button>
        `;

        qaTableEntry.appendChild(qaRow);
        qaTableEntry.appendChild(qaAnswer);

        qaContainer.appendChild(qaTableEntry);
      });
    };

    request.onerror = function (event) {
      console.error("Request error:", event.target.errorCode);
    };
  }

  // Event listener for form submission
  addQuestionForm.addEventListener("submit", function (event) {
    event.preventDefault();

    // Get form values
    const id = parseInt(editIdInput.value, 10) || null; // Get ID for editing
    const topic = document.getElementById("topic").value;
    const keywords = document.getElementById("keywords").value;
    const answer = document.getElementById("answer").value;

    // Save new or updated question to IndexedDB
    saveQuestion(id, topic, keywords, answer);
  });

  // Event listener for toggling answer visibility
  qaContainer.addEventListener("click", function (event) {
    const clickedElement = event.target.closest(".qa-table");
    if (clickedElement) {
      // const answerDiv = clickedElement.querySelector(".qa-answer");
      // console.log("1", answerDiv);

      // if (answerDiv) {
      // console.log("---", answerDiv);

      clickedElement.classList.toggle("visible");
      // }
    }
  });

  // Event listener for editing and deleting answers
  qaContainer.addEventListener("click", function (event) {
    const qaTableEntry = event.target.closest(".qa-table");
    const id = parseInt(qaTableEntry.dataset.id, 10);

    if (event.target.classList.contains("edit-answer-btn")) {
      // Populate form for editing
      fetchQuestion(id, function (question) {
        document.getElementById("topic").value = question.topic;
        document.getElementById("keywords").value = question.keywords;
        document.getElementById("answer").value = question.answer;
        editIdInput.value = question.id; // Set ID for editing
      });
    } else if (event.target.classList.contains("delete-answer-btn")) {
      // Delete answer
      deleteQuestion(id);
    }
  });

  // Function to fetch a question by ID
  function fetchQuestion(id, callback) {
    const transaction = db.transaction(["questions"], "readonly");
    const store = transaction.objectStore("questions");
    const request = store.get(id);

    request.onsuccess = function () {
      callback(request.result);
    };

    request.onerror = function (event) {
      console.error("Request error:", event.target.errorCode);
    };
  }

  // Function to delete a question
  function deleteQuestion(id) {
    const transaction = db.transaction(["questions"], "readwrite");
    const store = transaction.objectStore("questions");
    store.delete(id);

    transaction.oncomplete = function () {
      renderQuestions();
    };

    transaction.onerror = function (event) {
      console.error("Transaction error:", event.target.errorCode);
    };
  }

  // Event listener for clearing form fields
  clearButton.addEventListener("click", function () {
    addQuestionForm.reset();
  });

  // Function to open a specific database
  function openDatabase(dbName, dbVersion) {
    console.log(dbName);
    const request = indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = function (event) {
      db = event.target.result;
      if (db.objectStoreNames.contains("questions")) {
        db.deleteObjectStore("questions"); // Delete existing object store
      }
      db.createObjectStore("questions", { keyPath: "id", autoIncrement: true });
    };

    return new Promise((resolve, reject) => {
      request.onsuccess = function (event) {
        db = event.target.result;
        console.log(`Database ${dbName} opened successfully.`);
        resolve();
      };

      request.onerror = function (event) {
        console.error(
          `Error opening database ${dbName}:`,
          event.target.errorCode
        );
        reject(event.target.errorCode);
      };
    });
  }

  // Function to update header text
  function updateHeader(dbName) {
    dbNameHeader.textContent = dbName; // Update header with database name
  }

  // Function to switch databases and render questions
  async function switchDatabaseAndRender(dbName, dbVersion) {
    try {
      await openDatabase(dbName, dbVersion);
      currentDbName = dbName;
      currentDbVersion = dbVersion;
      updateHeader(dbName); // Update header text
      renderQuestions();
    } catch (error) {
      console.error("Database switch error:", error);
    }
  }

  // Event listeners for database switching buttons
  showDb1Button.addEventListener("click", function () {
    switchDatabaseAndRender("Python Core", 1);
  });

  showDb2Button.addEventListener("click", function () {
    switchDatabaseAndRender("Database", 1);
  });

  showDb3Button.addEventListener("click", function () {
    switchDatabaseAndRender("Django DRF", 1);
  });

  // !!!
  const exportDataBtn = document.getElementById("exportDataBtn");

  exportDataBtn.addEventListener("click", function () {
    // Get all QA entries from the container
    const qaEntries = qaContainer.querySelectorAll(".qa-table");

    if (qaEntries.length === 0) {
      alert("No data to export.");
      return;
    }

    // Prepare data to export
    const exportedData = [];

    qaEntries.forEach((qaEntry, index) => {
      const id = index + 1; // Numeration starts from 1
      const topic = qaEntry.querySelector(".topic-cell").textContent.trim();
      const keywords = qaEntry
        .querySelector(".keywords-cell")
        .textContent.trim();
      const answer = qaEntry.querySelector(".qa-answer div").textContent.trim();

      // Format the data as needed (e.g., CSV format)
      const rowData = `${id},${topic},${keywords},${answer}`;
      exportedData.push(rowData);
    });

    // Add headers
    exportedData.unshift("id,topic,keywords,answer");

    // Download the data as a file
    downloadCSV(exportedData.join("\n"), "exported_data.csv");
  });

  // Function to download data as CSV file
  function downloadCSV(csvData, fileName) {
    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

});
