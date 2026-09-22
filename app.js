// ===============================
// JHARKHANDI YODDHA - APP.JS
// Fixed Version
// ===============================

const SUPABASE_URL = "https://deosivmmboovramgwuft.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_WsnQdEgCb6YTLdeTmdt3hA_mDfs5eA4";

const db = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;
let currentProfile = null;

// ===============================
// HELPERS
// ===============================

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, function (char) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
}

function money(value) {
  const amount = Number(value || 0);
  return amount === 0
    ? "Free"
    : "₹" + amount.toLocaleString("en-IN");
}

function $(id) {
  return document.getElementById(id);
}

function openModal(html) {
  const content = $("modalContent");
  const modal = $("modal");

  if (!content || !modal) {
    alert("Modal element नहीं मिला।");
    return;
  }

  content.innerHTML = html;
  modal.classList.add("show");
}

function closeModal() {
  const modal = $("modal");
  if (modal) {
    modal.classList.remove("show");
  }
}

// ===============================
// AUTH MODAL
// ===============================

function openAuth() {
  openModal(`
    <h2>Login / Signup</h2>

    <input
      id="authName"
      placeholder="Full name (Signup के लिए)"
    >

    <input
      id="authEmail"
      type="email"
      placeholder="Email"
    >

    <input
      id="authPassword"
      type="password"
      placeholder="Password"
    >

    <div class="row">
      <button class="primaryBtn" onclick="signIn()">
        Login
      </button>

      <button class="secondaryBtn" onclick="signUp()">
        Signup
      </button>
    </div>

    <p id="authMsg" class="muted"></p>
  `);
}

// ===============================
// SIGN UP
// ===============================

async function signUp() {
  const nameEl = $("authName");
  const emailEl = $("authEmail");
  const passwordEl = $("authPassword");
  const msg = $("authMsg");

  if (!nameEl || !emailEl || !passwordEl || !msg) {
    return;
  }

  const name = nameEl.value.trim();
  const email = emailEl.value.trim();
  const password = passwordEl.value;

  if (!name || !email || password.length < 6) {
    msg.textContent =
      "Name, email और कम-से-कम 6 character password भरें।";
    return;
  }

  msg.textContent = "Signup हो रहा है...";

  const { data, error } = await db.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        full_name: name
      }
    }
  });

  if (error) {
    msg.textContent = error.message;
    return;
  }

  if (data && data.session) {
    msg.textContent = "Signup successful!";
    closeModal();
    await refreshSession();
  } else {
    msg.textContent =
      "Signup हो गया। अगर email confirmation ON है तो पहले email verify करें।";
  }
}

// ===============================
// LOGIN
// ===============================

async function signIn() {
  const emailEl = $("authEmail");
  const passwordEl = $("authPassword");
  const msg = $("authMsg");

  if (!emailEl || !passwordEl || !msg) {
    return;
  }

  const email = emailEl.value.trim();
  const password = passwordEl.value;

  if (!email || !password) {
    msg.textContent = "Email और password भरें।";
    return;
  }

  msg.textContent = "Login हो रहा है...";

  const { error } = await db.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    msg.textContent = error.message;
    return;
  }

  closeModal();
  await refreshSession();
}

// ===============================
// LOGOUT
// ===============================

async function logout() {
  const { error } = await db.auth.signOut();

  if (error) {
    alert(error.message);
    return;
  }

  currentUser = null;
  currentProfile = null;

  await refreshSession();
}

// ===============================
// REFRESH SESSION
// ===============================

async function refreshSession() {
  try {
    const {
      data: { session }
    } = await db.auth.getSession();

    currentUser = session ? session.user : null;

    const authBtn = $("authBtn");

    if (authBtn) {
      authBtn.textContent = currentUser ? "Logout" : "Login";
      authBtn.onclick = currentUser ? logout : openAuth;
    }

    currentProfile = null;

    if (currentUser) {
      const { data, error } = await db
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (!error) {
        currentProfile = data || null;
      }
    }

    const dashboard = $("dashboard");
    const admin = $("admin");

    if (dashboard) {
      dashboard.classList.toggle("hidden", !currentUser);
    }

    if (admin) {
      admin.classList.toggle(
        "hidden",
        currentProfile?.role !== "admin"
      );
    }

    if (currentUser) {
      await renderDashboard();
    }

    if (currentProfile?.role === "admin") {
      await renderAdmin();
    }
  } catch (error) {
    console.error("Session Error:", error);
  }
}

