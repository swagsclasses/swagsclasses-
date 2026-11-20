/* SWAGS CLASSES — Olympiad popup + Firebase + Admit Card (drop-in file) */
firebase.initializeApp({
  apiKey: "AIzaSyBVnqkvS0mPyTtX8JP07HAO0AC6OxpOQT0",
  authDomain: "swags-classes.firebaseapp.com",
  projectId: "swags-classes",
  storageBucket: "swags-classes.firebasestorage.app",
  messagingSenderId: "32648962857",
  appId: "1:32648962857:web:da82ce1f602822469d4d38"
});
const olyDB = firebase.firestore();
let olyCanvas = null, olyRoll = '';

/* ---------- CSS + POPUP HTML (auto-inject) ---------- */
(function(){
  const st = document.createElement('style');
  st.textContent = `
.oly-modal{position:fixed;inset:0;background:rgba(4,17,31,.9);z-index:10000;display:none;overflow-y:auto;padding:18px 12px}
.oly-modal.open{display:block}
.oly-box{background:linear-gradient(160deg,#0a2342,#0d3062);border:1px solid rgba(212,160,23,.45);border-radius:22px;width:100%;max-width:470px;margin:0 auto;padding:26px 20px;position:relative;color:#fff}
.oly-x{position:absolute;top:10px;right:14px;background:none;border:none;color:#f0c040;font-size:26px;cursor:pointer}
.oly-box h3{font-family:'Playfair Display',serif;color:#f0c040;text-align:center;font-size:22px;margin-bottom:4px}
.oly-box .sub{text-align:center;font-size:12px;color:rgba(255,255,255,.55);margin-bottom:18px}
.oly-box .form-group{margin-bottom:12px}
.oly-box input[type=file]{padding:9px;font-size:12px}
.oly-actions{display:flex;gap:10px;margin-top:14px}
.oly-actions button{flex:1;padding:14px 8px;border-radius:12px;font-weight:800;font-size:14px;cursor:pointer;border:none;font-family:'DM Sans',sans-serif}
.oly-share{background:#25d366;color:#fff}
.oly-dl{background:linear-gradient(135deg,#d4a017,#f0c040);color:#0a2342}
#o_card canvas{width:100%;height:auto;border-radius:10px;border:2px solid #d4a017;background:#fff}`;
  document.head.appendChild(st);

  document.body.insertAdjacentHTML('beforeend', `
<div class="oly-modal" id="olyModal"><div class="oly-box">
  <button class="oly-x" onclick="closeOly()">×</button>
  <div id="o_formView">
    <h3>🏅 SWAGS Olympiad Registration</h3>
    <div class="sub">Form bharein — turant Admit Card mil jayega</div>
    <div class="form-group"><label>Student Name *</label><input id="o_name" placeholder="Pura naam"></div>
    <div class="form-group"><label>Father's Name *</label><input id="o_father" placeholder="Pita ka naam"></div>
    <div class="form-group"><label>Class *</label><select id="o_cls"><option value="">Select Class</option>
      <option>Class 5</option><option>Class 6</option><option>Class 7</option><option>Class 8</option>
      <option>Class 9</option><option>Class 10</option><option>Class 11</option><option>Class 12</option></select></div>
    <div class="form-group"><label>School Name *</label><input id="o_school" placeholder="School ka naam"></div>
    <div class="form-group"><label>Mobile Number *</label><input id="o_mobile" type="tel" maxlength="10" placeholder="10 digit number"></div>
    <div class="form-group"><label>Village / Town *</label><input id="o_addr" placeholder="Gaon / Shahar"></div>
    <div class="form-group"><label>Photo (optional — Admit Card par lagegi)</label><input id="o_photo" type="file" accept="image/*"></div>
    <button class="form-submit" id="o_submit" onclick="submitOly()">Register & Get Admit Card →</button>
  </div>
  <div id="o_cardView" style="display:none">
    <h3>✅ Registration Successful!</h3>
    <div class="sub">Aapka Admit Card taiyar hai</div>
    <div id="o_card"></div>
    <div class="oly-actions">
      <button class="oly-share" onclick="shareCard()">📤 Share</button>
      <button class="oly-dl" onclick="downloadCard()">⬇ Download Admit Card</button>
    </div>
  </div>
</div></div>`);

  /* purane Olympiad buttons ko popup se jod do (Google Script link hat jayega) */
  document.querySelectorAll('.btn-olympiad-hero, a[href*="AKfycbwrXb6wjTfOfZTrSlyfoxw3OawQfJrQrQG2nZM51dc0NY9Fzw7O164SX2yAfElx6v5Wug"]').forEach(a => {
    a.removeAttribute('target'); a.setAttribute('href', '#');
    a.addEventListener('click', openOly);
  });
})();

