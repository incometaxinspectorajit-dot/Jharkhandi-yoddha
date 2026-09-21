const SUPABASE_URL="https://deosivmmboovramgwuft.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_WsnQdEgCb6YTLdeTmdt3hA_mDfs5eA4";
const {createClient}=supabase;
const db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);

let currentUser=null,currentProfile=null;

function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function money(v){return Number(v||0)===0?"Free":"₹"+Number(v).toLocaleString("en-IN");}
function openModal(html){document.getElementById("modalContent").innerHTML=html;document.getElementById("modal").classList.add("show")}
function closeModal(){document.getElementById("modal").classList.remove("show")}
function openAuth(){
 openModal(`<h2>Login / Signup</h2><input id="authName" placeholder="Full name (signup के लिए)"><input id="authEmail" type="email" placeholder="Email"><input id="authPassword" type="password" placeholder="Password"><div style="display:flex;gap:8px;margin-top:8px"><button class="primaryBtn" onclick="signIn()">Login</button><button class="secondary" onclick="signUp()">Signup</button></div><p id="authMsg" class="muted"></p>`);
}
async function signUp(){
 const name=document.getElementById("authName").value.trim(),email=document.getElementById("authEmail").value.trim(),password=document.getElementById("authPassword").value;
 const msg=document.getElementById("authMsg");
 if(!name||!email||password.length<6){msg.textContent="Name, email और कम-से-कम 6 character password भरें.";return}
 const {error}=await db.auth.signUp({email,password,options:{data:{full_name:name}}});
 msg.textContent=error?error.message:"Signup हो गया. अगर email confirmation on है तो email verify करके Login करें.";
}
async function signIn(){
 const email=document.getElementById("authEmail").value.trim(),password=document.getElementById("authPassword").value,msg=document.getElementById("authMsg");
 const {error}=await db.auth.signInWithPassword({email,password});
 if(error){msg.textContent=error.message;return}
 closeModal();await refreshSession();
}
async function logout(){await db.auth.signOut();await refreshSession()}
async function refreshSession(){
 const {data:{session}}=await db.auth.getSession();
 currentUser=session?.user||null;
 document.getElementById("authBtn").textContent=currentUser?"Logout":"Login";
 document.getElementById("authBtn").onclick=currentUser?logout:openAuth;
 if(currentUser){
   const {data}=await db.from("profiles").select("*").eq("id",currentUser.id).single();
   currentProfile=data||null;
 } else currentProfile=null;
 document.getElementById("dashboard").classList.toggle("hidden",!currentUser);
 document.getElementById("admin").classList.toggle("hidden",currentProfile?.role!=="admin");
 if(currentUser) renderDashboard();
 if(currentProfile?.role==="admin") renderAdmin();
}
async function loadCourses(){
 const {data,error}=await db.from("courses").select("*").order("created_at",{ascending:false});
 const el=document.getElementById("coursesGrid");
 if(error){el.innerHTML=`<div class="card error">${esc(error.message)}</div>`;return}
 el.innerHTML=data?.length?data.map(c=>`<div class="card">${c.thumbnail_url?`<img class="thumb" src="${esc(c.thumbnail_url)}">`:""}<h3>${esc(c.title)}</h3><p class="muted">${esc(c.description||"")}</p><div class="price">${money(c.price)}</div><button class="primaryBtn" onclick="enroll('${c.id}')">Enroll</button></div>`).join(""):`<div class="card"><h3>अभी courses नहीं हैं</h3><p>Admin panel से पहला course add करें.</p></div>`;
}
async function loadTests(){
 const {data,error}=await db.from("tests").select("*").order("created_at",{ascending:false});
 const el=document.getElementById("testsGrid");
 if(error){el.innerHTML=`<div class="card error">${esc(error.message)}</div>`;return}
 el.innerHTML=data?.length?data.map(t=>`<div class="card"><h3>${esc(t.title)}</h3><p class="muted">${esc(t.description||"")}</p><p>⏱️ ${t.duration_minutes} मिनट</p><button class="primaryBtn" onclick="startTest('${t.id}')">Start Test</button></div>`).join(""):`<div class="card"><h3>अभी tests नहीं हैं</h3></div>`;
}
async function enroll(courseId){
 if(!currentUser){openAuth();return}
 const {error}=await db.from("enrollments").upsert({user_id:currentUser.id,course_id:courseId,status:"active"},{onConflict:"user_id,course_id"});
 if(error){alert(error.message);return}
 alert("Course enrollment सफल रहा!");renderDashboard();
}
async function renderDashboard(){
 document.getElementById("profileBox").innerHTML=`<h3>नमस्ते, ${esc(currentProfile?.full_name||currentUser.email)}</h3><p>${esc(currentUser.email)}</p><p>Role: ${esc(currentProfile?.role||"student")}</p><button class="danger" onclick="logout()">Logout</button>`;
 const {data}=await db.from("enrollments").select("id,status,enrolled_at,courses(title,description,price)").eq("user_id",currentUser.id).order("enrolled_at",{ascending:false});
 document.getElementById("enrollmentsGrid").innerHTML=data?.length?data.map(e=>`<div class="card"><h3>${esc(e.courses?.title||"Course")}</h3><p>${esc(e.courses?.description||"")}</p><p class="success">Status: ${esc(e.status)}</p></div>`).join(""):`<div class="card"><p>अभी कोई enrolled course नहीं है.</p></div>`;
}
async function startTest(testId){
 if(!currentUser){openAuth();return}
 const {data,error}=await db.from("test_questions").select("id,question,option_a,option_b,option_c,option_d").eq("test_id",testId).order("sort_order");
 if(error){alert(error.message);return}
 if(!data?.length){alert("इस test में अभी questions नहीं हैं.");return}
 let i=0,answers=[];
 function show(){
  const q=data[i];
  openModal(`<h2>Question ${i+1}/${data.length}</h2><p><b>${esc(q.question)}</b></p>${["A","B","C","D"].map(x=>`<label style="display:block;margin:9px 0"><input type="radio" name="ans" value="${x}"> ${esc(q["option_"+x.toLowerCase()])}</label>`).join("")}<button class="primaryBtn" onclick="nextQ()">Next</button>`);
 }
 window.nextQ=function(){
   const picked=document.querySelector('input[name="ans"]:checked');
   if(!picked){alert("एक option चुनें.");return}
   answers.push({question_id:data[i].id,selected_option:picked.value});
   i++;
   if(i<data.length)show(); else submitAttempt(testId,answers,data.length);
 };
 show();
}
async function submitAttempt(testId,answers,total){
 const {data:attempt,error}=await db.from("test_attempts").insert({test_id:testId,user_id:currentUser.id,total_questions:total}).select().single();
 if(error){alert(error.message);return}
 const {data:questions}=await db.from("test_questions").select("id,correct_option").in("id",answers.map(a=>a.question_id));
 let score=0;
 const rows=answers.map(a=>{const q=questions.find(x=>x.id===a.question_id);const ok=q?.correct_option===a.selected_option;if(ok)score++;return {...a,attempt_id:attempt.id,is_correct:ok}});
 await db.from("test_answers").insert(rows);
 await db.from("test_attempts").update({score,submitted_at:new Date().toISOString()}).eq("id",attempt.id);
 openModal(`<h2>Test Submitted 🎉</h2><p>Your score: <b>${score}/${total}</b></p><button class="primaryBtn" onclick="closeModal()">Close</button>`);
}
async function renderAdmin(){
 const {data,error}=await db.from("courses").select("*").order("created_at",{ascending:false});
 document.getElementById("adminCourses").innerHTML=error?`<div class="card error">${esc(error.message)}</div>`:(data||[]).map(c=>`<div class="card"><h3>${esc(c.title)}</h3><p>${money(c.price)} • ${c.is_published?"Published":"Draft"}</p></div>`).join("")||`<div class="card">No courses yet.</div>`;
}
document.getElementById("courseForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const {error}=await db.from("courses").insert({title:courseTitle.value,description:courseDesc.value,price:Number(coursePrice.value||0),thumbnail_url:courseThumb.value||null,is_published:coursePublished.checked});
 if(error){alert(error.message);return} e.target.reset();coursePrice.value=0;await loadCourses();await renderAdmin();
});
document.getElementById("testForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const {error}=await db.from("tests").insert({title:testTitle.value,description:testDesc.value,duration_minutes:Number(testDuration.value||30),is_published:testPublished.checked});
 if(error){alert(error.message);return} e.target.reset();testDuration.value=30;await loadTests();
});
db.auth.onAuthStateChange(()=>refreshSession());
(async()=>{document.getElementById("connectionStatus").textContent="Supabase connected • Real database";await loadCourses();await loadTests();await refreshSession()})();
