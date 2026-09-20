(function(){
  "use strict";

  var THRESHOLD = 75;
  var USER_KEY = "cartshare:user";          // sessionStorage — per tab identity
  var ROOM_PTR_KEY = "cartshare:currentRoom"; // sessionStorage — which room this tab is in
  var roomKey = function(code){ return "cartshare:room:" + code; };

  // ---------- storage helpers ----------
  function loadRoom(code){
    try{
      var raw = localStorage.getItem(roomKey(code));
      return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
  }
  function saveRoom(room){
    room.updatedAt = Date.now();
    localStorage.setItem(roomKey(room.code), JSON.stringify(room));
  }
  function getUser(){
    try{ return JSON.parse(sessionStorage.getItem(USER_KEY) || "null"); }catch(e){ return null; }
  }
  function setUser(u){ sessionStorage.setItem(USER_KEY, JSON.stringify(u)); }
  function getCurrentRoomCode(){ return sessionStorage.getItem(ROOM_PTR_KEY) || ""; }
  function setCurrentRoomCode(c){ sessionStorage.setItem(ROOM_PTR_KEY, c); }

  function genCode(){
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var out = "";
    for(var i=0;i<6;i++){ out += chars[Math.floor(Math.random()*chars.length)]; }
    return out;
  }
  function genId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function money(n){ return "$" + (Math.round(n*100)/100).toFixed(2); }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function timeAgo(ts){
    var s = Math.max(1, Math.round((Date.now()-ts)/1000));
    if(s<60) return s+"s ago";
    var m = Math.round(s/60); if(m<60) return m+"m ago";
    var h = Math.round(m/60); if(h<24) return h+"h ago";
    return Math.round(h/24)+"d ago";
  }

  function addActivity(room, text){
    room.activity = room.activity || [];
    room.activity.unshift({ id: genId(), text: text, ts: Date.now() });
    if(room.activity.length > 60) room.activity.length = 60;
  }

  function ensureMember(room, user){
    room.members = room.members || [];
    var exists = room.members.some(function(m){ return m.mobile === user.mobile; });
    if(!exists){
      room.members.push({ name: user.name, mobile: user.mobile, joinedAt: Date.now() });
      addActivity(room, "<strong>"+escapeHtml(user.name)+"</strong> joined the room");
    }
    return room;
  }

  function toast(msg){
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._h);
    toast._h = setTimeout(function(){ t.classList.remove("show"); }, 1800);
  }

  function showScreen(id){
    document.querySelectorAll(".screen").forEach(function(s){ s.classList.remove("active"); });
    document.getElementById(id).classList.add("active");
  }

  // ---------- render ----------
  function render(){
    var user = getUser();
    var code = getCurrentRoomCode();

    if(!user){ showScreen("screen-login"); return; }
    document.getElementById("whoami-name").textContent = user.name;

    if(!code){ showScreen("screen-room"); return; }

    var room = loadRoom(code);
    if(!room){ setCurrentRoomCode(""); showScreen("screen-room"); return; }

    showScreen("screen-cart");
    document.getElementById("room-code-label").textContent = room.code;

    // members
    var membersList = document.getElementById("members-list");
    membersList.innerHTML = "";
    (room.members||[]).forEach(function(m){
      var li = document.createElement("li");
      li.innerHTML = '<span class="dot"></span>' + escapeHtml(m.name) + (m.mobile===user.mobile ? " (you)" : "");
      membersList.appendChild(li);
    });

    // cart rows
    var tbody = document.getElementById("cart-rows");
    tbody.innerHTML = "";
    var items = room.items || [];
    var total = 0, count = 0;
    if(items.length === 0){
      tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No items yet — add the first one above.</td></tr>';
    } else {
      items.forEach(function(it){
        var subtotal = it.qty * it.price;
        total += subtotal; count += it.qty;
        var tr = document.createElement("tr");
        tr.innerHTML =
          '<td class="item-name">' + escapeHtml(it.name) + '<span class="meta">added by ' + escapeHtml(it.addedBy) + '</span></td>' +
          '<td><div class="qty-controls">' +
            '<button type="button" class="ghost small" data-act="dec" data-id="'+it.id+'">−</button>' +
            '<span>'+it.qty+'</span>' +
            '<button type="button" class="ghost small" data-act="inc" data-id="'+it.id+'">+</button>' +
          '</div></td>' +
          '<td>'+money(it.price)+'</td>' +
          '<td>'+money(subtotal)+'</td>' +
          '<td><button type="button" class="subtle small" data-act="remove" data-id="'+it.id+'">Remove</button></td>';
        tbody.appendChild(tr);
      });
    }

    document.getElementById("total-count").textContent = count;
    document.getElementById("total-amount").textContent = money(total);
    document.getElementById("threshold-amount").textContent = THRESHOLD;
    var pct = Math.min(100, Math.round((total/THRESHOLD)*100));
    document.getElementById("progress-pct").textContent = pct + "%";
    var fill = document.getElementById("progress-fill");
    fill.style.width = pct + "%";
    fill.classList.toggle("hit", total >= THRESHOLD);

    // activity
    var actList = document.getElementById("activity-list");
    actList.innerHTML = "";
    var acts = room.activity || [];
    if(acts.length === 0){
      actList.innerHTML = '<li class="empty-note">Nothing yet.</li>';
    } else {
      acts.slice(0,25).forEach(function(a){
        var li = document.createElement("li");
        li.innerHTML = '<span class="a-time">'+timeAgo(a.ts)+'</span><span class="a-text">'+a.text+'</span>';
        actList.appendChild(li);
      });
    }
  }

  // ---------- mutations ----------
  function withRoom(fn){
    var code = getCurrentRoomCode();
    var room = loadRoom(code);
    if(!room) return;
    fn(room);
    saveRoom(room);
    render();
  }

  // ---------- login ----------
  document.getElementById("form-login").addEventListener("submit", function(e){
    e.preventDefault();
    var name = document.getElementById("in-name").value.trim();
    var mobile = document.getElementById("in-mobile").value.trim();
    if(!name || !mobile) return;
    setUser({ name: name, mobile: mobile });
    render();
  });

  document.getElementById("btn-logout").addEventListener("click", function(){
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(ROOM_PTR_KEY);
    render();
  });

  // ---------- room create/join ----------
  document.getElementById("btn-create-room").addEventListener("click", function(){
    var user = getUser();
    var code = genCode();
    var room = { code: code, items: [], activity: [], members: [], createdAt: Date.now() };
    ensureMember(room, user);
    addActivity(room, "<strong>"+escapeHtml(user.name)+"</strong> created the room");
    saveRoom(room);
    setCurrentRoomCode(code);
    render();
    toast("Room "+code+" created");
  });

  document.getElementById("btn-join-room").addEventListener("click", function(){
    var user = getUser();
    var code = document.getElementById("in-join-code").value.trim().toUpperCase();
    var errEl = document.getElementById("join-error");
    errEl.textContent = "";
    if(!code){ errEl.textContent = "Enter a room code."; return; }
    var room = loadRoom(code);
    if(!room){ errEl.textContent = "No room found with that code."; return; }
    ensureMember(room, user);
    saveRoom(room);
    setCurrentRoomCode(code);
    render();
  });

  document.getElementById("in-join-code").addEventListener("keydown", function(e){
    if(e.key === "Enter"){ document.getElementById("btn-join-room").click(); }
  });

  document.getElementById("btn-leave-room").addEventListener("click", function(){
    setCurrentRoomCode("");
    render();
  });

  document.getElementById("btn-copy-code").addEventListener("click", function(){
    var code = getCurrentRoomCode();
    if(navigator.clipboard){
      navigator.clipboard.writeText(code).then(function(){ toast("Code copied"); }).catch(function(){ toast(code); });
    } else {
      toast(code);
    }
  });

  // ---------- cart actions ----------
  document.getElementById("form-add-item").addEventListener("submit", function(e){
    e.preventDefault();
    var user = getUser();
    var name = document.getElementById("in-item-name").value.trim();
    var qty = parseInt(document.getElementById("in-item-qty").value, 10) || 1;
    var price = parseFloat(document.getElementById("in-item-price").value) || 0;
    if(!name) return;
    withRoom(function(room){
      room.items = room.items || [];
      room.items.push({ id: genId(), name: name, qty: qty, price: price, addedBy: user.name, addedAt: Date.now() });
      addActivity(room, "<strong>"+escapeHtml(user.name)+"</strong> added "+escapeHtml(name));
    });
    e.target.reset();
    document.getElementById("in-item-qty").value = 1;
    document.getElementById("in-item-name").focus();
  });

  document.getElementById("cart-rows").addEventListener("click", function(e){
    var btn = e.target.closest("button[data-act]");
    if(!btn) return;
    var id = btn.getAttribute("data-id");
    var act = btn.getAttribute("data-act");
    var user = getUser();
    withRoom(function(room){
      var item = (room.items||[]).find(function(it){ return it.id === id; });
      if(!item) return;
      if(act === "inc"){ item.qty += 1; }
      else if(act === "dec"){ item.qty = Math.max(1, item.qty - 1); }
      else if(act === "remove"){
        room.items = room.items.filter(function(it){ return it.id !== id; });
        addActivity(room, "<strong>"+escapeHtml(user.name)+"</strong> removed "+escapeHtml(item.name));
      }
    });
  });

  // ---------- print ----------
  document.getElementById("btn-print").addEventListener("click", function(){
    var code = getCurrentRoomCode();
    var room = loadRoom(code);
    if(!room) return;
    document.getElementById("r-room-code").textContent = room.code;
    document.getElementById("r-date").textContent = new Date().toLocaleString();
    var rows = document.getElementById("r-rows");
    rows.innerHTML = "";
    var total = 0;
    (room.items||[]).forEach(function(it){
      var subtotal = it.qty*it.price; total += subtotal;
      var tr = document.createElement("tr");
      tr.innerHTML = "<td>"+escapeHtml(it.name)+"</td><td>"+it.qty+"</td><td>"+money(it.price)+"</td><td>"+money(subtotal)+"</td><td>"+escapeHtml(it.addedBy)+"</td>";
      rows.appendChild(tr);
    });
    document.getElementById("r-total").textContent = money(total);
    window.print();
  });

  // ---------- live sync across tabs ----------
  window.addEventListener("storage", function(e){
    if(!e.key) return;
    var code = getCurrentRoomCode();
    if(code && e.key === roomKey(code)){ render(); }
  });
  setInterval(function(){
    // safety-net refresh for browsers that throttle storage events
    if(document.querySelector("#screen-cart.active")) render();
  }, 4000);

  render();
})();
