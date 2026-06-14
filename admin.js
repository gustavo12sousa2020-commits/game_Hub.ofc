let TOKEN = localStorage.getItem("admin_token") || "";
let _noticias = [];

if (TOKEN) mostrarPainel();

async function fazerLogin() {
    const senha = document.getElementById("login-senha").value;
    const erro  = document.getElementById("login-erro");
    erro.style.display = "none";
    try {
        const res  = await fetch("/api/admin/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({senha}) });
        const data = await res.json();
        if (!res.ok) { erro.textContent=data.erro; erro.style.display="block"; return; }
        TOKEN = data.token;
        localStorage.setItem("admin_token", TOKEN);
        mostrarPainel();
    } catch { erro.textContent="Erro de conexão."; erro.style.display="block"; }
}

async function fazerLogout() {
    await fetch("/api/admin/logout",{method:"POST",headers:{"x-admin-token":TOKEN}});
    TOKEN=""; localStorage.removeItem("admin_token");
    location.reload();
}

function mostrarPainel() {
    document.getElementById("login-screen").style.display="none";
    document.getElementById("painel").style.display="block";
    carregarStats();
    carregarNoticias();
}

function mudarAba(aba, btn) {
    document.querySelectorAll(".admin-aba").forEach(el=>el.style.display="none");
    document.querySelectorAll(".admin-tab").forEach(el=>el.classList.remove("active"));
    document.getElementById("aba-"+aba).style.display="block";
    btn.classList.add("active");
    const fns = {noticias:carregarNoticias,comentarios:carregarComentarios,usuarios:carregarUsuarios,doadores:carregarDoadores,logs:carregarLogs};
    if (fns[aba]) fns[aba]();
}

// ── STATS ──────────────────────────────────────────────────────────────────
async function carregarStats() {
    try {
        const res  = await fetch("/api/admin/stats",{headers:{"x-admin-token":TOKEN}});
        if (res.status===401) return sessaoExpirada();
        const s    = await res.json();
        document.getElementById("st-noticias").textContent   = s.noticias;
        document.getElementById("st-usuarios").textContent   = s.usuarios;
        document.getElementById("st-comentarios").textContent= s.comentarios;
        document.getElementById("st-doadores").textContent   = s.doadores;
        document.getElementById("st-pix").textContent        = "R$ "+s.totalPix;
    } catch {}
}

// ── NOTÍCIAS ──────────────────────────────────────────────────────────────
async function carregarNoticias() {
    const lista = document.getElementById("noticias-lista");
    lista.innerHTML = `<p class="admin-loading">Carregando...</p>`;
    try {
        const res  = await fetch("/api/admin/noticias",{headers:{"x-admin-token":TOKEN}});
        if (res.status===401) return sessaoExpirada();
        const data = await res.json();
        _noticias  = data.noticias || [];
        if (!_noticias.length) { lista.innerHTML=`<p class="admin-vazio">Cache vazio. Acesse a página inicial primeiro.</p>`; return; }
        renderNoticias(_noticias);
    } catch { lista.innerHTML=`<p class="admin-erro">Erro ao carregar.</p>`; }
}

function renderNoticias(lista) {
    document.getElementById("noticias-lista").innerHTML = lista.map(n=>`
        <div class="admin-item">
            <div class="admin-item-thumb"><img src="${n.urlToImage||""}" onerror="this.style.display='none'"></div>
            <div class="admin-item-info">
                <div class="admin-item-badge">${n.source?.name||"Fonte"}</div>
                <p class="admin-item-titulo">${esc(n.title)}</p>
                <p class="admin-item-desc">${esc(n.description||"")}</p>
            </div>
            <button onclick="removerNoticia('${encodeURIComponent(n.url)}')" class="admin-btn-danger admin-btn-sm">🗑 Remover</button>
        </div>
    `).join("") || `<p class="admin-vazio">Nenhuma notícia.</p>`;
}

function filtrarNoticias() {
    const v = document.getElementById("filtro-noticias").value.toLowerCase();
    renderNoticias(v ? _noticias.filter(n=>(n.title||"").toLowerCase().includes(v)) : _noticias);
}

async function removerNoticia(urlEnc) {
    if (!confirm("Remover esta notícia?")) return;
    const res = await fetch("/api/admin/noticias",{method:"DELETE",headers:{"Content-Type":"application/json","x-admin-token":TOKEN},body:JSON.stringify({url:decodeURIComponent(urlEnc)})});
    if (res.status===401) return sessaoExpirada();
    if (res.ok) { carregarNoticias(); carregarStats(); }
}

// ── COMENTÁRIOS ────────────────────────────────────────────────────────────
async function carregarComentarios() {
    const lista = document.getElementById("comentarios-lista");
    lista.innerHTML = `<p class="admin-loading">Carregando...</p>`;
    try {
        const res  = await fetch("/api/admin/comentarios",{headers:{"x-admin-token":TOKEN}});
        if (res.status===401) return sessaoExpirada();
        const coms = await res.json();
        if (!coms.length) { lista.innerHTML=`<p class="admin-vazio">Nenhum comentário.</p>`; return; }
        lista.innerHTML = coms.map(c=>`
            <div class="admin-item">
                <div class="admin-item-info">
                    <div class="admin-item-badge">${esc(c.pagina)}</div>
                    <p class="admin-item-titulo">${esc(c.nome)} ${c.logado?'<span style="color:#00ff88;font-size:11px">✓ logado</span>':''}</p>
                    <p class="admin-item-desc">${esc(c.texto)}</p>
                    <p style="font-size:11px;color:#555;margin-top:4px">${c.data}</p>
                </div>
                <button onclick="removerComentario(${c.id})" class="admin-btn-danger admin-btn-sm">🗑</button>
            </div>
        `).join("");
    } catch { lista.innerHTML=`<p class="admin-erro">Erro.</p>`; }
}

async function removerComentario(id) {
    if (!confirm("Remover comentário?")) return;
    const res = await fetch("/api/admin/comentarios",{method:"DELETE",headers:{"Content-Type":"application/json","x-admin-token":TOKEN},body:JSON.stringify({id})});
    if (res.status===401) return sessaoExpirada();
    if (res.ok) { carregarComentarios(); carregarStats(); }
}

// ── USUÁRIOS ───────────────────────────────────────────────────────────────
async function carregarUsuarios() {
    const lista = document.getElementById("usuarios-lista");
    lista.innerHTML = `<p class="admin-loading">Carregando...</p>`;
    try {
        const res   = await fetch("/api/admin/usuarios",{headers:{"x-admin-token":TOKEN}});
        if (res.status===401) return sessaoExpirada();
        const users = await res.json();
        if (!users.length) { lista.innerHTML=`<p class="admin-vazio">Nenhum usuário cadastrado.</p>`; return; }
        lista.innerHTML = users.map(u=>`
            <div class="admin-item">
                <div class="admin-user-avatar">${(u.nome||"?")[0].toUpperCase()}</div>
                <div class="admin-item-info">
                    <p class="admin-item-titulo">${esc(u.nome)}</p>
                    <p class="admin-item-desc">${esc(u.email)} — cadastrado em ${u.dataCadastro||"?"}</p>
                </div>
                <button onclick="removerUsuario(${u.id})" class="admin-btn-danger admin-btn-sm">🗑</button>
            </div>
        `).join("");
    } catch { lista.innerHTML=`<p class="admin-erro">Erro.</p>`; }
}

async function removerUsuario(id) {
    if (!confirm("Remover usuário? Isso é permanente.")) return;
    const res = await fetch("/api/admin/usuarios",{method:"DELETE",headers:{"Content-Type":"application/json","x-admin-token":TOKEN},body:JSON.stringify({id})});
    if (res.status===401) return sessaoExpirada();
    if (res.ok) { carregarUsuarios(); carregarStats(); }
}

// ── DOADORES ───────────────────────────────────────────────────────────────
const NIVEIS=[{min:60,e:"👑",l:"Lendário"},{min:30,e:"💎",l:"Diamante"},{min:15,e:"🥇",l:"Ouro"},{min:5,e:"🥈",l:"Prata"},{min:0,e:"🥉",l:"Bronze"}];
function nivel(v){return NIVEIS.find(n=>v>=n.min)||NIVEIS[4];}

async function carregarDoadores() {
    const lista = document.getElementById("doadores-lista");
    lista.innerHTML = `<p class="admin-loading">Carregando...</p>`;
    try {
        const res = await fetch("/api/doadores");
        const ds  = await res.json();
        if (!ds.length){lista.innerHTML=`<p class="admin-vazio">Nenhum apoiador.</p>`;return;}
        lista.innerHTML = ds.map(d=>{const nv=nivel(d.valor);return`
            <div class="admin-item">
                <div class="admin-item-info">
                    <p class="admin-item-titulo">${nv.e} ${esc(d.nome)}</p>
                    <p class="admin-item-desc">${nv.l} — R$ ${d.valor} — ${d.data}</p>
                </div>
                <button onclick="removerDoador(${d.id})" class="admin-btn-danger admin-btn-sm">🗑</button>
            </div>
        `;}).join("");
    } catch{lista.innerHTML=`<p class="admin-erro">Erro.</p>`;}
}

async function adicionarDoador() {
    const nome  = document.getElementById("doador-nome").value.trim();
    const valor = Number(document.getElementById("doador-valor").value);
    if (!nome||!valor) return alert("Preencha nome e valor.");
    const res = await fetch("/api/admin/doadores",{method:"POST",headers:{"Content-Type":"application/json","x-admin-token":TOKEN},body:JSON.stringify({nome,valor})});
    if (res.status===401) return sessaoExpirada();
    document.getElementById("doador-nome").value="";
    document.getElementById("doador-valor").value="";
    carregarDoadores(); carregarStats();
}

async function removerDoador(id) {
    if (!confirm("Remover apoiador?")) return;
    const res = await fetch("/api/admin/doadores",{method:"DELETE",headers:{"Content-Type":"application/json","x-admin-token":TOKEN},body:JSON.stringify({id})});
    if (res.status===401) return sessaoExpirada();
    if (res.ok) { carregarDoadores(); carregarStats(); }
}

// ── LOGS ───────────────────────────────────────────────────────────────────
const TIPO_COR = {admin_login:"#00ff88",login:"#00c3ff",cadastro:"#b14cff",admin_login_fail:"#ff5e5e",login_fail:"#ff5e5e",remove_noticia:"#ffb800",remove_comentario:"#ff5e5e"};

async function carregarLogs() {
    const lista = document.getElementById("logs-lista");
    lista.innerHTML = `<p class="admin-loading">Carregando...</p>`;
    try {
        const res  = await fetch("/api/admin/logs",{headers:{"x-admin-token":TOKEN}});
        if (res.status===401) return sessaoExpirada();
        const logs = await res.json();
        if (!logs.length){lista.innerHTML=`<p class="admin-vazio">Nenhum log ainda.</p>`;return;}
        lista.innerHTML = logs.map(l=>`
            <div class="admin-log-row">
                <span class="log-tipo" style="color:${TIPO_COR[l.tipo]||'#888'}">${l.tipo}</span>
                <span class="log-msg">${esc(l.msg)}</span>
                <span class="log-data">${l.data}</span>
            </div>
        `).join("");
    } catch{lista.innerHTML=`<p class="admin-erro">Erro.</p>`;}
}

// ── helpers ─────────────────────────────────────────────────────────────────
function sessaoExpirada(){TOKEN="";localStorage.removeItem("admin_token");alert("Sessão expirada.");location.reload();}
function esc(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}

document.getElementById("login-senha")?.addEventListener("keydown",e=>{if(e.key==="Enter")fazerLogin();});