// ===============================
// LOAD COURSES
// ===============================

async function loadCourses() {
  const el = $("coursesGrid");

  if (!el) return;

  const {
    data,
    error
  } = await db
    .from("courses")
    .select("*")
    .eq("is_published", true)
    .order("created_at", {
      ascending: false
    });

  if (error) {
    el.innerHTML = `
      <div class="card error">
        ${esc(error.message)}
      </div>
    `;
    return;
  }

  if (!data || data.length === 0) {
    el.innerHTML = `
      <div class="card">
        <h3>अभी courses नहीं हैं</h3>
        <p>Admin panel से पहला course add करें।</p>
      </div>
    `;
    return;
  }

  el.innerHTML = data
    .map(function (course) {
      return `
        <div class="card">

          ${
            course.thumbnail_url
              ? `
                <img
                  class="thumb"
                  src="${esc(course.thumbnail_url)}"
                  alt="${esc(course.title)}"
                >
              `
              : ""
          }

          <h3>${esc(course.title)}</h3>

          <p class="muted">
            ${esc(course.description || "")}
          </p>

          <div class="price">
            ${money(course.price)}
          </div>

          <div class="row">

            <button
              class="primaryBtn"
              onclick="enroll('${course.id}')"
            >
              Enroll
            </button>

            <button
              class="secondaryBtn"
              onclick="openCourse('${course.id}')"
            >
              View Course
            </button>

          </div>

        </div>
      `;
    })
    .join("");
}

// ===============================
// LOAD TESTS
// ===============================

async function loadTests() {
  const el = $("testsGrid");

  if (!el) return;

  const {
    data,
    error
  } = await db
    .from("tests")
    .select("*")
    .eq("is_published", true)
    .order("created_at", {
      ascending: false
    });

  if (error) {
    el.innerHTML = `
      <div class="card error">
        ${esc(error.message)}
      </div>
    `;
    return;
  }

  if (!data || data.length === 0) {
    el.innerHTML = `
      <div class="card">
        <h3>अभी tests नहीं हैं</h3>
      </div>
    `;
    return;
  }

  el.innerHTML = data
    .map(function (test) {
      return `
        <div class="card">

          <h3>${esc(test.title)}</h3>

          <p class="muted">
            ${esc(test.description || "")}
          </p>

          <p>
            ⏱️ ${Number(test.duration_minutes || 0)} मिनट
          </p>

          <button
            class="primaryBtn"
            onclick="startTest('${test.id}')"
          >
            Start Test
          </button>

        </div>
      `;
    })
    .join("");
}

// ===============================
// ENROLL COURSE
// ===============================

async function enroll(courseId) {
  if (!currentUser) {
    openAuth();
    return;
  }

  const {
    error
  } = await db
    .from("enrollments")
    .upsert(
      {
        user_id: currentUser.id,
        course_id: courseId,
        status: "active"
      },
      {
        onConflict: "user_id,course_id"
      }
    );

  if (error) {
    alert(error.message);
    return;
  }

  alert("Course enrollment सफल रहा!");

  await renderDashboard();
  await openCourse(courseId);
}

// ===============================
// DASHBOARD
// ===============================

