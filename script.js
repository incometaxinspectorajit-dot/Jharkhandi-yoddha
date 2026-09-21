const courses=[
 {title:"JPSC Complete Foundation",desc:"Jharkhand GK, GS और परीक्षा-oriented तैयारी.",price:"₹999"},
 {title:"JSSC CGL Master Course",desc:"Concept + Practice + Mock Test based preparation.",price:"₹799"},
 {title:"Jharkhand GK Special",desc:"Jharkhand इतिहास, भूगोल, संस्कृति और सामान्य ज्ञान.",price:"₹499"}
];
const tests=[
 {title:"Jharkhand GK Mock Test",q:"झारखंड की राजधानी क्या है?",a:["रांची","दुमका","बोकारो","धनबाद"],correct:0},
 {title:"General Studies Test",q:"भारत का संविधान कब लागू हुआ?",a:["1947","1950","1952","1949"],correct:1},
 {title:"Jharkhand Geography",q:"झारखंड राज्य का गठन किस वर्ष हुआ?",a:["1998","1999","2000","2001"],correct:2}
];
document.getElementById("coursesGrid").innerHTML=courses.map(c=>`<div class="card"><div>🎓</div><h3>${c.title}</h3><p>${c.desc}</p><div class="price">${c.price}</div><button onclick="buy('${c.title}')">Enroll Now</button></div>`).join("");
document.getElementById("testsGrid").innerHTML=tests.map((t,i)=>`<div class="card"><div>📝</div><h3>${t.title}</h3><p>Free practice test • 1 demo question</p><button onclick="startTest(${i})">Start Test</button></div>`).join("");
function openModal(html){document.getElementById("modalContent").innerHTML=html;document.getElementById("modal").classList.add("show")}
function closeModal(){document.getElementById("modal").classList.remove("show")}
function openLogin(){openModal(`<h2>Student Login</h2><p>Demo login — कोई real account नहीं बनता।</p><input id="name" placeholder="आपका नाम"><input id="email" placeholder="Email"><button class="login" onclick="login()">Login</button>`)}
function login(){let n=document.getElementById("name").value||"Student";localStorage.setItem("jyUser",n);openModal(`<h2>Welcome, ${n}! 🎉</h2><p>Demo login सफल रहा। आगे इसी जगह real database login जोड़ा जा सकता है।</p><button class="login" onclick="closeModal()">Dashboard देखें</button>`)}
function buy(name){openModal(`<h2>${name}</h2><p>यह अभी demo enrollment है। Real payment gateway जोड़ने के बाद यहीं UPI/Card payment होगा।</p><button class="login" onclick="openLogin()">Login करके Enroll करें</button>`)}
function startTest(i){let t=tests[i];openModal(`<h2>${t.title}</h2><p><b>${t.q}</b></p>${t.a.map((x,j)=>`<button style="display:block;width:100%;margin:8px 0;background:${j===t.correct?'#ffb703':'#19304d'};color:${j===t.correct?'#111':'white'}" onclick="answer(${j},${t.correct})">${x}</button>`).join("")}`)}
function answer(j,c){alert(j===c?"✅ सही उत्तर!":"❌ गलत उत्तर");closeModal()}