function openOly(e){
  if(e) e.preventDefault();
  document.getElementById('o_formView').style.display='block';
  document.getElementById('o_cardView').style.display='none';
  document.getElementById('olyModal').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeOly(){
  document.getElementById('olyModal').classList.remove('open');
  document.body.style.overflow='';
}

/* ---------- helpers ---------- */
function loadImg(src, cors){
  return new Promise(res=>{const i=new Image(); if(cors) i.crossOrigin='anonymous'; i.onload=()=>res(i); i.onerror=()=>res(null); i.src=src;});
}
function readFile(f){
  return new Promise(res=>{
    if(!f) return res(null);
    const r=new FileReader(); r.onload=()=>loadImg(r.result,false).then(res); r.onerror=()=>res(null); r.readAsDataURL(f);
  });
}

/* ---------- submit ---------- */
async function submitOly(){
  const g=id=>document.getElementById(id).value.trim();
  const d={name:g('o_name'),father:g('o_father'),cls:g('o_cls'),school:g('o_school'),mobile:g('o_mobile'),address:g('o_addr')};
  if(!d.name||!d.father||!d.cls||!d.school||!d.mobile||!d.address){alert('⚠️ Sabhi * wali fields bharein.');return;}
  if(!/^[0-9]{10}$/.test(d.mobile)){alert('⚠️ 10 digit ka sahi mobile number daalein.');return;}

  const btn=document.getElementById('o_submit');
  btn.disabled=true; btn.textContent='Submitting...';
  olyRoll='SO26'+String(Date.now()).slice(-6)+Math.floor(Math.random()*90+10);
  d.roll=olyRoll;
  try{
    await Promise.race([
      olyDB.collection('olympiad').doc(d.roll).set({...d, createdAt: firebase.firestore.FieldValue.serverTimestamp()}),
      new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),12000))
    ]);
    const photo=await readFile(document.getElementById('o_photo').files[0]);
    const logo=await loadImg('https://raw.githubusercontent.com/swagsclasses/swagsclasses-/main/logo.png',true);
    olyCanvas=drawCard(d,photo,logo);
    const w=document.getElementById('o_card'); w.innerHTML=''; w.appendChild(olyCanvas);
    document.getElementById('o_formView').style.display='none';
    document.getElementById('o_cardView').style.display='block';
    document.getElementById('olyModal').scrollTop=0;
  }catch(err){
    alert('❌ Registration save nahi ho payi. Internet check karke dobara try karein.');
  }
  btn.disabled=false; btn.textContent='Register & Get Admit Card →';
}

