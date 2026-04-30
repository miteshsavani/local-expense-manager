/* ================================================================
   AUTH HELPERS
   ================================================================ */
function togglePw(inputId, btn){
  const inp=document.getElementById(inputId);
  inp.type = inp.type==='password' ? 'text' : 'password';
  btn.textContent = inp.type==='text' ? '🙈' : '👁';
}
function checkPwStrength(pw){
  const bar=document.getElementById('pw-bar'); const hint=document.getElementById('pw-hint');
  if(!bar) return;
  let s=0;
  if(pw.length>=8) s++; if(pw.length>=12) s++;
  if(/[0-9]/.test(pw)) s++; if(/[^A-Za-z0-9]/.test(pw)) s++;
  if(/[A-Z]/.test(pw)&&/[a-z]/.test(pw)) s++;
  const pct=[0,25,50,75,100][Math.min(s,4)];
  bar.style.width=pct+'%'; bar.style.background=['#dc2626','#f97316','#eab308','#84cc16','#22c55e'][Math.min(s,4)];
  if(hint) hint.textContent=pw.length===0?'Use 8+ characters':['Too short','Weak','Fair','Good','Strong'][Math.min(s,4)];
}

