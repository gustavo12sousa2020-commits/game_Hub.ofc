require("dotenv").config();

const express  = require("express");
const cors     = require("cors");
const axios    = require("axios");
const path     = require("path");
const cheerio  = require("cheerio");
const fs       = require("fs");
const crypto   = require("crypto");
const bcrypt   = require("bcryptjs");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const API_KEY    = process.env.NEWS_API_KEY;
const GNEWS_KEY  = process.env.GNEWS_API_KEY || "";
const ADMIN_PASS = "12042011gg";

// ── JSON helpers ─────────────────────────────────────────────────────────────
function lerJSON(file, fallback) {
    try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file,"utf8")) : fallback; }
    catch { return fallback; }
}
function salvarJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

const P = f => path.join(__dirname, f);
const COMENTARIOS_DB = P("comentarios.json");
const NOTICIAS_DB    = P("noticias_cache.json");
const DOADORES_DB    = P("doadores.json");
const TOKENS_DB      = P("tokens.json");
const USUARIOS_DB    = P("usuarios.json");
const LOGS_DB        = P("logs.json");

function log(tipo, msg, ip) {
    const logs = lerJSON(LOGS_DB, []);
    logs.unshift({ tipo, msg, ip: ip || "?", data: new Date().toLocaleString("pt-BR") });
    salvarJSON(LOGS_DB, logs.slice(0, 200));
}

const PALAVROES = ["merda","porra","caralho","puta","viado","idiota","imbecil",
    "burro","cuzao","cu","buceta","fdp","foda","fodase","arrombado","babaca",
    "otario","corno","vagabundo","lixo","maldito","miseravel","retardado","estupido"];
function temPalavrao(t) {
    const s = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g,"");
    return PALAVROES.some(p => s.includes(p.replace(/\s/g,"")));
}

// ── AUTH ADMIN ───────────────────────────────────────────────────────────────
function gerarToken() { return crypto.randomBytes(32).toString("hex"); }
function validarAdminToken(req) {
    const t = req.headers["x-admin-token"];
    return t && lerJSON(TOKENS_DB,[]).includes(t);
}
function mwAdmin(req, res, next) {
    if (!validarAdminToken(req)) return res.status(401).json({ erro:"Não autorizado" });
    next();
}

app.post("/api/admin/login", (req, res) => {
    const { senha } = req.body;
    if (senha !== ADMIN_PASS) {
        log("admin_login_fail","Tentativa de login admin", req.ip);
        return res.status(401).json({ erro:"Senha incorreta" });
    }
    const token = gerarToken();
    const tokens = lerJSON(TOKENS_DB,[]);
    tokens.push(token);
    salvarJSON(TOKENS_DB, tokens.slice(-20));
    log("admin_login","Login admin bem-sucedido", req.ip);
    res.json({ token });
});

app.post("/api/admin/logout", mwAdmin, (req, res) => {
    const t = req.headers["x-admin-token"];
    salvarJSON(TOKENS_DB, lerJSON(TOKENS_DB,[]).filter(x => x !== t));
    res.json({ ok:true });
});

// ── AUTH USUÁRIOS ─────────────────────────────────────────────────────────────
function validarUserToken(req) {
    const t = req.headers["x-user-token"];
    if (!t) return null;
    return lerJSON(USUARIOS_DB, []).find(u => u.token === t) || null;
}

app.post("/api/auth/cadastro", async (req, res) => {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ erro:"Preencha todos os campos." });
    if (nome.length < 2 || nome.length > 40) return res.status(400).json({ erro:"Nome deve ter 2–40 caracteres." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ erro:"Email inválido." });
    if (senha.length < 6) return res.status(400).json({ erro:"Senha deve ter ao menos 6 caracteres." });
    const usuarios = lerJSON(USUARIOS_DB, []);
    if (usuarios.find(u => u.email === email.toLowerCase())) return res.status(400).json({ erro:"Email já cadastrado." });
    const hash = await bcrypt.hash(senha, 10);
    const token = gerarToken();
    const novoUser = { id:Date.now(), nome:nome.trim(), email:email.toLowerCase().trim(), senha:hash, token, avatar:nome.trim()[0].toUpperCase(), dataCadastro:new Date().toLocaleDateString("pt-BR"), role:"user" };
    usuarios.push(novoUser);
    salvarJSON(USUARIOS_DB, usuarios);
    log("cadastro", `Novo usuário: ${email}`, req.ip);
    res.json({ token, nome:novoUser.nome, avatar:novoUser.avatar, email:novoUser.email });
});

app.post("/api/auth/login", async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro:"Preencha email e senha." });
    const usuarios = lerJSON(USUARIOS_DB, []);
    const user = usuarios.find(u => u.email === email.toLowerCase().trim());
    if (!user || !(await bcrypt.compare(senha, user.senha))) {
        log("login_fail", `Falha login: ${email}`, req.ip);
        return res.status(401).json({ erro:"Email ou senha incorretos." });
    }
    user.token = gerarToken();
    salvarJSON(USUARIOS_DB, usuarios);
    log("login", `Login: ${email}`, req.ip);
    res.json({ token:user.token, nome:user.nome, avatar:user.avatar, email:user.email });
});