/* ---------- admit card ---------- */
function drawCard(d,photo,logo){
  const c=document.createElement('canvas'); c.width=800; c.height=1100;
  const x=c.getContext('2d');
  x.fillStyle='#fff'; x.fillRect(0,0,800,1100);
  x.fillStyle='#0a2342'; x.fillRect(0,0,800,190);
  x.fillStyle='#d4a017'; x.fillRect(0,190,800,8);
  x.strokeStyle='#d4a017'; x.lineWidth=6; x.strokeRect(10,10,780,1080);
  if(logo){x.save();x.beginPath();x.arc(100,95,52,0,7);x.clip();x.drawImage(logo,48,43,104,104);x.restore();}
  x.textAlign='center';
  x.fillStyle='#f0c040'; x.font='bold 46px Georgia'; x.fillText('SWAGS CLASSES',460,92);
  x.fillStyle='#fff'; x.font='italic 24px Georgia'; x.fillText('Study With Ajay Gope Sir',460,132);
  x.font='16px Arial'; x.fillStyle='rgba(255,255,255,.7)'; x.fillText('Call: 7481040468',460,166);
  x.fillStyle='#fdf3d0'; x.fillRect(150,222,500,52);
  x.strokeStyle='#d4a017'; x.lineWidth=2; x.strokeRect(150,222,500,52);
  x.fillStyle='#0a2342'; x.font='bold 26px Arial'; x.fillText('OLYMPIAD 2026 — ADMIT CARD',400,257);
  x.textAlign='left';
  x.strokeStyle='#0a2342'; x.lineWidth=3; x.strokeRect(590,305,160,200);
  if(photo){x.drawImage(photo,590,305,160,200);}
  else{x.fillStyle='#999';x.font='16px Arial';x.textAlign='center';x.fillText('Paste Photo',670,410);x.textAlign='left';}
  const rows=[['ROLL NO',d.roll],['STUDENT NAME',d.name.toUpperCase()],["FATHER'S NAME",d.father.toUpperCase()],['CLASS',d.cls],['SCHOOL',d.school],['MOBILE',d.mobile],['VILLAGE / TOWN',d.address]];
  let y=315;
  rows.forEach((r,i)=>{
    x.fillStyle='#7a7f8c'; x.font='bold 14px Arial'; x.fillText(r[0],50,y);
    let s=28; x.font='bold '+s+'px Arial';
    while(x.measureText(r[1]).width>510&&s>14){s-=2;x.font='bold '+s+'px Arial';}
    x.fillStyle=i===0?'#c0392b':'#0a2342'; x.fillText(r[1],50,y+32);
    x.strokeStyle='#eee'; x.lineWidth=1; x.beginPath(); x.moveTo(50,y+46); x.lineTo(550,y+46); x.stroke();
    y+=76;
  });
  x.fillStyle='#faf8f3'; x.fillRect(40,850,720,130);
  x.strokeStyle='#d4a017'; x.lineWidth=2; x.strokeRect(40,850,720,130);
  x.fillStyle='#0a2342'; x.font='bold 18px Arial'; x.fillText('INSTRUCTIONS',58,880);
  x.font='16px Arial'; x.fillStyle='#333';
  x.fillText('• Exam ke din yeh Admit Card (print ya mobile mein) saath layein.',58,908);
  x.fillText('• Exam se 15 minute pehle pahunchein. Pen/Pencil saath layein.',58,934);
  x.fillText('• Exam ki date aur time WhatsApp par bataya jayega.',58,960);
  x.strokeStyle='#0a2342'; x.beginPath(); x.moveTo(520,1040); x.lineTo(750,1040); x.stroke();
  x.fillStyle='#0a2342'; x.font='bold 16px Arial'; x.textAlign='center';
  x.fillText('Ajay Gope Sir (Director)',635,1064);
  x.textAlign='left'; x.fillStyle='#7a7f8c'; x.font='14px Arial';
  x.fillText('Generated: '+new Date().toLocaleDateString('en-IN'),50,1064);
  return c;
}

function downloadCard(){
  if(!olyCanvas) return;
  const a=document.createElement('a');
  a.download='SWAGS_Olympiad_AdmitCard_'+olyRoll+'.png';
  a.href=olyCanvas.toDataURL('image/png'); a.click();
}
function shareCard(){
  if(!olyCanvas) return;
  olyCanvas.toBlob(async b=>{
    const f=new File([b],'SWAGS_Admit_Card_'+olyRoll+'.png',{type:'image/png'});
    if(navigator.canShare && navigator.canShare({files:[f]})){
      try{await navigator.share({files:[f],title:'SWAGS Olympiad Admit Card',text:'Mera SWAGS Olympiad Admit Card (Roll No: '+olyRoll+')'});}catch(e){}
    }else{
      downloadCard();
      alert('Is device par direct share nahi ho sakta. Admit Card download ho gaya hai — ab use WhatsApp se bhej dein.');
    }
  });
}