async function renderDashboard() {
  if (!currentUser) return;

  const profileBox = $("profileBox");

  if (profileBox) {
    profileBox.innerHTML = `
      <h3>
        नमस्ते,
        ${esc(
          currentProfile?.full_name ||
          currentUser.email ||
          "Student"
        )}
      </h3>

      <p>
        ${esc(currentUser.email || "")}
      </p>

      <p>
        Role:
        ${esc(currentProfile?.role || "student")}
      </p>

      <button
        class="danger"
        onclick="logout()"
      >
        Logout
      </button>
    `;
  }

  const {
    data,
    error
  } = await db
    .from("enrollments")
    .select(`
      id,
      status,
      enrolled_at,
      courses (
        title,
        description,
        price
      )
    `)
    .eq("user_id", currentUser.id)
    .order("enrolled_at", {
      ascending: false
    });

  const grid = $("enrollmentsGrid");

  if (!grid) return;

  if (error) {
    grid.innerHTML = `
      <div class="card error">
        ${esc(error.message)}
      </div>
    `;
    return;
  }

  if (!data || data.length === 0) {
    grid.innerHTML = `
      <div class="card">
        <p>अभी कोई enrolled course नहीं है।</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = data
    .map(function (item) {
      return `
        <div class="card">

          <h3>
            ${esc(item.courses?.title || "Course")}
          </h3>

          <p>
            ${esc(item.courses?.description || "")}
          </p>

          <p class="success">
            Status:
            ${esc(item.status || "")}
          </p>

          <button
            class="primaryBtn"
            onclick="openCourse('${item.courses?.id || ""}')"
          >
            Open Course
          </button>

        </div>
      `;
    })
    .join("");
}

// ===============================
// OPEN COURSE
// ===============================

async function openCourse(courseId) {
  if (!courseId) {
    alert("Course ID नहीं मिला।");
    return;
  }

  const {
    data: course,
    error: courseError
  } = await db
    .from("courses")
    .select("id,title,description,price")
    .eq("id", courseId)
    .single();

  if (courseError) {
    alert(courseError.message);
    return;
  }

  if (!currentUser) {
    openModal(`
      <h2>${esc(course.title)}</h2>

      <p>
        ${esc(course.description || "")}
      </p>

      <p class="price">
        ${money(course.price)}
      </p>

      <p>
        Lessons देखने के लिए पहले Login करें और
        course में Enroll करें।
      </p>

      <button
        class="primaryBtn"
        onclick="closeModal();openAuth()"
      >
        Login / Signup
      </button>
    `);

    return;
  }

  const {
    data: enrollment,
    error: enrollmentError
  } = await db
    .from("enrollments")
    .select("id,status")
    .eq("user_id", currentUser.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (enrollmentError) {
    alert(enrollmentError.message);
    return;
  }

  if (!enrollment || enrollment.status !== "active") {
    openModal(`
      <h2>${esc(course.title)}</h2>

      <p>
        ${esc(course.description || "")}
      </p>

      <p class="price">
        ${money(course.price)}
      </p>

      <p>
        यह course देखने के लिए पहले Enroll करें।
      </p>

      <button
        class="primaryBtn"
        onclick="closeModal();enroll('${courseId}')"
      >
        Enroll Now
      </button>
    `);

    return;
  }

  const {
    data: lessons,
    error: lessonError
  } = await db
    .from("lessons")
    .select(`
      id,
      title,
      description,
      video_url,
      pdf_url,
      sort_order
    `)
    .eq("course_id", courseId)
    .eq("is_published", true)
    .order("sort_order", {
      ascending: true
    });

  if (lessonError) {
    alert(lessonError.message);
    return;
  }

  const lessonHTML =
    lessons && lessons.length
      ? lessons
          .map(function (lesson, index) {
            return `
              <div class="lesson">

                <div>
                  <strong>
                    ${index + 1}.
                    ${esc(lesson.title)}
                  </strong>

                  <p>
                    ${esc(lesson.description || "")}
                  </p>
                </div>

                <div class="row">

                  ${
                    lesson.video_url
                      ? `
                        <button
                          class="secondaryBtn"
                          onclick='playVideo(
                            ${JSON.stringify(lesson.video_url)},
                            ${JSON.stringify(lesson.title)}
                          )'
                        >
                          ▶ Video
                        </button>
                      `
                      : ""
                  }

                  ${
                    lesson.pdf_url
                      ? `
                        <a
                          class="secondaryBtn linkBtn"
                          target="_blank"
                          rel="noopener noreferrer"
                          href="${esc(lesson.pdf_url)}"
                        >
                          📄 PDF
                        </a>
                      `
                      : ""
                  }

                </div>

              </div>
            `;
          })
          .join("")
      : `
        <div class="card">
          <p>
            इस course में अभी lessons publish नहीं हुए हैं।
          </p>
        </div>
      `;

  openModal(`
    <h2>${esc(course.title)}</h2>

    <p class="muted">
      ${esc(course.description || "")}
    </p>

    <div class="lessonList">
      ${lessonHTML}
    </div>
  `);
}

// ===============================
// VIDEO PLAYER
// ===============================

function playVideo(url, title) {
  let embedUrl = url;

  try {
    const youtubeWatch =
      url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/i
      );

    if (youtubeWatch) {
      embedUrl =
        "https://www.youtube.com/embed/" +
        youtubeWatch[1];
    }
  } catch (error) {
    console.error(error);
  }

  openModal(`
    <h2>${esc(title)}</h2>

    <div class="videoWrap">
      <iframe
        src="${esc(embedUrl)}"
        title="${esc(title)}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>

    <p class="muted small">
      Video source:
      ${esc(url)}
    </p>
  `);
}

// ===============================
// ADMIN - COURSE LIST FOR LESSON
// ===============================

async function refreshLessonCourses() {
  const select = $("lessonCourse");

  if (!select) return;

  const {
    data,
    error
  } = await db
    .from("courses")
    .select("id,title")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    console.error(error);
    return;
  }

  select.innerHTML = `
    <option value="">
      Course चुनें
    </option>
  `;

  (data || []).forEach(function (course) {
    select.insertAdjacentHTML(
      "beforeend",
      `
        <option value="${esc(course.id)}">
          ${esc(course.title)}
        </option>
      `
    );
  });
}

// ===============================
// ADMIN PANEL
// ===============================

async function renderAdmin() {
  if (currentProfile?.role !== "admin") {
    return;
  }

  await refreshLessonCourses();

  const {
    data,
    error
  } = await db
    .from("courses")
    .select(`
      id,
      title,
      price,
      is_published,
      created_at,
      lessons (
        id,
        title,
        is_published,
        sort_order
      )
    `)
    .order("created_at", {
      ascending: false
    });

  const el = $("adminCourses");

  if (!el) return;

  if (error) {
    el.innerHTML = `
      <div class="card error">
        ${esc(error.message)}
      </div>
    `;
    return;
  }

  if (!data || data.length === 0) {
    el.innerHTML = `
      <div class="card">
        No courses yet.
      </div>
    `;
    return;
  }

  el.innerHTML = data
    .map(function (course) {
      const lessons = (course.lessons || []).sort(
        function (a, b) {
          return (
            Number(a.sort_order || 0) -
            Number(b.sort_order || 0)
          );
        }
      );

      return `
        <div class="card">

          <h3>
            ${esc(course.title)}
          </h3>

          <p>
            ${money(course.price)}
            •
            ${
              course.is_published
                ? "Published"
                : "Draft"
            }
          </p>

          <p>
            <b>${lessons.length}</b>
            lessons
          </p>

          ${
            lessons.length
              ? lessons
                  .map(function (lesson) {
                    return `
                      <div class="miniLesson">
                        ${esc(lesson.title)}

                        <span>
                          ${
                            lesson.is_published
                              ? "Published"
                              : "Draft"
                          }
                        </span>
                      </div>
                    `;
                  })
                  .join("")
              : `
                <p class="muted">
                  अभी कोई lesson नहीं।
                </p>
              `
          }

        </div>
      `;
    })
    .join("");
}

// ===============================
// ADMIN COURSE FORM
// ===============================

function setupForms() {
  const courseForm = $("courseForm");

  if (courseForm) {
    courseForm.addEventListener(
      "submit",
      async function (event) {
        event.preventDefault();

        if (currentProfile?.role !== "admin") {
          alert("Admin access required.");
          return;
        }

        const title = $("courseTitle")?.value.trim();
        const description =
          $("courseDesc")?.value.trim() || "";

        const price = Number(
          $("coursePrice")?.value || 0
        );

        const thumbnail =
          $("courseThumb")?.value.trim() || null;

        const published =
          $("coursePublished")?.checked || false;

        if (!title) {
          alert("Course title डालें।");
          return;
        }

        const {
          error
        } = await db
          .from("courses")
          .insert({
            title: title,
            description: description,
            price: price,
            thumbnail_url: thumbnail,
            is_published: published
          });

        if (error) {
          alert(error.message);
          return;
        }

        courseForm.reset();

        const priceInput = $("coursePrice");

        if (priceInput) {
          priceInput.value = 0;
        }

        await loadCourses();
        await renderAdmin();

        alert("Course added successfully!");
      }
    );
  }

  // =============================
  // LESSON FORM
  // =============================

  const lessonForm = $("lessonForm");

  if (lessonForm) {
    lessonForm.addEventListener(
      "submit",
      async function (event) {
        event.preventDefault();

        if (currentProfile?.role !== "admin") {
          alert("Admin access required.");
          return;
        }

        const courseId =
          $("lessonCourse")?.value;

        const title =
          $("lessonTitle")?.value.trim();

        const description =
          $("lessonDesc")?.value.trim() || "";

        const video =
          $("lessonVideo")?.value.trim() || null;

        const pdf =
          $("lessonPdf")?.value.trim() || null;

        const order = Number(
          $("lessonOrder")?.value || 0
        );

        const published =
          $("lessonPublished")?.checked || false;

        if (!courseId) {
          alert("Course चुनें।");
          return;
        }

        if (!title) {
          alert("Lesson title डालें।");
          return;
        }

        const {
          error
        } = await db
          .from("lessons")
          .insert({
            course_id: courseId,
            title: title,
            description: description,
            video_url: video,
            pdf_url: pdf,
            sort_order: order,
            is_published: published
          });

        if (error) {
          alert(error.message);
          return;
        }

        lessonForm.reset();

        const orderInput = $("lessonOrder");

        if (orderInput) {
          orderInput.value = 1;
        }

        await renderAdmin();

        alert("Lesson added successfully!");
      }
    );
  }

  // =============================
  // TEST FORM
  // =============================

  const testForm = $("testForm");

  if (testForm) {
    testForm.addEventListener(
      "submit",
      async function (event) {
        event.preventDefault();

        if (currentProfile?.role !== "admin") {
          alert("Admin access required.");
          return;
        }

        const title =
          $("testTitle")?.value.trim();

        const description =
          $("testDesc")?.value.trim() || "";

        const duration = Number(
          $("testDuration")?.value || 30
        );

        const published =
          $("testPublished")?.checked || false;

        if (!title) {
          alert("Test title डालें।");
          return;
        }

        const {
          error
        } = await db
          .from("tests")
          .insert({
            title: title,
            description: description,
            duration_minutes: duration,
            is_published: published
          });

        if (error) {
          alert(error.message);
          return;
        }

        testForm.reset();

        const durationInput =
          $("testDuration");

        if (durationInput) {
          durationInput.value = 30;
        }

        await loadTests();

        alert("Test added successfully!");
      }
    );
  }
}

// ===============================
// START TEST
// ===============================

async function startTest(testId) {
  if (!currentUser) {
    openAuth();
    return;
  }

  const {
    data,
    error
  } = await db
    .from("test_questions")
    .select(`
      id,
      question,
      option_a,
      option_b,
      option_c,
      option_d
    `)
    .eq("test_id", testId)
    .order("sort_order", {
      ascending: true
    });

  if (error) {
    alert(error.message);
    return;
  }

  if (!data || data.length === 0) {
    alert("इस test में अभी questions नहीं हैं।");
    return;
  }

  let currentQuestion = 0;
  const answers = [];

  function showQuestion() {
    const question = data[currentQuestion];

    const options = [
      ["A", question.option_a],
      ["B", question.option_b],
      ["C", question.option_c],
      ["D", question.option_d]
    ];

    openModal(`
      <h2>
        Question
        ${currentQuestion + 1}/${data.length}
      </h2>

      <p>
        <b>
          ${esc(question.question)}
        </b>
      </p>

      ${options
        .map(function (item) {
          return `
            <label class="option">
              <input
                type="radio"
                name="testAnswer"
                value="${item[0]}"
              >

              ${item[0]}. ${esc(item[1] || "")}
            </label>
          `;
        })
        .join("")}

      <button
        class="primaryBtn"
        onclick="nextQuestion()"
      >
        ${
          currentQuestion === data.length - 1
            ? "Submit"
            : "Next"
        }
      </button>
    `);
  }

  window.nextQuestion = function () {
    const selected =
      document.querySelector(
        'input[name="testAnswer"]:checked'
      );

    if (!selected) {
      alert("एक option चुनें।");
      return;
    }

    answers.push({
      question_id: data[currentQuestion].id,
      selected_option: selected.value
    });

    currentQuestion++;

    if (currentQuestion < data.length) {
      showQuestion();
    } else {
      submitAttempt(
        testId,
        answers,
        data.length
      );
    }
  };

  showQuestion();
}

// ===============================
// SUBMIT TEST
// ===============================

async function submitAttempt(
  testId,
  answers,
  total
) {
  const {
    data: attempt,
    error
  } = await db
    .from("test_attempts")
    .insert({
      test_id: testId,
      user_id: currentUser.id,
      total_questions: total
    })
    .select()
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  const questionIds = answers.map(
    function (answer) {
      return answer.question_id;
    }
  );

  const {
    data: questions,
    error: questionError
  } = await db
    .from("test_questions")
    .select("id,correct_option")
    .in("id", questionIds);

  if (questionError) {
    alert(questionError.message);
    return;
  }

  let score = 0;

  const answerRows = answers.map(
    function (answer) {
      const question =
        questions.find(
          function (item) {
            return (
              item.id === answer.question_id
            );
          }
        );

      const correct =
        question &&
        question.correct_option ===
          answer.selected_option;

      if (correct) {
        score++;
      }

      return {
        attempt_id: attempt.id,
        question_id: answer.question_id,
        selected_option: answer.selected_option,
        is_correct: correct
      };
    }
  );

  const {
    error: answerError
  } = await db
    .from("test_answers")
    .insert(answerRows);

  if (answerError) {
    alert(answerError.message);
    return;
  }

  const {
    error: updateError
  } = await db
    .from("test_attempts")
    .update({
      score: score,
      submitted_at:
        new Date().toISOString()
    })
    .eq("id", attempt.id);

  if (updateError) {
    alert(updateError.message);
    return;
  }

  openModal(`
    <h2>
      Test Submitted 🎉
    </h2>

    <p>
      Your score:
      <b>${score}/${total}</b>
    </p>

    <button
      class="primaryBtn"
      onclick="closeModal()"
    >
      Close
    </button>
  `);
}

// ===============================
// AUTH STATE
// ===============================

let authStateReady = false;

db.auth.onAuthStateChange(
  function () {
    if (authStateReady) {
      setTimeout(function () {
        refreshSession();
      }, 0);
    }
  }
);

// ===============================
// INITIALIZE APP
// ===============================

async function initApp() {
  try {
    const status = $("connectionStatus");

    if (status) {
      status.textContent =
        "Supabase connected • Real database";
    }

    setupForms();

    await loadCourses();
    await loadTests();
    await refreshSession();

    authStateReady = true;

    console.log(
      "JHARKHANDI YODDHA app initialized successfully."
    );
  } catch (error) {
    console.error(
      "Application initialization error:",
      error
    );

    const status = $("connectionStatus");

    if (status) {
      status.textContent =
        "Connection error";
    }
  }
}

// ===============================
// START
// ===============================

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initApp
  );
} else {
  initApp();
  }
