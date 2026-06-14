// ── Estado do usuário ─────────────────────────────────────────────────────
let USER_TOKEN = localStorage.getItem("user_token") || "";
let USER_DATA  = JSON.parse(localStorage.getItem("user_data") || "null");

function usuarioLogado() { return !!USER_TOKEN && !!USER_DATA; }

// ── Inicializa header ─────────────────────────────────────────────────────
function initAuth() {
    if (usuarioLogado()) mostrarUserChip(USER_DATA);
    else mostrarBtnEntrar();
}

function mostrarUserChip(data) {
    const chip = document.getElementById("user-chip");
    const btn  = document.getElementById("btn-entrar");
    if (!chip || !btn) return;
    document.getElementById("user-avatar").textContent = data.avatar || data.nome[0].toUpperCase();
    document.getElementById("user-nome").textContent   = data.nome;
    chip.style.display = "flex";
    btn.style.display  = "none";
}

function mostrarBtnEntrar() {
    const chip = document.getElementById("user-chip");
    const btn  = document.getElementById("btn-entrar");
    if (!chip || !btn) return;
    chip.style.display = "none";
    btn.style.display  = "flex";
}

// ── Modal ─────────────────────────────────────────────────────────────────
function abrirAuth()    { document.getElementById("auth-overlay").style.display="flex"; mostrarLogin(); }
function fecharAuth()   { document.getElementById("auth-overlay").style.display="none"; limparErros(); }
function mostrarLogin() {
    document.getElementById("auth-login").style.display="block";
    document.getElementById("auth-cadastro").style.display="none";
}
function mostrarCadastro() {
    document.getElementById("auth-login").style.display="none";
    document.getElementById("auth-cadastro").style.display="block";
}

function limparErros() {
    ["login-erro","cad-erro"].forEach(id=>{
        const el=document.getElementById(id); if(el) el.style.display="none";
    });
}

// Fecha ao clicar fora
document.getElementById("auth-overlay")?.addEventListener("click", e => {
    if (e.target.id === "auth-overlay") fecharAuth();
});

// ── Login ─────────────────────────────────────────────────────────────────
async function fazerLogin() {
    const email = document.getElementById("login-email")?.value.trim();
    const senha = document.getElementById("login-senha")?.value;
    const erro  = document.getElementById("login-erro");

    if (!email || !senha) { mostrarErro(erro, "Preencha email e senha."); return; }

    try {
        const res  = await fetch("/api/auth/login", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ email, senha })
        });
        const data = await res.json();
        if (!res.ok) { mostrarErro(erro, data.erro); return; }

        salvarSessao(data);
        fecharAuth();
        mostrarUserChip(data);
    } catch { mostrarErro(erro, "Erro de conexão."); }
}

// ── Cadastro ──────────────────────────────────────────────────────────────
async function fazerCadastro() {
    const nome  = document.getElementById("cad-nome")?.value.trim();
    const email = document.getElementById("cad-email")?.value.trim();
    const senha = document.getElementById("cad-senha")?.value;
    const erro  = document.getElementById("cad-erro");

    if (!nome||!email||!senha) { mostrarErro(erro,"Preencha todos os campos."); return; }

    try {
        const res  = await fetch("/api/auth/cadastro", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ nome, email, senha })
        });
        const data = await res.json();
        if (!res.ok) { mostrarErro(erro, data.erro); return; }

        salvarSessao(data);
        fecharAuth();
        mostrarUserChip(data);
    } catch { mostrarErro(erro, "Erro de conexão."); }
}

// ── Logout ────────────────────────────────────────────────────────────────
async function fazerLogout() {
    await fetch("/api/auth/logout", {
        method:"POST", headers:{"x-user-token": USER_TOKEN}
    }).catch(()=>{});
    USER_TOKEN = ""; USER_DATA = null;
    localStorage.removeItem("user_token");
    localStorage.removeItem("user_data");
    mostrarBtnEntrar();
}

// ── Helpers ───────────────────────────────────────────────────────────────
function salvarSessao(data) {
    USER_TOKEN = data.token;
    USER_DATA  = { nome: data.nome, avatar: data.avatar, email: data.email };
    localStorage.setItem("user_token", USER_TOKEN);
    localStorage.setItem("user_data",  JSON.stringify(USER_DATA));
}

function mostrarErro(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
}

// Enter nos campos
document.getElementById("login-senha")?.addEventListener("keydown",  e=>{ if(e.key==="Enter") fazerLogin(); });
document.getElementById("cad-senha")?.addEventListener("keydown",    e=>{ if(e.key==="Enter") fazerCadastro(); });

// Inicializa
initAuth();