app.post("/api/auth/logout", (req, res) => {
    const t = req.headers["x-user-token"];
    if (!t) return res.json({ ok:true });
    const usuarios = lerJSON(USUARIOS_DB, []);
    const u = usuarios.find(x => x.token === t);
    if (u) { u.token = ""; salvarJSON(USUARIOS_DB, usuarios); }
    res.json({ ok:true });
});

app.get("/api/auth/me", (req, res) => {
    const u = validarUserToken(req);
    if (!u) return res.status(401).json({ erro:"Não autenticado" });
    res.json({ nome:u.nome, avatar:u.avatar, email:u.email });
});

app.get("/api/admin/usuarios", mwAdmin, (req, res) => {
    res.json(lerJSON(USUARIOS_DB,[]).map(u => ({ id:u.id, nome:u.nome, email:u.email, dataCadastro:u.dataCadastro, role:u.role })).reverse());
});

app.delete("/api/admin/usuarios", mwAdmin, (req, res) => {
    salvarJSON(USUARIOS_DB, lerJSON(USUARIOS_DB,[]).filter(u => u.id !== req.body.id));
    res.json({ ok:true });
});

// ── NOTÍCIAS ──────────────────────────────────────────────────────────────────
async function buscarNewsAPI() {
    const res = await axios.get("https://newsapi.org/v2/everything", {
        params: { q:'(gaming OR videogames OR esports OR anime OR manga OR "one piece" OR "jujutsu kaisen" OR "demon slayer" OR "dragon ball" OR "attack on titan" OR "video game" OR nintendo OR playstation OR xbox OR steam)', language:"pt", sortBy:"publishedAt", pageSize:100, apiKey:API_KEY }
    });
    return res.data.articles || [];
}

async function buscarGNews() {
    if (!GNEWS_KEY) return [];
    try {
        const res = await axios.get("https://gnews.io/api/v4/search", { params:{ q:"games OR anime OR esports", lang:"pt", max:20, apikey:GNEWS_KEY } });
        return (res.data.articles||[]).map(a => ({ title:a.title, description:a.description, url:a.url, urlToImage:a.image, publishedAt:a.publishedAt, source:{ name:a.source?.name||"GNews" }, author:null, content:a.content }));
    } catch { return []; }
}

function limparArtigos(artigos, removidas) {
    const vistos = new Set();
    return artigos.filter(a => {
        if (!a.title || a.title==="[Removed]") return false;
        if (!a.description || a.description==="[Removed]") return false;
        if (!a.url) return false;
        if (removidas.includes(a.url)) return false;
        if (vistos.has(a.url)) return false;
        vistos.add(a.url);
        return true;
    });
}

async function atualizarCache() {
    try {
        const [na, gn] = await Promise.allSettled([buscarNewsAPI(), buscarGNews()]);
        const todos = [...(na.status==="fulfilled"?na.value:[]), ...(gn.status==="fulfilled"?gn.value:[])];
        const db = lerJSON(NOTICIAS_DB, { removidas:[], cache:[] });
        db.cache = limparArtigos(todos, db.removidas);
        db.atualizado = new Date().toISOString();
        salvarJSON(NOTICIAS_DB, db);
        return db.cache;
    } catch(e) { console.log("Erro cache:", e.message); return []; }
}

setInterval(atualizarCache, 30*60*1000);

app.get("/api/noticias", async (req, res) => {
    try {
        let artigos = await atualizarCache();
        if (!artigos.length) artigos = lerJSON(NOTICIAS_DB,{cache:[]}).cache||[];
        res.json(artigos);
    } catch {
        const c = lerJSON(NOTICIAS_DB,{cache:[]}).cache;
        if (c?.length) return res.json(c);
        res.status(500).json({ erro:"Erro ao buscar notícias" });
    }
});

app.get("/api/noticias-topico", async (req, res) => {
    const q = req.query.q;
    if (!q) return res.status(400).json({ erro:"Tópico não informado" });
    try {
        const r = await axios.get("https://newsapi.org/v2/everything", { params:{ q, language:"pt", sortBy:"publishedAt", pageSize:20, apiKey:API_KEY } });
        const removidas = lerJSON(NOTICIAS_DB,{removidas:[]}).removidas;
        res.json(limparArtigos(r.data.articles||[], removidas));
    } catch { res.status(500).json({ erro:"Erro" }); }
});

app.get("/api/admin/noticias", mwAdmin, (req, res) => {
    const db = lerJSON(NOTICIAS_DB,{cache:[],removidas:[]});
    res.json({ noticias:db.cache||[], removidas:db.removidas||[], atualizado:db.atualizado });
});

app.delete("/api/admin/noticias", mwAdmin, (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ erro:"URL necessária" });
    const db = lerJSON(NOTICIAS_DB,{cache:[],removidas:[]});
    if (!db.removidas.includes(url)) db.removidas.push(url);
    db.cache = (db.cache||[]).filter(a => a.url!==url);
    salvarJSON(NOTICIAS_DB, db);
    log("remove_noticia", url, req.ip);
    res.json({ ok:true });
});

app.get("/api/noticia", async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ erro:"URL não informada" });
    try {
        const r = await axios.get(url, { headers:{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}, timeout:8000 });
        const $ = cheerio.load(r.data);
        $("script,style,nav,header,footer,aside,iframe,form,.ad,.ads,.advertisement,.related,.newsletter,.share,.social,.comments").remove();
        let c = $("article"); if(!c.length) c=$('[itemprop="articleBody"]'); if(!c.length) c=$(".post-content,.entry-content,.article-content,.article-body"); if(!c.length) c=$("main"); if(!c.length) c=$("body");
        const ps = []; c.find("p").each((i,el)=>{ const t=$(el).text().replace(/\s+/g," ").trim(); if(t.length>40) ps.push(t); });
        if(!ps.length) return res.status(404).json({ erro:"Sem conteúdo" });
        res.json({ content:ps });
    } catch { res.status(500).json({ erro:"Erro scraping" }); }
});

// ── COMENTÁRIOS ───────────────────────────────────────────────────────────────
app.get("/api/comentarios", (req, res) => {
    const p = req.query.pagina||"geral";
    res.json(lerJSON(COMENTARIOS_DB,[]).filter(c=>c.pagina===p).slice(-50).reverse());
});

app.post("/api/comentarios", (req, res) => {
    const { pagina, nome, texto } = req.body;
    const user = validarUserToken(req);
    const nomeReal = user ? user.nome : (nome||"").trim();
    if (!nomeReal) return res.status(400).json({ erro:"Nome obrigatório." });
    if (!texto||texto.length<2) return res.status(400).json({ erro:"Comentário vazio." });
    if (texto.length>500) return res.status(400).json({ erro:"Máx 500 caracteres." });
    if (temPalavrao(nomeReal)||temPalavrao(texto)) return res.status(400).json({ erro:"Linguagem inadequada." });
    const todos = lerJSON(COMENTARIOS_DB,[]);
    todos.push({ id:Date.now(), pagina:pagina||"geral", nome:nomeReal, texto:texto.trim(), data:new Date().toLocaleString("pt-BR"), logado:!!user });
    salvarJSON(COMENTARIOS_DB, todos);
    res.json({ ok:true });
});

app.get("/api/admin/comentarios", mwAdmin, (req,res) => res.json(lerJSON(COMENTARIOS_DB,[]).reverse()));
app.delete("/api/admin/comentarios", mwAdmin, (req,res) => {
    salvarJSON(COMENTARIOS_DB, lerJSON(COMENTARIOS_DB,[]).filter(c=>c.id!==req.body.id));
    log("remove_comentario", String(req.body.id), req.ip);
    res.json({ ok:true });
});

// ── DOADORES ──────────────────────────────────────────────────────────────────
app.get("/api/doadores", (req,res) => res.json(lerJSON(DOADORES_DB,[])));
app.post("/api/admin/doadores", mwAdmin, (req,res) => {
    const { nome, valor } = req.body;
    if (!nome||!valor) return res.status(400).json({ erro:"Nome e valor obrigatórios" });
    const lista = lerJSON(DOADORES_DB,[]);
    lista.unshift({ id:Date.now(), nome:nome.trim(), valor:Number(valor), data:new Date().toLocaleDateString("pt-BR") });
    lista.sort((a,b)=>b.valor-a.valor);
    salvarJSON(DOADORES_DB, lista.slice(0,50));
    res.json({ ok:true });
});
app.delete("/api/admin/doadores", mwAdmin, (req,res) => {
    salvarJSON(DOADORES_DB, lerJSON(DOADORES_DB,[]).filter(d=>d.id!==req.body.id));
    res.json({ ok:true });
});

// ── LOGS / STATS ──────────────────────────────────────────────────────────────
app.get("/api/admin/logs", mwAdmin, (req,res) => res.json(lerJSON(LOGS_DB,[]).slice(0,100)));
app.get("/api/admin/stats", mwAdmin, (req,res) => {
    res.json({
        noticias:  lerJSON(NOTICIAS_DB,{cache:[]}).cache?.length||0,
        comentarios: lerJSON(COMENTARIOS_DB,[]).length,
        usuarios:  lerJSON(USUARIOS_DB,[]).length,
        doadores:  lerJSON(DOADORES_DB,[]).length,
        totalPix:  lerJSON(DOADORES_DB,[]).reduce((s,d)=>s+d.valor,0)
    });
});

// ── ROTA PRINCIPAL ────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Redireciona qualquer rota desconhecida para index.html
app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    const file = path.join(__dirname, req.path);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return res.sendFile(file);
    res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🎮 Gamer Hub rodando em http://localhost:" + PORT));
